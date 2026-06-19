import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { notes, noteTags, reminders, tags } from "./db/schema";
import type { BackupBundle } from "./backup-import";
import { MAX_TAGS_PER_NOTE, validateBackupBundle } from "./backup-import-validation";

export type BackupImportResult = {
  notes: number;
  reminders: number;
  tags: number;
  note_tags: number;
  warnings: string[];
};

export { validateBackupBundle };

function parseDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export async function importBackupTransaction(
  userId: string,
  bundle: BackupBundle,
): Promise<BackupImportResult> {
  const warnings = validateBackupBundle(bundle);
  const now = new Date();
  let noteCount = 0;
  let reminderCount = 0;
  let tagCount = 0;
  let noteTagCount = 0;

  await getDb().transaction(async (tx) => {
    const existingNotes = await tx
      .select({ id: notes.id })
      .from(notes)
      .where(eq(notes.userId, userId));
    const existingNoteIds = new Set(existingNotes.map((n) => n.id));

    const existingTagRows = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.userId, userId));
    const existingTagIds = new Set(existingTagRows.map((t) => t.id));

    for (const tag of bundle.tags ?? []) {
      if (!tag.id || tag.deleted_at) continue;
      const createdAt = parseDate(tag.created_at, now);
      const updatedAt = parseDate(tag.updated_at, now);
      if (existingTagIds.has(tag.id)) {
        await tx
          .update(tags)
          .set({ name: tag.name, updatedAt, deletedAt: null })
          .where(eq(tags.id, tag.id));
      } else {
        await tx.insert(tags).values({
          id: tag.id,
          userId,
          name: tag.name,
          createdAt,
          updatedAt,
        });
        existingTagIds.add(tag.id);
      }
      tagCount++;
    }

    for (const note of bundle.notes) {
      if (!note.id) continue;
      const createdAt = parseDate(note.created_at, now);
      const updatedAt = parseDate(note.updated_at, now);
      const pinnedAt = note.pinned_at ? parseDate(note.pinned_at, now) : null;
      const deletedAt = note.deleted_at ? parseDate(note.deleted_at, now) : null;

      if (existingNoteIds.has(note.id)) {
        await tx
          .update(notes)
          .set({
            title: note.title ?? "",
            body: note.body ?? "",
            status: note.status ?? "active",
            pinnedAt,
            updatedAt,
            deletedAt,
          })
          .where(eq(notes.id, note.id));
      } else {
        await tx.insert(notes).values({
          id: note.id,
          userId,
          title: note.title ?? "",
          body: note.body ?? "",
          status: note.status ?? "active",
          pinnedAt,
          createdAt,
          updatedAt,
          deletedAt,
        });
        existingNoteIds.add(note.id);
      }
      if (!note.deleted_at) noteCount++;
    }

    const existingReminders = await tx
      .select({ id: reminders.id, noteId: reminders.noteId })
      .from(reminders)
      .where(eq(reminders.userId, userId));
    const remindersByNote = new Map<string, Set<string>>();
    for (const row of existingReminders) {
      if (!remindersByNote.has(row.noteId)) remindersByNote.set(row.noteId, new Set());
      remindersByNote.get(row.noteId)!.add(row.id);
    }

    for (const [noteId, list] of Object.entries(bundle.reminders_by_note)) {
      if (!existingNoteIds.has(noteId)) continue;
      const have = remindersByNote.get(noteId) ?? new Set<string>();

      for (const r of list) {
        if (!r.id || r.deleted_at) continue;
        const createdAt = parseDate(r.created_at, now);
        const updatedAt = parseDate(r.updated_at, now);
        const fireAt = parseDate(r.fire_at, now);
        const completedAt = r.completed_at ? parseDate(r.completed_at, now) : null;
        const deletedAt = r.deleted_at ? parseDate(r.deleted_at, now) : null;
        const payload = {
          noteId,
          fireAt,
          timezone: r.timezone ?? "UTC",
          repeatRule: r.repeat_rule,
          intensity: r.intensity ?? "gentle",
          status: r.status ?? "active",
          completedAt,
          updatedAt,
          deletedAt,
        };

        if (have.has(r.id)) {
          await tx.update(reminders).set(payload).where(eq(reminders.id, r.id));
        } else {
          await tx.insert(reminders).values({
            id: r.id,
            userId,
            createdAt,
            ...payload,
          });
          have.add(r.id);
        }
        reminderCount++;
      }
      remindersByNote.set(noteId, have);
    }

    const tagsByNote = new Map<string, string[]>();
    for (const link of bundle.note_tags ?? []) {
      if (link.deleted_at) continue;
      const list = tagsByNote.get(link.note_id) ?? [];
      list.push(link.tag_id);
      tagsByNote.set(link.note_id, list);
    }

    for (const [noteId, tagIds] of tagsByNote) {
      if (!existingNoteIds.has(noteId)) continue;
      const unique = [...new Set(tagIds)]
        .filter((id) => existingTagIds.has(id))
        .slice(0, MAX_TAGS_PER_NOTE);

      await tx.delete(noteTags).where(eq(noteTags.noteId, noteId));

      for (const tagId of unique) {
        const link = bundle.note_tags?.find((l) => l.note_id === noteId && l.tag_id === tagId);
        const linkId = link?.id ?? crypto.randomUUID();
        const createdAt = parseDate(link?.created_at, now);
        const updatedAt = parseDate(link?.updated_at, now);
        await tx.insert(noteTags).values({
          id: linkId,
          userId,
          noteId,
          tagId,
          createdAt,
          updatedAt,
        });
        noteTagCount++;
      }
    }
  });

  return {
    notes: noteCount,
    reminders: reminderCount,
    tags: tagCount,
    note_tags: noteTagCount,
    warnings,
  };
}
