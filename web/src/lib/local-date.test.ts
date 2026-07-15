import { describe, expect, it } from "vitest";
import { toLocalDateString } from "./local-date";

describe("toLocalDateString", () => {
  it("uses local calendar fields instead of the UTC date", () => {
    const date = new Date(2026, 6, 15, 23, 30);
    expect(toLocalDateString(date)).toBe("2026-07-15");
  });
});
