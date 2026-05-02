# Stagiaire — Product Plan

**A platform for aspiring chefs to discover and book stages at Michelin-starred restaurants worldwide.**

---

## 1. Vision

Stagiaire is the global directory and booking layer for chef stages at the world's best restaurants. Every 1, 2, and 3-star Michelin restaurant on the planet is on the map from day one. A young cook in Mexico City can pull up the globe, find Mirazur, see the team, request a two-week stage, and chat with the chef de cuisine — all in one place. After the stage, both sides leave a review. Over time the platform becomes (a) the canonical kitchen-side view of what it's actually like to work at every great restaurant in the world, and (b) the place where chef careers are built.

**One-liner:** Airbnb for chef stages, with kitchen-side reviews.

---

## 2. Product principles

- **Aspirational from day one.** Only Michelin-starred restaurants. Quality scarcity > selection breadth.
- **The map is the product.** Discovery is visual, geographic, exploratory — not a search box.
- **Trust beats speed.** Every action that creates state requires a verified account. Reviews are tied to confirmed completed stages.
- **The kitchen is private.** Diner reviews are public; ours are a different category — written by people who worked there.
- **Restaurants are the scarce side.** Build for them first.

---

## 3. Users

### Stagiaires
Aspiring or working chefs (typically 18–32) seeking short-form learning experiences in elite kitchens. They have culinary school training, line cook experience, or both. They're often willing to travel internationally and stage unpaid in exchange for technique, exposure, and resume builds. Many are between jobs or on vacation from current roles.

### Restaurants
Michelin-starred restaurants who host stagiaires for free labor + future-hire scouting + reputation. Account is owned by one person — typically the chef, sous chef, or chef de cuisine — who manages requests.

### Admins (us)
Approve restaurant claims, handle disputes, moderate reviews, manage the underlying restaurant directory.

---

## 4. Value propositions

**For stagiaires:**
- Single global directory of every starred restaurant
- Visibility into what stage life is actually like at each place (kitchen-side reviews)
- Legitimate request flow vs cold DM lottery
- Portable verified resume + reference history

**For restaurants:**
- Pre-vetted candidates instead of inbox chaos
- Less time spent screening, scheduling, declining
- Scouting tool for future hires
- Reciprocal review system — the stagiaires they've trained are signal for their kitchen's quality

---

## 5. Scope at launch

**In:**
- Every 1, 2, and 3-star restaurant globally (~3,000) pre-populated, claimable
- Stagiaire signup, profile, portfolio, references
- Restaurant claim flow with verification
- Globe-based discovery
- Restaurant profile pages
- Stage request flow with hybrid availability model
- Pre-acceptance messaging
- Two-way reviews
- Email notifications

**Out (deferred to v2+):**
- Monetization, payments, payouts
- Housing / travel / visa support
- Restaurants below starred tier (Bib Gourmand, etc.)
- Native mobile apps (web only, mobile-responsive)
- Multi-language UI (English first)
- Counter-proposal flow (use chat + new request instead)
- Multi-seat restaurant accounts
- Calendar sync (Google/Apple cal)
- Gratification / paid-stage handling

---

## 6. Discovery experience — the globe

**Aesthetic direction:** the globe should look and feel like a medieval cartographer's map — hand-drawn coastlines, parchment textures, period-accurate calligraphy for region labels, sea monsters / cardinal-direction wind heads in the margins, restrained ornamentation. Less Google Earth, more *Mappa Mundi*. Pins should feel like waypoints inked onto the parchment, not modern UI elements. The rest of the product carries this through with editorial restraint — Apartamento meets Stripe Press meets a 15th-century atlas.

**Behavior:**
- Interactive 3D globe (rotate, zoom, pan)
- Pins for every starred restaurant, distinguished by tier:
  - 3-star: large filled marker
  - 2-star: medium marker
  - 1-star: small marker
- Filters: star tier, country/region, cuisine, language requirement
- Click pin → restaurant card opens (overlay, not new page):
  - Name, location, star count, cuisine
  - 2-sentence blurb
  - Head chef name + photo
  - Website + Instagram links
  - "View profile" CTA → full restaurant page

**Tech:** `react-globe.gl` (three.js wrapper). Custom dark material for the retro feel. Pin clustering at low zoom levels. Public — no login required.

---

## 7. Restaurant profile page

Public, indexable, opens from the card or direct URL.

- Hero photos (kitchen-first, not dining room)
- Name, stars, address, cuisine, opening year
- Long-form blurb / chef philosophy
- Photo gallery
- Menu (uploaded PDF or photo or rich text)
- **Team section** — head chef, sous chef, pastry chef, etc., with names and roles. Source: restaurants fill in their own team at claim time (locked). No scraping or crowdsourcing in v1; team data will be sparse until restaurants engage.
- Open windows (visible if restaurant has set them)
- Stagiaire reviews (kitchen-side, structured ratings + free text)
- "Request stage" CTA — opens calendar (login-walled)
- Verified badge if claimed

