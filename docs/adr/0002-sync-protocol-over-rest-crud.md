# 2. Sync protocol over REST CRUD

## Status

Accepted

## Context

Android works offline-first against a local Room database and syncs when connectivity
returns. Per-resource REST CRUD (separate GET/PUT/DELETE for each note and reminder)
would require many round trips per sync, complex per-row conflict tracking, and a chatty
offline queue. The web app also needs to load the current catalog. A single, reliable
sync operation is preferable to orchestrating dozens of endpoint calls.

The implementation lives in `web/src/lib/sync.ts`, `web/src/lib/sync-catalog.ts`, and
`web/src/lib/sync-schema.ts`, exposed at `POST /api/v1/sync`.

## Decision

Expose one endpoint, `POST /api/v1/sync`. The client sends `device_id`, `last_sync_at`,
and arrays of dirty notes, reminders, tags, and note-tags (client-supplied UUIDs and
timestamps). The server applies a last-writer-wins (LWW) merge scoped to the owning
user: it rejects cross-user writes and orphan reminders/tags, records the device's
`last_sync_at`, and returns the updated catalog in one response. With an epoch
`last_sync_at` the response is a `full` catalog; otherwise it is a `delta` of rows
changed since that time. Payloads are capped (5 MB; 5,000 notes).

## Consequences

One round trip per sync. The client owns IDs and timestamps, so IDs must be UUIDs created
client-side. LWW means concurrent edits resolve to the newer `updated_at`, losing the
older write with no field-level merge. There is no cursor pagination; a full sync returns
every non-deleted row in a single response. Ownership checks prevent IDOR-style cross-user
access. Validation failures return 400 with field-level `issues`, which Android
sanitizes against before retrying; debug reports help diagnose them.
