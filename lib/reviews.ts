import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { reviews, stageRequests } from "@/db/schema";

export type { ReviewDirection } from "./reviews-shared";
export { STAGIAIRE_RATING_LABELS, RESTAURANT_RATING_LABELS } from "./reviews-shared";

const ratingScale = z.coerce.number().int().min(1).max(5);

export const stagiaireReviewSchema = z.object({
  learningQuality: ratingScale,
  kitchenCulture: ratingScale,
  organization: ratingScale,
  hygiene: ratingScale,
  leadership: ratingScale,
  hoursDescription: z.string().trim().min(1, "Tell us what hours were like").max(200),
  body: z
    .string()
    .trim()
    .max(2000, "Keep public notes under 2000 characters")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const restaurantReviewSchema = z.object({
  skill: ratingScale,
  attitude: ratingScale,
  reliability: ratingScale,
  brigadeFit: ratingScale,
  body: z
    .string()
    .trim()
    .max(2000, "Keep public notes under 2000 characters")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

/*
 * Call after inserting a review. If the other side has also submitted,
 * mark both visible and close the stage request. Idempotent — re-running
 * after both are visible is a no-op because the WHERE clause filters
 * out already-revealed rows.
 *
 * The 14-day fallback (reveal even if only one side wrote one) is a
 * scheduled job we'll add later — for now revealing requires both.
 */
export async function maybeRevealPair(stageRequestId: string): Promise<boolean> {
  const submitted = await db
    .select({ direction: reviews.direction })
    .from(reviews)
    .where(eq(reviews.stageRequestId, stageRequestId));

  const haveBoth =
    submitted.some((r) => r.direction === "s_to_r") &&
    submitted.some((r) => r.direction === "r_to_s");

  if (!haveBoth) return false;

  const now = new Date();
  await db
    .update(reviews)
    .set({ visibleAt: now })
    .where(and(eq(reviews.stageRequestId, stageRequestId), isNull(reviews.visibleAt)));

  await db
    .update(stageRequests)
    .set({ status: "closed", updatedAt: now })
    .where(eq(stageRequests.id, stageRequestId));

  return true;
}
