# Recall — Web

Next.js app (App Router) with embedded API routes, deployed on Vercel. Pairs with the Android client in the parent repo.

## Commands

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm run db:push      # Drizzle → Neon (run after pulling new migrations in web/drizzle/)
```

## Environment

Copy `.env.example` to `.env.local`. See the [root README](../README.md) for variable descriptions.

## Routes

| Route         | Purpose                                |
| ------------- | -------------------------------------- |
| `/login`      | Sign in / register                     |
| `/today`      | Upcoming reminders timeline            |
| `/notes`      | Note list (search, pin, archive, tags) |
| `/notes/[id]` | Markdown editor + reminders            |
| `/history`    | Completed / cancelled reminders        |
| `/settings`   | Backup import/export, debug reports    |

API lives under `/api/v1/*`.

## Dependency overrides

The npm overrides in `package.json` keep transitive build tools on patched
versions:

- `@babel/core` overrides the range from `eslint-plugin-react-hooks`. Remove it
  when that package's declared range resolves to a patched Babel release.
- `@esbuild-kit/core-utils > esbuild` replaces its unmaintained esbuild 0.18
  dependency. Remove it when Drizzle Kit no longer depends on
  `@esbuild-kit/esm-loader`.
