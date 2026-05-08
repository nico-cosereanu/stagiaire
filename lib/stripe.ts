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

export { getAppOrigin } from "./site-url";
