import "server-only";

import Stripe from "stripe";

/*
 * Stripe singleton. STRIPE_SECRET_KEY is server-only — never imported from a
 * client component or referenced via NEXT_PUBLIC_*. The webhook secret is
 * read separately at the webhook route.
 */

/*
 * Lazy proxy: don't throw at module load (so `next build` doesn't fail
 * just because the key is absent in CI). Throws on first method access
 * if the key isn't set.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    const real = new Stripe(key);
    return Reflect.get(real, prop, receiver);
  },
});

/*
 * Public origin for return_url callbacks. Vercel sets VERCEL_URL on
 * deployments; locally we fall back to NEXT_PUBLIC_APP_URL or http://localhost:3000.
 */
export function getAppOrigin(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
