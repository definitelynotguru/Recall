import { NextRequest } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  toApiTag,
  readJsonBody,
  parseJsonBody,
} from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const tagItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(40),
});

const MAX_ITEMS = 100;

type TagResult =
  | { ok: true; tag: ReturnType<typeof toApiTag> }
  | { ok: false; index: number; error: string };

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const rateKey = `tags-bulk:${user!.userId}:${getClientIp(request)}`;
  if (!(await rateLimit(rateKey, { max: 60, windowMs: 60_000 }))) {
    return errorResponse("Too many requests", 429);
  }

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;
  const parsed = parseJsonBody<{ tags?: unknown[] }>(raw.text);
  if (parsed instanceof Response) return parsed;

  const items = parsed.tags;
  if (!Array.isArray(items)) {
    return errorResponse("Invalid request", 400);
  }
  if (items.length > MAX_ITEMS) {
    return errorResponse(`Too many items (max ${MAX_ITEMS})`, 400);
  }

  const results: TagResult[] = [];
  let created = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const itemParse = tagItemSchema.safeParse(items[i]);
    if (!itemParse.success) {
      results.push({
        ok: false,
        index: i,
        error: itemParse.error.issues[0]?.message ?? "Invalid item",
      });
      failed++;
      continue;
    }
    const item = itemParse.data;
    const now = new Date();
    const id = item.id ?? uuidv4();
    try {
      const [row] = await db
        .insert(tags)
        .values({
          id,
          userId: user!.userId,
          name: item.name,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      results.push({ ok: true, tag: toApiTag(row) });
      created++;
    } catch (e) {
      results.push({
        ok: false,
        index: i,
        error: e instanceof Error ? e.message : "Insert failed",
      });
      failed++;
    }
  }

  return jsonResponse({ results, created, failed });
}
