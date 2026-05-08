import * as Sentry from "@sentry/nextjs";

/*
 * Next.js instrumentation entrypoint. Picks the right Sentry config for
 * the runtime the request is handled by — Node for server actions and
 * route handlers, Edge for middleware and edge routes.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
