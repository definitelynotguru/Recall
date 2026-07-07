import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db, getDb } from "./db";
import { noteRevisions } from "./db/schema";
import type { NoteRevision } from "./db/schema";

export const MAX_REVISIONS_PER_NOTE = 10;
export const REVISION_RETENTION_DAYS = 30;

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export function revisionChanged(
  existing: { title: string; body: string },
  nextTitle: string,
  nextBody: string,
): boolean {
  return existing.title !== nextTitle || existing.body !== nextBody;
}

export async function captureRevisionIfChanged(
  tx: Tx,
  userId: string,
  noteId: string,
  existing: { title: string; body: string },
  nextTitle: string,
  nextBody: string,
  source = "edit",
): Promise<void> {
  if (!revisionChanged(existing, nextTitle, nextBody)) return;
  await tx.insert(noteRevisions).values({
    id: crypto.randomUUID(),
    userId,
    noteId,
    title: existing.title,
    body: existing.body,
    source,
    createdAt: new Date(),
  });
  await pruneRevisions(tx, userId, noteId);
}

export async function pruneRevisions(
  tx: Tx,
  userId: string,
  noteId: string,
): Promise<void> {
  const cutoff = new Date(
    Date.now() - REVISION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  await tx
    .delete(noteRevisions)
    .where(
      and(
        eq(noteRevisions.userId, userId),
        eq(noteRevisions.noteId, noteId),
        lt(noteRevisions.createdAt, cutoff),
      ),
    );

  const rows = await tx
    .select({ id: noteRevisions.id })
    .from(noteRevisions)
    .where(
      and(eq(noteRevisions.userId, userId), eq(noteRevisions.noteId, noteId)),
    )
    .orderBy(desc(noteRevisions.createdAt));

  if (rows.length > MAX_REVISIONS_PER_NOTE) {
    const toDelete = rows.slice(MAX_REVISIONS_PER_NOTE).map((r) => r.id);
    await tx
      .delete(noteRevisions)
      .where(
        and(
          eq(noteRevisions.userId, userId),
          inArray(noteRevisions.id, toDelete),
        ),
      );
  }
}

export async function listRevisions(
  userId: string,
  noteId: string,
): Promise<NoteRevision[]> {
  return db
    .select()
    .from(noteRevisions)
    .where(
      and(eq(noteRevisions.userId, userId), eq(noteRevisions.noteId, noteId)),
    )
    .orderBy(desc(noteRevisions.createdAt));
}

export async function getRevision(
  userId: string,
  revisionId: string,
): Promise<NoteRevision | undefined> {
  const [row] = await db
    .select()
    .from(noteRevisions)
    .where(
      and(eq(noteRevisions.userId, userId), eq(noteRevisions.id, revisionId)),
    )
    .limit(1);
  return row;
}
