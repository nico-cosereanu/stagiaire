"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

/*
 * Client-side PostHog wrapper. Mounted at the root so page views and
 * autocapture work everywhere. No-ops when NEXT_PUBLIC_POSTHOG_KEY isn't
 * set so dev keeps running without analytics.
 *
 * Identify happens separately in <PostHogIdentify /> inside dashboard
 * layouts where the user is already loaded server-side. Anonymous
 * sessions still record events with an auto-generated distinct_id;
 * identify stitches them to the user once they sign in.
 */

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    if (posthog.__loaded) return;

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: "history_change",
      capture_pageleave: true,
      person_profiles: "identified_only",
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
