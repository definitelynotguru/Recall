import { db } from "./db";
import { notes, reminders } from "./db/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  resolveNoteMerge,
  resolveReminderMerge,
  type SyncNoteInput,
  type SyncReminderInput,
} from "./sync-merge";

export type { SyncNoteInput as SyncNote, SyncReminderInput as SyncReminder };

async function mergeNote(userId: string, client: SyncNoteInput): Promise<void> {
  const [existing] = await db
    .select()
    .from(notes)
    .where(eq(notes.id, client.id))
    .limit(1);

  const clientUpdated = new Date(client.updated_at);
  const action = resolveNoteMerge(existing?.updatedAt, clientUpdated);
  if (action === "skip") return;

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

  if (action === "insert") {
    await db.insert(notes).values(row);
    return;
  }

  await db.update(notes).set(row).where(eq(notes.id, client.id));
}

async function mergeReminder(
  userId: string,
  client: SyncReminderInput,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(reminders)
    .where(eq(reminders.id, client.id))
    .limit(1);

  const clientUpdated = new Date(client.updated_at);
  const action = resolveReminderMerge(existing?.updatedAt, clientUpdated);
  if (action === "skip") return;

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

  if (action === "insert") {
    await db.insert(reminders).values(row);
    return;
  }

  await db.update(reminders).set(row).where(eq(reminders.id, client.id));
}

export async function processSync(
  userId: string,
  incomingNotes: SyncNoteInput[],
  incomingReminders: SyncReminderInput[],
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
