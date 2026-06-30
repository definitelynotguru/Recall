import { noteTags, notes, reminders, tags } from "./db/schema";
import { and, asc, eq, gt, inArray, isNotNull, isNull, or, type AnyColumn } from "drizzle-orm";
import {
  resolveNoteMerge,
  resolveReminderMerge,
  type SyncNoteInput,
  type SyncReminderInput,
} from "./sync-merge";
import type { getDb } from "./db";
import type { Note, NoteTag, Reminder, Tag } from "./db/schema";

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

export type SyncMode = "full" | "delta";

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const EPOCH = new Date("1970-01-01T00:00:00.000Z");

export function resolveSyncMode(lastSyncAt: string): { mode: SyncMode; since: Date } {
  const since = new Date(lastSyncAt);
  if (Number.isNaN(since.getTime()) || since.getTime() <= EPOCH.getTime() + 1000) {
    return { mode: "full", since: EPOCH };
  }
  return { mode: "delta", since };
}

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

function changedSinceClause(
  updatedAtCol: AnyColumn,
  deletedAtCol: AnyColumn,
  since: Date,
) {
  return or(
    gt(updatedAtCol, since),
    and(isNotNull(deletedAtCol), gt(deletedAtCol, since)),
  );
}

async function prefetchOwnedNoteIds(
  tx: Tx,
  userId: string,
  noteIds: string[],
): Promise<Set<string>> {
  if (noteIds.length === 0) return new Set();
  const rows = await tx
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.userId, userId), inArray(notes.id, noteIds)));
  return new Set(rows.map((row) => row.id));
}

async function prefetchOwnedTagIds(
  tx: Tx,
  userId: string,
  tagIds: string[],
): Promise<Set<string>> {
  if (tagIds.length === 0) return new Set();
  const rows = await tx
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.id, tagIds)));
  return new Set(rows.map((row) => row.id));
}

export async function mergeNotesBatch(
  tx: Tx,
  userId: string,
  clients: SyncNoteInput[],
): Promise<void> {
  if (clients.length === 0) return;
  const existingRows = await tx
    .select()
    .from(notes)
    .where(inArray(notes.id, clients.map((client) => client.id)));
  const existingById = new Map(existingRows.map((row) => [row.id, row]));
  for (const client of clients) {
    await mergeNote(tx, userId, client, existingById.get(client.id));
  }
}

