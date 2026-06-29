import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { debugReports } from "@/lib/db/schema";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const reportSchema = z.object({
  device_id: z.string().max(128).optional(),
  app_version: z.string().max(64).optional(),
  api_base_url: z.string().max(512).optional(),
  payload: z.record(z.string(), z.unknown()),
});

const MAX_PAYLOAD_BYTES = 256_000;

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const rateKey = `debug:${user!.userId}:${getClientIp(request)}`;
  if (!(await rateLimit(rateKey))) {
    return errorResponse("Too many debug reports — try again in a minute", 429);
  }

  const rawText = await request.text();
  if (rawText.length > MAX_PAYLOAD_BYTES) {
    return errorResponse("Debug report too large", 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  let body: z.infer<typeof reportSchema>;
  try {
    body = reportSchema.parse(parsed);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonResponse(
        {
          error: "Invalid debug report",
          issues: err.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      );
    }
    return errorResponse("Invalid request", 400);
  }

  const [row] = await db
    .insert(debugReports)
    .values({
      userId: user!.userId,
      deviceId: body.device_id ?? "",
      appVersion: body.app_version ?? "",
      apiBaseUrl: body.api_base_url ?? "",
      payload: body.payload,
    })
    .returning();

  return jsonResponse(
    {
      id: row.id,
      created_at: row.createdAt.toISOString(),
    },
    201,
  );
}
