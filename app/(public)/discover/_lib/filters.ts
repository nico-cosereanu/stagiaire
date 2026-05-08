import "server-only";

import { and, arrayOverlaps, eq, ilike, inArray, isNotNull, sql } from "drizzle-orm";

import {
  restaurantProfiles,
  reviews,
  stageRequests,
  type ClosedWindow,
  type StagiaireToRestaurantRatings,
} from "@/db/schema";
import { db } from "@/lib/db";

/*
 * Discover-page filter parsing + querying.
 *
 * URL is the source of truth for filter state, so the page is shareable
 * and back-button works. We parse the searchParams into a normalised
 * Filters object, push what we can down to Postgres (stars, country,
 * city, cuisine, claimed), and then post-filter / sort by closure
 * conflicts in JS — the closedWindows are jsonb arrays small enough
 * that iterating 658 rows in app code is cheaper than pg-side jsonb
 * logic.
 *
 * Default availability model: kitchens are open. A restaurant only ever
 * looks "blocked" for a date range when it has explicitly published a
 * closure that overlaps. That's the minority case — most rows are
 * always-available — and we surface a badge only when there's a
 * conflict to mention.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type Filters = {
  q: string | null;
  startDate: string | null;
  endDate: string | null;
  stars: (1 | 2 | 3)[];
  country: string | null;
  city: string | null;
  cuisines: string[];
  verifiedOnly: boolean;
  // Minimum stagiaire-side review score (1-5). Filters to restaurants
  // whose published reviews average at or above this threshold.
  minRating: 1 | 2 | 3 | 4 | 5 | null;
  sort: "availability" | "stars" | "name";
};

export type SearchParams = Record<string, string | string[] | undefined>;

export function parseFilters(params: SearchParams): Filters {
  const stars = csvParam(params.stars)
    .map((s) => Number(s))
    .filter((n): n is 1 | 2 | 3 => n === 1 || n === 2 || n === 3);

  const start = singleParam(params.start);
  const end = singleParam(params.end);

  const sort = singleParam(params.sort);

  const qRaw = singleParam(params.q);
  const q = qRaw ? qRaw.trim() : null;

  const ratingRaw = Number(singleParam(params.rating));
  const minRating: Filters["minRating"] =
    ratingRaw === 1 || ratingRaw === 2 || ratingRaw === 3 || ratingRaw === 4 || ratingRaw === 5
      ? ratingRaw
      : null;

  return {
    q: q && q.length > 0 ? q : null,
    startDate: start && ISO_DATE.test(start) ? start : null,
    endDate: end && ISO_DATE.test(end) ? end : null,
    stars,
    country: singleParam(params.country),
    city: singleParam(params.city),
    cuisines: csvParam(params.cuisine),
    verifiedOnly: singleParam(params.verified) === "1",
    minRating,
    sort: sort === "stars" || sort === "name" ? sort : "availability",
  };
}

function singleParam(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v && v.length > 0 ? v : null;
}

function csvParam(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap((x) => x.split(",")).filter(Boolean);
  return v.split(",").filter(Boolean);
}

/*
 * Serialize Filters back into a URL-safe query object. Used by client
 * components when patching one filter without losing the others.
 */
export function filtersToQuery(f: Filters): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.q) out.q = f.q;
  if (f.startDate) out.start = f.startDate;
  if (f.endDate) out.end = f.endDate;
  if (f.stars.length) out.stars = f.stars.join(",");
  if (f.country) out.country = f.country;
  if (f.city) out.city = f.city;
  if (f.cuisines.length) out.cuisine = f.cuisines.join(",");
  if (f.verifiedOnly) out.verified = "1";
  if (f.minRating) out.rating = String(f.minRating);
  if (f.sort !== "availability") out.sort = f.sort;
  return out;
}

/*
 * Per-restaurant average review score, derived from the published
 * stagiaire-to-restaurant reviews. Each review averages its 5 numeric
 * rating categories; we then average across reviews per restaurant.
 *
 * Returns null entries are absent — callers should treat "no entry" as
 * "not yet reviewed" and exclude when filtering by minRating. With no
 * reviews in the system the map is empty, so a minRating filter with
 * any threshold gives an empty result set.
 */
async function getRestaurantAvgScores(): Promise<Map<string, number>> {
  const rows = await db
    .select({
      restaurantId: stageRequests.restaurantId,
      ratings: reviews.ratings,
    })
    .from(reviews)
    .innerJoin(stageRequests, eq(stageRequests.id, reviews.stageRequestId))
    .where(and(eq(reviews.direction, "s_to_r"), isNotNull(reviews.visibleAt)));

  const sums = new Map<string, { sum: number; count: number }>();
  for (const r of rows) {
    const ratings = r.ratings as StagiaireToRestaurantRatings;
    const score =
      (ratings.learningQuality +
        ratings.kitchenCulture +
        ratings.organization +
        ratings.hygiene +
        ratings.leadership) /
      5;
    const cur = sums.get(r.restaurantId) ?? { sum: 0, count: 0 };
    cur.sum += score;
    cur.count += 1;
    sums.set(r.restaurantId, cur);
  }

  const avgs = new Map<string, number>();
  for (const [id, { sum, count }] of sums) avgs.set(id, sum / count);
  return avgs;
}

