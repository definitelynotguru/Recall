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

## Tests and quality

```bash
# Web
cd web && npm test && npm run lint && npm run format:check && npm run build

# Android
cd android && ./gradlew :app:testDebugUnitTest spotlessCheck detekt

# Or from repo root
make ci-web
make ci-android
```

Integration tests in `web/src/lib/sync.integration.test.ts` require `DATABASE_URL`.

Optional local hooks:

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

## Pull requests

1. Fork the repo and create a branch from `main`.
2. Keep changes focused; match existing code style (Prettier on web, Spotless/ktlint on Android).
3. Run web and Android unit tests before opening a PR.
4. Update docs if you change setup, env vars, or user-facing behavior.
5. Use issue templates and priority labels (`P0`–`P3`). See [docs/ISSUE_LABELS.md](docs/ISSUE_LABELS.md).
6. Agent-oriented setup lives in [AGENTS.md](AGENTS.md).

## CI for forks

Default CI runs web unit tests and Android unit tests without production secrets. Maintainer workflows (`deploy-web`, `db-push`, `api-smoke`) are manual or require repository secrets.

## Questions

Open a GitHub issue for bugs, feature ideas, or setup help.
