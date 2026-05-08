/*
 * Turbopack-compatible client-side Sentry entrypoint. Next 15+ with
 * --turbopack doesn't auto-load sentry.client.config.ts; this file is
 * the supported alternative and gets picked up by both runtimes.
 *
 * One source of truth — re-export the existing config so we don't drift.
 */
import "./sentry.client.config";
