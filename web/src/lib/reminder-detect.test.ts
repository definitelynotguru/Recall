import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixtures from "../../shared/fixtures.json";
import { detectRemindersInNote } from "./reminder-detect";

/** Fixed "today" so fixture dates (e.g. May 2026) stay in the future. */
const FIXTURE_REFERENCE_DATE = new Date("2026-05-01T12:00:00Z");

describe("detectRemindersInNote", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXTURE_REFERENCE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(
    fixtures as {
      title: string;
      body: string;
      expectCount: number;
      expectRepeat?: string | null;
      expectConfidence?: "high" | "maybe";
    }[],
  )(
    "fixture: $title",
    ({ title, body, expectCount, expectRepeat, expectConfidence }) => {
      const found = detectRemindersInNote(title, body, {
        defaultHour: 9,
        defaultMinute: 0,
        referenceDate: FIXTURE_REFERENCE_DATE,
      });
      expect(found.length).toBe(expectCount);
      if (expectCount > 0 && expectRepeat !== undefined) {
        expect(found[0].repeatRule).toBe(expectRepeat);
      }
      if (expectCount > 0 && expectConfidence) {
        expect(found[0].confidence).toBe(expectConfidence);
      }
    },
  );

  it("parses in three minutes", () => {
    const found = detectRemindersInNote("Task", "in three minutes", {
      referenceDate: FIXTURE_REFERENCE_DATE,
    });
    expect(found.length).toBe(1);
    expect(found[0].confidence).toBe("high");
    const fire = new Date(found[0].fireAt).getTime();
    expect(fire).toBe(FIXTURE_REFERENCE_DATE.getTime() + 3 * 60_000);
  });

  it("parses in about 3 minutes", () => {
    const found = detectRemindersInNote("Task", "in about 3 minutes", {
      referenceDate: FIXTURE_REFERENCE_DATE,
    });
    expect(found.length).toBe(1);
    expect(found[0].confidence).toBe("high");
  });

  it("parses half an hour", () => {
    const found = detectRemindersInNote("", "remind in half an hour", {
      referenceDate: FIXTURE_REFERENCE_DATE,
    });
    expect(found.length).toBe(1);
    const fire = new Date(found[0].fireAt).getTime();
    expect(fire).toBe(FIXTURE_REFERENCE_DATE.getTime() + 30 * 60_000);
  });

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
