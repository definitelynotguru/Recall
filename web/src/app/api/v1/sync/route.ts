import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { deviceSyncState } from "@/lib/db/schema";
import { processSync } from "@/lib/sync";
import { syncSchema } from "@/lib/sync-schema";
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  toApiNote,
  toApiNoteTag,
  toApiReminder,
  toApiTag,
} from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  let body: z.infer<typeof syncSchema>;
  try {
    body = syncSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonResponse(
        {
          error: "Invalid sync payload",
          issues: err.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        400,
      );
    }
    return errorResponse("Invalid request", 400);
  }

  const {
    notes: mergedNotes,
    reminders: mergedReminders,
    tags: mergedTags,
    noteTags: mergedNoteTags,
    sync_mode,
  } = await processSync(
    user!.userId,
    body.last_sync_at,
    body.notes,
    body.reminders,
    body.tags,
    body.note_tags,
  );

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
    sync_mode,
    notes: mergedNotes.map(toApiNote),
    reminders: mergedReminders.map(toApiReminder),
    tags: mergedTags.map(toApiTag),
    note_tags: mergedNoteTags.map(toApiNoteTag),
  });
}
