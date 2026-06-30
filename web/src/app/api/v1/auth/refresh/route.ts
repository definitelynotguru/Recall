import { NextRequest } from "next/server";
import { z } from "zod";
import { rotateRefreshToken } from "@/lib/auth";
import {
  errorResponse,
  setRefreshCookie,
  getRefreshFromRequest,
  isSameOriginRequest,
} from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  refresh_token: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!(await rateLimit(`refresh:${ip}`))) {
    return errorResponse("Too many requests", 429);
  }

  let body: z.infer<typeof schema> = {};
  try {
    const json = await request.json().catch(() => ({}));
    body = schema.parse(json);
  } catch {
    return errorResponse("Invalid request", 400);
  }

  const fromCookie = !body.refresh_token;
  const token = body.refresh_token ?? getRefreshFromRequest(request);
  if (!token) {
    return errorResponse("Refresh token required", 401);
  }

  // Cookie-based refresh is vulnerable to CSRF; require same-origin.
  if (fromCookie && !isSameOriginRequest(request)) {
    return errorResponse("Unauthorized", 401);
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
