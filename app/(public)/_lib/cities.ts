import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

/*
 * Top destinations for the homepage search-bar dropdown — ranked by
 * how many starred kitchens sit in each city. Mirrors Airbnb's
 * "Suggested destinations" pattern but driven by the directory rather
 * than search traffic (which we don't have yet).
 */

export type CitySuggestion = {
  city: string;
  country: string | null;
  count: number;
};

export async function getTopCities(limit = 8): Promise<CitySuggestion[]> {
  const rows = await db.execute<{ city: string; country: string | null; count: number }>(sql`
    select city, max(country) as country, count(*)::int as count
    from restaurant_profiles
    where city is not null
    group by city
    order by count desc, city asc
    limit ${limit}
  `);
  return rows.map((r) => ({
    city: r.city,
    country: r.country,
    count: r.count,
  }));
}
