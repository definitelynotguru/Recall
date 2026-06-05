import { db } from "./db";
import { noteTags, notes, reminders, tags } from "./db/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  resolveNoteMerge,
  resolveReminderMerge,
  type SyncNoteInput,
  type SyncReminderInput,
} from "./sync-merge";

export type { SyncNoteInput as SyncNote, SyncReminderInput as SyncReminder };

export type SyncTagInput = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SyncNoteTagInput = {
  id: string;
  note_id: string;
  tag_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

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
    pinnedAt: client.pinned_at ? new Date(client.pinned_at) : null,
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

async function mergeTag(userId: string, client: SyncTagInput): Promise<void> {
  const [existing] = await db.select().from(tags).where(eq(tags.id, client.id)).limit(1);
  const clientUpdated = new Date(client.updated_at);
  const action = resolveNoteMerge(existing?.updatedAt, clientUpdated);
  if (action === "skip") return;

  const row = {
    id: client.id,
    userId,
    name: client.name,
    createdAt: new Date(client.created_at),
    updatedAt: clientUpdated,
    deletedAt: client.deleted_at ? new Date(client.deleted_at) : null,
  };

  if (action === "insert") {
    await db.insert(tags).values(row);
    return;
  }
  await db.update(tags).set(row).where(eq(tags.id, client.id));
}

async function mergeNoteTag(userId: string, client: SyncNoteTagInput): Promise<void> {
  const [existing] = await db.select().from(noteTags).where(eq(noteTags.id, client.id)).limit(1);
  const clientUpdated = new Date(client.updated_at);
  const action = resolveNoteMerge(existing?.updatedAt, clientUpdated);
  if (action === "skip") return;

  const row = {
    id: client.id,
    userId,
    noteId: client.note_id,
    tagId: client.tag_id,
    createdAt: new Date(client.created_at),
    updatedAt: clientUpdated,
    deletedAt: client.deleted_at ? new Date(client.deleted_at) : null,
  };

  if (action === "insert") {
    await db.insert(noteTags).values(row);
    return;
  }
  await db.update(noteTags).set(row).where(eq(noteTags.id, client.id));
}

export async function processSync(
  userId: string,
  incomingNotes: SyncNoteInput[],
  incomingReminders: SyncReminderInput[],
  incomingTags: SyncTagInput[] = [],
  incomingNoteTags: SyncNoteTagInput[] = [],
) {
  for (const n of incomingNotes) {
    await mergeNote(userId, n);
  }
  for (const r of incomingReminders) {
    await mergeReminder(userId, r);
  }
  for (const t of incomingTags) {
    await mergeTag(userId, t);
  }
  for (const nt of incomingNoteTags) {
    await mergeNoteTag(userId, nt);
  }

  const allNotes = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), isNull(notes.deletedAt)));

  const allReminders = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.userId, userId), isNull(reminders.deletedAt)));

  const allTags = await db
    .select()
    .from(tags)
    .where(and(eq(tags.userId, userId), isNull(tags.deletedAt)));

  const allNoteTags = await db
    .select()
    .from(noteTags)
    .where(and(eq(noteTags.userId, userId), isNull(noteTags.deletedAt)));

  return { notes: allNotes, reminders: allReminders, tags: allTags, noteTags: allNoteTags };
}
