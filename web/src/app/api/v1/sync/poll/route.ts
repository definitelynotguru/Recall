import { NextRequest } from "next/server";
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  parseIsoDate,
} from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { pollSyncChanges } from "@/lib/sync-poll";

const EPOCH = new Date("1970-01-01T00:00:00.000Z");

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const rateKey = `sync-poll:${user!.userId}:${getClientIp(request)}`;
  if (!(await rateLimit(rateKey, { max: 60, windowMs: 60_000 }))) {
    return errorResponse("Too many poll requests — try again in a minute", 429);
  }

  const sinceParam = request.nextUrl.searchParams.get("since") ?? "";
  const parsed = parseIsoDate(sinceParam);
  const isFull =
    parsed === null || parsed.getTime() <= EPOCH.getTime() + 1000;
  const since = isFull ? EPOCH : parsed;

  const result = await pollSyncChanges(user!.userId, since);

  return jsonResponse({
    server_time: new Date().toISOString(),
    has_changes: isFull || result.has_changes,
    counts: result.counts,
  });
}
