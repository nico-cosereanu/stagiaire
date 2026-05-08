import * as Sentry from "@sentry/nextjs";

/*
 * Edge-runtime Sentry init (middleware, edge route handlers).
 * Loaded by instrumentation.ts when the edge runtime boots.
 */

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? "development",
  });
}
