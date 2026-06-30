# Security policy

## Supported versions

Recall is a self-hosted personal notes app. Security fixes are applied on `main`.

## Reporting a vulnerability

Please **do not** open a public issue for security-sensitive reports.

Email the maintainer via GitHub (private security advisory) or open a minimal issue asking for a contact channel if advisories are unavailable.

## Secret scanning

CI runs [Gitleaks](https://github.com/gitleaks/gitleaks) on every push and pull request (`.github/workflows/secret-scan.yml`). Before making the repo public, also run locally:

```bash
gitleaks detect --source . --config .gitleaks.toml
```

Never commit `.env.local`, `android/local.properties`, API tokens, or production database URLs.

Include:

- Affected component (web API, Android app, sync)
- Steps to reproduce
- Impact assessment

## Self-hosting notes

- Rotate `JWT_SECRET`, `REFRESH_PEPPER`, and `REGISTER_SECRET` for every deployment.
- Use HTTPS in production; Android debug builds may allow cleartext for local dev only.
- `REGISTER_SECRET` gates new account creation; leave unset or strong in production.
- Debug reports may include user email and sync diagnostics — disable or restrict access if you do not need them.

## CSRF protection

Recall's API uses two complementary CSRF defenses depending on how a request is authenticated:

- **Bearer access tokens:** All state-changing endpoints (`/notes`, `/reminders`, `/sync`, `/tags`, `/backup/import`, `/debug/report`) require a `Bearer` access token in the `Authorization` header. Bearer tokens are not sent automatically by the browser, so these endpoints are immune to CSRF.
- **Refresh cookie:** The 90-day refresh token is stored in an `HttpOnly`, `SameSite=Strict` cookie. `SameSite=Strict` prevents the cookie from being sent on cross-site or top-level navigations. The `/auth/refresh` and `/auth/logout` endpoints additionally enforce same-origin on cookie-based calls: when the refresh token is read from the cookie (rather than the JSON body), a `Sec-Fetch-Site` header that is present and not `same-origin` or `none` is rejected with `401`. This blocks cross-site forged refresh/logout requests while still allowing legitimate same-origin fetch calls from the web app.

When a refresh token is supplied in the JSON body (e.g. from the Android app, which stores it client-side), the same-origin check is skipped because the request is not cookie-authenticated.

## Secrets in CI

Forks should not enable maintainer deploy workflows without their own Vercel/Neon credentials. Never commit `.env.local`, `local.properties`, or tokens.
