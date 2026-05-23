import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { debugReports } from "@/lib/db/schema";
import { requireAuth, jsonResponse } from "@/lib/api-utils";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 50);

  const rows = await db
    .select()
    .from(debugReports)
    .where(eq(debugReports.userId, user!.userId))
    .orderBy(desc(debugReports.createdAt))
    .limit(limit);

  return jsonResponse({
    reports: rows.map((r) => ({
      id: r.id,
      device_id: r.deviceId,
      app_version: r.appVersion,
      api_base_url: r.apiBaseUrl,
      payload: r.payload,
      created_at: r.createdAt.toISOString(),
      summary: summarizePayload(r.payload),
    })),
  });
}

function summarizePayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "—";
  const p = payload as Record<string, unknown>;
  const sync = p.sync as Record<string, unknown> | undefined;
  const lastError = typeof p.last_sync_error === "string" ? p.last_sync_error : "";
  const warnings = Array.isArray(p.sanitize_warnings)
    ? p.sanitize_warnings.length
    : 0;
  const dirtyNotes =
    typeof sync?.dirty_note_count === "number" ? sync.dirty_note_count : "?";
  const dirtyReminders =
    typeof sync?.dirty_reminder_count === "number"
      ? sync.dirty_reminder_count
      : "?";
  const parts = [
    `dirty notes=${dirtyNotes}`,
    `dirty reminders=${dirtyReminders}`,
  ];
  if (warnings > 0) parts.push(`warnings=${warnings}`);
  if (lastError) parts.push(`err=${lastError.slice(0, 60)}`);
  return parts.join(" · ");
}
