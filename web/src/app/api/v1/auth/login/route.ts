import { NextRequest } from "next/server";
import { z } from "zod";
import { db, getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  verifyPassword,
  signAccessToken,
  createRefreshToken,
} from "@/lib/auth";
import {
  errorResponse,
  setRefreshCookie,
} from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { eq, sql } from "drizzle-orm";

const schema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!(await rateLimit(`login:${ip}`))) {
    return errorResponse("Too many requests", 429);
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return errorResponse("Invalid request", 400);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email.toLowerCase()))
    .limit(1);

  // Return the same 401 for unknown emails to avoid user enumeration.
  if (!user) {
    return errorResponse("Invalid credentials", 401);
  }

  const now = Date.now();
  if (user.lockedUntil && user.lockedUntil.getTime() > now) {
    const retryAfter = Math.ceil((user.lockedUntil.getTime() - now) / 1000);
    return new Response(
      JSON.stringify({ error: "Too many failed login attempts. Try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  const passwordOk = await verifyPassword(body.password, user.passwordHash);

  if (!passwordOk) {
    const lockUntil = new Date(now + LOCK_DURATION_MS);
    await getDb().transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`,
          lockedUntil: sql`CASE WHEN ${users.failedLoginAttempts} + 1 >= ${MAX_FAILED_ATTEMPTS} THEN ${lockUntil}::timestamptz ELSE ${users.lockedUntil} END`,
        })
        .where(eq(users.id, user.id));
    });
    return errorResponse("Invalid credentials", 401);
  }

  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, user.id));

  const accessToken = await signAccessToken(user.id, user.email);
  const refresh = await createRefreshToken(user.id);

  return new Response(
    JSON.stringify({
      access_token: accessToken,
      refresh_token: refresh.token,
      user: { id: user.id, email: user.email },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": setRefreshCookie(refresh.token),
      },
    },
  );
}
