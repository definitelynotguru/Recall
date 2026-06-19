## Pull requests

CI runs on every PR that touches `web/` or `android/`:

- **Web:** Postgres service container, `db:push`, lint, Vitest (including sync ownership integration tests), production build
- **Android:** unit tests, lint, debug APK assemble
- **Secret scan:** Gitleaks on full history
