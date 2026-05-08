import type { MetadataRoute } from "next";

import { getAppOrigin } from "@/lib/site-url";

/*
 * Block crawlers from auth-gated and personal surfaces; let them roam
 * the directory and restaurant pages — those are the public asset.
 * Login + signup are noindex by convention (low-value duplicates of the
 * front door for SEO purposes).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/app/",
          "/restaurant/",
          "/admin/",
          "/api/",
          "/login",
          "/signup",
          "/u/",
        ],
      },
    ],
    sitemap: `${getAppOrigin()}/sitemap.xml`,
  };
}
