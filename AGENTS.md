# AGENTS.md

Guidance for autonomous coding agents working on **Recall**, a notes + reminders monorepo with a Next.js web/API app and a Kotlin Android client.

## Repository layout

| Path | Role |
| --- | --- |
| `web/` | Next.js 16 App Router UI + `/api/v1/*` REST API (Vercel + Neon Postgres) |
| `android/` | Jetpack Compose client, Room offline DB, notifications, widget, sync worker |
| `shared/` | Shared reminder-detection fixtures (JSON) used by web and Android tests |
| `docs/` | OpenAPI (`docs/openapi.yaml`), ADRs, self-hosting, branch-protection notes |
| `TESTING.md` | Manual + automated QA checklist (auth, sync, offline, e2e) |

`shared/` is **not** an npm/Gradle package. Web stages fixture JSON into `web/shared/` via `npm run stage-shared` (runs automatically on `predev` / `prebuild` / `pretest`).

## Prerequisites

- **Node.js 20+** (see `.nvmrc`)
- **Postgres** (Neon works; required for web API and integration tests)
- **JDK 17+** and Android SDK for the Android app
- Do **not** commit secrets: `web/.env.local`, `android/local.properties`

## Web app (`web/`)

### Setup

```bash
cd web
cp .env.example .env.local
# Fill DATABASE_URL, JWT_SECRET, REFRESH_PEPPER, REGISTER_SECRET, NEXT_PUBLIC_APP_URL
# JWT_SECRET and REFRESH_PEPPER must each be at least 32 characters
npm install
npm run db:push
npm run dev
```

Open http://localhost:3000.

Optional Redis rate limiting: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Without them, rate limiting uses an in-memory fallback.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server (stages shared fixtures first) |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint (includes complexity / max-lines warnings) |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check (CI) |
| `npm test` | Vitest with coverage thresholds |
| `npm run test:e2e` | Playwright smoke tests |
| `npm run knip` | Unused export / dependency detection |
| `npm run db:push` | Apply Drizzle schema to `DATABASE_URL` |
| `npm run db:generate` | Generate Drizzle migrations |

Root orchestration (optional): `make help`, `make ci-web`, `make ci-android`.

### Tests

```bash
cd web
npm test                          # unit + coverage thresholds (no DB for most)
npm run lint
npm run format:check
npm run build

# Integration tests that hit Postgres need DATABASE_URL (and secrets) set:
# web/src/lib/sync.integration.test.ts, web/src/lib/auth.integration.test.ts

# Playwright e2e (install Chromium once):
npx playwright install chromium
E2E_EMAIL=smoke@example.com E2E_PASSWORD=twelvecharpass npm run test:e2e
# Optional: E2E_REGISTER_SECRET=<same as REGISTER_SECRET>, E2E_BASE_URL=http://localhost:3000
```

Vitest includes: `src/**/*.test.ts` and `src/**/*.integration.test.ts`.

### Key web paths

- UI: `web/src/app/` (routes), `web/src/components/`, `web/src/hooks/`
- API: `web/src/app/api/v1/**/route.ts`
- Domain/lib: `web/src/lib/` (`auth.ts`, `sync.ts`, `sync-merge.ts`, `reminder-detect.ts`, `logger.ts`, `db/schema.ts`)
- Request ID: `web/src/proxy.ts` sets `X-Request-Id` on `/api/*`
- Health: `GET /api/v1/health`
- Schema/ORM: Drizzle (`web/src/lib/db/`, `web/drizzle/`)
- OpenAPI: `docs/openapi.yaml`

### Web conventions

- TypeScript with `strict: true` (`web/tsconfig.json`).
- ESLint via `eslint-config-next` (`web/eslint.config.mjs`); complexity warn at 20, max-lines warn at 500.
- Format with Prettier (`npm run format`). Do not hand-fight style.
- Prefer existing patterns in `web/src/lib/api-utils.ts` for JSON/auth helpers.
- Use `web/src/lib/logger.ts` for server logs (JSON + secret scrubbing). Never log tokens/passwords.
- Auth: short-lived Bearer access JWT + rotating refresh tokens; cookie refresh is CSRF-guarded (`SameSite=Strict` + `Sec-Fetch-Site`).
- Sync is dirty-upload + last-writer-wins; see ADR `docs/adr/0002-sync-protocol-over-rest-crud.md`.
- Keep API under `/api/v1`; do not invent unversioned public routes.
- Do not hardcode secrets. Use env vars from `.env.example` only as placeholders.
- Coverage floors live in `web/vitest.config.ts` (lib code). Keep or raise them; do not delete thresholds.

## Android app (`android/`)

### Setup

```bash
cp android/local.properties.example android/local.properties
# Emulator → host machine:
#   API_BASE_URL=http://10.0.2.2:3000/api/v1
# Device / production:
#   API_BASE_URL=https://<host>/api/v1
```

Open `android/` in Android Studio, or build with Gradle (JDK 17):

```bash
cd android
./gradlew :app:testDebugUnitTest
./gradlew detekt
./gradlew spotlessCheck
./gradlew :app:lintDebug
./gradlew :app:assembleDebug
# Auto-format Kotlin when needed:
./gradlew spotlessApply
```

Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

