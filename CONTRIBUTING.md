# Contributing to Recall

Thanks for your interest in Recall. This is a small monorepo with a Next.js web app, a Kotlin Android app, and shared detection fixtures.

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- JDK 17+ for Android
- A Postgres database (Neon works well) for local web development

## Setup

```bash
# Web
cd web
cp .env.example .env.local
# Fill in DATABASE_URL, JWT_SECRET, REFRESH_PEPPER, REGISTER_SECRET, NEXT_PUBLIC_APP_URL
npm install
npm run db:push
npm run dev

# Android
cd android
cp local.properties.example local.properties
# Set API_BASE_URL (emulator: http://10.0.2.2:3000/api/v1)
```

See [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) for deployment details.

## Tests

```bash
cd web && npm test && npm run build
cd android && ./gradlew :app:testDebugUnitTest
```

Integration tests in `web/src/lib/sync.integration.test.ts` require `DATABASE_URL`.

## Pull requests

1. Fork the repo and create a branch from `main`.
2. Keep changes focused; match existing code style.
3. Run web and Android unit tests before opening a PR.
4. Update docs if you change setup, env vars, or user-facing behavior.

## CI for forks

Default CI runs web unit tests and Android unit tests without production secrets. Maintainer workflows (`deploy-web`, `db-push`, `api-smoke`) are manual or require repository secrets.

## Questions

Open a GitHub issue for bugs, feature ideas, or setup help.
