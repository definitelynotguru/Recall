import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
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
import { eq } from "drizzle-orm";

const schema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`login:${ip}`)) {
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

  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return errorResponse("Invalid credentials", 401);
  }

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
