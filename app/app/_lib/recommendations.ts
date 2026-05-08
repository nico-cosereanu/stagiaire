import "server-only";

import { and, eq, isNotNull, notInArray, sql } from "drizzle-orm";

import { experiences, restaurantProfiles } from "@/db/schema";
import { db } from "@/lib/db";

/*
 * "Restaurants like the kitchens you've worked in" — first-pass recommender.
 *
 * Signal stack (in order of weight):
 *   1. Cuisine-tag overlap with the user's prior restaurants
 *   2. Same star tier (heavily weighted) or adjacent tier (lighter)
 *   3. Verified by chef (tiny boost — better signal)
 *
 * Excludes restaurants the user has already worked at (matched via the
 * experiences.restaurant_id FK when present).
 *
 * Note: under the open-by-default availability model, every kitchen is
 * always actionable, so we no longer reward published windows here.
 *
 * Chef-lineage scoring (e.g. "you worked under X, here's where their
 * protégés cook now") is intentionally out of scope for v1 — team_members
 * is too sparse to drive useful matches yet.
 */

export type Recommendation = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  stars: 1 | 2 | 3;
  cuisineTags: string[];
  blurb: string | null;
  claimed: boolean;
  // Why this restaurant surfaced — drives the "because you cooked at …" line.
  reason: {
    sharedCuisines: string[];
    sameTierAs: string | null;
  };
  score: number;
};

export async function getRecommendationsForStagiaire(
  stagiaireId: string,
  limit = 6,
): Promise<Recommendation[]> {
  // 1. Pull the user's CV — restaurant_id, plus the matching restaurant
  //    so we know the cuisine + tier signal each entry carries.
  const cv = await db
    .select({
      restaurantId: experiences.restaurantId,
      restaurantName: experiences.restaurantName,
      cuisineTags: restaurantProfiles.cuisineTags,
      stars: restaurantProfiles.stars,
    })
    .from(experiences)
    .leftJoin(restaurantProfiles, eq(experiences.restaurantId, restaurantProfiles.id))
    .where(eq(experiences.stagiaireId, stagiaireId));

  // No experiences yet → nothing useful to recommend off the user's CV.
  // Caller decides what to render in that case (e.g. "complete your CV").
  if (cv.length === 0) return [];

  const workedAtIds = cv
    .map((e) => e.restaurantId)
    .filter((id): id is string => id !== null);

  // Aggregate signal: which cuisines + tiers does this user keep ending up in?
  const cuisineWeight = new Map<string, number>();
  const tierCount = new Map<1 | 2 | 3, number>();
  let canonicalRefName: string | null = null;
  let canonicalRefTier: 1 | 2 | 3 | null = null;

  for (const e of cv) {
    if (!e.cuisineTags) continue;
    for (const tag of e.cuisineTags) {
      cuisineWeight.set(tag, (cuisineWeight.get(tag) ?? 0) + 1);
    }
    if (e.stars) {
      tierCount.set(e.stars as 1 | 2 | 3, (tierCount.get(e.stars as 1 | 2 | 3) ?? 0) + 1);
      if (!canonicalRefName) {
        canonicalRefName = e.restaurantName;
        canonicalRefTier = e.stars as 1 | 2 | 3;
      }
    }
  }

  if (cuisineWeight.size === 0) return [];

  const userCuisines = [...cuisineWeight.keys()];
  const dominantTier = pickDominantTier(tierCount);

  // 2. Pull candidates: restaurants sharing at least one cuisine tag
  //    with the user's history, excluding those already worked at.
  const candidateConditions = [
    sql`${restaurantProfiles.cuisineTags} && ${userCuisines}::text[]`,
    isNotNull(restaurantProfiles.cuisineTags),
  ];
  if (workedAtIds.length > 0) {
    candidateConditions.push(notInArray(restaurantProfiles.id, workedAtIds));
  }

  const candidates = await db
    .select({
      id: restaurantProfiles.id,
      slug: restaurantProfiles.slug,
      name: restaurantProfiles.name,
      city: restaurantProfiles.city,
      stars: restaurantProfiles.stars,
      cuisineTags: restaurantProfiles.cuisineTags,
      blurb: restaurantProfiles.blurb,
      claimedByUserId: restaurantProfiles.claimedByUserId,
    })
    .from(restaurantProfiles)
    .where(and(...candidateConditions));

  // 3. Score in JS so weighting stays readable.
  const scored: Recommendation[] = candidates.map((c) => {
    const tags = c.cuisineTags ?? [];
    const shared = tags.filter((t) => cuisineWeight.has(t));
    const sharedScore = shared.reduce((sum, t) => sum + (cuisineWeight.get(t) ?? 0), 0);

    const tier = c.stars as 1 | 2 | 3;
    let tierScore = 0;
    if (dominantTier !== null) {
      if (tier === dominantTier) tierScore = 4;
      else if (Math.abs(tier - dominantTier) === 1) tierScore = 1.5;
    }

    const verifiedBoost = c.claimedByUserId !== null ? 0.5 : 0;

    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      city: c.city,
      stars: tier,
      cuisineTags: tags,
      blurb: c.blurb,
      claimed: c.claimedByUserId !== null,
      reason: {
        sharedCuisines: shared,
        sameTierAs: dominantTier === tier ? canonicalRefName : null,
      },
      score: sharedScore * 2 + tierScore + verifiedBoost,
    };
  });

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, limit);
}

function pickDominantTier(tierCount: Map<1 | 2 | 3, number>): 1 | 2 | 3 | null {
  let best: 1 | 2 | 3 | null = null;
  let bestCount = 0;
  for (const [tier, count] of tierCount) {
    if (count > bestCount) {
      best = tier;
      bestCount = count;
    }
  }
  return best;
}

