import "server-only";

import { PostHog } from "posthog-node";

/*
 * Server-side capture for marketplace events (request submitted, accepted,
 * etc.). Client-side posthog-js handles page views + autocapture; this is
 * for events that fire from server actions where we can't trust the client.
 *
 * No-ops + logs when POSTHOG_API_KEY isn't set, so dev keeps working.
 *
 * flushAt:1 / flushInterval:0 = send each event immediately. We're on a
 * serverless runtime where the function may exit before a batched flush.
 */

let cached: PostHog | null = null;

function getClient(): PostHog | null {
  if (cached) return cached;
  const key = process.env.POSTHOG_API_KEY;
  if (!key) return null;
  cached = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
  return cached;
}

export type CaptureArgs = {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
};

export async function capture(args: CaptureArgs): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn(`[analytics] POSTHOG_API_KEY missing — skipping ${args.event}`);
    return;
  }
  try {
    client.capture({
      distinctId: args.distinctId,
      event: args.event,
      properties: args.properties,
    });
    // flush() drains the queue without tearing down the client, so the
    // singleton stays usable across captures within a warm function.
    await client.flush();
  } catch (err) {
    console.error(`[analytics] capture failed for ${args.event}:`, err);
  }
}
