# Shared Recall contracts

## Reminder detection (Phase F)

**Canonical implementation:** `web/src/lib/reminder-detect.ts`

Android mirrors logic in `android/.../reminders/ReminderDetect.kt`. When changing detection rules, update both and run:

```bash
cd web && npm test
```

## Fixtures

`fixtures.json` drives web Vitest cases in `web/src/lib/reminder-detect.test.ts`. Each entry:

- `title` / `body` — note input
- `expectCount` — number of suggestions (max 5 returned)
- `expectRepeat` — `yearly` | `weekly` | `daily` | `monthly` | `null` for first result
- `expectConfidence` — optional `high` | `maybe` (Likely vs uncertain/default time)

Future: optional Kotlin instrumentation test that reads the same JSON.
