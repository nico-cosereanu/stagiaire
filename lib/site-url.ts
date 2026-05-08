/*
 * Public origin for absolute URLs (sitemap entries, OG tags, email CTAs,
 * Stripe return_url). Vercel sets VERCEL_URL on deployments; locally we
 * fall back to NEXT_PUBLIC_APP_URL or http://localhost:3000.
 *
 * No server-only import: this needs to be reachable from layout metadata
 * and any other surface that builds a URL.
 */
export function getAppOrigin(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
