import { describe, it, expect } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import {
  sanitizeFilename,
  uniqueFilename,
  buildMarkdownArchive,
} from "./export-markdown";
import type { BackupBundle } from "./backup-import";

describe("sanitizeFilename", () => {
  it("falls back to id when title is blank", () => {
    expect(sanitizeFilename("", "abc-123")).toBe("abc-123");
    expect(sanitizeFilename("   ", "abc-123")).toBe("abc-123");
  });

  it("replaces illegal filesystem characters", () => {
    expect(sanitizeFilename('a/b:c?d*e<f>g|h', "id")).toBe("a_b_c_d_e_f_g_h");
  });

  it("trims trailing dots and spaces", () => {
    expect(sanitizeFilename("note.  ", "id")).toBe("note");
  });

  it("truncates long titles at a word boundary", () => {
    const long = "word ".repeat(40).trim();
    const out = sanitizeFilename(long, "id");
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.endsWith(" ")).toBe(false);
  });
});

describe("uniqueFilename", () => {
  it("returns the base when unused", () => {
    const used = new Set<string>();
    expect(uniqueFilename("daily", used)).toBe("daily");
    expect(used.has("daily")).toBe(true);
  });

  it("appends a counter on collision", () => {
    const used = new Set<string>(["daily"]);
    expect(uniqueFilename("daily", used)).toBe("daily-2");
    expect(uniqueFilename("daily", used)).toBe("daily-3");
  });
});

describe("buildMarkdownArchive", () => {
  const bundle: BackupBundle = {
    exported_at: "2026-07-07T12:00:00.000Z",
    notes: [
      { id: "n1", title: "First Note", body: "# Hello\n\nWorld", status: "active", pinned_at: "2026-07-01T00:00:00.000Z", created_at: "2026-07-01T00:00:00.000Z", updated_at: "2026-07-02T00:00:00.000Z", deleted_at: null } as never,
      { id: "n2", title: "First Note", body: "second body", status: "active", pinned_at: null, created_at: "2026-07-03T00:00:00.000Z", updated_at: "2026-07-03T00:00:00.000Z", deleted_at: null } as never,
      { id: "n3", title: "Gone", body: "deleted", status: "active", pinned_at: null, created_at: "2026-07-03T00:00:00.000Z", updated_at: "2026-07-03T00:00:00.000Z", deleted_at: "2026-07-04T00:00:00.000Z" } as never,
    ],
    reminders_by_note: {
      n1: [{ id: "r1", note_id: "n1", fire_at: "2026-07-10T09:00:00.000Z", timezone: "UTC", repeat_rule: null, intensity: "gentle", reminder_mode: "once", nag_interval_minutes: null, status: "active", completed_at: null, created_at: "2026-07-01T00:00:00.000Z", updated_at: "2026-07-01T00:00:00.000Z", deleted_at: null } as never],
    },
    tags: [
      { id: "t1", name: "journal", created_at: "2026-07-01T00:00:00.000Z", updated_at: "2026-07-01T00:00:00.000Z", deleted_at: null } as never,
    ],
    note_tags: [
      { id: "lt1", note_id: "n1", tag_id: "t1", created_at: "2026-07-01T00:00:00.000Z", updated_at: "2026-07-01T00:00:00.000Z", deleted_at: null } as never,
    ],
  };

  it("packs one markdown file per non-deleted note with deduped names", () => {
    const { bytes, meta } = buildMarkdownArchive(bundle);
    const files = unzipSync(bytes);
    const names = Object.keys(files).sort();
    expect(names).toEqual(["metadata.json", "notes/First Note-2.md", "notes/First Note.md"]);
    expect(strFromU8(files["notes/First Note.md"])).toBe("# Hello\n\nWorld");
    expect(strFromU8(files["notes/First Note-2.md"])).toBe("second body");
    expect(meta.notes).toHaveLength(2);
    expect(meta.notes[0].file).toBe("notes/First Note.md");
    expect(meta.notes[0].tags).toEqual(["journal"]);
    expect(meta.notes[0].pinned_at).toBe("2026-07-01T00:00:00.000Z");
  });

  it("metadata includes reminders, tags, and note_tags", () => {
    const { meta } = buildMarkdownArchive(bundle);
    expect(meta.reminders).toHaveLength(1);
    expect(meta.reminders[0].note_file).toBe("notes/First Note.md");
    expect(meta.reminders[0].fire_at).toBe("2026-07-10T09:00:00.000Z");
    expect(meta.tags).toEqual([{ id: "t1", name: "journal" }]);
    expect(meta.note_tags).toEqual([{ id: "lt1", note_id: "n1", tag_id: "t1" }]);
    expect(meta.app).toBe("recall");
  });

  it("filename is timestamped zip", () => {
    const { filename } = buildMarkdownArchive(bundle);
    expect(filename).toBe("recall-export-2026-07-07-12-00-00.zip");
    expect(filename.endsWith(".zip")).toBe(true);
  });
});
