import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { notes, reminders } from "@/lib/db/schema";
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  toApiNote,
  toApiReminder,
} from "@/lib/api-utils";
import { eq, and, isNull } from "drizzle-orm";

const patchSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { id } = await params;
  const [note] = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.id, id),
        eq(notes.userId, user!.userId),
        isNull(notes.deletedAt),
      ),
    )
    .limit(1);

  if (!note) return errorResponse("Note not found", 404);

  const noteReminders = await db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.noteId, id),
        eq(reminders.userId, user!.userId),
        isNull(reminders.deletedAt),
      ),
    );

  return jsonResponse({
    note: toApiNote(note),
    reminders: noteReminders.map(toApiReminder),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { id } = await params;
  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
  } catch {
    return errorResponse("Invalid request", 400);
  }

  const [existing] = await db
    .select()
    .from(notes)
    .where(
      and(eq(notes.id, id), eq(notes.userId, user!.userId), isNull(notes.deletedAt)),
    )
    .limit(1);

  if (!existing) return errorResponse("Note not found", 404);

  const now = new Date();
  const [row] = await db
    .update(notes)
    .set({
      title: body.title ?? existing.title,
      body: body.body ?? existing.body,
      status: body.status ?? existing.status,
      updatedAt: now,
    })
    .where(eq(notes.id, id))
    .returning();

  return jsonResponse({ note: toApiNote(row) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { id } = await params;
  const now = new Date();

  const [existing] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, user!.userId)))
    .limit(1);

  if (!existing) return errorResponse("Note not found", 404);

  await db
    .update(notes)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(notes.id, id));

  await db
    .update(reminders)
    .set({ deletedAt: now, updatedAt: now, status: "cancelled" })
    .where(
      and(eq(reminders.noteId, id), eq(reminders.userId, user!.userId)),
    );

  return jsonResponse({ ok: true });
}
