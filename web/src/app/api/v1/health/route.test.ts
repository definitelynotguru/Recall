import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/v1/health", () => {
  it("returns 503 when database is unavailable", async () => {
    const prev = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const res = await GET(new Request("http://localhost/api/v1/health") as never);
    process.env.DATABASE_URL = prev;
    expect(res.status).toBe(503);
  });
});
