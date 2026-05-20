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
} from "@/lib/api-utils";
import { eq, and, isNull, desc } from "drizzle-orm";

const createSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().default(""),
  body: z.string().default(""),
  status: z.enum(["active", "archived"]).default("active"),
});

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const rows = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, user!.userId), isNull(notes.deletedAt)))
    .orderBy(desc(notes.updatedAt));

  return jsonResponse({ notes: rows.map(toApiNote) });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await request.json());
  } catch {
    return errorResponse("Invalid request", 400);
  }

  const now = new Date();
  const id = body.id ?? uuidv4();

  const [row] = await db
    .insert(notes)
    .values({
      id,
      userId: user!.userId,
      title: body.title,
      body: body.body,
      status: body.status,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return jsonResponse({ note: toApiNote(row) }, 201);
}
