import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    // Stagiaire photo uploads cap at 8 MB per file (enforced in lib/storage).
    // Default Server Action body limit is 1 MB — raise to 10 MB to leave room
    // for the file plus the surrounding form fields and multipart envelope.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    // Restaurant hero images are hot-linked from the Michelin Guide's
    // image CDN (cloudimg.io). Allows on-the-fly resize via ?width=N.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "axwwgrkdco.cloudimg.io",
      },
    ],
  },
};

/*
 * Wrap with Sentry. The plugin is mostly a no-op when SENTRY_AUTH_TOKEN
 * isn't set — it skips source-map uploads. Source maps still bundle
 * locally; they just don't ship to Sentry without the token.
 *
 * silent + tunnelRoute keep the build output clean and route the
 * client-side Sentry beacon through our domain so ad-blockers don't
 * eat error reports.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  tunnelRoute: "/monitoring",
  disableLogger: true,
});
