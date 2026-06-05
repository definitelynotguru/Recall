import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { noteTags, tags } from "@/lib/db/schema";
import { requireAuth, jsonResponse, errorResponse, toApiTag } from "@/lib/api-utils";
import { and, eq, isNull } from "drizzle-orm";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(40),
});

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
    .from(tags)
    .where(and(eq(tags.id, id), eq(tags.userId, user!.userId), isNull(tags.deletedAt)))
    .limit(1);
  if (!existing) return errorResponse("Tag not found", 404);

  const [row] = await db
    .update(tags)
    .set({ name: body.name, updatedAt: new Date() })
    .where(eq(tags.id, id))
    .returning();
  return jsonResponse({ tag: toApiTag(row) });
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
    .from(tags)
    .where(and(eq(tags.id, id), eq(tags.userId, user!.userId)))
    .limit(1);
  if (!existing) return errorResponse("Tag not found", 404);

  await db.update(tags).set({ deletedAt: now, updatedAt: now }).where(eq(tags.id, id));
  await db
    .update(noteTags)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(noteTags.tagId, id), eq(noteTags.userId, user!.userId)));
  return jsonResponse({ ok: true });
}
