import { describe, expect, it } from "vitest";
import { parseBackupJson, parseBackupPreview } from "./backup-import";

describe("parseBackupPreview", () => {
  it("counts notes reminders and tags", () => {
    const bundle = parseBackupJson(
      JSON.stringify({
        exported_at: "2026-06-01T00:00:00Z",
        notes: [{ id: "1", title: "A", body: "", status: "active", created_at: "", updated_at: "" }],
        reminders_by_note: { "1": [{ id: "r1", note_id: "1", fire_at: "2026-06-01T09:00:00.000Z", timezone: "UTC", intensity: "gentle", status: "active", created_at: "", updated_at: "" }, { id: "r2", note_id: "1", fire_at: "2026-06-02T09:00:00.000Z", timezone: "UTC", intensity: "gentle", status: "active", created_at: "", updated_at: "" }] },
        tags: [{ id: "t1", name: "work", created_at: "", updated_at: "" }],
        note_tags: [],
      }),
    );
    const preview = parseBackupPreview(bundle);
    expect(preview.notes).toBe(1);
    expect(preview.reminders).toBe(2);
    expect(preview.tags).toBe(1);
  });

  it("rejects invalid json", () => {
    expect(() => parseBackupJson("not json")).toThrow();
  });
});
