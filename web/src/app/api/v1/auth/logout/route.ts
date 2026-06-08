import { NextRequest } from "next/server";
import { z } from "zod";
import { revokeRefreshToken } from "@/lib/auth";
import {
  errorResponse,
  clearRefreshCookie,
  getRefreshFromRequest,
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

  const token = body.refresh_token ?? getRefreshFromRequest(request);
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
