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

## Secrets in CI

Forks should not enable maintainer deploy workflows without their own Vercel/Neon credentials. Never commit `.env.local`, `local.properties`, or tokens.
