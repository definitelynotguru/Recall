import { apiFetch, ApiNote, ApiReminder } from "./api-client";

export type BackupBundle = {
  exported_at?: string;
  notes: ApiNote[];
  reminders_by_note: Record<string, ApiReminder[]>;
};

function isBackupBundle(value: unknown): value is BackupBundle {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return Array.isArray(o.notes) && typeof o.reminders_by_note === "object";
}

export function parseBackupJson(text: string): BackupBundle {
  const parsed: unknown = JSON.parse(text);
  if (!isBackupBundle(parsed)) {
    throw new Error("Invalid backup: expected notes[] and reminders_by_note{}");
  }
  return parsed;
}

export async function importBackup(
  bundle: BackupBundle,
): Promise<{ notes: number; reminders: number }> {
  const existing = await apiFetch<{ notes: ApiNote[] }>("/notes");
  const existingIds = new Set(existing.notes.map((n) => n.id));
  let noteCount = 0;
  let reminderCount = 0;

  for (const note of bundle.notes) {
    if (!note.id) continue;
    if (existingIds.has(note.id)) {
      await apiFetch(`/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: note.title, body: note.body }),
      });
    } else {
      await apiFetch("/notes", {
        method: "POST",
        body: JSON.stringify({
          id: note.id,
          title: note.title ?? "",
          body: note.body ?? "",
        }),
      });
      existingIds.add(note.id);
    }
    noteCount++;
  }

  for (const [noteId, reminders] of Object.entries(bundle.reminders_by_note)) {
    if (!existingIds.has(noteId)) continue;
    const detail = await apiFetch<{ reminders: ApiReminder[] }>(`/notes/${noteId}`);
    const have = new Set(detail.reminders.map((r) => r.id));

    for (const r of reminders) {
      if (!r.id || r.deleted_at) continue;
      const payload = {
        id: r.id,
        fire_at: r.fire_at,
        timezone: r.timezone ?? "UTC",
        repeat_rule: r.repeat_rule,
        intensity: r.intensity ?? "gentle",
      };
      if (have.has(r.id)) {
        const { id: _id, ...patch } = payload;
        await apiFetch(`/reminders/${r.id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
      } else {
        await apiFetch(`/notes/${noteId}/reminders`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        have.add(r.id);
      }
      reminderCount++;
    }
  }

  return { notes: noteCount, reminders: reminderCount };
}
