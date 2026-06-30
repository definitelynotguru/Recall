# 4. Use Tailwind and Next.js

## Status

Accepted

## Context

Recall needs a web app that serves both the user-facing UI and the JSON API from one
codebase. Requirements include server-side rendering for fast first paint, colocated API
routes, rapid styling iteration with a consistent design system (the warm "ink + copper"
palette, Syne and Source Sans 3 typefaces), and straightforward deployment. The data
layer is Postgres.

## Decision

Build the web app with Next.js using the App Router, with API routes colocated under
`/api/v1/*` and pages under `app/`. Style the UI with Tailwind CSS for utility-first,
consistent design tokens. Access Postgres (Neon) through Drizzle ORM, applying schema
with `db:push`. Deploy to Vercel with the required environment variables
(`DATABASE_URL`, `JWT_SECRET`, `REFRESH_PEPPER`, `REGISTER_SECRET`,
`NEXT_PUBLIC_APP_URL`).

## Consequences

The API and UI ship in a single deployable unit, simplifying releases. Tailwind keeps
CSS small and the design system consistent. Next.js route handlers run serverless, so the
in-memory rate limiter is effective per instance rather than globally. Drizzle migrations
are applied manually via `db:push` when the schema changes. Vendor lock-in is low because
the stack is standard Node/React/Postgres, but the deployment workflow is tuned for
Vercel.
