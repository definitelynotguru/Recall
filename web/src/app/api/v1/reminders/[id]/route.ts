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
import { eq, and, isNull } from "drizzle-orm";

const patchSchema = z.object({
  fire_at: z.string().optional(),
  timezone: z.string().optional(),
  repeat_rule: z.string().trim().max(120).nullable().optional(),
  intensity: z.enum(["gentle", "persistent", "escalating"]).optional(),
  status: z.enum(["active", "completed", "cancelled"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { id } = await params;
  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
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

  const now = new Date();
  let fireAt = existing.fireAt;
  if (body.fire_at) {
    const parsed = parseIsoDate(body.fire_at);
    if (!parsed) return errorResponse("Invalid fire_at", 400);
    fireAt = parsed;
  }

  const [row] = await db
    .update(reminders)
    .set({
      fireAt,
      timezone: body.timezone ?? existing.timezone,
      repeatRule:
        body.repeat_rule !== undefined ? body.repeat_rule : existing.repeatRule,
      intensity: body.intensity ?? existing.intensity,
      status: body.status ?? existing.status,
      updatedAt: now,
    })
    .where(eq(reminders.id, id))
    .returning();

  return jsonResponse({ reminder: toApiReminder(row) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { id } = await params;
  const now = new Date();

  const [existing] = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, user!.userId)))
    .limit(1);

  if (!existing) return errorResponse("Reminder not found", 404);

  await db
    .update(reminders)
    .set({ deletedAt: now, updatedAt: now, status: "cancelled" })
    .where(eq(reminders.id, id));

  return jsonResponse({ ok: true });
}
