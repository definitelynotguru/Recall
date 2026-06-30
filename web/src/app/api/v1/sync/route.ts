import { NextRequest } from "next/server";
import { z } from "zod";
import { processSync } from "@/lib/sync";
import { syncSchema } from "@/lib/sync-schema";
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  toApiNote,
  toApiNoteTag,
  toApiReminder,
  toApiTag,
} from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const MAX_SYNC_BYTES = 5_000_000;

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const rateKey = `sync:${user!.userId}:${getClientIp(request)}`;
  if (!(await rateLimit(rateKey, { max: 30, windowMs: 60_000 }))) {
    return errorResponse("Too many sync requests — try again in a minute", 429);
  }

  const rawText = await request.text();
  if (rawText.length > MAX_SYNC_BYTES) {
    return errorResponse("Sync payload too large", 413);
  }

  let body: z.infer<typeof syncSchema>;
  try {
    body = syncSchema.parse(JSON.parse(rawText));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonResponse(
        {
          error: "Invalid sync payload",
          issues: err.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        400,
      );
    }
    return errorResponse("Invalid request", 400);
  }

  const {
    notes: mergedNotes,
    reminders: mergedReminders,
    tags: mergedTags,
    noteTags: mergedNoteTags,
    sync_mode,
    server_time,
    next_cursor,
    has_more,
  } = await processSync(
    user!.userId,
    body.device_id,
    body.last_sync_at,
    body.notes,
    body.reminders,
    body.tags,
    body.note_tags,
    { limit: body.limit, cursor: body.cursor },
  );

  return jsonResponse({
    server_time: server_time.toISOString(),
    sync_mode,
    notes: mergedNotes.map(toApiNote),
    reminders: mergedReminders.map(toApiReminder),
    tags: mergedTags.map(toApiTag),
    note_tags: mergedNoteTags.map(toApiNoteTag),
    next_cursor,
    has_more,
  });
}
