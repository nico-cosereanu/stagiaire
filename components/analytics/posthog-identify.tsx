"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

/*
 * Stitches the anonymous PostHog session to a real user. Mounted inside
 * authenticated layouts where the user is already loaded server-side, so
 * the call is cheap and runs once per page render.
 *
 * Calling identify() with the same distinct_id repeatedly is a no-op
 * after the first, so re-renders don't add cost.
 */

export function PostHogIdentify({
  userId,
  email,
  role,
}: {
  userId: string;
  email: string;
  role: string;
}) {
  useEffect(() => {
    if (!posthog.__loaded) return;
    posthog.identify(userId, { email, role });
  }, [userId, email, role]);

  return null;
}
