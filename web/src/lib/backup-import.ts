import { apiFetch, ApiNote, ApiNoteTag, ApiReminder, ApiTag } from "./api-client";
import { validateBackupBundle } from "./backup-import-validation";

export type BackupBundle = {
  exported_at?: string;
  notes: ApiNote[];
  reminders_by_note: Record<string, ApiReminder[]>;
  tags?: ApiTag[];
  note_tags?: ApiNoteTag[];
};

function isBackupBundle(value: unknown): value is BackupBundle {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return Array.isArray(o.notes) && typeof o.reminders_by_note === "object";
}

export type BackupPreview = {
  notes: number;
  reminders: number;
  tags: number;
  note_tags: number;
  newNotes: number;
  warnings: string[];
};

export function parseBackupPreview(
  bundle: BackupBundle,
  existingNoteIds?: Set<string>,
): BackupPreview {
  let reminders = 0;
  for (const list of Object.values(bundle.reminders_by_note)) {
    reminders += list.filter((r) => r.id && !r.deleted_at).length;
  }

  const activeNotes = bundle.notes.filter((n) => n.id && !n.deleted_at);
  const newNotes = existingNoteIds
    ? activeNotes.filter((n) => !existingNoteIds.has(n.id)).length
    : activeNotes.length;

  return {
    notes: activeNotes.length,
    reminders,
    tags: (bundle.tags ?? []).filter((t) => t.id && !t.deleted_at).length,
    note_tags: (bundle.note_tags ?? []).filter((l) => l.id && !l.deleted_at).length,
    newNotes,
    warnings: validateBackupBundle(bundle),
  };
}

export function parseBackupJson(text: string): BackupBundle {
  const parsed: unknown = JSON.parse(text);
  if (!isBackupBundle(parsed)) {
    throw new Error("Invalid backup: expected notes[] and reminders_by_note{}");
  }
  return parsed;
}

export async function exportBackupBundle(): Promise<BackupBundle> {
  const notesRes = await apiFetch<{ notes: ApiNote[] }>(
    "/notes?status=all&limit=all",
  );
  const remindersRes = await apiFetch<{ reminders: ApiReminder[] }>(
    "/reminders?status=all&limit=all",
  );
  const tagsRes = await apiFetch<{ tags: ApiTag[] }>("/tags");
  const noteTagsRes = await apiFetch<{ note_tags: ApiNoteTag[] }>("/note-tags");
  const remindersByNote: Record<string, ApiReminder[]> = {};
  for (const n of notesRes.notes) remindersByNote[n.id] = [];
  for (const r of remindersRes.reminders) {
    if (!remindersByNote[r.note_id]) remindersByNote[r.note_id] = [];
    remindersByNote[r.note_id].push(r);
  }
  return {
    exported_at: new Date().toISOString(),
    notes: notesRes.notes,
    reminders_by_note: remindersByNote,
    tags: tagsRes.tags,
    note_tags: noteTagsRes.note_tags,
  };
}

export async function importBackup(
  bundle: BackupBundle,
): Promise<{ notes: number; reminders: number; warnings: string[] }> {
  const res = await apiFetch<{
    notes: number;
    reminders: number;
    warnings: string[];
  }>("/backup/import", {
    method: "POST",
    body: JSON.stringify(bundle),
  });
  return res;
}
