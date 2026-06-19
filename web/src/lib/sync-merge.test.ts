import { describe, expect, it } from "vitest";
import {
  resolveNoteMerge,
  resolveReminderMerge,
  type SyncNoteInput,
} from "./sync-merge";

function androidOfflineNotePayload(
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
    pinned_at: null,
    created_at: updatedAtIso,
    updated_at: updatedAtIso,
    deleted_at: null,
  };
}

describe("resolveNoteMerge", () => {
  it("inserts when note is new on server", () => {
    expect(resolveNoteMerge(undefined, new Date("2026-05-20T12:00:00Z"))).toBe(
      "insert",
    );
  });

  it("updates when Android client is newer (offline write)", () => {
    const server = new Date("2026-05-20T10:00:00Z");
    const client = new Date("2026-05-20T12:00:00Z");
    expect(resolveNoteMerge(server, client)).toBe("update");
  });

  it("skips when server copy is newer", () => {
    const server = new Date("2026-05-20T14:00:00Z");
    const client = new Date("2026-05-20T12:00:00Z");
    expect(resolveNoteMerge(server, client)).toBe("skip");
  });
});

describe("resolveReminderMerge", () => {
  it("matches note LWW rules", () => {
    expect(
      resolveReminderMerge(
        new Date("2026-01-01T00:00:00Z"),
        new Date("2026-06-01T00:00:00Z"),
      ),
    ).toBe("update");
  });
});

describe("androidOfflineNotePayload", () => {
  it("builds active dirty note shape from Android", () => {
    const iso = "2026-05-20T15:30:00.000Z";
    const payload = androidOfflineNotePayload(
      "550e8400-e29b-41d4-a716-446655440000",
      "Offline test",
      "Written without internet",
      iso,
    );
    expect(payload.title).toBe("Offline test");
    expect(payload.updated_at).toBe(iso);
    expect(payload.deleted_at).toBeNull();
    expect(resolveNoteMerge(undefined, new Date(payload.updated_at))).toBe(
      "insert",
    );
  });
});
