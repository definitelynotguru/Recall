import { apiFetch, ApiNote, ApiNoteTag, ApiReminder, ApiTag } from "./api-client";

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
  const existing = await apiFetch<{ notes: ApiNote[] }>("/notes?status=all&limit=all");
  const existingReminders = await apiFetch<{ reminders: ApiReminder[] }>(
    "/reminders?status=all&limit=all",
  );
  const existingIds = new Set(existing.notes.map((n) => n.id));
  const remindersByNote = new Map<string, Set<string>>();
  for (const r of existingReminders.reminders) {
    if (!remindersByNote.has(r.note_id)) remindersByNote.set(r.note_id, new Set());
    remindersByNote.get(r.note_id)!.add(r.id);
  }
  let noteCount = 0;
  let reminderCount = 0;

  for (const tag of bundle.tags ?? []) {
    if (!tag.id || tag.deleted_at) continue;
    await apiFetch("/tags", {
      method: "POST",
      body: JSON.stringify({ id: tag.id, name: tag.name }),
    }).catch(async () => {
      await apiFetch(`/tags/${tag.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: tag.name }),
      });
    });
  }

  for (const note of bundle.notes) {
    if (!note.id) continue;
    if (existingIds.has(note.id)) {
      await apiFetch(`/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: note.title,
          body: note.body,
          status: note.status,
          pinned_at: note.pinned_at ?? null,
        }),
      });
    } else {
      await apiFetch("/notes", {
        method: "POST",
        body: JSON.stringify({
          id: note.id,
          title: note.title ?? "",
          body: note.body ?? "",
          status: note.status ?? "active",
          pinned_at: note.pinned_at ?? null,
        }),
      });
      existingIds.add(note.id);
    }
    noteCount++;
  }

  for (const [noteId, reminders] of Object.entries(bundle.reminders_by_note)) {
    if (!existingIds.has(noteId)) continue;
    const have = remindersByNote.get(noteId) ?? new Set<string>();

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

  const tagsByNote = new Map<string, string[]>();
  for (const link of bundle.note_tags ?? []) {
    if (link.deleted_at) continue;
    const list = tagsByNote.get(link.note_id) ?? [];
    list.push(link.tag_id);
    tagsByNote.set(link.note_id, list);
  }
  for (const [noteId, tagIds] of tagsByNote) {
    if (!existingIds.has(noteId)) continue;
    await apiFetch(`/notes/${noteId}/tags`, {
      method: "PUT",
      body: JSON.stringify({ tag_ids: tagIds.slice(0, 12) }),
    });
  }

  return { notes: noteCount, reminders: reminderCount };
}
