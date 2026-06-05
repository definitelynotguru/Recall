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

| Route | Purpose |
|-------|---------|
| `/login` | Sign in / register |
| `/today` | Upcoming reminders timeline |
| `/notes` | Note list (search, pin, archive, tags) |
| `/notes/[id]` | Markdown editor + reminders |
| `/history` | Completed / cancelled reminders |
| `/settings` | Backup import/export, debug reports |

API lives under `/api/v1/*`.
