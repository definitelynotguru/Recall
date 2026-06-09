import { getDb } from "./db";
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

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

function ownedByUser(existingUserId: string | undefined, userId: string): boolean {
  return existingUserId === undefined || existingUserId === userId;
}

async function userOwnsNote(tx: Tx, userId: string, noteId: string): Promise<boolean> {
  const [row] = await tx
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .limit(1);
  return Boolean(row);
}

async function userOwnsTag(tx: Tx, userId: string, tagId: string): Promise<boolean> {
  const [row] = await tx
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
    .limit(1);
  return Boolean(row);
}

async function mergeNote(
  tx: Tx,
  userId: string,
  client: SyncNoteInput,
): Promise<void> {
  const [existing] = await tx
    .select()
    .from(notes)
    .where(eq(notes.id, client.id))
    .limit(1);

  if (!ownedByUser(existing?.userId, userId)) return;

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
    await tx.insert(notes).values(row);
    return;
  }

  await tx
    .update(notes)
    .set(row)
    .where(and(eq(notes.id, client.id), eq(notes.userId, userId)));
}

async function mergeReminder(
  tx: Tx,
  userId: string,
  client: SyncReminderInput,
): Promise<void> {
  const [existing] = await tx
    .select()
    .from(reminders)
    .where(eq(reminders.id, client.id))
    .limit(1);

  if (!ownedByUser(existing?.userId, userId)) return;
  if (!(await userOwnsNote(tx, userId, client.note_id))) return;

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
    await tx.insert(reminders).values(row);
    return;
  }

  await tx
    .update(reminders)
    .set(row)
    .where(and(eq(reminders.id, client.id), eq(reminders.userId, userId)));
}

async function mergeTag(tx: Tx, userId: string, client: SyncTagInput): Promise<void> {
  const [existing] = await tx
    .select()
    .from(tags)
    .where(eq(tags.id, client.id))
    .limit(1);

  if (!ownedByUser(existing?.userId, userId)) return;

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
    await tx.insert(tags).values(row);
    return;
  }

  await tx
    .update(tags)
    .set(row)
    .where(and(eq(tags.id, client.id), eq(tags.userId, userId)));
}

async function mergeNoteTag(
  tx: Tx,
  userId: string,
  client: SyncNoteTagInput,
): Promise<void> {
  const [existing] = await tx
    .select()
    .from(noteTags)
    .where(eq(noteTags.id, client.id))
    .limit(1);

  if (!ownedByUser(existing?.userId, userId)) return;
  if (!(await userOwnsNote(tx, userId, client.note_id))) return;
  if (!(await userOwnsTag(tx, userId, client.tag_id))) return;

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
    await tx.insert(noteTags).values(row);
    return;
  }

  await tx
    .update(noteTags)
    .set(row)
    .where(and(eq(noteTags.id, client.id), eq(noteTags.userId, userId)));
}

async function fetchUserCatalog(tx: Tx, userId: string) {
  const allNotes = await tx
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), isNull(notes.deletedAt)));

  const allReminders = await tx
    .select()
    .from(reminders)
    .where(and(eq(reminders.userId, userId), isNull(reminders.deletedAt)));

  const allTags = await tx
    .select()
    .from(tags)
    .where(and(eq(tags.userId, userId), isNull(tags.deletedAt)));

  const allNoteTags = await tx
    .select()
    .from(noteTags)
    .where(and(eq(noteTags.userId, userId), isNull(noteTags.deletedAt)));

  return {
    notes: allNotes,
    reminders: allReminders,
    tags: allTags,
    noteTags: allNoteTags,
  };
}

export async function processSync(
  userId: string,
  incomingNotes: SyncNoteInput[],
  incomingReminders: SyncReminderInput[],
  incomingTags: SyncTagInput[] = [],
  incomingNoteTags: SyncNoteTagInput[] = [],
) {
  return getDb().transaction(async (tx) => {
    for (const n of incomingNotes) {
      await mergeNote(tx, userId, n);
    }
    for (const r of incomingReminders) {
      await mergeReminder(tx, userId, r);
    }
    for (const t of incomingTags) {
      await mergeTag(tx, userId, t);
    }
    for (const nt of incomingNoteTags) {
      await mergeNoteTag(tx, userId, nt);
    }
    return fetchUserCatalog(tx, userId);
  });
}
