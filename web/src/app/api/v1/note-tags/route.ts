import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { noteTags } from "@/lib/db/schema";
import { requireAuth, jsonResponse, toApiNoteTag } from "@/lib/api-utils";
import { and, eq, isNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const rows = await db
    .select()
    .from(noteTags)
    .where(and(eq(noteTags.userId, user!.userId), isNull(noteTags.deletedAt)));

  return jsonResponse({ note_tags: rows.map(toApiNoteTag) });
}
