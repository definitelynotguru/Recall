import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  hashPassword,
  validatePassword,
  signAccessToken,
  createRefreshToken,
} from "@/lib/auth";
import { errorResponse, setRefreshCookie } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  register_secret: z.string(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`register:${ip}`)) {
    return errorResponse("Too many requests", 429);
  }

  const secret = process.env.REGISTER_SECRET;
  if (!secret) {
    return errorResponse("Registration disabled", 403);
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return errorResponse("Invalid request", 400);
  }

  if (body.register_secret !== secret) {
    return errorResponse("Invalid registration secret", 403);
  }

  const pwdError = validatePassword(body.password);
  if (pwdError) return errorResponse(pwdError, 400);

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email.toLowerCase()))
    .limit(1);

  if (existing) {
    return errorResponse("Email already registered", 409);
  }

  const passwordHash = await hashPassword(body.password);
  const [user] = await db
    .insert(users)
    .values({ email: body.email.toLowerCase(), passwordHash })
    .returning();

  const accessToken = await signAccessToken(user.id, user.email);
  const refresh = await createRefreshToken(user.id);

  return new Response(
    JSON.stringify({
      access_token: accessToken,
      refresh_token: refresh.token,
      user: { id: user.id, email: user.email },
    }),
    {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": setRefreshCookie(refresh.token),
      },
    },
  );
}
