# 1. Use JWT auth

## Status

Accepted

## Context

Recall's web API (`/api/v1/*`) and Android client both need authentication over email and
password. The API runs as Next.js route handlers, which may execute in serverless
instances, so session lookups on every request are costly. Android must stay signed in
across app restarts and tolerate intermittent network failures without logging the user
out. A second concern is replay protection for long-lived sessions.

The codebase stores users in Postgres with a `password_hash` column (`web/src/lib/db/schema.ts`)
and exposes register, login, refresh, logout, and me routes under `/api/v1/auth`.

## Decision

Use bcrypt (12 rounds) for password hashing (`hashPassword`/`verifyPassword`). Issue
short-lived (15-minute) HS256 JWT access tokens signed with `JWT_SECRET` via the `jose`
library (`signAccessToken`/`verifyAccessToken`). For persistence, issue 90-day refresh
tokens stored as SHA-256 hashes peppered with `REFRESH_PEPPER` in a `refresh_tokens`
table; deliver them to clients through an HttpOnly, SameSite=Lax `refresh_token` cookie.
Refresh is rotating: each refresh issues a new access token and a new refresh token and
revokes the old one. Logout revokes the supplied refresh token.

## Consequences

Access tokens are verified without a database hit, which suits serverless execution.
Refresh operations require a database transaction. Rotation limits replay value of a
stolen refresh token. `JWT_SECRET` and `REFRESH_PEPPER` must each be at least 32
characters and kept secret. Sessions expire after 90 days, requiring re-login. Android
keeps using its access token until expiry, so transient network errors do not force a
re-login. Revocation of an already-issued access token before its 15-minute expiry is not
supported.
