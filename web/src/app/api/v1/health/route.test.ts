import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/v1/health", () => {
  it("returns 503 when database is unavailable", async () => {
    const prev = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const res = await GET();
    process.env.DATABASE_URL = prev;
    expect(res.status).toBe(503);
  });

  it("reports auth as configured when secrets are set (even if DB is down)", async () => {
    const prevDb = process.env.DATABASE_URL;
    const prevJwt = process.env.JWT_SECRET;
    const prevPepper = process.env.REFRESH_PEPPER;
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = "a".repeat(40);
    process.env.REFRESH_PEPPER = "b".repeat(40);
    const res = await GET();
    const body = await res.json();
    process.env.DATABASE_URL = prevDb;
    process.env.JWT_SECRET = prevJwt;
    process.env.REFRESH_PEPPER = prevPepper;
    expect(res.status).toBe(503);
    expect(body.auth).toBe("configured");
    expect(body.db).toBe("unavailable");
  });
});
