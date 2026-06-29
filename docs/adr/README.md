# Architecture Decision Records

This directory records architectural decisions for Recall. Each ADR follows a consistent
format: `# N. Title`, `## Status`, `## Context`, `## Decision`, `## Consequences`.

ADRs are historical records; they document the reasoning at the time a decision was made
and are not updated after the fact except to change the Status (e.g. Superseded).

| ADR | Title | Summary |
|-----|-------|---------|
| [0001](0001-use-jwt-auth.md) | Use JWT auth | bcrypt passwords, 15-minute HS256 access JWTs, 90-day rotating peppered refresh tokens. |
| [0002](0002-sync-protocol-over-rest-crud.md) | Sync protocol over REST CRUD | One `POST /sync` endpoint with dirty upload, last-writer-wins merge, and full/delta catalog response. |
| [0003](0003-use-room-database.md) | Use Room database | Android stores notes/reminders locally in Jetpack Room for offline-first sync. |
| [0004](0004-use-tailwind-and-nextjs.md) | Use Tailwind and Next.js | Web app built on Next.js (App Router + API routes) styled with Tailwind, deployed on Vercel. |
| [0005](0005-use-markdown-for-notes.md) | Use Markdown for notes | Note bodies stored as Markdown text, rendered on web and Android, exported in backups. |
