import { describe, expect, it } from "vitest";
import { validateBackupBundle } from "./backup-import-validation";
import type { BackupBundle } from "./backup-import";

describe("validateBackupBundle", () => {
  it("warns when note has more than 12 tags", () => {
    const bundle: BackupBundle = {
      notes: [{ id: "n1", title: "A", body: "", status: "active", created_at: "", updated_at: "" }],
      reminders_by_note: {},
      note_tags: Array.from({ length: 13 }, (_, i) => ({
        id: `l${i}`,
        note_id: "n1",
        tag_id: `t${i}`,
        created_at: "",
        updated_at: "",
      })),
    };
    const warnings = validateBackupBundle(bundle);
    expect(warnings.some((w) => w.includes("12"))).toBe(true);
  });
});
