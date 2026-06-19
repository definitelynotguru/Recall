# Self-hosting Recall

Recall is designed to run as your own web API + Postgres backend, with Android as the notification client.

## Overview

```
Web (Next.js)  →  Postgres (Neon)  ←  Android (Compose + Room)
```

- **Web** serves the UI and REST API at `/api/v1/*`.
- **Android** syncs via `POST /api/v1/sync` and schedules local notifications.
- **Web does not send push notifications** — only Android does.

## 1. Database (Neon or any Postgres)

1. Create a Postgres database.
2. Copy connection string for `DATABASE_URL`.

```bash
cd web
cp .env.example .env.local
```

Required variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Access token signing (random 32+ bytes) |
| `REFRESH_PEPPER` | Refresh token HMAC pepper |
| `REGISTER_SECRET` | Required to create new accounts via API |
| `NEXT_PUBLIC_APP_URL` | Public URL of the web app (e.g. `https://recall.example.com`) |

Apply schema:

```bash
npm install
npm run db:push
```

## 2. Web (Vercel or Node)

### Vercel

1. Import repo; set root directory to `web`.
2. Add env vars from `.env.example`.
3. Deploy.
4. Run `npm run db:push` against production `DATABASE_URL` when schema changes.

### Local dev

```bash
cd web
npm run dev
```

Open http://localhost:3000.

## 3. Android

```bash
cd android
cp local.properties.example local.properties
```

```properties
# Emulator → host machine
API_BASE_URL=http://10.0.2.2:3000/api/v1

# Device on LAN or production
# API_BASE_URL=https://recall.example.com/api/v1

# Optional: in-app APK updates from GitHub Releases
# UPDATE_APK_URL=https://github.com/YOUR_ORG/Recall/releases/download/v1.0.4-debug/recall-1.0.4-debug.apk
```

Build and install from Android Studio or:

```bash
./gradlew assembleDebug
```

Pre-built debug APKs are published to GitHub Releases (`v1.0.4-debug`). These are **debug-signed** — suitable for personal use, not Play Store distribution.

## 4. Registration policy

New accounts require `REGISTER_SECRET` in the register request body. Options:

- **Closed**: share the secret only with people you trust.
- **Open**: document the secret in your private deployment notes (not recommended for public instances).

## 5. Backup and restore

- **Web**: Settings → Export / Import JSON.
- **Android**: Settings → Export / Import JSON (sync after import to push to server).

## 6. Fork CI

Forks can run `web-test` and `build-apk` without maintainer secrets. Do not enable `deploy-web` or `db-push` unless you configure your own Vercel/Neon credentials.

Maintainer production URL (`recall-aevum-s-projects1.vercel.app`) is the upstream author's deployment, not a shared demo service. Forks should set GitHub repository variable `PRODUCTION_URL` / `PRODUCTION_API_URL` for smoke tests and APK builds.

## Troubleshooting

See root [README.md](../README.md) and [TESTING.md](../TESTING.md).

- **Android sync HTTP 400**: check `API_BASE_URL` ends with `/api/v1`; send debug report from Android Settings.
- **Session expired on web**: refresh cookie + access token rotation; re-login after 90-day refresh expiry.
