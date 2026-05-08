import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { restaurantClaims, restaurantProfiles } from "@/db/schema";

/*
 * Helpers for the restaurant owner side. The dashboard's three states
 * (no claim / pending / approved) are computed from these reads.
 *
 * Convention: pass userId from requireRole('restaurant_owner') in the
 * caller — these helpers trust it.
 */

export type OwnerClaim = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  status: "pending" | "approved" | "rejected";
  evidenceText: string | null;
  createdAt: Date;
};

/*
 * The most recent claim by this owner, regardless of status. We surface
 * the latest one even if rejected so the user sees what happened.
 */
export async function getLatestClaim(userId: string): Promise<OwnerClaim | null> {
  const [row] = await db
    .select({
      id: restaurantClaims.id,
      restaurantId: restaurantClaims.restaurantId,
      restaurantName: restaurantProfiles.name,
      restaurantSlug: restaurantProfiles.slug,
      status: restaurantClaims.status,
      evidenceText: restaurantClaims.evidenceText,
      createdAt: restaurantClaims.createdAt,
    })
    .from(restaurantClaims)
    .innerJoin(restaurantProfiles, eq(restaurantProfiles.id, restaurantClaims.restaurantId))
    .where(eq(restaurantClaims.userId, userId))
    .orderBy(desc(restaurantClaims.createdAt))
    .limit(1);
  return row ?? null;
}

/*
 * The restaurant this owner has been confirmed against — i.e. the row
 * where claimed_by_user_id matches. There is at most one in v1.
 */
export async function getOwnedRestaurant(userId: string) {
  return db.query.restaurantProfiles.findFirst({
    where: eq(restaurantProfiles.claimedByUserId, userId),
  });
}

/*
 * Returns true if this owner already has a pending claim. Prevents
 * stacking claims while one is still under review.
 */
export async function hasPendingClaim(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: restaurantClaims.id })
    .from(restaurantClaims)
    .where(and(eq(restaurantClaims.userId, userId), eq(restaurantClaims.status, "pending")))
    .limit(1);
  return Boolean(row);
}

/*
 * Search unclaimed restaurants by name or city. Used by the claim page.
 *
 * 658 rows is small enough that pulling all unclaimed rows once and
 * filtering in JS is faster than SQL ILIKE without a trigram index.
 * Revisit when the directory grows past a few thousand.
 */
export async function searchUnclaimed(query: string) {
  const q = query.trim();
  if (q.length < 2) return [];

  const rows = await db
    .select({
      id: restaurantProfiles.id,
      name: restaurantProfiles.name,
      slug: restaurantProfiles.slug,
      city: restaurantProfiles.city,
      country: restaurantProfiles.country,
      stars: restaurantProfiles.stars,
    })
    .from(restaurantProfiles)
    .where(isNull(restaurantProfiles.claimedByUserId));

  const lower = q.toLowerCase();
  return rows
    .filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        (r.city?.toLowerCase().includes(lower) ?? false),
    )
    .slice(0, 20);
}