### Key Android paths

- UI: `android/app/src/main/java/com/notesreminders/app/ui/`
- Sync: `.../sync/SyncRepository.kt`, `SyncWorker.kt`, `SyncPayloadSanitizer.kt`
- Local DB: `.../data/local/` (Room)
- API client: `.../data/api/`
- Reminders/alarms: `.../reminders/`
- Unit tests: `android/app/src/test/`
- Instrumentation: `android/app/src/androidTest/`
- Detekt config: `android/app/detekt.yml`

### Android conventions

- Package: `com.notesreminders.app`.
- Offline-first: Room is source of truth on device; notifications only fire on Android (not web).
- `API_BASE_URL` **must** end with `/api/v1`.
- Sanitize dirty rows before upload (`SyncPayloadSanitizer`); permanent failures surface in Settings.
- Format Kotlin with Spotless/ktlint (`./gradlew spotlessApply`).
- Detekt enforces cyclomatic complexity and naming (Composable functions may use PascalCase). CI still sets `ignoreFailures = true` for gradual cleanup; do not add new hotspots.
- Prefer existing Compose Material3 / theme tokens in `ui/theme/`.

## Cross-cutting product rules

1. **Notes are Markdown** on both clients.
2. **Reminders** can be one-time or repeating; detection suggests candidates only — user confirms.
3. **Sync ownership**: server enforces user ownership; clients must not trust cross-user IDs.
4. **Registration** requires `REGISTER_SECRET` in the register body.
5. **Debug reports** may include email/sync diagnostics — treat as sensitive.
6. Shared detection fixtures live in `shared/`; update fixtures when changing reminder parsing, and keep web + Android tests green.

## CI workflows (`.github/workflows/`)

| Workflow | When | What |
| --- | --- | --- |
| `web-test.yml` | PR/push touching `web/**` or `shared/**` | Postgres service, `db:push`, lint, Vitest, build |
| `build-apk.yml` | PR/push touching `android/**` or `shared/**` | unit tests, detekt, lint, assemble debug APK |
| `secret-scan.yml` | push/PR | Gitleaks |
| `deploy-web.yml` | push to `main` (web/shared) | verify + Vercel prod deploy + smoke |
| `api-smoke.yml` | schedule / manual | production health/auth smoke |
| `db-push.yml` | manual/maintainer | schema push |

Forks: default CI does not need production secrets. Do not enable deploy/db-push without your own Vercel/Neon credentials.

## Tooling for agents

| Tool | Where | Notes |
| --- | --- | --- |
| Prettier | `web/` | `npm run format` / `format:check` |
| ESLint complexity | `web/eslint.config.mjs` | warn thresholds |
| knip | `web/knip.json` | unused deps/exports |
| Vitest coverage | `web/vitest.config.ts` | enforced floors |
| Spotless + ktlint | Android Gradle | `spotlessCheck` / `spotlessApply` |
| Detekt | `android/app/detekt.yml` | complexity + naming |
| pre-commit | `.pre-commit-config.yaml` | optional local hooks (secrets, large files, prettier, eslint) |
| Dependency updates | npm/Gradle/GitHub Actions manifests | Maintained manually |
| CODEOWNERS | `.github/CODEOWNERS` | default `@definitelynotguru` |
| Issue templates | `.github/ISSUE_TEMPLATE/` | bug + feature; priority P0–P3 |
| Labels | `docs/ISSUE_LABELS.md` | priority / type / area |

Install local hooks (optional): `pip install pre-commit && pre-commit install`.

## Safe change checklist

Before opening a PR:

1. Scope changes to the app you touch (`web/` and/or `android/`); update `shared/` fixtures if detection logic changes.
2. Run the relevant checks:
   - Web: `cd web && npm test && npm run lint && npm run format:check`
   - Android: `cd android && ./gradlew :app:testDebugUnitTest spotlessCheck`
   - Or: `make ci-web` / `make ci-android`
3. If schema changes: update Drizzle schema/migrations and document env impact; run `npm run db:push` locally.
4. If API changes: update `docs/openapi.yaml` and keep Android models in sync when fields are shared.
5. Never commit `.env`, `.env.local`, `local.properties`, tokens, or real database URLs.
6. Match existing code style; keep PRs focused. See `CONTRIBUTING.md` and `.github/pull_request_template.md`.
7. Label issues/PRs with priority (`P0`–`P3`) and area when applicable (`docs/ISSUE_LABELS.md`).

## Interactive QA (agent-followable)

Full checklist: [`TESTING.md`](TESTING.md).

Minimal web path:

```bash
cd web && cp .env.example .env.local   # configure secrets + DATABASE_URL
npm install && npm run db:push && npm run dev
# Register/login via UI or curl against /api/v1/auth/*
# Create a note, add a reminder, confirm /api/v1/health returns ok
```

Minimal Android path: point `API_BASE_URL` at the running API, install debug build, sign in, create a note offline, reconnect, confirm sync on web.

## More docs

- Product overview & API map: [`README.md`](README.md)
- Contributing: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Security / secrets: [`SECURITY.md`](SECURITY.md)
- Self-hosting: [`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md)
- Architecture decisions: [`docs/adr/`](docs/adr/)
