import { describe, expect, it } from "vitest";
import vectors from "../../shared/repeat-vectors.json";
import { computeNextRepeat, formatRepeatLabel } from "./repeat-rules";

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
