import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { reminders } from "@/lib/db/schema";
import {
  requireAuth,
  jsonResponse,
  errorResponse,
  toApiReminder,
  parseIsoDate,
} from "@/lib/api-utils";
import { computeNextRepeat } from "@/lib/repeat-rules";
import { eq, and, isNull } from "drizzle-orm";

const schema = z.object({
  completed_at: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { id } = await params;
  let body: z.infer<typeof schema> = {};
  try {
    const json = await request.json().catch(() => ({}));
    body = schema.parse(json);
  } catch {
    return errorResponse("Invalid request", 400);
  }

  const [existing] = await db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.id, id),
        eq(reminders.userId, user!.userId),
        isNull(reminders.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) return errorResponse("Reminder not found", 404);

  const completedAt = body.completed_at
    ? parseIsoDate(body.completed_at)
    : new Date();
  if (!completedAt) return errorResponse("Invalid completed_at", 400);

  const now = new Date();
  let fireAt = existing.fireAt;
  let status: "active" | "completed" = "completed";

  if (existing.repeatRule) {
    status = "active";
    const next = computeNextRepeat(existing.repeatRule, existing.fireAt);
    if (!next) return errorResponse("Invalid repeat_rule", 400);
    fireAt = next;
  }

  const [row] = await db
    .update(reminders)
    .set({
      status,
      completedAt: existing.repeatRule ? null : completedAt,
      fireAt,
      updatedAt: now,
    })
    .where(eq(reminders.id, id))
    .returning();

  return jsonResponse({ reminder: toApiReminder(row) });
}
