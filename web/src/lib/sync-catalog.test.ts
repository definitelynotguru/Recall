import { describe, expect, it } from "vitest";
import { resolveSyncMode } from "./sync-catalog";

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
