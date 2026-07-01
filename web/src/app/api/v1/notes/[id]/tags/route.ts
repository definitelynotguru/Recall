import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { noteTags, notes, tags } from "@/lib/db/schema";
import { requireAuth, jsonResponse, errorResponse, toApiTag } from "@/lib/api-utils";
import { and, eq, inArray, isNull } from "drizzle-orm";

const putSchema = z.object({
  tag_ids: z.array(z.string().uuid()).max(12),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;
  const { id } = await params;

  const rows = await db
    .select({ tag: tags })
    .from(noteTags)
    .innerJoin(tags, eq(noteTags.tagId, tags.id))
    .where(
      and(
        eq(noteTags.userId, user!.userId),
        eq(noteTags.noteId, id),
        isNull(noteTags.deletedAt),
        isNull(tags.deletedAt),
      ),
    );

  return jsonResponse({ tags: rows.map((r) => toApiTag(r.tag)) });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;
  const { id } = await params;

  let body: z.infer<typeof putSchema>;
  try {
    body = putSchema.parse(await request.json());
  } catch {
    return errorResponse("Invalid request", 400);
  }

  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, user!.userId), isNull(notes.deletedAt)))
    .limit(1);
  if (!note) return errorResponse("Note not found", 404);

  const validTags = body.tag_ids.length
    ? await db
        .select()
        .from(tags)
        .where(and(eq(tags.userId, user!.userId), inArray(tags.id, body.tag_ids), isNull(tags.deletedAt)))
    : [];
  if (validTags.length !== body.tag_ids.length) return errorResponse("Invalid tag", 400);

  const now = new Date();
  const existing = await db
    .select()
    .from(noteTags)
    .where(and(eq(noteTags.userId, user!.userId), eq(noteTags.noteId, id)));
  const wanted = new Set(body.tag_ids);

  for (const link of existing) {
    const shouldExist = wanted.has(link.tagId);
    await db
      .update(noteTags)
      .set({
        deletedAt: shouldExist ? null : now,
        updatedAt: now,
      })
      .where(eq(noteTags.id, link.id));
    wanted.delete(link.tagId);
  }

  for (const tagId of wanted) {
    await db.insert(noteTags).values({
      id: crypto.randomUUID(),
      userId: user!.userId,
      noteId: id,
      tagId,
      createdAt: now,
      updatedAt: now,
    });
  }

  return GET(request, { params: Promise.resolve({ id }) });
}
