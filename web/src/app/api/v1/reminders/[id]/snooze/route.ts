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

const schema = z.object({
  fire_at: z.string(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { id } = await params;
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return errorResponse("Invalid request", 400);
  }

  const fireAt = parseIsoDate(body.fire_at);
  if (!fireAt) return errorResponse("Invalid fire_at", 400);

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
  const [row] = await db
    .update(reminders)
    .set({ fireAt, status: "active", updatedAt: now })
    .where(eq(reminders.id, id))
    .returning();

  return jsonResponse({ reminder: toApiReminder(row) });
}
