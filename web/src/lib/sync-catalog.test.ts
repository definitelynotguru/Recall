import { describe, expect, it } from "vitest";
import { computePaginationCursor, resolveSyncMode } from "./sync-catalog";

describe("resolveSyncMode", () => {
  it("uses full sync for epoch sentinel", () => {
    expect(resolveSyncMode("1970-01-01T00:00:00Z").mode).toBe("full");
  });

  it("uses delta sync for recent last_sync_at", () => {
    expect(resolveSyncMode("2026-06-01T12:00:00.000Z").mode).toBe("delta");
  });

  it("falls back to full sync for invalid timestamps", () => {
    expect(resolveSyncMode("not-a-date").mode).toBe("full");
  });
});

function row(id: string, iso: string) {
  return { id, updatedAt: new Date(iso) };
}

describe("computePaginationCursor", () => {
  it("returns null cursor and no has_more when no limit is given", () => {
    const result = computePaginationCursor(
      [[row("a", "2026-06-01T00:00:00.000Z")], [row("b", "2026-06-02T00:00:00.000Z")]],
      undefined,
    );
    expect(result.next_cursor).toBeNull();
    expect(result.has_more).toBe(false);
  });

  it("sets next_cursor and has_more when a group fills the limit", () => {
    const limit = 2;
    const notes = [
      row("a", "2026-06-01T00:00:00.000Z"),
      row("b", "2026-06-02T00:00:00.000Z"),
    ];
    const tags = [row("c", "2026-06-03T00:00:00.000Z")];
    const result = computePaginationCursor([notes, tags], limit);
    expect(result.has_more).toBe(true);
    expect(result.next_cursor).toBe("2026-06-03T00:00:00.000Z|c");
  });

  it("returns null cursor when no group fills the limit", () => {
    const limit = 5;
    const notes = [
      row("a", "2026-06-01T00:00:00.000Z"),
      row("b", "2026-06-02T00:00:00.000Z"),
    ];
    const result = computePaginationCursor([notes], limit);
    expect(result.has_more).toBe(false);
    expect(result.next_cursor).toBeNull();
  });

  it("picks the max key across all groups", () => {
    const limit = 1;
    const notes = [row("zzz", "2026-06-01T00:00:00.000Z")];
    const reminders = [row("aaa", "2026-06-05T00:00:00.000Z")];
    const result = computePaginationCursor([notes, reminders], limit);
    expect(result.has_more).toBe(true);
    expect(result.next_cursor).toBe("2026-06-05T00:00:00.000Z|aaa");
  });
});
