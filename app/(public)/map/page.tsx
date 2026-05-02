import type { Metadata } from "next";

import { MapView } from "@/components/features/map/map-view";
import { db } from "@/lib/db";
import { restaurantProfiles } from "@/db/schema";

/*
 * /map — public globe of all starred restaurants.
 *
 * Server Component. Fetches the full set (no pagination — 658 rows is
 * trivial for Postgres + a single network roundtrip) and hands it off
 * to the MapView client component, which holds filter state and
 * dynamically loads the WebGL globe canvas.
 *
 * RLS allows public SELECT on restaurant_profiles, so this works for
 * anon and authenticated visitors alike.
 */

export const metadata: Metadata = {
  title: "The map · Stagiaire",
  description:
    "Every Michelin-starred restaurant in France, plotted on a hand-inked globe. Click a pin to read about the restaurant.",
};

export type RestaurantPin = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  stars: number;
  lat: number;
  lng: number;
  blurb: string | null;
};

export default async function MapPage() {
  const rows = await db
    .select({
      id: restaurantProfiles.id,
      slug: restaurantProfiles.slug,
      name: restaurantProfiles.name,
      city: restaurantProfiles.city,
      stars: restaurantProfiles.stars,
      lat: restaurantProfiles.lat,
      lng: restaurantProfiles.lng,
      blurb: restaurantProfiles.blurb,
    })
    .from(restaurantProfiles);

  // Drop any rows missing coords (shouldn't happen with current seed,
  // but defensive — globe pins need lat/lng).
  const pins: RestaurantPin[] = rows
    .filter((r): r is typeof r & { lat: number; lng: number } => r.lat != null && r.lng != null)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      city: r.city,
      stars: r.stars,
      lat: r.lat,
      lng: r.lng,
      blurb: r.blurb,
    }));

  return <MapView pins={pins} />;
}
