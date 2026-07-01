import { and, count, eq, gt, isNotNull, or, type AnyColumn } from "drizzle-orm";
import { db } from "./db";
import { noteTags, notes, reminders, tags } from "./db/schema";

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

export async function pollSyncChanges(
  userId: string,
  since: Date,
): Promise<{
  has_changes: boolean;
  counts: { notes: number; reminders: number; tags: number; note_tags: number };
}> {
  const [noteRow] = await db
    .select({ count: count() })
    .from(notes)
    .where(
      and(
        eq(notes.userId, userId),
        changedSinceClause(notes.updatedAt, notes.deletedAt, since),
      ),
    );
  const [reminderRow] = await db
    .select({ count: count() })
    .from(reminders)
    .where(
      and(
        eq(reminders.userId, userId),
        changedSinceClause(reminders.updatedAt, reminders.deletedAt, since),
      ),
    );
  const [tagRow] = await db
    .select({ count: count() })
    .from(tags)
    .where(
      and(
        eq(tags.userId, userId),
        changedSinceClause(tags.updatedAt, tags.deletedAt, since),
      ),
    );
  const [noteTagRow] = await db
    .select({ count: count() })
    .from(noteTags)
    .where(
      and(
        eq(noteTags.userId, userId),
        changedSinceClause(noteTags.updatedAt, noteTags.deletedAt, since),
      ),
    );

  const counts = {
    notes: noteRow?.count ?? 0,
    reminders: reminderRow?.count ?? 0,
    tags: tagRow?.count ?? 0,
    note_tags: noteTagRow?.count ?? 0,
  };

  return {
    has_changes:
      counts.notes > 0 ||
      counts.reminders > 0 ||
      counts.tags > 0 ||
      counts.note_tags > 0,
    counts,
  };
}
