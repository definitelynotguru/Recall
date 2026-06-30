import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users, refreshTokens } from "./db/schema";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from "./auth";

const hasDb = Boolean(process.env.DATABASE_URL);
process.env.JWT_SECRET ??= "test-jwt-secret-32-characters-long";
process.env.REFRESH_PEPPER ??= "test-refresh-pepper-32-characters";

describe.skipIf(!hasDb)("auth integration", () => {
  // 77777777-... prefix avoids colliding with sync.integration.test user uuids.
  const testUserId = "77777777-7777-4777-8777-777777777777";
  const testEmail = "auth-integration@example.com";
  const testPassword = "correct-password-123";

  beforeAll(async () => {
    const db = getDb();
    const passwordHash = await hashPassword(testPassword);
    await db
      .insert(users)
      .values({
        id: testUserId,
        email: testEmail,
        passwordHash,
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("hashPassword then verifyPassword is true for correct and false for wrong", async () => {
    const hash = await hashPassword("another-password-123");
    expect(await verifyPassword("another-password-123", hash)).toBe(true);
    expect(await verifyPassword("wrong-password-123", hash)).toBe(false);
  });

  it("signAccessToken returns a string and verifyAccessToken returns matching userId/email", async () => {
    const token = await signAccessToken(testUserId, testEmail);
    expect(typeof token).toBe("string");

    const payload = await verifyAccessToken(token);
    expect(payload.userId).toBe(testUserId);
    expect(payload.email).toBe(testEmail);
  });

  it("verifyAccessToken throws on a tampered/garbage token", async () => {
    await expect(verifyAccessToken("garbage.token.value")).rejects.toThrow();

    const token = await signAccessToken(testUserId, testEmail);
    const tampered = token.slice(0, -4) + "AAAA";
    await expect(verifyAccessToken(tampered)).rejects.toThrow();
  });

  it("createRefreshToken returns {token, expiresAt} and rotateRefreshToken rotates once then returns null", async () => {
    const created = await createRefreshToken(testUserId);
    expect(typeof created.token).toBe("string");
    expect(created.expiresAt instanceof Date).toBe(true);

    const rotated = await rotateRefreshToken(created.token);
    expect(rotated).not.toBeNull();
    expect(rotated!.userId).toBe(testUserId);
    expect(rotated!.email).toBe(testEmail);
    expect(typeof rotated!.accessToken).toBe("string");
    expect(typeof rotated!.refreshToken).toBe("string");

    // The OLD token was revoked during rotation and no longer rotates.
    const secondRotate = await rotateRefreshToken(created.token);
    expect(secondRotate).toBeNull();
  });

  it("revokeRefreshToken makes the token non-rotatable", async () => {
    const created = await createRefreshToken(testUserId);
    await revokeRefreshToken(created.token);

    const rotated = await rotateRefreshToken(created.token);
    expect(rotated).toBeNull();
  });
});
