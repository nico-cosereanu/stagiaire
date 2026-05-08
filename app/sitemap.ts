import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { restaurantProfiles } from "@/db/schema";
import { getAppOrigin } from "@/lib/site-url";

/*
 * Static front pages plus every restaurant. Stagiaire profiles are
 * intentionally omitted — they're publicly viewable but not something
 * we want crawled and indexed by default; chefs aren't the SEO target,
 * the directory is. Add them later behind an opt-in profile flag if a
 * stagiaire wants discoverability.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getAppOrigin();

  const restaurants = await db
    .select({
      slug: restaurantProfiles.slug,
      updatedAt: restaurantProfiles.updatedAt,
    })
    .from(restaurantProfiles);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/discover`, changeFrequency: "daily", priority: 0.9 },
  ];

  const restaurantEntries: MetadataRoute.Sitemap = restaurants.map((r) => ({
    url: `${origin}/r/${r.slug}`,
    lastModified: r.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...restaurantEntries];
}
