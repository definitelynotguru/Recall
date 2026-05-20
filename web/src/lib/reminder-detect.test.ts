import { describe, expect, it } from "vitest";
import fixtures from "../../../shared/fixtures.json";
import { detectRemindersInNote } from "./reminder-detect";

describe("detectRemindersInNote", () => {
  it.each(fixtures as { title: string; body: string; expectCount: number; expectRepeat: string | null }[])(
    "fixture: $title",
    ({ title, body, expectCount, expectRepeat }) => {
      const found = detectRemindersInNote(title, body, {
        defaultHour: 9,
        defaultMinute: 0,
      });
      expect(found.length).toBe(expectCount);
      if (expectCount > 0 && expectRepeat !== undefined) {
        expect(found[0].repeatRule).toBe(expectRepeat);
      }
    },
  );

  it("caps at five suggestions", () => {
    const body = [
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
    ].join("\n");
    expect(detectRemindersInNote("Many", body).length).toBeLessThanOrEqual(5);
  });
});
