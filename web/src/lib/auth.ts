import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "crypto";
import { db, getDb } from "./db";
import { refreshTokens, users } from "./db/schema";
import { eq, and, isNull } from "drizzle-orm";

const ACCESS_TTL = "15m";
const REFRESH_DAYS = 90;
const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

function getRefreshPepper() {
  const pepper = process.env.REFRESH_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new Error("REFRESH_PEPPER must be at least 32 characters");
  }
  return pepper;
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256")
    .update(token + getRefreshPepper())
    .digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

export async function signAccessToken(userId: string, email: string) {
  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());
  const sub = payload.sub;
  if (!sub || typeof sub !== "string") {
    throw new Error("Invalid token");
  }
  const email = payload.email;
  if (!email || typeof email !== "string") {
    throw new Error("Invalid token");
  }
  return { userId: sub, email };
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function insertRefreshToken(tx: Tx, userId: string) {
  const token = generateRefreshToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_DAYS);

  await tx.insert(refreshTokens).values({
    userId,
    tokenHash: hashRefreshToken(token),
    expiresAt,
  });

  return { token, expiresAt };
}

export async function createRefreshToken(userId: string) {
  const token = generateRefreshToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_DAYS);

  await db.insert(refreshTokens).values({
    userId,
    tokenHash: hashRefreshToken(token),
    expiresAt,
  });

  return { token, expiresAt };
}

export async function rotateRefreshToken(oldToken: string) {
  const hash = hashRefreshToken(oldToken);

  return getDb().transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(refreshTokens)
      .where(
        and(eq(refreshTokens.tokenHash, hash), isNull(refreshTokens.revokedAt)),
      )
      .limit(1);

    if (!row || row.expiresAt < new Date()) {
      return null;
    }

    const [user] = await tx
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1);

    if (!user) {
      return null;
    }

    await tx
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, row.id));

    const accessToken = await signAccessToken(row.userId, user.email);
    const refresh = await insertRefreshToken(tx, row.userId);
    return {
      userId: row.userId,
      email: user.email,
      accessToken,
      refreshToken: refresh.token,
    };
  });
}

export async function revokeRefreshToken(token: string) {
  const hash = hashRefreshToken(token);
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, hash));
}

export { MIN_PASSWORD_LENGTH };