async function mergeNote(
  tx: Tx,
  userId: string,
  client: SyncNoteInput,
  existingRow?: Note,
): Promise<void> {
  const existing =
    existingRow ??
    (
      await tx.select().from(notes).where(eq(notes.id, client.id)).limit(1)
    )[0];

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
  existingRow?: Reminder,
  ownedNoteIds?: Set<string>,
): Promise<void> {
  const existing =
    existingRow ??
    (
      await tx.select().from(reminders).where(eq(reminders.id, client.id)).limit(1)
    )[0];

  if (!ownedByUser(existing?.userId, userId)) return;
  const noteOwned = ownedNoteIds
    ? ownedNoteIds.has(client.note_id)
    : await userOwnsNote(tx, userId, client.note_id);
  if (!noteOwned) return;

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
    completedAt: client.completed_at ? new Date(client.completed_at) : null,
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

export async function mergeRemindersBatch(
  tx: Tx,
  userId: string,
  clients: SyncReminderInput[],
): Promise<void> {
  if (clients.length === 0) return;
  const existingRows = await tx
    .select()
    .from(reminders)
    .where(inArray(reminders.id, clients.map((client) => client.id)));
  const existingById = new Map(existingRows.map((row) => [row.id, row]));
  const ownedNoteIds = await prefetchOwnedNoteIds(
    tx,
    userId,
    [...new Set(clients.map((client) => client.note_id))],
  );
  for (const client of clients) {
    await mergeReminder(tx, userId, client, existingById.get(client.id), ownedNoteIds);
  }
}

async function mergeTag(
  tx: Tx,
  userId: string,
  client: SyncTagInput,
  existingRow?: Tag,
): Promise<void> {
  const existing =
    existingRow ??
    (await tx.select().from(tags).where(eq(tags.id, client.id)).limit(1))[0];

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

export async function mergeTagsBatch(
  tx: Tx,
  userId: string,
  clients: SyncTagInput[],
): Promise<void> {
  if (clients.length === 0) return;
  const existingRows = await tx
    .select()
    .from(tags)
    .where(inArray(tags.id, clients.map((client) => client.id)));
  const existingById = new Map(existingRows.map((row) => [row.id, row]));
  for (const client of clients) {
    await mergeTag(tx, userId, client, existingById.get(client.id));
  }
}

async function mergeNoteTag(
  tx: Tx,
  userId: string,
  client: SyncNoteTagInput,
  existingRow?: NoteTag,
  ownedNoteIds?: Set<string>,
  ownedTagIds?: Set<string>,
): Promise<void> {
  const existing =
    existingRow ??
    (await tx.select().from(noteTags).where(eq(noteTags.id, client.id)).limit(1))[0];

  if (!ownedByUser(existing?.userId, userId)) return;
  const noteOwned = ownedNoteIds
    ? ownedNoteIds.has(client.note_id)
    : await userOwnsNote(tx, userId, client.note_id);
  if (!noteOwned) return;
  const tagOwned = ownedTagIds
    ? ownedTagIds.has(client.tag_id)
    : await userOwnsTag(tx, userId, client.tag_id);
  if (!tagOwned) return;

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

export async function mergeNoteTagsBatch(
  tx: Tx,
  userId: string,
  clients: SyncNoteTagInput[],
): Promise<void> {
  if (clients.length === 0) return;
  const existingRows = await tx
    .select()
    .from(noteTags)
    .where(inArray(noteTags.id, clients.map((client) => client.id)));
  const existingById = new Map(existingRows.map((row) => [row.id, row]));
  const ownedNoteIds = await prefetchOwnedNoteIds(
    tx,
    userId,
    [...new Set(clients.map((client) => client.note_id))],
  );
  const ownedTagIds = await prefetchOwnedTagIds(
    tx,
    userId,
    [...new Set(clients.map((client) => client.tag_id))],
  );
  for (const client of clients) {
    await mergeNoteTag(
      tx,
      userId,
      client,
      existingById.get(client.id),
      ownedNoteIds,
      ownedTagIds,
    );
  }
}

type CatalogRow = { id: string; updatedAt: Date };

/**
 * Compute the pagination metadata for a full-catalog page. `next_cursor` is the
 * max `${updatedAt.toISOString()}|${id}` key across all returned rows, set only
 * when at least one entity type filled the `limit` (i.e. there may be more).
 * Without a limit, everything is returned and the cursor is null.
 */
export function computePaginationCursor(
  rowGroups: CatalogRow[][],
  limit?: number,
): { next_cursor: string | null; has_more: boolean } {
  if (!limit) {
    return { next_cursor: null, has_more: false };
  }
  const hasMore = rowGroups.some((rows) => rows.length === limit);
  if (!hasMore) {
    return { next_cursor: null, has_more: false };
  }
  let maxKey = "";
  for (const rows of rowGroups) {
    for (const row of rows) {
      const key = `${row.updatedAt.toISOString()}|${row.id}`;
      if (key > maxKey) maxKey = key;
    }
  }
  return { next_cursor: maxKey || null, has_more: true };
}

function afterCursorCondition(
  updatedAtCol: AnyColumn,
  idCol: AnyColumn,
  cursorDate: Date,
  cursorId: string,
) {
  return or(
    gt(updatedAtCol, cursorDate),
    and(eq(updatedAtCol, cursorDate), gt(idCol, cursorId)),
  );
}

export type CatalogFetchOptions = { limit?: number; cursor?: string };

export async function fetchCatalogForClient(
  tx: Tx,
  userId: string,
  mode: SyncMode,
  since: Date,
  opts?: CatalogFetchOptions,
) {
  if (mode === "full") {
    const limit = opts?.limit;
    const cursor = opts?.cursor;

    if (limit === undefined && cursor === undefined) {
      const [allNotes, allReminders, allTags, allNoteTags] = await Promise.all([
        tx
          .select()
          .from(notes)
          .where(and(eq(notes.userId, userId), isNull(notes.deletedAt))),
        tx
          .select()
          .from(reminders)
          .where(and(eq(reminders.userId, userId), isNull(reminders.deletedAt))),
        tx
          .select()
          .from(tags)
          .where(and(eq(tags.userId, userId), isNull(tags.deletedAt))),
        tx
          .select()
          .from(noteTags)
          .where(and(eq(noteTags.userId, userId), isNull(noteTags.deletedAt))),
      ]);
      return {
        notes: allNotes,
        reminders: allReminders,
        tags: allTags,
        noteTags: allNoteTags,
        next_cursor: null,
        has_more: false,
      };
    }

    let cursorDate: Date | null = null;
    let cursorId: string | null = null;
    if (cursor) {
      const sep = cursor.indexOf("|");
      cursorDate = new Date(cursor.slice(0, sep));
      cursorId = cursor.slice(sep + 1);
    }
    const hasCursor = cursorDate !== null && cursorId !== null;

    const notesOrdered = tx
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.userId, userId),
          isNull(notes.deletedAt),
          hasCursor
            ? afterCursorCondition(notes.updatedAt, notes.id, cursorDate!, cursorId!)
            : undefined,
        ),
      )
      .orderBy(asc(notes.updatedAt), asc(notes.id));
    const remindersOrdered = tx
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, userId),
          isNull(reminders.deletedAt),
          hasCursor
            ? afterCursorCondition(reminders.updatedAt, reminders.id, cursorDate!, cursorId!)
            : undefined,
        ),
      )
      .orderBy(asc(reminders.updatedAt), asc(reminders.id));
    const tagsOrdered = tx
      .select()
      .from(tags)
      .where(
        and(
          eq(tags.userId, userId),
          isNull(tags.deletedAt),
          hasCursor
            ? afterCursorCondition(tags.updatedAt, tags.id, cursorDate!, cursorId!)
            : undefined,
        ),
      )
      .orderBy(asc(tags.updatedAt), asc(tags.id));
    const noteTagsOrdered = tx
      .select()
      .from(noteTags)
      .where(
        and(
          eq(noteTags.userId, userId),
          isNull(noteTags.deletedAt),
          hasCursor
            ? afterCursorCondition(noteTags.updatedAt, noteTags.id, cursorDate!, cursorId!)
            : undefined,
        ),
      )
      .orderBy(asc(noteTags.updatedAt), asc(noteTags.id));

    const [allNotes, allReminders, allTags, allNoteTags] = await Promise.all([
      limit ? notesOrdered.limit(limit) : notesOrdered,
      limit ? remindersOrdered.limit(limit) : remindersOrdered,
      limit ? tagsOrdered.limit(limit) : tagsOrdered,
      limit ? noteTagsOrdered.limit(limit) : noteTagsOrdered,
    ]);

    const pagination = computePaginationCursor(
      [allNotes, allReminders, allTags, allNoteTags],
      limit,
    );
    return {
      notes: allNotes,
      reminders: allReminders,
      tags: allTags,
      noteTags: allNoteTags,
      ...pagination,
    };
  }

  const [noteRows, reminderRows, tagRows, noteTagRows] = await Promise.all([
    tx
      .select()
      .from(notes)
      .where(and(eq(notes.userId, userId), changedSinceClause(notes.updatedAt, notes.deletedAt, since))),
    tx
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, userId),
          changedSinceClause(reminders.updatedAt, reminders.deletedAt, since),
        ),
      ),
    tx
      .select()
      .from(tags)
      .where(and(eq(tags.userId, userId), changedSinceClause(tags.updatedAt, tags.deletedAt, since))),
    tx
      .select()
      .from(noteTags)
      .where(
        and(
          eq(noteTags.userId, userId),
          changedSinceClause(noteTags.updatedAt, noteTags.deletedAt, since),
        ),
      ),
  ]);

  return {
    notes: noteRows,
    reminders: reminderRows,
    tags: tagRows,
    noteTags: noteTagRows,
    next_cursor: null,
    has_more: false,
  };
}
