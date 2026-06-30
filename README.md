# Recall

Recall is a calm notes and reminders app for people who want their notes to lead somewhere.
Write a thought, turn it into a reminder, and let the Android app nudge you when it matters.

The web app is the writing desk.
The Android app is the place that actually reminds you.

**Live app:** https://recall-aevum-s-projects1.vercel.app

## What it does

Recall keeps notes, reminders, tags, and sync in one small system.
It is not trying to be an AI workspace or a project manager.
It is meant to be simple, durable, and useful every day.

The basic flow is:

1. Write a Markdown note.
2. Add a reminder manually, or use Fetch reminders to find dates in the note.
3. Sync across web and Android.
4. Get notified on Android.
5. Snooze, complete, edit, or keep writing.

## Highlights

| Area | Web | Android |
| --- | --- | --- |
| Email and password auth | Yes | Yes |
| Markdown notes | Yes | Yes |
| Markdown toolbar and rich preview | Yes | Yes |
| Dark mode toggle | Yes | Uses app theme |
| Tags | Yes | Yes |
| Reminders and repeats | Yes | Yes |
| Fetch reminders from note text | Yes | Yes |
| Today timeline | Yes | Yes |
| Offline-first local storage | PWA basics | Room database |
| Cross-device sync | Yes | Yes |
| Notifications with snooze and complete | No | Yes |
| Home screen widget | No | Yes |
| JSON backup import and export | Yes | Yes |
| Debug reports | View reports | Send reports |
| In-app APK update | No | Yes |

## How it is built

```
Web app                      API and database                 Android app
Next.js on Vercel       ->   Next.js API routes          <-   Jetpack Compose
Markdown editor              Postgres on Neon                 Room, WorkManager
PWA shell                    Auth, sync, backups              AlarmManager
```

The repository is split into three main parts:

- `web/` contains the Next.js 16 app, API routes, auth, sync, docs, and tests.
- `android/` contains the Kotlin app, local database, notifications, widget, and sync worker.
- `shared/` contains reminder detection fixtures used by tests.

## Feature details

### Notes and Markdown

Notes support Markdown on both web and Android.
The web editor includes a formatting toolbar, retry toasts for failed saves, and a virtualized list for large collections.

### Reminders

Reminders can be one-time or repeating.
Recall understands common patterns like daily, weekly, monthly, and yearly.
Android notifications can be snoozed or completed from the notification shade.

### Fetch reminders

Fetch reminders scans a note for dates and time phrases.
It can find exact dates, relative phrases, and likely reminder candidates.
You stay in control, since detected reminders are suggestions until you add them.

### Sync

Sync uses a dirty-upload model.
Clients upload changed notes, reminders, tags, and note-tag links.
The server applies ownership checks and last-writer-wins merging, then returns the current catalog.

The sync API also supports catalog pagination for large accounts.
Android keeps retryable failures separate from permanent failures, and permanently failed rows can be reviewed in Settings.

### Security and reliability

Recall includes:

- Bcrypt password hashing.
- Short-lived access tokens.
- Rotating refresh tokens.
- CSRF checks for cookie-based refresh flows.
- Account lockout after repeated failed login attempts.
- Redis-backed rate limiting when Upstash is configured, with a local fallback for development.
- Request ID tracing on API responses.
- Health checks for database access and required auth secrets.

## Quick start

### Prerequisites

You will need:

- Node.js 20 or newer.
- A Postgres database. Neon works well.
- JDK 17 or Android Studio for the Android app.

### Run the web app

```bash
cd web
cp .env.example .env.local
```

Set these values in `web/.env.local`:

```bash
DATABASE_URL=
JWT_SECRET=
REFRESH_PEPPER=
REGISTER_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`JWT_SECRET` and `REFRESH_PEPPER` must each be at least 32 characters.

Then install, push the schema, and start the app:

```bash
npm install
npm run db:push
npm run dev
```

Open http://localhost:3000.

Useful web commands:

```bash
npm run lint
npm test
npm run build
```

### Run the Android app

Open `android/` in Android Studio, or use the Gradle wrapper with JDK 17.

Copy the local properties file:

```bash
cp android/local.properties.example android/local.properties
```

For an emulator talking to your local web app:

```properties
API_BASE_URL=http://10.0.2.2:3000/api/v1
```

For a physical device, use your LAN IP or the production API:

```properties
API_BASE_URL=https://recall-aevum-s-projects1.vercel.app/api/v1
```

Then run the app from Android Studio, or build from the command line:

```bash
cd android
./gradlew :app:assembleDebug
```

The latest debug APK is published from `main` when Android changes land.
After installing once, use Settings, Update to install newer builds from inside the app.

## Project map

```
.
├── android/       Kotlin app, Room database, notifications, widget
├── docs/          OpenAPI spec, ADRs, and operational notes
├── shared/        Shared reminder detection fixtures
├── web/           Next.js app and API
├── TESTING.md     Manual test checklist
└── README.md
```

## API overview

The API lives under `/api/v1`.
The OpenAPI spec is in [docs/openapi.yaml](docs/openapi.yaml).
Versioning notes are in [docs/API_VERSIONING.md](docs/API_VERSIONING.md).

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Notes | `GET /notes`, `POST /notes`, `POST /notes/bulk`, `GET /notes/:id`, `PATCH /notes/:id`, `DELETE /notes/:id` |
| Tags | `GET /tags`, `POST /tags`, `POST /tags/bulk`, `PATCH /tags/:id`, `DELETE /tags/:id` |
| Reminders | `POST /notes/:id/reminders`, `PATCH /reminders/:id`, `DELETE /reminders/:id`, `POST /reminders/:id/complete`, `POST /reminders/:id/snooze` |
| Sync | `POST /sync`, `GET /sync/status` |
| Backup | `POST /backup/import` |
| Debug | `POST /debug/report`, `GET /debug/reports` |
| Health | `GET /health` |

## Deploying the web app

The production app runs on Vercel with `web/` as the project root.

Required environment variables:

```bash
DATABASE_URL=
JWT_SECRET=
REFRESH_PEPPER=
REGISTER_SECRET=
NEXT_PUBLIC_APP_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Upstash is optional.
If it is not configured, rate limiting falls back to an in-memory limiter.

When the database schema changes, run:

```bash
cd web
npm run db:push
```

## Troubleshooting sync

If Android sync returns `HTTP 400`, the server response includes validation details.
Common causes are invalid UUIDs, orphan reminders, unknown tags, or empty `fire_at` values.

Android sanitizes dirty rows before upload and records skipped rows for review.
Use Settings, Send debug report on Android, then open Settings, Debug reports on the web app.

Also check that `API_BASE_URL` ends with `/api/v1`.

## Health check

```bash
curl https://recall-aevum-s-projects1.vercel.app/api/v1/health
```

A healthy response looks like:

```json
{ "status": "ok", "db": "connected" }
```

## License

Recall is released under the [MIT License](LICENSE).

For contribution notes, see [CONTRIBUTING.md](CONTRIBUTING.md).
