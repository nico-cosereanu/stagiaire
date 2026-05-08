import "server-only";

import { asc } from "drizzle-orm";

import { db } from "@/lib/db";
import { restaurantProfiles } from "@/db/schema";

/*
 * Full-directory autocomplete payload for the homepage search bar.
 * The directory is ~660 rows for France-only v0; shipping the whole list
 * is ~50KB and avoids a per-keystroke server roundtrip. If the directory
 * grows past ~5k we'll switch to a /api/suggest endpoint with debounced
 * fetch, but for now inline is the lighter path.
 */

export type RestaurantSuggestion = {
  slug: string;
  name: string;
  city: string | null;
  stars: number;
};

export async function getRestaurantSuggestions(): Promise<RestaurantSuggestion[]> {
  const rows = await db
    .select({
      slug: restaurantProfiles.slug,
      name: restaurantProfiles.name,
      city: restaurantProfiles.city,
      stars: restaurantProfiles.stars,
    })
    .from(restaurantProfiles)
    .orderBy(asc(restaurantProfiles.name));
  return rows;
}
