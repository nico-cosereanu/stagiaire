# Stagiaire — Backend Architecture

This document describes how the backend is organized. Read it alongside `PLAN.md` (product) and `CLAUDE.md` (conventions). The data model lives in `PLAN.md` §14.

---

## TL;DR

There is no separate backend service. The backend is **Next.js Server Components + Server Actions** running on Vercel, talking to **Supabase** (Postgres + Auth + Storage + Realtime) via **Drizzle ORM**. Cron and webhooks live as Next.js route handlers. If we ever need a real service, we extract it then — not now.

---

## System diagram

```
┌─────────────────────────────────────────────────┐
│  Browser (Next.js client components)            │
│  - Globe (react-globe.gl)                       │
│  - Calendars, chat UI, forms                    │
│  - Realtime message subscriptions               │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴───────────┐
        │                      │
┌───────▼────────┐    ┌────────▼─────────┐
│ Server Actions │    │ Server Components│
│ (mutations)    │    │ (reads)          │
│ Vercel runtime │    │ Vercel runtime   │
└───────┬────────┘    └────────┬─────────┘
        │                      │
        └──────────┬───────────┘
                   │  Drizzle (typed queries)
                   │
┌──────────────────▼──────────────────────────────┐
│  Supabase                                       │
│  ├── Postgres (data + Row-Level Security)       │
│  ├── Auth (cookie-based sessions)               │
│  ├── Storage (photos, evidence)                 │
│  └── Realtime (messages channel)                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Out-of-band                                    │
│  ├── Vercel Cron → app/cron/* daily             │
│  ├── Resend → transactional email               │
│  └── Stripe Identity → ID verification webhook  │
└─────────────────────────────────────────────────┘
```

---

## Where each concern lives

| Concern | Where it runs | What it uses |
|---|---|---|
| Data reads | Server Components | Drizzle |
| Data writes | Server Actions | Drizzle, Zod (validation) |
| Authentication | Supabase Auth | `@supabase/ssr` cookies |
| Authorization | Server Actions + Postgres RLS | Two layers: app + DB |
| File uploads | Server Actions → Supabase Storage | signed URLs |
| Realtime chat | Supabase Realtime channels | client-side subscription |
| Scheduled work | Vercel Cron → `app/cron/*` | one HTTP route per job |
| Webhooks | `app/api/webhooks/*` | signature-verified routes |
| Email | Resend SDK from server actions | React Email templates |
| Search | Postgres FTS + trigram | indexes on `restaurants` + `stagiaire_profiles` |

---

## Folder layout (backend-relevant)

```
db/
├── schema.ts              # all Drizzle table defs
├── migrations/            # generated SQL (drizzle-kit generate)
├── seed/
│   └── restaurants.ts     # seeds from data/michelin_starred_world.csv
└── policies.sql           # hand-written RLS policies, applied via migrations

lib/
├── db.ts                  # Drizzle client (server-only)
├── supabase/
│   ├── client.ts          # browser-side Supabase client
│   ├── server.ts          # server-side Supabase client (cookies)
│   └── admin.ts           # service-role client (privileged ops only — webhooks, cron)
├── auth.ts                # getCurrentUser(), requireUser(), requireRole()
├── email/
│   ├── send.ts            # Resend wrapper
│   └── templates/         # React Email components
├── storage.ts             # upload helpers, signed URL helpers
└── validators/            # Zod schemas shared between server and client

app/
├── (public)/              # marketing, map, public profiles
├── (auth)/                # login, signup, password reset
├── app/                   # stagiaire dashboard
│   └── requests/
│       ├── page.tsx              # list of my requests (RSC)
│       ├── [id]/
│       │   ├── page.tsx          # request detail (RSC)
│       │   └── actions.ts        # server actions colocated
│       └── _components/          # client components for this feature
├── restaurant/            # restaurant dashboard (mirror structure)
├── admin/                 # admin tooling
├── api/
│   └── webhooks/
│       ├── stripe/route.ts
│       └── resend/route.ts
└── cron/
    ├── expire-requests/route.ts
    ├── open-review-windows/route.ts
    └── close-review-windows/route.ts
```

**Co-location principle:** put server actions next to the page that uses them. Don't build a giant `server/actions/` directory. Features should be self-contained.

---

## Reads — Server Components

Server Components import Drizzle directly. The component IS the query.

```ts
// app/r/[slug]/page.tsx
import { db } from '@/lib/db'
import { restaurantProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function RestaurantPage({ params }: { params: { slug: string } }) {
  const restaurant = await db.query.restaurantProfiles.findFirst({
    where: eq(restaurantProfiles.slug, params.slug),
    with: { teamMembers: true, reviews: true },
  })
  if (!restaurant) notFound()
  return <RestaurantDetail restaurant={restaurant} />
}
```

No GraphQL, no `/api` routes, no fetchers. Direct DB → component.

---

