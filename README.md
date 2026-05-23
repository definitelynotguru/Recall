# Recall

**Recall** is a personal notes app where reminders are first-class: write on the web, get notified on Android. One calm workspace for Markdown notes, timed nudges, and cross-device sync — no AI, no clutter.

**Production:** https://recall-aevum-s-projects1.vercel.app

## Why Recall

Most notes apps treat reminders as an afterthought. Recall is built around a simple loop:

1. **Write** a note (Markdown on web and Android).
2. **Attach** a reminder (date, time, optional repeat) — or use **Fetch reminders** to detect dates in text.
3. **Sync** to the server.
4. **Notify** on your phone only — the web app never sends push notifications.

## Features

| Feature | Web | Android |
|---------|-----|---------|
| Email + password auth (access + refresh JWT) | Yes | Yes |
| Markdown notes + debounced autosave | Yes | Yes (local debounced save) |
| Reminders (daily / weekly / monthly / yearly) | Yes | Yes |
| **Fetch reminders** (dates, relative phrases, Likely/Maybe confidence) | Yes | Yes |
| Today timeline + next-nudge preview | Yes | Yes |
| Offline notes (stay signed in, sync when online) | Online-first | Yes (Room) |
| Notifications + snooze / complete from shade | — | Yes |
| Tap notification → open note | — | Yes |
| JSON backup export / import | Yes | — |
| Debug reports (Android → server → web Settings) | View | Send |

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Web (Next) │────▶│  API + Postgres  │◀────│   Android   │
│   Vercel    │     │  (Neon)          │     │   Compose   │
└─────────────┘     └──────────────────┘     └──────┬──────┘
                                                    │
                                             AlarmManager
                                             (notifications)
```

- **Monorepo:** `web/` (Next.js 16) + `android/` (Kotlin, minSdk 26) + `shared/` (detection fixtures)
- **Sync:** `POST /api/v1/sync` — dirty upload, LWW merge, full active catalog in response
- **Auth:** bcrypt, 15-minute access JWT, 90-day rotating refresh (network errors do not log you out on Android)

## Quick start

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) Postgres database
- Android Studio or JDK 17+ (for the mobile app)

### Web

```bash
cd web
cp .env.example .env.local
# Set DATABASE_URL, JWT_SECRET, REFRESH_PEPPER, REGISTER_SECRET, NEXT_PUBLIC_APP_URL

npm install
npm run db:push    # applies schema (including debug_reports)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test           # Vitest: reminder detect, sync schema, sync merge
npm run build
```

### Android

1. Open `android/` in Android Studio (or use CLI with JDK 17).
2. Copy `android/local.properties.example` to `android/local.properties`.
3. Set your API URL:

```properties
# Emulator → host machine
API_BASE_URL=http://10.0.2.2:3000/api/v1

# Physical device → your LAN IP or production
# API_BASE_URL=https://recall-aevum-s-projects1.vercel.app/api/v1
```

4. Run on a device or emulator.

**APK:** [GitHub Releases v1.0.0-debug](https://github.com/definitelynotguru/Recall/releases/download/v1.0.0-debug/recall-1.0.0-debug.apk) — rebuilt on `main` when `android/**` changes. See [android/README.md](android/README.md).

### Deploy web (Vercel)

1. Project root directory: `web`.
2. Add the same env vars as `.env.local`.
3. After deploy, run `npm run db:push` against production Neon when the schema changes (e.g. `debug_reports` table).

## Project structure

```
.
├── android/          # Jetpack Compose app (notifications, offline sync)
├── web/              # Next.js app + API routes (/api/v1/*)
├── shared/           # Detection fixtures (Vitest in web)
├── plan.md           # Roadmap / implementation log
├── TESTING.md        # Manual E2E checklist
└── README.md
```

## API overview

Base path: `/api/v1`

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/register`, `/login`, `/refresh`, `/logout` · `GET /auth/me` |
| Notes | `GET|POST /notes`, `GET|PATCH|DELETE /notes/:id` |
| Reminders | `POST /notes/:id/reminders`, `PATCH|DELETE /reminders/:id`, `/complete`, `/snooze` |
| Sync | `POST /sync` — primary Android sync |
| Debug | `POST /debug/report`, `GET /debug/reports?limit=20` |

## Troubleshooting sync (Android)

If sync shows **HTTP 400**:

1. The server returns validation details (invalid UUID, empty `fire_at`, etc.).
2. Android **sanitizes** dirty rows before upload (drops invalid/orphan items).
3. Open **Settings → Send debug report**, then on web **Settings → Debug reports** to inspect payload (no tokens stored).

Ensure `API_BASE_URL` in `local.properties` matches your deployed API (trailing path `/api/v1`).

## Design

Warm **ink + copper** palette, Syne + Source Sans 3 on web, timeline-first Today view. Preview: `web/public/ui-preview.html`.

## License

Personal project — all rights reserved unless you add a license file.

## Author

Built for solo, daily use. Repo: [definitelynotguru/Recall](https://github.com/definitelynotguru/Recall).
