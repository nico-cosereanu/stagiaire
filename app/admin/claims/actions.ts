"use server";

import { revalidatePath } from "next/cache";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { restaurantClaims, restaurantProfiles } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export type DecisionResult = { ok: true } | { ok: false; error: string };

const idSchema = z.object({ claimId: z.string().uuid() });

/*
 * Approve a claim. Two writes that have to land together:
 *   - restaurant_claims row → status='approved' + audit fields
 *   - restaurant_profiles.claimed_by_user_id → claimant id
 *
 * Refuses if the restaurant is already claimed by a different account
 * (a second admin acting in parallel could trip this) — better to
 * surface than to silently clobber.
 *
 * Auto-rejects any other pending claims on the same restaurant since
 * v1 supports a single owner per restaurant.
 */
export async function approveClaimAction(
  _prev: DecisionResult | null,
  formData: FormData,
): Promise<DecisionResult> {
  const admin = await requireRole("admin");
  const parsed = idSchema.safeParse({ claimId: formData.get("claimId") });
  if (!parsed.success) return { ok: false, error: "Invalid claim id." };

  const claim = await db.query.restaurantClaims.findFirst({
    where: eq(restaurantClaims.id, parsed.data.claimId),
    columns: { id: true, restaurantId: true, userId: true, status: true },
  });
  if (!claim) return { ok: false, error: "Claim not found." };
  if (claim.status !== "pending") {
    return { ok: false, error: `Already ${claim.status}. Refresh the page.` };
  }

  const restaurant = await db.query.restaurantProfiles.findFirst({
    where: eq(restaurantProfiles.id, claim.restaurantId),
    columns: { id: true, slug: true, claimedByUserId: true },
  });
  if (!restaurant) return { ok: false, error: "Restaurant not found." };
  if (restaurant.claimedByUserId && restaurant.claimedByUserId !== claim.userId) {
    return {
      ok: false,
      error: "This restaurant is already claimed by another account. Reject this duplicate.",
    };
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(restaurantClaims)
      .set({
        status: "approved",
        reviewedAt: now,
        reviewedByAdminId: admin.id,
        updatedAt: now,
      })
      .where(eq(restaurantClaims.id, claim.id));

    await tx
      .update(restaurantProfiles)
      .set({ claimedByUserId: claim.userId, updatedAt: now })
      .where(eq(restaurantProfiles.id, restaurant.id));

    await tx
      .update(restaurantClaims)
      .set({
        status: "rejected",
        reviewedAt: now,
        reviewedByAdminId: admin.id,
        updatedAt: now,
      })
      .where(
        and(
          eq(restaurantClaims.restaurantId, restaurant.id),
          eq(restaurantClaims.status, "pending"),
        ),
      );
  });

  revalidatePath("/admin/claims");
  revalidatePath("/admin");
  revalidatePath(`/r/${restaurant.slug}`);
  revalidatePath("/restaurant");
  return { ok: true };
}

/*
 * Reject a claim. No reason captured for now — there's no column to
 * store it and we're not surfacing internal notes to claimants yet.
 * Add a notes column later if reviewer context is needed.
 */
export async function rejectClaimAction(
  _prev: DecisionResult | null,
  formData: FormData,
): Promise<DecisionResult> {
  const admin = await requireRole("admin");
  const parsed = idSchema.safeParse({ claimId: formData.get("claimId") });
  if (!parsed.success) return { ok: false, error: "Invalid claim id." };

  const claim = await db.query.restaurantClaims.findFirst({
    where: eq(restaurantClaims.id, parsed.data.claimId),
    columns: { id: true, status: true },
  });
  if (!claim) return { ok: false, error: "Claim not found." };
  if (claim.status !== "pending") {
    return { ok: false, error: `Already ${claim.status}. Refresh the page.` };
  }

  const now = new Date();
  await db
    .update(restaurantClaims)
    .set({
      status: "rejected",
      reviewedAt: now,
      reviewedByAdminId: admin.id,
      updatedAt: now,
    })
    .where(eq(restaurantClaims.id, claim.id));

  revalidatePath("/admin/claims");
  revalidatePath("/admin");
  revalidatePath("/restaurant");
  return { ok: true };
}
