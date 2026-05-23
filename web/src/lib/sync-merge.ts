/** Pure last-write-wins helpers used by server sync (testable without DB). */

export type SyncNoteInput = {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SyncReminderInput = {
  id: string;
  note_id: string;
  fire_at: string;
  timezone: string;
  repeat_rule: string | null;
  intensity: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MergeAction = "insert" | "update" | "skip";

export function resolveNoteMerge(
  existingUpdatedAt: Date | undefined,
  clientUpdatedAt: Date,
): MergeAction {
  if (existingUpdatedAt === undefined) return "insert";
  if (clientUpdatedAt > existingUpdatedAt) return "update";
  return "skip";
}

export function resolveReminderMerge(
  existingUpdatedAt: Date | undefined,
  clientUpdatedAt: Date,
): MergeAction {
  return resolveNoteMerge(existingUpdatedAt, clientUpdatedAt);
}

/** Shape of a dirty note pushed from Android during sync. */
export function androidOfflineNotePayload(
  id: string,
  title: string,
  body: string,
  updatedAtIso: string,
): SyncNoteInput {
  return {
    id,
    title,
    body,
    status: "active",
    created_at: updatedAtIso,
    updated_at: updatedAtIso,
    deleted_at: null,
  };
}
