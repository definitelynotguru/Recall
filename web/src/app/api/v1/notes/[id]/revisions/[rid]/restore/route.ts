import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  toApiNote,
} from "@/lib/api-utils";
import { eq, and, isNull } from "drizzle-orm";
import { getRevision } from "@/lib/revisions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> },
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { id, rid } = await params;
  const [note] = await db
    .select({ id: notes.id })
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

  const revision = await getRevision(user!.userId, rid);
  if (!revision || revision.noteId !== id) {
    return errorResponse("Revision not found", 404);
  }

  const now = new Date();
  const newId = crypto.randomUUID();
  const restoredTitle = (revision.title || "Restored note").trim();

  const [row] = await db
    .insert(notes)
    .values({
      id: newId,
      userId: user!.userId,
      title: restoredTitle,
      body: revision.body,
      status: "active",
      pinnedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return jsonResponse({ note: toApiNote(row) }, 201);
}
