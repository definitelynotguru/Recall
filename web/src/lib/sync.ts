import { db } from "./db";
import { notes, reminders } from "./db/schema";
import { eq, and, isNull } from "drizzle-orm";

type SyncNote = {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type SyncReminder = {
  id: string;
  note_id: string;
  fire_at: string;
  timezone: string;
  repeat_rule: string | null;
  intensity: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

async function mergeNote(
  userId: string,
  client: SyncNote,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(notes)
    .where(eq(notes.id, client.id))
    .limit(1);

  const clientUpdated = new Date(client.updated_at);
  const row = {
    id: client.id,
    userId,
    title: client.title,
    body: client.body,
    status: client.status,
    createdAt: new Date(client.created_at),
    updatedAt: clientUpdated,
    deletedAt: client.deleted_at ? new Date(client.deleted_at) : null,
  };

  if (!existing) {
    await db.insert(notes).values(row);
    return;
  }

  if (clientUpdated > existing.updatedAt) {
    await db.update(notes).set(row).where(eq(notes.id, client.id));
  }
}

async function mergeReminder(
  userId: string,
  client: SyncReminder,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(reminders)
    .where(eq(reminders.id, client.id))
    .limit(1);

  const clientUpdated = new Date(client.updated_at);
  const row = {
    id: client.id,
    userId,
    noteId: client.note_id,
    fireAt: new Date(client.fire_at),
    timezone: client.timezone,
    repeatRule: client.repeat_rule,
    intensity: client.intensity,
    status: client.status,
    completedAt: client.completed_at
      ? new Date(client.completed_at)
      : null,
    createdAt: new Date(client.created_at),
    updatedAt: clientUpdated,
    deletedAt: client.deleted_at ? new Date(client.deleted_at) : null,
  };

  if (!existing) {
    await db.insert(reminders).values(row);
    return;
  }

  if (clientUpdated > existing.updatedAt) {
    await db.update(reminders).set(row).where(eq(reminders.id, client.id));
  }
}

export async function processSync(
  userId: string,
  incomingNotes: SyncNote[],
  incomingReminders: SyncReminder[],
) {
  for (const n of incomingNotes) {
    await mergeNote(userId, n);
  }
  for (const r of incomingReminders) {
    await mergeReminder(userId, r);
  }

  const allNotes = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), isNull(notes.deletedAt)));

  const allReminders = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.userId, userId), isNull(reminders.deletedAt)));

  return { notes: allNotes, reminders: allReminders };
}
