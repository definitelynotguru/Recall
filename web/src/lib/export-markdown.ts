import { zipSync, strToU8 } from "fflate";
import type { BackupBundle } from "./backup-import";

export type MarkdownArchiveNote = {
  id: string;
  title: string;
  file: string;
  status: string;
  pinned_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  tags: string[];
};

export type MarkdownArchiveReminder = {
  id: string;
  note_id: string;
  note_file: string;
  fire_at: string;
  timezone: string;
  repeat_rule: string | null;
  intensity: string;
  reminder_mode: string;
  nag_interval_minutes: number | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MarkdownArchiveMeta = {
  app: string;
  exported_at: string;
  notes: MarkdownArchiveNote[];
  reminders: MarkdownArchiveReminder[];
  tags: Array<{ id: string; name: string }>;
  note_tags: Array<{ id: string; note_id: string; tag_id: string }>;
};

export type MarkdownArchive = {
  filename: string;
  bytes: Uint8Array;
  meta: MarkdownArchiveMeta;
};

const ILLEGAL_CHARS = /[\\/:*?"<>|\u0000-\u001f]/g;
const MAX_FILENAME = 100;

export function sanitizeFilename(title: string, id: string): string {
  const base = (title ?? "").trim();
  const candidate = base.length > 0 ? base : id;
  const cleaned = candidate
    .replace(ILLEGAL_CHARS, "_")
    .replace(/\s+/g, " ")
    .replace(/_+/g, "_")
    .replace(/[. ]+$/g, "")
    .trim();
  if (cleaned.length === 0) return id;
  if (cleaned.length <= MAX_FILENAME) return cleaned;
  const slice = cleaned.slice(0, MAX_FILENAME);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim() || id;
}

export function uniqueFilename(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  const name = `${base}-${n}`;
  used.add(name);
  return name;
}

function tagNameById(bundle: BackupBundle): Map<string, string> {
  const map = new Map<string, string>();
  for (const tag of bundle.tags ?? []) {
    if (tag.id && !tag.deleted_at) map.set(tag.id, tag.name);
  }
  return map;
}

function tagNamesByNote(
  bundle: BackupBundle,
  nameById: Map<string, string>,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const link of bundle.note_tags ?? []) {
    if (link.deleted_at) continue;
    const name = nameById.get(link.tag_id);
    if (!name) continue;
    const list = map.get(link.note_id) ?? [];
    list.push(name);
    map.set(link.note_id, list);
  }
  return map;
}

export function buildMarkdownArchive(bundle: BackupBundle): MarkdownArchive {
  const nameById = tagNameById(bundle);
  const tagsByNote = tagNamesByNote(bundle, nameById);
  const used = new Set<string>();
  const files: Record<string, Uint8Array> = {};
  const notesMeta: MarkdownArchiveNote[] = [];
  const fileByNoteId = new Map<string, string>();

  for (const note of bundle.notes) {
    if (!note.id || note.deleted_at) continue;
    const base = sanitizeFilename(note.title ?? "", note.id);
    const stem = uniqueFilename(base, used);
    const file = `notes/${stem}.md`;
    fileByNoteId.set(note.id, file);
    files[file] = strToU8(note.body ?? "");
    notesMeta.push({
      id: note.id,
      title: note.title ?? "",
      file,
      status: note.status ?? "active",
      pinned_at: note.pinned_at ?? null,
      created_at: note.created_at,
      updated_at: note.updated_at,
      deleted_at: note.deleted_at ?? null,
      tags: tagsByNote.get(note.id) ?? [],
    });
  }

  const remindersMeta: MarkdownArchiveReminder[] = [];
  for (const [noteId, list] of Object.entries(bundle.reminders_by_note)) {
    const noteFile = fileByNoteId.get(noteId) ?? "";
    for (const r of list) {
      if (!r.id || r.deleted_at) continue;
      remindersMeta.push({
        id: r.id,
        note_id: noteId,
        note_file: noteFile,
        fire_at: r.fire_at,
        timezone: r.timezone,
        repeat_rule: r.repeat_rule ?? null,
        intensity: r.intensity,
        reminder_mode: r.reminder_mode ?? "once",
        nag_interval_minutes: r.nag_interval_minutes ?? null,
        status: r.status,
        completed_at: r.completed_at ?? null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        deleted_at: r.deleted_at ?? null,
      });
    }
  }

  const meta: MarkdownArchiveMeta = {
    app: "recall",
    exported_at: bundle.exported_at ?? new Date().toISOString(),
    notes: notesMeta,
    reminders: remindersMeta,
    tags: (bundle.tags ?? [])
      .filter((t) => t.id && !t.deleted_at)
      .map((t) => ({ id: t.id, name: t.name })),
    note_tags: (bundle.note_tags ?? [])
      .filter((l) => l.id && !l.deleted_at)
      .map((l) => ({ id: l.id, note_id: l.note_id, tag_id: l.tag_id })),
  };

  files["metadata.json"] = strToU8(JSON.stringify(meta, null, 2));
  const bytes = zipSync(files);
  const stamp = new Date(meta.exported_at)
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-");
  return { filename: `recall-export-${stamp}.zip`, bytes, meta };
}
