# Recall — Web

Next.js app (App Router) with embedded API routes, deployed on Vercel. Pairs with the Android client in the parent repo.

## Commands

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm run db:push      # Drizzle → Neon
```

## Environment

Copy `.env.example` to `.env.local`. See the [root README](../README.md) for variable descriptions.

## Routes

| Route | Purpose |
|-------|---------|
| `/login` | Sign in / register |
| `/today` | Upcoming reminders timeline |
| `/notes` | Note list |
| `/notes/[id]` | Markdown editor + reminders |
| `/settings` | Backup export |

API lives under `/api/v1/*`.