---

## 8. Stagiaire profile page

Public, the stagiaire's portable resume.

- Photo, name, current city, languages
- Short pitch / bio (why they stage)
- CV: schools, restaurants worked, prior stages — with dates and roles
- Portfolio: 5–10 dishes with photos, role, technique notes
- References (chefs who've vouched, verified by email confirmation)
- Reviews from past stages (restaurants reviewing them)
- ID-verified badge

---

## 9. Booking flow — hybrid availability

1. Restaurant publishes "open windows" — date ranges they're accepting stagiaire requests. Optional; restaurants without windows still receive requests.
2. Stagiaire selects specific dates on the restaurant's calendar. Range: 2 days to 3 months. Dates outside listed windows are flagged but allowed.
3. Stagiaire writes a cover message and submits.
4. Restaurant receives notification + sees stagiaire profile + cover message.
5. Pre-acceptance chat opens — either side can message.
6. Restaurant accepts, declines, or lets it expire (auto-decline at 14 days no response).
7. On accept: dates lock for stagiaire; their other overlapping pending requests don't auto-cancel but stagiaire is warned. Restaurant can see if stagiaire has competing accepts elsewhere.
8. Stage happens.
9. 14-day review window opens for both sides.

---

## 10. Stage request lifecycle (state machine)

```
[draft]
   ↓
submitted ──→ pending ─┬─→ accepted ──→ confirmed ──┬─→ completed ──→ reviewable ──→ closed
                       │                             ├─→ cancelled_by_stagiaire
                       │                             ├─→ cancelled_by_restaurant
                       │                             └─→ no_show
                       ├─→ declined
                       ├─→ withdrawn (by stagiaire)
                       └─→ expired (no response in 14d)
```

**Triggers per transition:**
- `submitted`: notification to restaurant, dates added to stagiaire's pending list
- `accepted`: notification to stagiaire, calendar block, review window scheduled
- `declined / withdrawn / expired`: notification to other party, dates released
- `completed`: review prompts to both parties, 14-day window starts
- `reviewable → closed`: both reviews submitted OR window closes

**Rules:**
- Stagiaires can have multiple `pending` requests at once.
- Stagiaires can have only one `accepted` request per overlapping date range.
- Restaurants can have many overlapping accepts (different stagiaires, different stations).
- Counter-proposal not in v1 — chat + new request instead.

---

## 11. Reviews

**Two-way, symmetric reveal.** Hidden from both parties until both submit, OR 14 days after stage end (whichever first). Then both publish simultaneously.

**Stagiaire → restaurant** (the differentiated layer):
- Structured ratings (1–5):
  - Learning quality
  - Kitchen culture / treatment
  - Organization / brigade discipline
  - Hours and intensity (described, not rated good/bad)
  - Hygiene
  - Leadership
- Free text (300–2000 chars)
- Optional flags: harassment, wage/hour issues, would not recommend

**Restaurant → stagiaire:**
- Structured ratings (1–5):
  - Skill level
  - Attitude
  - Reliability
  - Fit with brigade
- Free text recommendation (300–2000 chars)
- Becomes a portable reference attached to stagiaire profile

**Moderation:** flagged reviews go to admin queue. Defamation / abuse can be hidden. Original always preserved for audit.

---

## 12. Messaging

- Per-stage-request thread, opens as soon as request is submitted
- Persists through all states (including post-completion, for follow-up references)
- Plain text + image attachments
- No video calls, no scheduling tools in v1
- Email notification on new message; reply-via-email not supported in v1 (in-app reply only)

---

## 13. Trust & safety

**At signup:**
- Email verification mandatory
- ID verification for stagiaires (Stripe Identity or similar) before they can submit a request
- Restaurant claim verification — must prove association with the restaurant (provided email match against domain, or upload of business credentials, or admin manual review)

**Ongoing:**
- Reporting: any user can report another user, a review, or a message
- Admin moderation queue
- Dispute resolution path for cancelled / disputed stages
- Block + mute functionality

**Out for v1, important for v2:**
- Background checks
- Insurance coverage during stages
- Convention de stage / school-program integration for legal compliance

---

## 14. Data model

Core entities and key fields. Not exhaustive — the database scaffolder will fill in IDs, timestamps, soft-delete flags.

### `users`
`id, email, password_hash, role (stagiaire | restaurant_owner | admin), email_verified_at, created_at`

### `stagiaire_profiles`
`user_id, name, photo_url, bio, current_city, country, languages[], available_from, available_until, id_verified_at, slug`

### `restaurant_profiles`
`id, name, slug, address, lat, lng, city, country, stars (1|2|3), cuisine_tags[], blurb, long_description, website_url, instagram_handle, photos[], menu_url, claimed_by_user_id (nullable), open_windows[], created_at`

### `restaurant_claims`
`id, restaurant_id, user_id, evidence_text, evidence_url, status (pending | approved | rejected), reviewed_by_admin_id, created_at`

### `team_members`
`id, restaurant_id, name, role (head_chef | sous_chef | chef_de_cuisine | pastry_chef | etc), photo_url, source (claim | crowdsourced | scraped), verified`

### `experiences` (stagiaire CV)
`id, stagiaire_id, restaurant_name, restaurant_id (nullable, if it's on platform), role, station, started_on, ended_on, description`

### `dishes` (stagiaire portfolio)
`id, stagiaire_id, photo_url, title, role, technique_notes, sort_order`

### `references`
`id, stagiaire_id, referee_name, referee_email, referee_role, relationship, status (pending | confirmed | declined), confirmed_at`

### `stage_requests`
`id, stagiaire_id, restaurant_id, start_date, end_date, cover_message, status (see lifecycle), submitted_at, decided_at, completed_at, expires_at`

### `messages`
`id, stage_request_id, sender_user_id, body, attachment_urls[], sent_at, read_at`

### `reviews`
`id, stage_request_id, direction (s_to_r | r_to_s), ratings (jsonb of structured ratings), body, flags[], submitted_at, visible_at`

### `notifications`
`id, user_id, type, payload (jsonb), read_at, created_at`

### `audit_log`
`id, actor_user_id, action, target_type, target_id, payload, created_at`

---

## 15. Information architecture (pages)

### Public
- `/` — landing page (what is Stagiaire, CTA to map and signup)
- `/map` — globe / discovery
- `/r/[slug]` — restaurant profile
- `/u/[slug]` — stagiaire profile
- `/about`, `/legal`, `/safety`

### Auth
- `/signup` — role selector (stagiaire | restaurant)
- `/signup/stagiaire` — stagiaire signup flow
- `/signup/restaurant` — restaurant claim flow (search for your restaurant → submit evidence)
- `/login`, `/forgot-password`

### Stagiaire dashboard (`/app/...`)
- `/app` — overview: upcoming stages, pending requests, unread messages
- `/app/discover` — same as `/map` but with "request" affordances
- `/app/requests` — all my requests by status
- `/app/requests/[id]` — request detail: status, dates, restaurant, chat thread, actions
- `/app/messages` — all message threads
- `/app/profile` — edit my profile, portfolio, references
- `/app/reviews` — reviews of me from past stages
- `/app/settings` — account, notifications, ID verification

### Restaurant dashboard (`/restaurant/...`)
- `/restaurant` — overview: incoming requests, upcoming stages, unread messages
- `/restaurant/requests` — all incoming requests
- `/restaurant/requests/[id]` — request detail: stagiaire profile, chat, accept/decline
- `/restaurant/messages` — threads
- `/restaurant/profile` — edit restaurant profile, photos, menu, team
- `/restaurant/availability` — manage open windows
- `/restaurant/reviews` — reviews of my restaurant + my reviews of past stagiaires
- `/restaurant/settings`

### Admin (`/admin/...`)
- `/admin` — dashboard
- `/admin/claims` — restaurant claim approvals
- `/admin/reports` — flagged content / users
- `/admin/disputes` — disputed stages
- `/admin/restaurants` — restaurant directory CRUD

---

## 16. Decisions (resolved + open)

See `DECISIONS.md` for the canonical list. Summary as of 2026-05-01:

**Resolved:**
1. Team data source: restaurants fill in their own team at claim time. No scraping or crowdsourcing in v1.
2. Stagiaire vetting bar: verified email + verified ID. No reference required before first request.
3. Legal posture: ship in gray zone with ToS-based liability shift. v2 path is school-affiliation + gratification handling.
5. 90-day success metric: 50 completed stages with both-side reviews submitted.

**Open:**
4. Domain: deferred. Repo / Supabase / Vercel use `stagiaire` as placeholder until decided.

---

## 17. Tech stack

- **Framework:** Next.js 15.5.15 (App Router, React Server Components, Server Actions, Turbopack)
- **Styling:** Tailwind v4 + shadcn/ui
- **DB / auth / storage / realtime:** Supabase (Postgres + Row-Level Security + Auth + Storage + Realtime for messaging)
- **ORM:** Drizzle (works well with Supabase, type-safe, lighter than Prisma)
- **Globe:** react-globe.gl (three.js wrapper)
- **Forms:** react-hook-form + zod
- **Email:** Resend + React Email templates
- **ID verification:** Stripe Identity
- **Image uploads:** Supabase Storage with on-the-fly resizing via @vercel/og or imgproxy
- **Hosting:** Vercel (web), Supabase managed (db)
- **Analytics:** PostHog
- **Error tracking:** Sentry
- **Deployment / CI:** Vercel preview deploys, GitHub Actions for migrations

---

## 18. Branding & aesthetic

- **Core direction:** medieval cartography meets editorial minimalism. The globe is a hand-drawn world map; the surrounding UI is restrained, editorial, and spacious. Like opening a Renaissance atlas in a quiet library.
- **Name:** Stagiaire
- **Wordmark:** lowercase or small caps, possibly a humanist serif with subtle calligraphic inflection
- **Palette:** parchment / ink — warm off-white (vellum), deep brown-black (oak gall ink), a faded sepia mid-tone, single warm-red accent (Michelin red, used very sparingly for active states and 3-star markers)
- **Typography:** editorial serif for body and headings (Tiempos, Adobe Caslon, or similar humanist serif); a calligraphic display face for the globe labels and key headlines; clean grotesque only where readability demands it (forms, dashboards)
- **Photography:** documentary kitchen-realist — flour, hands, knives, prep lists. Treat photos to feel slightly desaturated, almost like illuminated-manuscript miniatures sit next to them comfortably.
- **Ornamentation:** sparingly used — drop caps on long blurbs, hairline rules, occasional small woodcut-style icons (knife, spoon, compass, etc.). Never decorative for its own sake.
- **Motion:** restrained throughout. The globe rotates and zooms; everything else is still or near-still.

**Design synthesis happens on first build session.** Reference imagery lives in `inspiration/` — Claude Code reads it when you start and produces `docs/design-direction.md`.

---

## 19. Phasing

### v0 — closed alpha (weeks 1–6)
- Auth, profiles, restaurant directory pre-populated, basic globe, request flow, messaging, reviews
- 1 city, 20 hand-recruited restaurants, 100 invited stagiaires
- No public landing page; invite-only

### v1 — public launch (weeks 6–14)
- All ~3,000 starred restaurants live as unclaimed profiles
- Public landing + globe
- Open signup for stagiaires (with vetting)
- Restaurant claim flow live
- Email notifications, basic admin tools
- Target: 50 completed stages in first 90 days post-launch

### v2 — depth (months 4–9)
- Counter-proposal flow
- School-affiliation / convention de stage handling for France
- Housing partnerships / travel grants
- Mobile-native (or PWA at minimum)
- Advanced search filters, saved searches
- Restaurant analytics ("you got 12 requests this month, 3 from cooks who've staged at 2-stars")

### v3 — adjacencies
- Equipment / knife / apparel partnerships
- Pop-up event hosting
- Hire-from-stage workflow (convert to full-time)
- Expand below-Michelin (Bib, regional standouts)

---

## 20. Build approach

**Tools:** Cursor for in-file iteration, Claude Code for autonomous multi-file work. Both read the same `CLAUDE.md` / `.cursorrules` at the repo root.

**Order of operations:**
1. Scaffold Next.js + Supabase + Tailwind + shadcn project
2. Set up Drizzle schemas matching §14
3. Seed restaurants table from `ngshiheng/michelin-my-maps` CSV (already have the data)
4. Auth flows (stagiaire signup, restaurant signup with claim)
5. Restaurant profile page (public, read-only first)
6. Stagiaire profile page (public, read-only first)
7. Globe at `/map` reading from seeded data
8. Edit flows — stagiaire and restaurant profiles
9. Stage request lifecycle: submission → accept/decline → messaging → completion → reviews
10. Email notifications (Resend)
11. Admin tooling for claims and disputes
12. Polish, performance, SEO, mobile responsive

**Branching:** trunk-based with short-lived feature branches. Vercel preview deploy per PR.

**Testing:** Vitest for unit, Playwright for E2E on critical flows (signup, request submission, accept, review). Don't over-invest in tests for v0; do invest before public launch.

---

## 21. What I (Claude) need from you to start building

When you hand this back:

- [ ] Confirm or override the §16 defaults (team data source, vetting bar, legal posture, domain, success metric)
- [ ] Any aesthetic refs you have (Pinterest board, sites you love)
- [ ] Logo direction or "design it"
- [ ] Cursor + Claude Code installed and authenticated
- [ ] An empty GitHub repo
- [ ] Supabase account + new project
- [ ] Vercel account linked to that repo
- [ ] Resend, Stripe, PostHog, Sentry accounts (can defer some until needed)

With those in place, I can scaffold the project, run migrations, seed the database, and have a logged-in user able to view restaurant profiles within the first build session.
