"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { restaurantClaims, restaurantProfiles } from "@/db/schema";
import { requireRole } from "@/lib/auth";

import { hasPendingClaim } from "../_lib/owner";

/*
 * Submit a claim for a restaurant. Inserts into restaurant_claims with
 * status='pending'; an admin (us, manually for now) flips it to
 * 'approved' and sets restaurant_profiles.claimed_by_user_id, which
 * unlocks the editor on /restaurant.
 *
 * Refuses if:
 *   - the restaurant doesn't exist or is already claimed
 *   - this owner already has a pending claim (one at a time)
 */

const submitSchema = z.object({
  restaurantId: z.string().uuid("Pick a restaurant from the directory"),
  evidenceText: z
    .string()
    .min(20, "Tell us a bit more — at least a couple of sentences")
    .max(2000, "Keep it under 2,000 characters"),
  evidenceUrl: z
    .string()
    .url("Enter a full URL (https://…)")
    .max(500)
    .optional()
    .or(z.literal("")),
});

export type SubmitClaimResult =
  | { ok: true }
  | { ok: false; error: string; field?: "evidenceText" | "evidenceUrl" | "restaurantId" };

export async function submitClaimAction(
  _prev: SubmitClaimResult | null,
  formData: FormData,
): Promise<SubmitClaimResult> {
  const user = await requireRole("restaurant_owner");

  const parsed = submitSchema.safeParse({
    restaurantId: formData.get("restaurantId"),
    evidenceText: (formData.get("evidenceText") as string)?.trim(),
    evidenceUrl: (formData.get("evidenceUrl") as string)?.trim() || undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Invalid input",
      field: (issue?.path[0] as "evidenceText" | "evidenceUrl" | "restaurantId") ?? undefined,
    };
  }

  if (await hasPendingClaim(user.id)) {
    return {
      ok: false,
      error: "You already have a claim under review. Wait for it to clear before submitting another.",
    };
  }

  const restaurant = await db.query.restaurantProfiles.findFirst({
    where: eq(restaurantProfiles.id, parsed.data.restaurantId),
    columns: { id: true, claimedByUserId: true },
  });
  if (!restaurant) {
    return { ok: false, error: "That restaurant isn't in the directory." };
  }
  if (restaurant.claimedByUserId) {
    return { ok: false, error: "That restaurant has already been claimed by another account." };
  }

  await db.insert(restaurantClaims).values({
    restaurantId: parsed.data.restaurantId,
    userId: user.id,
    evidenceText: parsed.data.evidenceText,
    evidenceUrl: parsed.data.evidenceUrl || null,
  });

  redirect("/restaurant");
}

