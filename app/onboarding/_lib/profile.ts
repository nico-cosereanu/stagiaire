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

export function isProfileComplete(profile: { name: string; slug: string } | undefined | null) {
  if (!profile) return false;
  return profile.name.trim().length > 0 && profile.slug.trim().length > 0;
}
