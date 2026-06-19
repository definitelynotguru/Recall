import { getDb } from "./db";
import { deviceSyncState } from "./db/schema";
import {
  fetchCatalogForClient,
  mergeNoteTagsBatch,
  mergeNotesBatch,
  mergeRemindersBatch,
  mergeTagsBatch,
  resolveSyncMode,
  type SyncMode,
  type SyncNoteTagInput,
  type SyncTagInput,
} from "./sync-catalog";
import type { SyncNoteInput, SyncReminderInput } from "./sync-merge";

export type { SyncNoteInput as SyncNote, SyncReminderInput as SyncReminder };
export type { SyncTagInput, SyncNoteTagInput, SyncMode };

export async function processSync(
  userId: string,
  deviceId: string,
  lastSyncAt: string,
  incomingNotes: SyncNoteInput[],
  incomingReminders: SyncReminderInput[],
  incomingTags: SyncTagInput[] = [],
  incomingNoteTags: SyncNoteTagInput[] = [],
) {
  const { mode, since } = resolveSyncMode(lastSyncAt);
  const serverTime = new Date();

  const catalog = await getDb().transaction(async (tx) => {
    await mergeNotesBatch(tx, userId, incomingNotes);
    await mergeRemindersBatch(tx, userId, incomingReminders);
    await mergeTagsBatch(tx, userId, incomingTags);
    await mergeNoteTagsBatch(tx, userId, incomingNoteTags);

    await tx
      .insert(deviceSyncState)
      .values({
        userId,
        deviceId,
        lastSyncAt: serverTime,
      })
      .onConflictDoUpdate({
        target: [deviceSyncState.userId, deviceSyncState.deviceId],
        set: { lastSyncAt: serverTime },
      });

    return fetchCatalogForClient(tx, userId, mode, since);
  });

  return { ...catalog, sync_mode: mode, server_time: serverTime };
}
