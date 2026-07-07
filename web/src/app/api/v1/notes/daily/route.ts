import { z } from "zod";
import type { NextRequest } from "next/server";
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
import { eq, and, isNull } from "drizzle-orm";
import { expandTemplate, DEFAULT_TEMPLATES } from "@/lib/templates";

const dailySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});

const DAILY_TEMPLATE_BODY = DEFAULT_TEMPLATES[0].body;

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const rateKey = `notes-daily:${user!.userId}:${getClientIp(request)}`;
  if (!(await rateLimit(rateKey, { max: 30, windowMs: 60_000 }))) {
    return errorResponse("Too many requests", 429);
  }

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;
  const parsed = parseJsonBody<unknown>(raw.text);
  if (parsed instanceof Response) return parsed;

  let body: z.infer<typeof dailySchema>;
  try {
    body = dailySchema.parse(parsed);
  } catch {
    return errorResponse("Invalid request", 400);
  }

  const [existing] = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.userId, user!.userId),
        eq(notes.dailyDate, body.date),
        isNull(notes.deletedAt),
      ),
    )
    .limit(1);

  if (existing) {
    return jsonResponse({ note: toApiNote(existing) });
  }

  const title = `Daily — ${body.date}`;
  const now = new Date();
  const [row] = await db
    .insert(notes)
    .values({
      id: crypto.randomUUID(),
      userId: user!.userId,
      title,
      body: expandTemplate(DAILY_TEMPLATE_BODY, { title }),
      status: "active",
      isTemplate: false,
      dailyDate: body.date,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return jsonResponse({ note: toApiNote(row) }, 201);
}
