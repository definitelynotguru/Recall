import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { deviceSyncState } from "@/lib/db/schema";
import { requireAuth, jsonResponse } from "@/lib/api-utils";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const rows = await db
    .select()
    .from(deviceSyncState)
    .where(eq(deviceSyncState.userId, user!.userId));

  return jsonResponse({
    server_time: new Date().toISOString(),
    devices: rows
      .map((row) => ({
        device_id: row.deviceId,
        last_sync_at: row.lastSyncAt.toISOString(),
      }))
      .sort((a, b) => b.last_sync_at.localeCompare(a.last_sync_at)),
  });
}