export type DiscoverResult = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  stars: 1 | 2 | 3;
  cuisineTags: string[];
  blurb: string | null;
  heroImageUrl: string | null;
  claimed: boolean;
  hasClosures: boolean;
  // Coords are nullable in the schema; map view filters to non-null on the client.
  lat: number | null;
  lng: number | null;
  // Availability for the requested range; null when no date filter is active.
  availability: AvailabilityStats | null;
};

export type AvailabilityStats = {
  // Length of the requested range itself.
  rangeDays: number;
  // Days in the requested range that fall outside every closure (i.e. open).
  availableDays: number;
  // First closure that overlaps the range, surfaced for display.
  conflict: { startDate: string; endDate: string; note?: string } | null;
};

/*
 * Build the SQL where-conditions that correspond to a Filters object.
 * Shared by the discover list and the map pin query so both surfaces
 * honour the same constraints. Closure overlap is handled in JS by
 * callers since closedWindows is a jsonb array.
 */
function buildPgConditions(f: Filters) {
  const conditions = [];
  if (f.q) conditions.push(ilike(restaurantProfiles.name, `%${f.q}%`));
  if (f.stars.length) conditions.push(inArray(restaurantProfiles.stars, f.stars));
  if (f.country) conditions.push(eq(restaurantProfiles.country, f.country));
  if (f.city) conditions.push(ilike(restaurantProfiles.city, `%${f.city}%`));
  if (f.cuisines.length) {
    conditions.push(arrayOverlaps(restaurantProfiles.cuisineTags, f.cuisines));
  }
  if (f.verifiedOnly) conditions.push(isNotNull(restaurantProfiles.claimedByUserId));
  return conditions;
}

/*
 * Run the filtered query. Push what we can to Postgres, then post-filter
 * / score the in-memory rows for closure conflicts.
 *
 * Availability rule: a restaurant with no closedWindows is fully
 * available for any range. With closures, availableDays = rangeDays
 * minus the union of intersections with each closure, capped at zero.
 */
export async function queryRestaurants(f: Filters): Promise<DiscoverResult[]> {
  const conditions = buildPgConditions(f);

  const [rows, avgScores] = await Promise.all([
    db
      .select({
        id: restaurantProfiles.id,
        slug: restaurantProfiles.slug,
        name: restaurantProfiles.name,
        city: restaurantProfiles.city,
        country: restaurantProfiles.country,
        stars: restaurantProfiles.stars,
        cuisineTags: restaurantProfiles.cuisineTags,
        blurb: restaurantProfiles.blurb,
        heroImageUrl: restaurantProfiles.heroImageUrl,
        claimedByUserId: restaurantProfiles.claimedByUserId,
        closedWindows: restaurantProfiles.closedWindows,
        lat: restaurantProfiles.lat,
        lng: restaurantProfiles.lng,
      })
      .from(restaurantProfiles)
      .where(conditions.length ? and(...conditions) : undefined),
    f.minRating !== null ? getRestaurantAvgScores() : Promise.resolve(null),
  ]);

  const filteredRows = avgScores
    ? rows.filter((r) => {
        const s = avgScores.get(r.id);
        return s !== undefined && s >= f.minRating!;
      })
    : rows;

  const dateFilter = f.startDate && f.endDate ? { start: f.startDate, end: f.endDate } : null;

  const results: DiscoverResult[] = filteredRows.map((r) => {
    const closures = r.closedWindows ?? [];
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      city: r.city,
      country: r.country,
      stars: r.stars as 1 | 2 | 3,
      cuisineTags: r.cuisineTags ?? [],
      blurb: r.blurb,
      heroImageUrl: r.heroImageUrl,
      claimed: r.claimedByUserId !== null,
      hasClosures: closures.length > 0,
      lat: r.lat,
      lng: r.lng,
      availability: dateFilter
        ? computeAvailability(closures, dateFilter.start, dateFilter.end)
        : null,
    };
  });

  // Sort
  if (f.sort === "name") {
    results.sort((a, b) => a.name.localeCompare(b.name));
  } else if (f.sort === "stars") {
    results.sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name));
  } else {
    // "availability" — only meaningful with a date filter, otherwise
    // falls through to stars desc + name asc. With a date filter,
    // restaurants fully available for the range sort first.
    results.sort((a, b) => {
      if (a.availability && b.availability) {
        if (a.availability.availableDays !== b.availability.availableDays) {
          return b.availability.availableDays - a.availability.availableDays;
        }
      }
      return b.stars - a.stars || a.name.localeCompare(b.name);
    });
  }

  return results;
}

export type RestaurantPin = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  stars: 1 | 2 | 3;
  lat: number;
  lng: number;
  blurb: string | null;
};

