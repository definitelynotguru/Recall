import { describe, expect, it } from "vitest";
import { computeNextRepeat, formatRepeatLabel } from "./repeat-rules";

const vectors = [
  {
    rule: "daily",
    fire_at: "2026-06-05T09:00:00Z",
    next_fire_at: "2026-06-06T09:00:00.000Z",
  },
  {
    rule: "freq=daily;interval=2",
    fire_at: "2026-06-05T09:00:00Z",
    next_fire_at: "2026-06-07T09:00:00.000Z",
  },
  {
    rule: "freq=weekly;days=MO,WE",
    fire_at: "2026-06-05T09:00:00Z",
    next_fire_at: "2026-06-08T09:00:00.000Z",
  },
  {
    rule: "freq=monthly;day=31",
    fire_at: "2026-04-30T09:00:00Z",
    next_fire_at: "2026-05-31T09:00:00.000Z",
  },
  {
    rule: "freq=yearly;month=2;day=29",
    fire_at: "2025-02-28T09:00:00Z",
    next_fire_at: "2026-02-28T09:00:00.000Z",
  },
];

describe("repeat rules", () => {
  it("advances shared repeat vectors", () => {
    for (const vector of vectors) {
      expect(computeNextRepeat(vector.rule, new Date(vector.fire_at))?.toISOString()).toBe(
        vector.next_fire_at,
      );
    }
  });

  it("formats legacy and structured labels", () => {
    expect(formatRepeatLabel(null)).toBe("Once");
    expect(formatRepeatLabel("")).toBe("Once");
    expect(formatRepeatLabel("daily")).toBe("Daily");
    expect(formatRepeatLabel("freq=daily;interval=2")).toBe("Every 2 days");
    expect(formatRepeatLabel("freq=weekly;days=MO,WE")).toBe("Every week on Mon, Wed");
  });
});