## Writes — Server Actions

Server Actions live in `actions.ts` files next to the page that uses them. Pattern:

```ts
// app/restaurant/requests/[id]/actions.ts
'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import { stageRequests } from '@/db/schema'
import { requireUser, requireRole } from '@/lib/auth'
import { eq } from 'drizzle-orm'
import { sendEmail } from '@/lib/email/send'

const acceptInput = z.object({ requestId: z.string().uuid() })

export async function acceptStageRequest(input: z.infer<typeof acceptInput>) {
  const user = await requireRole('restaurant_owner')
  const { requestId } = acceptInput.parse(input)

  const request = await db.query.stageRequests.findFirst({
    where: eq(stageRequests.id, requestId),
    with: { restaurant: true, stagiaire: true },
  })

  if (!request || request.restaurant.claimedByUserId !== user.id) {
    return { ok: false, error: 'Not authorized' }
  }
  if (request.status !== 'pending') {
    return { ok: false, error: 'Already decided' }
  }

  await db.update(stageRequests)
    .set({ status: 'accepted', decidedAt: new Date() })
    .where(eq(stageRequests.id, requestId))

  await sendEmail({
    to: request.stagiaire.email,
    template: 'stage-accepted',
    data: { restaurantName: request.restaurant.name },
  })

  return { ok: true }
}
```

**Rules for actions:**
- Always `'use server'` at the top
- Always Zod-validate input
- Always check auth before touching data
- Return a discriminated result type (`{ ok: true } | { ok: false, error: string }`) — never throw for expected failures
- Side effects (email, etc.) happen after the DB write succeeds
- One action does one thing

---

## Authorization — two layers

### Layer 1: Application

Server Actions and Server Components check the user via `lib/auth.ts`:

```ts
export async function requireUser() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export async function requireRole(role: 'stagiaire' | 'restaurant_owner' | 'admin') {
  const user = await requireUser()
  const profile = await db.query.users.findFirst({ where: eq(users.id, user.id) })
  if (profile?.role !== role) throw new Error('Forbidden')
  return profile
}
```

### Layer 2: Database (Row-Level Security)

Every table has RLS enabled. Policies live in `db/policies.sql`. This is defense-in-depth — even if a Server Action forgets to check, Postgres refuses.

Example policies for `stage_requests`:

```sql
ALTER TABLE stage_requests ENABLE ROW LEVEL SECURITY;

-- Stagiaires can read their own requests
CREATE POLICY stage_requests_stagiaire_select
  ON stage_requests FOR SELECT
  USING (stagiaire_id = auth.uid());

-- Restaurant owners can read requests for their restaurants
CREATE POLICY stage_requests_restaurant_select
  ON stage_requests FOR SELECT
  USING (restaurant_id IN (
    SELECT id FROM restaurant_profiles WHERE claimed_by_user_id = auth.uid()
  ));

-- Stagiaires can insert their own requests
CREATE POLICY stage_requests_stagiaire_insert
  ON stage_requests FOR INSERT
  WITH CHECK (stagiaire_id = auth.uid());

-- Restaurant owners can update status on their restaurant's requests
CREATE POLICY stage_requests_restaurant_update_status
  ON stage_requests FOR UPDATE
  USING (restaurant_id IN (
    SELECT id FROM restaurant_profiles WHERE claimed_by_user_id = auth.uid()
  ));
```

Critical to get right; easy to get wrong. Test policies with the Supabase SQL editor as different users before shipping.

---

## Authentication — Supabase Auth

- Email + password (primary) and Google OAuth (optional, can defer to v1.5)
- Session lives in HTTP-only cookies via `@supabase/ssr`
- Middleware (`middleware.ts`) refreshes session on every request and gates protected paths
- `auth.uid()` is available as a SQL function, used by RLS

Why not NextAuth/Auth.js: Supabase Auth integrates directly with Postgres RLS. One vendor, one source of truth for users. Avoids syncing user records between an auth provider and the database.

---

## Storage

Supabase Storage buckets:

| Bucket | Read access | Write access |
|---|---|---|
| `restaurant-photos` | public | claimed restaurant owner only |
| `stagiaire-photos` | public | own user only |
| `dish-photos` | public | own user only |
| `claim-evidence` | private (admin only) | own user during claim flow |

Uploads go through a Server Action that gets a signed URL from Supabase, then the client PUTs directly. Image optimization handled by `next/image` with Supabase as the source.

---

## Realtime

Used **only** for the chat thread on a stage request. Everything else is server-rendered.

Pattern: client component subscribes to `messages` table filtered by `stage_request_id`, with RLS ensuring the user can only see threads they're part of.

```ts
'use client'
const channel = supabase
  .channel(`messages:${stageRequestId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages',
      filter: `stage_request_id=eq.${stageRequestId}` },
    (payload) => addMessage(payload.new))
  .subscribe()
