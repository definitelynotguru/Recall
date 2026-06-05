import { NextRequest } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { requireAuth, jsonResponse, errorResponse, toApiTag } from "@/lib/api-utils";
import { and, asc, eq, isNull } from "drizzle-orm";

const tagSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(40),
});

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const rows = await db
    .select()
    .from(tags)
    .where(and(eq(tags.userId, user!.userId), isNull(tags.deletedAt)))
    .orderBy(asc(tags.name));

  return jsonResponse({ tags: rows.map(toApiTag) });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  let body: z.infer<typeof tagSchema>;
  try {
    body = tagSchema.parse(await request.json());
  } catch {
    return errorResponse("Invalid request", 400);
  }

  const now = new Date();
  const [row] = await db
    .insert(tags)
    .values({
      id: body.id ?? uuidv4(),
      userId: user!.userId,
      name: body.name,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return jsonResponse({ tag: toApiTag(row) }, 201);
}
