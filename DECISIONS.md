# Stagiaire — Decisions log

Running record of decisions made during planning. Locked decisions go above the fold; open decisions go below. Update this file as decisions are made.

---

## Locked (do not revisit without good reason)

### Product
- **Name:** Stagiaire
- **Scope:** every 1, 2, and 3-star Michelin restaurant globally (~3,000). No Bib, no Selected, no unstarred.
- **Discovery primitive:** interactive 3D globe with medieval-cartography aesthetic.
- **Booking model:** hybrid — restaurants publish open windows; stagiaires submit specific date requests; restaurants accept/decline.
- **Account model:** one account per restaurant; stagiaire and restaurant are distinct roles.
- **Auth wall:** browsing public; any state-creating action (request, message, review, claim) requires sign-in.
- **Reviews:** two-way, symmetric reveal (hidden until both submit OR 14 days post-stage). Restaurant-side review becomes portable reference for stagiaire.
- **Stage length:** 2 days to 3 months, no enforced minimum or maximum within that range.
- **Pending request rule:** stagiaire can have many `pending`; only one `accepted` per overlapping date range.
- **Auto-expire:** 14 days no response → `expired`.
- **Counter-proposal:** v2. v1 uses chat + new request.

### Technical
- **Stack:** Next.js 15 + TS + Tailwind v4 + shadcn + Supabase + Drizzle + react-globe.gl + Vercel + Resend + Stripe Identity.
- **Web first.** Native mobile is v2+.
- **English only at launch.**

### Out of scope for v1
Monetization, payments, housing, visa, multi-seat restaurant accounts, calendar sync, gratification handling, counter-proposal, native mobile, multi-language, sub-Michelin restaurants.

---

## Open — answer before scaffolding

### 4. Domain
Deferred. Project will use a placeholder name (`stagiaire`) for repo / Supabase / Vercel until a real domain is chosen.

---

## Resolved

- **[2026-05-01] Team-with-names data source:** restaurants fill in their own team at claim time. No scraping, no crowdsourcing for v1. Acknowledge that team data will be sparse until restaurants engage with their profiles.
- **[2026-05-01] Stagiaire vetting bar:** verified email + verified ID only. No reference requirement before first request submission. References remain a profile feature (optional).
- **[2026-05-01] Legal posture for v1:** ship in gray zone. ToS places legal compliance burden on restaurants and stagiaires. Disclaimer at request submission. v2 path is school-affiliation + gratification handling for France/EU.
- **[2026-05-01] 90-day success metric:** 50 completed stages with both-side reviews submitted. Not signups. Not requests. Actual completed loops.