```

---

## Scheduled work — Vercel Cron

Daily at 03:00 UTC, cron hits these routes:

| Route | Job |
|---|---|
| `/cron/expire-requests` | Set `pending` requests > 14d old to `expired`, notify both parties |
| `/cron/open-review-windows` | For stages that ended yesterday, set `reviewable`, send review prompts |
| `/cron/close-review-windows` | For stages 14d past completion, freeze reviews, reveal whatever was submitted |
| `/cron/digest-emails` | (v1.5) Weekly digest of new requests / matches |

Each route checks a secret query param against `CRON_SECRET` env var to prevent random callers.

```ts
// app/cron/expire-requests/route.ts
export async function GET(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('secret') !== process.env.CRON_SECRET) {
    return new Response('Forbidden', { status: 403 })
  }
  // ...do work
  return Response.json({ expired: count })
}
```

Configured in `vercel.json`:
```json
{
  "crons": [
    { "path": "/cron/expire-requests?secret=$CRON_SECRET", "schedule": "0 3 * * *" }
  ]
}
```

---

## Webhooks

External services call us at `app/api/webhooks/[provider]/route.ts`.

| Provider | Purpose | What we do |
|---|---|---|
| Stripe Identity | ID verification finished | Set `id_verified_at` on stagiaire profile |
| Resend | Email bounce / spam complaint | Mark email as bouncing on user, prevent future sends |

Always verify the signature first. Always idempotent (check if event already processed by `event_id`).

---

## Background jobs — deferred

For v1, anything async runs **inline** in the Server Action that triggers it: send the email, wait for the response, return. Acceptable latency for 99% of cases.

When inline gets slow (likely after we're sending hundreds of emails per day), we add **Inngest** or **Trigger.dev** as a typed job queue. Not before.

---

## Search

Postgres full-text + trigram, no external service:

- `tsvector` column on `restaurant_profiles` (name + city + cuisine) with GIN index
- Trigram index for fuzzy match on stagiaire names
- Total dataset is ~3,000 restaurants — Postgres handles this in microseconds

When and only when this stops being fast enough, we add Typesense (self-hosted) or Algolia. v3 problem.

---

## Email — Resend + React Email

Templates live in `lib/email/templates/` as React components. Renders to HTML + plain text on the server before sending.

Key transactional emails for v1:
- `welcome-stagiaire`, `welcome-restaurant`
- `stage-request-received` (to restaurant)
- `stage-accepted`, `stage-declined`, `stage-expired`
- `message-received`
- `review-window-open`, `review-window-closing`
- `claim-approved`, `claim-rejected`

Reply-via-email not supported in v1. All replies happen in-app.

---

## Environment variables

Lives in `.env.local` (gitignored). Production values set in Vercel project settings.

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-only, NEVER exposed

# Database (Drizzle uses direct Postgres connection)
DATABASE_URL=                        # supabase Postgres URI with pgbouncer

# Email
RESEND_API_KEY=
EMAIL_FROM=hello@stagiaire.app

# Cron
CRON_SECRET=                         # random 32+ char string

# Stripe (defer until ID verification ships)
STRIPE_SECRET_KEY=
STRIPE_IDENTITY_WEBHOOK_SECRET=

# Analytics / errors (defer until launch prep)
NEXT_PUBLIC_POSTHOG_KEY=
SENTRY_DSN=
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and is used **only** in webhook routes and cron jobs. Never imported into Server Components or Server Actions used by regular request flow.

---

## Testing approach

- **Vitest** for unit tests on validators, helpers, action logic
- **Playwright** for E2E on the critical paths: signup → submit request → accept → message → review
- **No tests for v0** (closed alpha). Add E2E coverage of the full happy path before public launch.
- RLS policies tested in Supabase SQL editor by impersonating each role; this catches the highest-cost bugs.

---

## Logging & observability

- `console.log` in Server Actions / route handlers; Vercel captures stdout
- **Sentry** for unhandled errors (add at launch prep)
- **PostHog** for product events (`stage_requested`, `stage_accepted`, `review_submitted`) — added when the funnel matters
- Audit log table for moderation-relevant actions (claims approved/rejected, reviews flagged, accounts disabled)

---

## Deployment

- `main` branch → Vercel production
- PR branches → Vercel preview deploys
- Migrations run via GitHub Action on merge to `main` (`drizzle-kit migrate`)
- Database backups: Supabase's automatic daily backups for v1 (upgrade to point-in-time recovery before launch)

---

## Things deliberately not in v1

- Background job queue (use inline)
- External search service (use Postgres)
- Caching layer (rely on Vercel's edge cache for static + RSC streaming)
- Multi-region database (one Supabase region is fine for ≤10K users)
- Rate limiting (add when first abuse appears, use Upstash + middleware)
- Feature flags (add when first A/B test is needed; PostHog has them)

When any of these become a bottleneck, we add them. Not before.