/*
 * Same filter set as the discover list but trimmed to pin fields and
 * filtered to rows with coords (the globe needs lat/lng).
 *
 * Date-range handling: when a range is set, hide pins for restaurants
 * fully blocked during that range. Partially-blocked stays visible —
 * the stagiaire can still pick a sub-range that avoids the closure.
 */
export async function queryRestaurantPins(f: Filters): Promise<RestaurantPin[]> {
  const conditions = buildPgConditions(f);
  conditions.push(isNotNull(restaurantProfiles.lat));
  conditions.push(isNotNull(restaurantProfiles.lng));

  const [rows, avgScores] = await Promise.all([
    db
      .select({
        id: restaurantProfiles.id,
        slug: restaurantProfiles.slug,
        name: restaurantProfiles.name,
        city: restaurantProfiles.city,
        stars: restaurantProfiles.stars,
        lat: restaurantProfiles.lat,
        lng: restaurantProfiles.lng,
        blurb: restaurantProfiles.blurb,
        closedWindows: restaurantProfiles.closedWindows,
      })
      .from(restaurantProfiles)
      .where(and(...conditions)),
    f.minRating !== null ? getRestaurantAvgScores() : Promise.resolve(null),
  ]);

  const dateFilter = f.startDate && f.endDate ? { start: f.startDate, end: f.endDate } : null;

  return rows
    .filter((r): r is typeof r & { lat: number; lng: number } => r.lat !== null && r.lng !== null)
    .filter((r) => {
      if (!avgScores) return true;
      const s = avgScores.get(r.id);
      return s !== undefined && s >= f.minRating!;
    })
    .filter((r) => {
      if (!dateFilter) return true;
      const stats = computeAvailability(
        r.closedWindows ?? [],
        dateFilter.start,
        dateFilter.end,
      );
      return stats.availableDays > 0;
    })
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      city: r.city,
      stars: r.stars as 1 | 2 | 3,
      lat: r.lat,
      lng: r.lng,
      blurb: r.blurb,
    }));
}

/*
 * Availability stats for a [start, end] range against a restaurant's
 * closedWindows. Default = fully available; closures shave days off.
 *
 * `conflict` returns the first overlapping closure (sorted ascending)
 * so the result card has something concrete to render.
 */
export function computeAvailability(
  closures: ClosedWindow[],
  start: string,
  end: string,
): AvailabilityStats {
  const rangeDays = daysBetweenInclusive(start, end);
  if (closures.length === 0) {
    return { rangeDays, availableDays: rangeDays, conflict: null };
  }

  // Union of intersections: collect overlapping intervals, merge, sum.
  const overlaps: Array<{ start: string; end: string }> = [];
  let conflict: AvailabilityStats["conflict"] = null;
  for (const w of closures) {
    if (!w.startDate || !w.endDate) continue;
    const oStart = w.startDate > start ? w.startDate : start;
    const oEnd = w.endDate < end ? w.endDate : end;
    if (oStart <= oEnd) {
      overlaps.push({ start: oStart, end: oEnd });
      if (!conflict || w.startDate < conflict.startDate) {
        conflict = w.note
          ? { startDate: w.startDate, endDate: w.endDate, note: w.note }
          : { startDate: w.startDate, endDate: w.endDate };
      }
    }
  }

  if (overlaps.length === 0) {
    return { rangeDays, availableDays: rangeDays, conflict: null };
  }

  // Merge then sum. Sort by start, fold overlapping intervals.
  overlaps.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  let blocked = 0;
  let curStart = overlaps[0]!.start;
  let curEnd = overlaps[0]!.end;
  for (let i = 1; i < overlaps.length; i++) {
    const o = overlaps[i]!;
    if (o.start <= addOneDay(curEnd)) {
      if (o.end > curEnd) curEnd = o.end;
    } else {
      blocked += daysBetweenInclusive(curStart, curEnd);
      curStart = o.start;
      curEnd = o.end;
    }
  }
  blocked += daysBetweenInclusive(curStart, curEnd);

  return {
    rangeDays,
    availableDays: Math.max(0, rangeDays - blocked),
    conflict,
  };
}

function daysBetweenInclusive(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

function addOneDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

/*
 * Snapshot of facet options for the filter sidebar. Computed off the
 * full restaurant set (not the filtered set) so users see the full
 * choice list — typical search-UI convention.
 */
export type FacetOptions = {
  countries: string[];
  cuisines: { tag: string; count: number }[];
};

export async function getFacetOptions(): Promise<FacetOptions> {
  const [countriesRows, cuisinesRows] = await Promise.all([
    db
      .selectDistinct({ country: restaurantProfiles.country })
      .from(restaurantProfiles)
      .where(isNotNull(restaurantProfiles.country))
      .orderBy(restaurantProfiles.country),
    db.execute<{ tag: string; count: number }>(sql`
      select unnest(cuisine_tags) as tag, count(*)::int as count
      from restaurant_profiles
      where cuisine_tags is not null
      group by 1
      order by count desc, tag asc
    `),
  ]);

  return {
    countries: countriesRows.map((r) => r.country!).filter(Boolean),
    cuisines: cuisinesRows.map((r) => ({ tag: r.tag, count: r.count })),
  };
}
