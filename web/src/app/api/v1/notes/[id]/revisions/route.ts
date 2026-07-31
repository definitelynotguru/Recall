import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-utils";
import { eq, and, isNull } from "drizzle-orm";
import { listRevisions } from "@/lib/revisions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { id } = await params;
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

  const rows = await listRevisions(user!.userId, id);
  return jsonResponse({
    revisions: rows.map((r) => ({
      id: r.id,
      note_id: r.noteId,
      title: r.title,
      body: r.body,
      source: r.source,
      created_at: r.createdAt.toISOString(),
    })),
  });
}
