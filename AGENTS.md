# Recall — agent notes

Monorepo: `web/` (Next.js 16 + API), `android/` (Kotlin/Compose), `shared/` (Vitest fixtures).

## Cursor Cloud specific instructions

### Web (primary dev surface)

- **Dependencies:** `cd web && npm install` (see root `README.md` quick start).
- **Database:** The web app requires PostgreSQL via `DATABASE_URL` in `web/.env.local` (copy from `web/.env.example`). CI unit tests do not need a DB; `npm run dev`, `npm run build`, and API routes do.
- **Local Postgres:** If using the VM’s local PostgreSQL (`recall` / `recall_dev_password` on `localhost:5432`), start it with `sudo pg_ctlcluster 16 main start` before `npm run dev`. Apply schema with `cd web && npm run db:push` (loads `DATABASE_URL` from `.env.local` or the shell).
- **Dev server:** `cd web && npm run dev` → http://localhost:3000
- **Lint / test / build:** `npm run lint`, `npm test`, `npm run build` (all from `web/`).
- **Register users:** `POST /api/v1/auth/register` requires `register_secret` matching `REGISTER_SECRET` in `.env.local`; passwords must be ≥ 12 characters.

### Android (optional in cloud)

- Requires **Android SDK 35** (`ANDROID_HOME` or `android/local.properties` with `sdk.dir`). Without the SDK, `./gradlew :app:testDebugUnitTest` fails with “SDK location not found”.
- Point `API_BASE_URL` in `android/local.properties` at the dev API (emulator: `http://10.0.2.2:3000/api/v1`).

### No docker-compose

There is no in-repo database container. Use Neon (production) or local PostgreSQL for development.
