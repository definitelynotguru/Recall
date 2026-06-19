# Recall roadmap

Public roadmap for Recall. Completed baseline features are listed for context; active work targets open-source polish and Android-first UX.

## Shipped baseline

| Area | Status |
|------|--------|
| Auth (JWT + refresh) | Done |
| Notes + reminders CRUD, soft delete | Done |
| Sync (`POST /api/v1/sync`) | Done |
| Today timeline, Fetch reminders | Done |
| Pin, archive, search | Done |
| Tags (API + web UI; Android sync) | Partial |
| History (web) | Done |
| Backup export/import | Done (web + Android) |
| Conflict review | Partial (Android Settings) |
| APK CI (`v1.0.4-debug`) | Done |

## In progress (OSS polish)

- [ ] Public repo docs, LICENSE, self-hosting guide
- [ ] Sync trust: pin propagation, sync status, conflict title/body
- [ ] Reminder loop: complete/snooze, overdue grouping, friendly repeat labels
- [ ] Android tags UI, History screen, note-detail pin/archive
- [ ] Import preview, backup round-trip tests
- [ ] Web tag filters, debounced search, styled confirmations

## Later (not committed)

- Web offline PWA
- Play Store release builds
- Package rename `com.notesreminders.app` → `com.recall.app`
- Server-side transactional import API

## Links

- [Self-hosting](SELF_HOSTING.md)
- [Contributing](../CONTRIBUTING.md)
- [Testing checklist](../TESTING.md)
