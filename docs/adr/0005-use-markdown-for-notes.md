# 5. Use Markdown for notes

## Status

Accepted

## Context

Recall notes need a text format that is readable on both web and Android, supports basic
formatting (headings, lists, emphasis, links) without a heavy rich-text editor, remains
diff- and search-friendly, and exports cleanly to JSON backups. The note `body` is a
single text column in the schema (`web/src/lib/db/schema.ts`).

## Decision

Store note bodies as Markdown text in the `body` column. On web, edit in a Markdown
editor with debounced autosave and render to HTML for display. On Android, edit and
render Markdown locally against the Room store. JSON backup bundles carry the raw
Markdown unchanged.

## Consequences

Notes are portable, human-readable, and work across platforms without a proprietary
format. Storage stays a simple text column. Formatting is limited to Markdown's feature
set; there are no rich embeds or complex layouts. Both clients must render Markdown
consistently to avoid visual drift. Plain-text storage makes notes easy to search and
diff, but large notes are still constrained by the API's payload limits.
