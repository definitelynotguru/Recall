# Recall

Recall is a notes and reminders system whose web app is the writing desk and whose Android app is the offline working copy and notification surface.

## Notes and organization

**Note**:
A user-owned Markdown document with a title, lifecycle status, optional pin, and optional special role as a template or daily note.

**Reminder**:
A user-owned schedule attached to one note, with timing, repeat, intensity, mode, and completion state.

**Tag**:
A user-owned name used to organize notes.

**Note-tag**:
The user-owned association between one note and one tag; removing a tag from a note soft-deletes this association.
_Avoid_: Tagged note

**Pin**:
A timestamped marker that places an active note ahead of unpinned notes without changing its lifecycle status.

**Archive**:
The non-active lifecycle status of a note; archiving is independent of pinning and deletion.

**Daily note**:
The note assigned to one calendar date for a user; clients open the existing note for that date or create it.

**Template**:
A note-shaped reusable source whose body placeholders are expanded when creating a regular note.

**Revision**:
A retained snapshot of a note's title and body from an earlier edit or conflict decision; restoring one creates a new note rather than overwriting the original.

## Sync

**Dirty row**:
A local note, reminder, tag, or note-tag whose latest change has not been accepted by sync.

**Conflict**:
A dirty Android note whose title or body differs from a newer server copy; it remains local until the user keeps the local copy, keeps the server copy, or merges both.

**Catalog**:
The server's user-scoped collection of notes, reminders, tags, and note-tags returned by sync. A **full catalog** is returned from the epoch starting point; a **delta catalog** contains rows changed since the client's last sync time.

**Device sync state**:
The per-user, per-device checkpoint recording the device identity and its last successful sync time.

**Last-writer-wins**:
The merge rule that accepts an incoming row only when its `updated_at` is newer than the stored row; equal or older writes do not replace it.
_Avoid_: Automatic merge

**Soft delete**:
A deletion represented by `deleted_at` so it can propagate through delta sync before eventual local purging.
_Avoid_: Archive

## Key invariants

- Notes, reminders, tags, and note-tags use client-generated UUIDs and remain scoped to one owning user.
- A reminder must reference a note owned by the same user; a note-tag must reference both a note and tag owned by that user. Orphan and cross-user relationships are rejected from the merge.
- Dirty rows stay dirty until a successful catalog merge accepts or supersedes them; skipped invalid Android rows are quarantined for review.
- The epoch checkpoint (`1970-01-01T00:00:00Z`) requests a full catalog; later valid checkpoints request a delta.
- Android's current persistence compatibility level is Room schema version 11.
