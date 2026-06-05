import { NextRequest } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { notes, reminders } from "@/lib/db/schema";
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  toApiReminder,
  parseIsoDate,
} from "@/lib/api-utils";
import { eq, and, isNull } from "drizzle-orm";

const createSchema = z.object({
  id: z.string().uuid().optional(),
  fire_at: z.string(),
  timezone: z.string().default("UTC"),
  repeat_rule: z.string().trim().max(120).nullable().optional(),
  intensity: z.enum(["gentle", "persistent", "escalating"]).default("gentle"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { id: noteId } = await params;
  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await request.json());
  } catch {
    return errorResponse("Invalid request", 400);
  }

  const fireAt = parseIsoDate(body.fire_at);
  if (!fireAt) return errorResponse("Invalid fire_at", 400);

  const [note] = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.id, noteId),
        eq(notes.userId, user!.userId),
        isNull(notes.deletedAt),
      ),
    )
    .limit(1);

  if (!note) return errorResponse("Note not found", 404);

  const now = new Date();
  const id = body.id ?? uuidv4();

  const [row] = await db
    .insert(reminders)
    .values({
      id,
      userId: user!.userId,
      noteId,
      fireAt,
      timezone: body.timezone,
      repeatRule: body.repeat_rule ?? null,
      intensity: body.intensity,
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return jsonResponse({ reminder: toApiReminder(row) }, 201);
}
