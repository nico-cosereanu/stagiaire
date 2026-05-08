import * as Sentry from "@sentry/nextjs";

/*
 * Server-side Sentry init (Node runtime). Loaded by instrumentation.ts.
 * No-ops without a DSN.
 */

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? "development",
  });
}
