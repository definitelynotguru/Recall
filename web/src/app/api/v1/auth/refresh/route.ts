import { NextRequest } from "next/server";
import { z } from "zod";
import { rotateRefreshToken } from "@/lib/auth";
import {
  errorResponse,
  setRefreshCookie,
  getRefreshFromRequest,
} from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  refresh_token: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`refresh:${ip}`)) {
    return errorResponse("Too many requests", 429);
  }

  let body: z.infer<typeof schema> = {};
  try {
    const json = await request.json().catch(() => ({}));
    body = schema.parse(json);
  } catch {
    return errorResponse("Invalid request", 400);
  }

  const token = body.refresh_token ?? getRefreshFromRequest(request);
  if (!token) {
    return errorResponse("Refresh token required", 401);
  }

  const result = await rotateRefreshToken(token);
  if (!result) {
    return errorResponse("Invalid or expired refresh token", 401);
  }

  return new Response(
    JSON.stringify({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      user: { id: result.userId, email: result.email },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": setRefreshCookie(result.refreshToken),
      },
    },
  );
}
