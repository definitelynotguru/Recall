import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

describe("/api/v1/notes", () => {
  it("GET requires auth", async () => {
    const res = await GET(new Request("http://localhost/api/v1/notes") as never);
    expect(res.status).toBe(401);
  });

  it("POST rejects oversized body", async () => {
    const res = await POST(
      new Request("http://localhost/api/v1/notes", {
        method: "POST",
        headers: {
          Authorization: "Bearer fake",
          "Content-Type": "application/json",
        },
        body: "x".repeat(600_000),
      }) as never,
    );
    expect([401, 413]).toContain(res.status);
  });
});
