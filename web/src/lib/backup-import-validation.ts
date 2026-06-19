import type { BackupBundle } from "./backup-import";

export const MAX_TAGS_PER_NOTE = 12;

export function validateBackupBundle(bundle: BackupBundle): string[] {
  const warnings: string[] = [];
  const noteIds = new Set<string>();

  for (const note of bundle.notes) {
    if (!note.id || note.deleted_at) continue;
    noteIds.add(note.id);
  }

  const tagsByNote = new Map<string, string[]>();
  for (const link of bundle.note_tags ?? []) {
    if (link.deleted_at) continue;
    const list = tagsByNote.get(link.note_id) ?? [];
    list.push(link.tag_id);
    tagsByNote.set(link.note_id, list);
  }

  for (const [noteId, tagIds] of tagsByNote) {
    if (tagIds.length > MAX_TAGS_PER_NOTE) {
      warnings.push(
        `Note ${noteId.slice(0, 8)}… has ${tagIds.length} tags; only ${MAX_TAGS_PER_NOTE} will be imported.`,
      );
    }
    if (!noteIds.has(noteId)) {
      warnings.push(
        `Tag links reference missing note ${noteId.slice(0, 8)}… — those links will be skipped.`,
      );
    }
  }

  for (const [noteId, list] of Object.entries(bundle.reminders_by_note)) {
    if (!noteIds.has(noteId)) {
      const active = list.filter((r) => r.id && !r.deleted_at).length;
      if (active > 0) {
        warnings.push(
          `Reminders reference missing note ${noteId.slice(0, 8)}… — ${active} will be skipped.`,
        );
      }
    }
  }

  return warnings;
}
