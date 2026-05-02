# Stagiaire

Airbnb for chef stages, with kitchen-side reviews. Global directory of every Michelin-starred restaurant.

**Status:** planning. Not yet scaffolded. See [PLAN.md](./PLAN.md).

## What's in this folder

- [`PLAN.md`](./PLAN.md) — the full product plan (vision → data model → IA → tech stack → phasing)
- [`DECISIONS.md`](./DECISIONS.md) — running log of decisions made and still open
- [`CLAUDE.md`](./CLAUDE.md) — instructions for Claude Code when scaffolding & building
- [`.cursorrules`](./.cursorrules) — same instructions for Cursor
- [`data/`](./data/) — seed data (Michelin restaurants CSV)

## How to build

Once decisions in [DECISIONS.md](./DECISIONS.md) are answered:

```bash
cd ~/Desktop/STAGIAIRE
claude    # or open the folder in Cursor
```

Tell Claude Code: **"Read PLAN.md and CLAUDE.md, then scaffold the project."**

## Stack (planned)

Next.js 15 · Tailwind v4 · shadcn/ui · Supabase (auth + Postgres + storage + realtime) · Drizzle · react-globe.gl · Vercel · Resend · Stripe Identity · PostHog · Sentry
