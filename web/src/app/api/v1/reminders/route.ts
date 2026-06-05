import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { notes, reminders } from "@/lib/db/schema";
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  toApiReminder,
} from "@/lib/api-utils";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";

const VALID_STATUSES = new Set(["active", "completed", "cancelled"]);

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const params = request.nextUrl.searchParams;
  const statusParam = params.get("status") ?? "active";
  const limitParam = params.get("limit");
  const limit = limitParam === "all" ? 10000 : Math.min(Number(limitParam) || 100, 500);

  const filters = [
    eq(reminders.userId, user!.userId),
    isNull(reminders.deletedAt),
    eq(notes.userId, user!.userId),
    isNull(notes.deletedAt),
  ];

  if (statusParam !== "all") {
    const statuses = statusParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (statuses.length === 0 || statuses.some((s) => !VALID_STATUSES.has(s))) {
      return errorResponse("Invalid status", 400);
    }
    filters.push(inArray(reminders.status, statuses));
  }

  const rows = await db
    .select({
      reminder: reminders,
      noteTitle: notes.title,
    })
    .from(reminders)
    .innerJoin(notes, eq(reminders.noteId, notes.id))
    .where(and(...filters))
    .orderBy(asc(reminders.fireAt))
    .limit(limit);

  return jsonResponse({
    reminders: rows.map((row) =>
      toApiReminder({ ...row.reminder, noteTitle: row.noteTitle }),
    ),
  });
}
