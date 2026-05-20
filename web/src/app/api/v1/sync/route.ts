import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { deviceSyncState } from "@/lib/db/schema";
import { processSync } from "@/lib/sync";
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  toApiNote,
  toApiReminder,
} from "@/lib/api-utils";
import { eq, and } from "drizzle-orm";

const syncSchema = z.object({
  device_id: z.string().min(1),
  last_sync_at: z.string(),
  notes: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      body: z.string(),
      status: z.string(),
      created_at: z.string(),
      updated_at: z.string(),
      deleted_at: z.string().nullable(),
    }),
  ),
  reminders: z.array(
    z.object({
      id: z.string().uuid(),
      note_id: z.string().uuid(),
      fire_at: z.string(),
      timezone: z.string(),
      repeat_rule: z.string().nullable(),
      intensity: z.string(),
      status: z.string(),
      completed_at: z.string().nullable(),
      created_at: z.string(),
      updated_at: z.string(),
      deleted_at: z.string().nullable(),
    }),
  ),
});

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  let body: z.infer<typeof syncSchema>;
  try {
    body = syncSchema.parse(await request.json());
  } catch {
    return errorResponse("Invalid request", 400);
  }

  const { notes: mergedNotes, reminders: mergedReminders } =
    await processSync(user!.userId, body.notes, body.reminders);

  const serverTime = new Date();
  await db
    .insert(deviceSyncState)
    .values({
      userId: user!.userId,
      deviceId: body.device_id,
      lastSyncAt: serverTime,
    })
    .onConflictDoUpdate({
      target: [deviceSyncState.userId, deviceSyncState.deviceId],
      set: { lastSyncAt: serverTime },
    });

  return jsonResponse({
    server_time: serverTime.toISOString(),
    notes: mergedNotes.map(toApiNote),
    reminders: mergedReminders.map(toApiReminder),
  });
}
