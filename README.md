# Recall

**Recall** is a personal notes app where reminders are first-class: write on the web, get notified on Android. One calm workspace for Markdown notes, timed nudges, and cross-device sync — no AI, no clutter.

## Why Recall

Most notes apps treat reminders as an afterthought. Recall is built around a simple loop:

1. **Write** a note (Markdown on web and Android).
2. **Attach** a reminder (date, time, optional repeat).
3. **Sync** to the server.
4. **Notify** on your phone only — the web app never sends push notifications.

## Features

| Feature | Web | Android |
|---------|-----|---------|
| Email + password auth (access + refresh JWT) | Yes | Yes |
| Markdown notes | Yes | Yes |
| Reminders (daily / weekly / monthly / yearly) | Yes | Yes |
| Today timeline (upcoming nudges) | Yes | Yes |
| Offline notes + sync | Online-first | Yes (Room) |
| Notifications | — | Yes |
| Snooze / complete from notification shade | — | Yes |
| JSON backup export | Yes | — |

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

- **Monorepo:** `web/` (Next.js 16) + `android/` (Kotlin, minSdk 26)
- **Sync:** `POST /api/v1/sync` with last-write-wins and soft-delete tombstones
- **Auth:** bcrypt passwords, 15-minute access JWT, 90-day rotating refresh tokens

## Quick start

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) Postgres database
- Android Studio (for the mobile app)

### Web

```bash
cd web
cp .env.example .env.local
```

Set in `.env.local`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon pooled connection string |
| `JWT_SECRET` | At least 32 random characters |
| `REFRESH_PEPPER` | At least 32 random characters |
| `REGISTER_SECRET` | Secret required to register (solo use) |
| `NEXT_PUBLIC_APP_URL` | e.g. `http://localhost:3000` |

```bash
npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Android

1. Open `android/` in Android Studio.
2. Copy `android/local.properties.example` to `android/local.properties`.
3. Set your API URL:

```properties
# Emulator → host machine
API_BASE_URL=http://10.0.2.2:3000/api/v1

# Physical device → your LAN IP
# API_BASE_URL=http://192.168.x.x:3000/api/v1
```

4. Run on a device or emulator (JDK 17+).

### Deploy web (Vercel)

1. Import the `web/` directory as a Vercel project.
2. Add the same environment variables as `.env.local`.
3. Run `npm run db:push` against production Neon once before first deploy.

## Project structure

```
.
├── android/          # Jetpack Compose app (notifications + sync)
├── web/              # Next.js app + API routes
├── README.md
└── TESTING.md        # Manual E2E checklist
```

## API overview

Base path: `/api/v1`

- `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`
- `GET|POST /notes`, `GET|PATCH|DELETE /notes/:id`
- `POST /notes/:id/reminders`
- `POST /reminders/:id/complete`, `/reminders/:id/snooze`
- `POST /sync` — primary Android sync endpoint

## Design

Warm **ink + copper** palette, Syne + Source Sans 3 on web, timeline-first Today view, sidebar navigation. Preview mockups: `web/public/ui-preview.html`.

## License

Personal project — all rights reserved unless you add a license file.

## Author

Built for solo, daily use. Issues and PRs welcome if you fork or extend.
