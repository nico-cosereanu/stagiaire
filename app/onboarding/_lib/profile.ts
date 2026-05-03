import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { stagiaireProfiles } from "@/db/schema";

/*
 * Helpers for reading + writing the stagiaire profile during onboarding.
 * All callers should requireUser() first; these functions trust the
 * userId argument is the authenticated user.
 */

export async function getProfile(userId: string) {
  return db.query.stagiaireProfiles.findFirst({
    where: eq(stagiaireProfiles.userId, userId),
  });
}

/*
 * Generate a unique slug from the stagiaire's name. If a collision exists
 * (someone else has the same kebab-cased name), append numeric suffix.
 *
 * Called only at the "name" step — after that, the slug is locked unless
 * we add a separate rename flow later.
 */
export async function generateUniqueSlug(name: string, ownUserId: string): Promise<string> {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (!base) return ownUserId.slice(0, 8); // pathological fallback

  let candidate = base;
  let suffix = 1;
  while (true) {
    const existing = await db.query.stagiaireProfiles.findFirst({
      where: eq(stagiaireProfiles.slug, candidate),
      columns: { userId: true },
    });
    if (!existing || existing.userId === ownUserId) return candidate;
    suffix++;
    candidate = `${base}-${suffix}`;
  }
}

type ProfileGateInput = {
  name: string;
  slug: string;
  identityVerificationStatus: "not_started" | "pending" | "verified" | "failed";
} | undefined | null;

/*
 * Profile is "complete enough to use /app" when name + slug exist AND
 * identity verification has at least been submitted (pending or verified).
 * A 'pending' user is shown a banner on the dashboard but not blocked,
 * since Stripe's review can take minutes and we don't want a hard wait.
 */
export function isProfileComplete(profile: ProfileGateInput) {
  if (!profile) return false;
  if (profile.name.trim().length === 0) return false;
  if (profile.slug.trim().length === 0) return false;
  if (profile.identityVerificationStatus === "not_started") return false;
  if (profile.identityVerificationStatus === "failed") return false;
  return true;
}

/*
 * Where to send a stagiaire whose profile fails the gate. Pick the first
 * unfinished step so they don't have to click through completed ones.
 */
export function firstIncompleteStepHref(profile: ProfileGateInput): string {
  if (!profile || profile.name.trim().length === 0 || profile.slug.trim().length === 0) {
    return "/onboarding/name";
  }
  if (
    profile.identityVerificationStatus === "not_started" ||
    profile.identityVerificationStatus === "failed"
  ) {
    return "/onboarding/verify";
  }
  return "/onboarding/name";
}
