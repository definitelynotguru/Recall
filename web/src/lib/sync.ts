import { getDb } from "./db";
import {
  fetchCatalogForClient,
  mergeNote,
  mergeNoteTag,
  mergeReminder,
  mergeTag,
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
  lastSyncAt: string,
  incomingNotes: SyncNoteInput[],
  incomingReminders: SyncReminderInput[],
  incomingTags: SyncTagInput[] = [],
  incomingNoteTags: SyncNoteTagInput[] = [],
) {
  const { mode, since } = resolveSyncMode(lastSyncAt);

  const catalog = await getDb().transaction(async (tx) => {
    for (const n of incomingNotes) {
      await mergeNote(tx, userId, n);
    }
    for (const r of incomingReminders) {
      await mergeReminder(tx, userId, r);
    }
    for (const t of incomingTags) {
      await mergeTag(tx, userId, t);
    }
    for (const nt of incomingNoteTags) {
      await mergeNoteTag(tx, userId, nt);
    }
    return fetchCatalogForClient(tx, userId, mode, since);
  });

  return { ...catalog, sync_mode: mode };
}
