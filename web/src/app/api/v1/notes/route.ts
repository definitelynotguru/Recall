import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { notes, noteTags, tags } from "@/lib/db/schema";
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  toApiNote,
  readJsonBody,
  parseJsonBody,
} from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { eq, and, isNull, desc, sql, inArray } from "drizzle-orm";
import { searchNotes, type SearchableNote } from "@/lib/search-score";

const createSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().default(""),
  body: z.string().default(""),
  status: z.enum(["active", "archived"]).default("active"),
  pinned_at: z.string().nullable().optional(),
  is_template: z.boolean().optional().default(false),
  daily_date: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? "active";
  const q = params.get("q")?.trim() ?? "";
  const tagId = params.get("tag_id")?.trim() ?? "";
  const templatesMode = params.get("templates") ?? "hide";
  const dailyDate = params.get("daily_date")?.trim() ?? "";
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
  if (templatesMode === "only") {
    filters.push(eq(notes.isTemplate, true));
  } else if (templatesMode === "include") {
    // no template filter
  } else {
    filters.push(eq(notes.isTemplate, false));
  }
  if (dailyDate) {
    filters.push(eq(notes.dailyDate, dailyDate));
  }

  let noteIdFilter: string[] | null = null;
  if (tagId) {
    const links = await db
      .select({ noteId: noteTags.noteId })
      .from(noteTags)
      .where(
        and(
          eq(noteTags.userId, user!.userId),
          eq(noteTags.tagId, tagId),
          isNull(noteTags.deletedAt),
        ),
      );
    noteIdFilter = links.map((l) => l.noteId);
    if (noteIdFilter.length === 0) {
      return jsonResponse({ notes: [] });
    }
  }

  if (q) {
    const searchFilters = [...filters];
    if (noteIdFilter) searchFilters.push(inArray(notes.id, noteIdFilter));
    const candidateRows = await db
      .select()
      .from(notes)
      .where(and(...searchFilters))
      .limit(5000);

    const [tagRows, linkRows] = await Promise.all([
      db.select().from(tags).where(eq(tags.userId, user!.userId)),
      db.select().from(noteTags).where(eq(noteTags.userId, user!.userId)),
    ]);
    const tagNameById = new Map(tagRows.map((t) => [t.id, t.name]));
    const tagsByNote = new Map<string, string[]>();
    for (const link of linkRows) {
      if (link.deletedAt) continue;
      const name = tagNameById.get(link.tagId);
      if (!name) continue;
      const list = tagsByNote.get(link.noteId) ?? [];
      list.push(name);
      tagsByNote.set(link.noteId, list);
    }

    const searchable: SearchableNote[] = candidateRows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      updated_at: r.updatedAt.toISOString(),
      tags: tagsByNote.get(r.id) ?? [],
    }));
    const ranked = searchNotes(searchable, q).slice(0, 200);
    const orderedRows = ranked
      .map((r) => candidateRows.find((row) => row.id === r.id)!)
      .filter(Boolean);
    return jsonResponse({ notes: orderedRows.map(toApiNote) });
  }

  const listFilters = [...filters];
  if (noteIdFilter) listFilters.push(inArray(notes.id, noteIdFilter));

  const rows = await db
    .select()
    .from(notes)
    .where(and(...listFilters))
    .orderBy(sql`${notes.pinnedAt} DESC NULLS LAST`, desc(notes.updatedAt))
    .limit(limit);

  return jsonResponse({ notes: rows.map(toApiNote) });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const rateKey = `notes:${user!.userId}:${getClientIp(request)}`;
  if (!(await rateLimit(rateKey, { max: 60, windowMs: 60_000 }))) {
    return errorResponse("Too many requests", 429);
  }

  const raw = await readJsonBody(request);
  if (!raw.ok) return raw.response;
  const parsed = parseJsonBody<unknown>(raw.text);
  if (parsed instanceof Response) return parsed;

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(parsed);
  } catch {
    return errorResponse("Invalid request", 400);
  }

  const now = new Date();
  const id = body.id ?? crypto.randomUUID();
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
      isTemplate: body.is_template,
      dailyDate: body.daily_date ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return jsonResponse({ note: toApiNote(row) }, 201);
}
