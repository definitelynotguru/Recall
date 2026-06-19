import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("blocks after max requests in window", () => {
    const key = `test-${Date.now()}`;
    for (let i = 0; i < 10; i++) {
      expect(rateLimit(key, { max: 10, windowMs: 60_000 })).toBe(true);
    }
    expect(rateLimit(key, { max: 10, windowMs: 60_000 })).toBe(false);
  });
});
