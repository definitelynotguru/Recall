# 3. Use Room database

## Status

Accepted

## Context

The Android client must remain usable without a network connection. Notes, reminders,
tags, and their associations need local persistence with structured queries (today
timeline, search, tag filters) and the ability to sync a dirty set to the server later.
The app targets `minSdk 26` and is built with Jetpack Compose. The server is the
eventual source of truth, but the device is the working copy while offline.

## Decision

Use Jetpack Room as the on-device database for notes, reminders, tags, note-tags, and
device sync state. Compose screens read from and write to Room; note edits save locally
with a debounced save, and a sync run pushes dirty rows to `POST /api/v1/sync` and
applies the returned catalog. Room provides typed DAO queries, schema migrations, and
observable flows that the UI collects.

## Consequences

The app is offline-first; sync is best-effort and runs when connectivity is available.
The client is the source of truth between syncs, so conflicts are reconciled at sync
time via last-writer-wins. Room adds schema and migration maintenance burden on the
Android side. Data lives on the device, so JSON backup export/import is provided as an
additional safety net. Local data is not encrypted beyond standard app sandboxing.
