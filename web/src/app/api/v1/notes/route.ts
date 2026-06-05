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
import { eq, and, isNull, desc, ilike, or, sql } from "drizzle-orm";

const createSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().default(""),
  body: z.string().default(""),
  status: z.enum(["active", "archived"]).default("active"),
  pinned_at: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? "active";
  const q = params.get("q")?.trim() ?? "";
  const limitParam = params.get("limit");
  const limit = limitParam === "all" ? 10000 : Math.min(Number(limitParam) || 100, 500);
  if (!["active", "archived", "all"].includes(status)) {
    return errorResponse("Invalid status", 400);
  }

  const filters = [
    eq(notes.userId, user!.userId),
    isNull(notes.deletedAt),
  ];
  if (status !== "all") {
    filters.push(eq(notes.status, status));
  }
  if (q) {
    const pattern = `%${q}%`;
    filters.push(or(ilike(notes.title, pattern), ilike(notes.body, pattern))!);
  }

  const rows = await db
    .select()
    .from(notes)
    .where(and(...filters))
    .orderBy(sql`${notes.pinnedAt} DESC NULLS LAST`, desc(notes.updatedAt))
    .limit(limit);

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
  const pinnedAt = body.pinned_at ? new Date(body.pinned_at) : null;

  const [row] = await db
    .insert(notes)
    .values({
      id,
      userId: user!.userId,
      title: body.title,
      body: body.body,
      status: body.status,
      pinnedAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return jsonResponse({ note: toApiNote(row) }, 201);
}
