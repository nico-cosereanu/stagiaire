import "server-only";

import { inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { restaurantProfiles } from "@/db/schema";

/*
 * "Hot restaurants" — a ranked roll-up of kitchens with recent activity:
 * accepted/completed stages in the last 60 days, fresh reviews, or
 * recent claims. Each restaurant carries a `hotReason` the UI can
 * surface as a badge.
 *
 * Today the signal tables (stage_requests, reviews) are empty, so the
 * real query returns nothing and we fall through to a curated placeholder
 * set. The wiring is real — once stages are flowing, this swaps over
 * automatically without any UI changes.
 */

export type HotReason = {
  label: string;
  kind: "stagiaires" | "reviews" | "claimed" | "trending";
};

export type HotRestaurant = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  stars: 1 | 2 | 3;
  blurb: string | null;
  heroImageUrl: string | null;
  hotReason: HotReason;
  hotScore: number;
};

/*
 * Slugs used to populate the strip when no real activity exists yet.
 * Order matters — it's the display order. Reasons are obviously fake;
 * the kind shapes the badge styling so it's not pretending to be a
 * stat ("trending this week" vs "12 stagiaires this month").
 */
const PLACEHOLDER_HOT: { slug: string; reason: HotReason }[] = [
  {
    slug: "le-clos-des-sens-annecy",
    reason: { label: "Trending this week", kind: "trending" },
  },
  {
    slug: "la-villa-madie-cassis",
    reason: { label: "Heating up", kind: "trending" },
  },
  {
    slug: "maison-lameloise-chagny",
    reason: { label: "On the line", kind: "trending" },
  },
  {
    slug: "auberge-du-vieux-puits-fontjoncouse",
    reason: { label: "Buzzing right now", kind: "trending" },
  },
];

export async function getHotRestaurants(limit = 4): Promise<HotRestaurant[]> {
  const scored = await aggregateSignals(limit);

  // De-dup against the real-signal results so the placeholder doesn't
  // duplicate something already chosen on merit.
  const seen = new Set(scored.map((s) => s.slug));
  const filler = await fetchPlaceholders(limit - scored.length, seen);

  return [...scored, ...filler].slice(0, limit);
}

/*
 * Real signal aggregation. Returns rows ranked by:
 *   recent_stagiaires * 3 + recent_reviews * 2 + recently_claimed
 *
 * Currently returns [] because stage_requests / reviews are empty,
 * but the wiring is here so this becomes the default path the moment
 * activity exists.
 */
async function aggregateSignals(limit: number): Promise<HotRestaurant[]> {
  const rows = await db.execute<{
    id: string;
    slug: string;
    name: string;
    city: string | null;
    stars: number;
    blurb: string | null;
    hero_image_url: string | null;
    recent_stagiaires: number;
    recent_reviews: number;
    recently_claimed: number;
  }>(sql`
    select
      r.id,
      r.slug,
      r.name,
      r.city,
      r.stars,
      r.blurb,
      r.hero_image_url,
      coalesce(s.recent_stagiaires, 0)::int as recent_stagiaires,
      coalesce(s.recent_reviews, 0)::int as recent_reviews,
      case
        when r.claimed_by_user_id is not null and r.updated_at > now() - interval '30 days'
        then 1 else 0
      end as recently_claimed
    from restaurant_profiles r
    left join (
      select
        sr.restaurant_id,
        count(distinct case
          when sr.status in ('accepted', 'completed')
            and sr.created_at > now() - interval '60 days'
          then sr.id
        end) as recent_stagiaires,
        count(distinct case
          when rv.visible_at > now() - interval '60 days'
          then rv.id
        end) as recent_reviews
      from stage_requests sr
      left join reviews rv on rv.stage_request_id = sr.id
      group by sr.restaurant_id
    ) s on s.restaurant_id = r.id
    where
      coalesce(s.recent_stagiaires, 0) > 0
      or coalesce(s.recent_reviews, 0) > 0
      or (r.claimed_by_user_id is not null and r.updated_at > now() - interval '30 days')
    order by (
      coalesce(s.recent_stagiaires, 0) * 3
      + coalesce(s.recent_reviews, 0) * 2
      + case
          when r.claimed_by_user_id is not null and r.updated_at > now() - interval '30 days'
          then 1 else 0
        end
    ) desc
    limit ${limit}
  `);

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    city: r.city,
    stars: r.stars as 1 | 2 | 3,
    blurb: r.blurb,
    heroImageUrl: r.hero_image_url,
    hotReason: pickReason(r),
    hotScore: r.recent_stagiaires * 3 + r.recent_reviews * 2 + r.recently_claimed,
  }));
}

function pickReason(r: {
  recent_stagiaires: number;
  recent_reviews: number;
  recently_claimed: number;
}): HotReason {
  if (r.recent_stagiaires > 0) {
    return {
      label: `${r.recent_stagiaires} stagiaire${r.recent_stagiaires === 1 ? "" : "s"} this month`,
      kind: "stagiaires",
    };
  }
  if (r.recent_reviews > 0) {
    return {
      label: `${r.recent_reviews} new review${r.recent_reviews === 1 ? "" : "s"}`,
      kind: "reviews",
    };
  }
  if (r.recently_claimed) {
    return { label: "Recently claimed", kind: "claimed" };
  }
  return { label: "Trending", kind: "trending" };
}

/*
 * Fill the strip from the curated PLACEHOLDER_HOT set. Used when
 * real signals don't yield enough rows to fill `limit`.
 */
async function fetchPlaceholders(need: number, exclude: Set<string>): Promise<HotRestaurant[]> {
  if (need <= 0) return [];

  const candidates = PLACEHOLDER_HOT.filter((p) => !exclude.has(p.slug)).slice(0, need);
  if (candidates.length === 0) return [];

  const rows = await db
    .select({
      id: restaurantProfiles.id,
      slug: restaurantProfiles.slug,
      name: restaurantProfiles.name,
      city: restaurantProfiles.city,
      stars: restaurantProfiles.stars,
      blurb: restaurantProfiles.blurb,
      heroImageUrl: restaurantProfiles.heroImageUrl,
    })
    .from(restaurantProfiles)
    .where(
      inArray(
        restaurantProfiles.slug,
        candidates.map((c) => c.slug),
      ),
    );

  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  return candidates
    .map((c) => {
      const r = bySlug.get(c.slug);
      if (!r) return null;
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        city: r.city,
        stars: r.stars as 1 | 2 | 3,
        blurb: r.blurb,
        heroImageUrl: r.heroImageUrl,
        hotReason: c.reason,
        hotScore: 0,
      } satisfies HotRestaurant;
    })
    .filter((r): r is HotRestaurant => r !== null);
}
