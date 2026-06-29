import { NextRequest } from "next/server";
import { z } from "zod";
import { revokeRefreshToken } from "@/lib/auth";
import {
  errorResponse,
  clearRefreshCookie,
  getRefreshFromRequest,
  isSameOriginRequest,
} from "@/lib/api-utils";

const schema = z.object({
  refresh_token: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let body: z.infer<typeof schema> = {};
  try {
    const json = await request.json().catch(() => ({}));
    body = schema.parse(json);
  } catch {
    return errorResponse("Invalid request", 400);
  }

  const fromCookie = !body.refresh_token;
  const token = body.refresh_token ?? getRefreshFromRequest(request);

  // Cookie-based logout is vulnerable to CSRF; require same-origin.
  if (fromCookie && !isSameOriginRequest(request)) {
    return errorResponse("Unauthorized", 401);
  }

  if (token) {
    await revokeRefreshToken(token);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearRefreshCookie(),
    },
  });
}
