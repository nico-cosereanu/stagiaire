import * as Sentry from "@sentry/nextjs";

/*
 * Client-side Sentry init. Loaded automatically by the Sentry webpack
 * plugin via `withSentryConfig`. No-ops when NEXT_PUBLIC_SENTRY_DSN is
 * unset so dev keeps quiet.
 *
 * tracesSampleRate is conservative (10%) — enough signal for the v0
 * launch without burning the free tier on background noise. Bump later
 * if we need finer-grained perf data.
 */

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  });
}
