import { describe, expect, it, vi, afterEach } from "vitest";
import { logger, scrubObject } from "./logger";

describe("scrubObject", () => {
  it("redacts sensitive keys", () => {
    const scrubbed = scrubObject({
      email: "user@example.com",
      password: "super-secret",
      access_token: "abc123",
      nested: { refreshToken: "xyz", noteId: "n1" },
    });
    expect(scrubbed.email).toBe("user@example.com");
    expect(scrubbed.password).toBe("[REDACTED]");
    expect(scrubbed.access_token).toBe("[REDACTED]");
    expect((scrubbed.nested as Record<string, unknown>).refreshToken).toBe(
      "[REDACTED]",
    );
    expect((scrubbed.nested as Record<string, unknown>).noteId).toBe("n1");
  });

  it("redacts bearer headers", () => {
    const scrubbed = scrubObject({
      authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.abc.def",
    });
    expect(scrubbed.authorization).toBe("[REDACTED]");
  });
});

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits JSON and scrubs fields", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("sync complete", {
      userId: "u1",
      token: "should-hide",
      count: 3,
    });
    const raw = String((logSpy.mock.calls[0] ?? spy.mock.calls[0])?.[0] ?? "");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("sync complete");
    expect(parsed.userId).toBe("u1");
    expect(parsed.count).toBe(3);
    expect(parsed.token).toBe("[REDACTED]");
  });
});
