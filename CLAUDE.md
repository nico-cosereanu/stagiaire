# Claude Code instructions for Stagiaire

Read this file first. Then read `PLAN.md` for the full product spec and `DECISIONS.md` for what's locked vs still open.

## Project status

**Planning phase.** No code has been scaffolded yet. The next time you're invoked, the user may ask you to:

1. Scaffold the project (Next.js 15 + Supabase + Drizzle + Tailwind + shadcn)
2. Seed the restaurants table from `data/michelin_starred_france.csv`
3. Build features in the order described in `PLAN.md` §20

Do not start scaffolding until the user explicitly says so. They may want to refine the plan or answer remaining open decisions first.

## Conventions

### Stack (locked)
- **Framework:** Next.js 15, App Router, React Server Components, Server Actions
- **Language:** TypeScript, strict mode
- **Styling:** Tailwind v4 + shadcn/ui (components live in `components/ui/`)
- **Database:** Supabase Postgres with Row-Level Security
- **ORM:** Drizzle (schema in `db/schema.ts`, migrations in `db/migrations/`)
- **Auth:** Supabase Auth (email + OAuth)
- **Storage:** Supabase Storage
- **Realtime:** Supabase Realtime (for messaging)
- **Globe:** react-globe.gl
- **Forms:** react-hook-form + zod
- **Email:** Resend + React Email
- **ID verification:** Stripe Identity
- **Analytics:** PostHog
- **Errors:** Sentry
- **Hosting:** Vercel

### Code style
- Server Components by default; mark client components explicitly with `"use client"`
- Server Actions for mutations; no API routes unless required by webhooks or third-party callbacks
- Zod schemas as the source of truth for validation; share between server and client
- Drizzle queries co-located with the feature, not in a giant `queries.ts`
- Tailwind classes via `cn()` helper; no inline styles
- Components named in PascalCase, files in kebab-case
- Avoid `any` and `as` casts — narrow types properly
- Functions return early; nest sparingly

### File organization
```
app/                    # Next.js App Router routes
  (public)/             # Public routes (landing, map, profiles)
  (auth)/               # Login, signup
  app/                  # Stagiaire dashboard
  restaurant/           # Restaurant dashboard
  admin/                # Admin
components/
  ui/                   # shadcn primitives
  features/             # Feature-grouped components
db/
  schema.ts             # Drizzle schema
  migrations/
  seed/
lib/
  auth.ts
  supabase.ts
  email/
data/                   # Seed CSV / JSON
docs/                   # Decision logs, ADRs as we accumulate them
```

### Commit messages
- Format: `feat: ...`, `fix: ...`, `chore: ...`, `refactor: ...`, `docs: ...`
- Imperative present tense, lowercase, no trailing period
- One concern per commit

### Git
- Trunk-based with short-lived feature branches
- PRs trigger Vercel preview deploys
- Squash-merge to `main`

### What NOT to do
- Don't introduce new top-level dependencies without checking with the user
- Don't change the data model without updating `PLAN.md` §14
- Don't add monetization, payments, or housing features — those are explicitly out of scope for v1
- Don't put restaurants below 1-star Michelin in the directory
- Don't fabricate chef names or restaurant team data — better to leave blank than guess

### Reading order when starting a new feature

1. `PLAN.md` — section relevant to the feature
2. `DECISIONS.md` — verify nothing has changed
3. `docs/architecture.md` — backend conventions (auth, RLS, server actions, etc.)
4. Existing schema in `db/schema.ts`
5. Existing route structure under `app/`
6. Then plan the change before writing code

### Build order (from PLAN.md §20)

1. Scaffold Next.js + Supabase + Tailwind + shadcn
2. Drizzle schemas matching PLAN §14
3. Seed restaurants from `data/michelin_starred_france.csv` (France-only for v0; world CSV available at `data/michelin_starred_world.csv` for later)
4. Auth flows (stagiaire + restaurant)
5. Restaurant profile page (public, read-only)
6. Stagiaire profile page (public, read-only)
7. Globe at `/map`
8. Edit flows for both profile types
9. Stage request lifecycle (submit → accept → messaging → completion → review)
10. Email notifications
11. Admin tooling
12. Polish, performance, SEO, mobile

Don't skip ahead — each step depends on the previous.
