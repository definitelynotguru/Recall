import { NextRequest } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  toApiNote,
  readJsonBody,
  parseJsonBody,
} from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const noteItemSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().default(""),
  body: z.string().default(""),
  status: z.enum(["active", "archived"]).default("active"),
  pinned_at: z.string().nullable().optional(),
});

const MAX_ITEMS = 100;
const MAX_BULK_BYTES = 2_000_000;

type NoteResult =
  | { ok: true; note: ReturnType<typeof toApiNote> }
  | { ok: false; index: number; error: string };

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const rateKey = `notes-bulk:${user!.userId}:${getClientIp(request)}`;
  if (!(await rateLimit(rateKey, { max: 60, windowMs: 60_000 }))) {
    return errorResponse("Too many requests", 429);
  }

  const raw = await readJsonBody(request, MAX_BULK_BYTES);
  if (!raw.ok) return raw.response;
  const parsed = parseJsonBody<{ notes?: unknown[] }>(raw.text);
  if (parsed instanceof Response) return parsed;

  const items = parsed.notes;
  if (!Array.isArray(items)) {
    return errorResponse("Invalid request", 400);
  }
  if (items.length > MAX_ITEMS) {
    return errorResponse(`Too many items (max ${MAX_ITEMS})`, 400);
  }

  const results: NoteResult[] = [];
  let created = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const itemParse = noteItemSchema.safeParse(items[i]);
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
    const pinnedAt = item.pinned_at ? new Date(item.pinned_at) : null;
    try {
      const [row] = await db
        .insert(notes)
        .values({
          id,
          userId: user!.userId,
          title: item.title,
          body: item.body,
          status: item.status,
          pinnedAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      results.push({ ok: true, note: toApiNote(row) });
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
