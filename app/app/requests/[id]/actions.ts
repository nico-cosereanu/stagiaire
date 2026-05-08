"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { messages, notifications, restaurantProfiles, reviews, stageRequests } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { canMessage, canStagiaireWithdraw } from "@/lib/requests";
import { maybeRevealPair, stagiaireReviewSchema } from "@/lib/reviews";
import { notifyReviewSubmittedByStagiaire } from "@/lib/email/notify";
import { capture } from "@/lib/analytics/server";

import type { ComposeResult } from "@/components/features/requests/compose-message";
import type { ReviewFormResult } from "@/components/features/requests/review-form";

/*
 * Stagiaire-side mutations on a single stage request:
 *   - withdrawRequest: pull a still-pending submission
 *   - sendMessage: post to the request's thread
 *
 * Both re-check ownership and allowed-status because IDs in form data
 * are untrusted, and statuses change asynchronously (e.g. an accept
 * could land between the page render and the form submit).
 */

const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a message")
    .max(4000, "Keep messages under 4000 characters"),
});

export async function withdrawRequest(formData: FormData): Promise<void> {
  const user = await requireRole("stagiaire");
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;

  const row = await db.query.stageRequests.findFirst({
    where: and(eq(stageRequests.id, id), eq(stageRequests.stagiaireId, user.id)),
    columns: { id: true, status: true, restaurantId: true },
  });
  if (!row) return;
  if (!canStagiaireWithdraw(row.status)) return;

  await db
    .update(stageRequests)
    .set({ status: "withdrawn", decidedAt: new Date(), updatedAt: new Date() })
    .where(eq(stageRequests.id, row.id));

  // Notify the restaurant owner if the restaurant is claimed.
  const restaurant = await db.query.restaurantProfiles.findFirst({
    where: eq(restaurantProfiles.id, row.restaurantId),
    columns: { claimedByUserId: true },
  });
  if (restaurant?.claimedByUserId) {
    await db.insert(notifications).values({
      userId: restaurant.claimedByUserId,
      type: "stage_request_withdrawn",
      payload: { requestId: row.id },
    });
  }

  revalidatePath("/app/requests");
  revalidatePath(`/app/requests/${row.id}`);
  revalidatePath("/restaurant/requests");
}

export async function sendMessageAsStagiaire(
  requestId: string,
  _prev: ComposeResult | null,
  formData: FormData,
): Promise<ComposeResult> {
  const user = await requireRole("stagiaire");

  const parsed = messageSchema.safeParse({
    body: (formData.get("body") as string | null) ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const row = await db.query.stageRequests.findFirst({
    where: and(eq(stageRequests.id, requestId), eq(stageRequests.stagiaireId, user.id)),
    columns: { id: true, status: true, restaurantId: true },
  });
  if (!row) return { ok: false, error: "Request not found" };
  if (!canMessage(row.status)) {
    return { ok: false, error: "Messaging is closed for this request" };
  }

  await db.insert(messages).values({
    stageRequestId: row.id,
    senderUserId: user.id,
    body: parsed.data.body,
  });

  // Notify the restaurant owner if claimed.
  const restaurant = await db.query.restaurantProfiles.findFirst({
    where: eq(restaurantProfiles.id, row.restaurantId),
    columns: { claimedByUserId: true },
  });
  if (restaurant?.claimedByUserId) {
    await db.insert(notifications).values({
      userId: restaurant.claimedByUserId,
      type: "stage_request_message",
      payload: { requestId: row.id },
    });
  }

  revalidatePath(`/app/requests/${row.id}`);
  revalidatePath(`/restaurant/requests/${row.id}`);
  return { ok: true };
}

export async function submitReviewAsStagiaire(
  requestId: string,
  _prev: ReviewFormResult | null,
  formData: FormData,
): Promise<ReviewFormResult> {
  const user = await requireRole("stagiaire");

  const parsed = stagiaireReviewSchema.safeParse({
    learningQuality: formData.get("learningQuality"),
    kitchenCulture: formData.get("kitchenCulture"),
    organization: formData.get("organization"),
    hygiene: formData.get("hygiene"),
    leadership: formData.get("leadership"),
    hoursDescription: (formData.get("hoursDescription") as string | null) ?? "",
    body: (formData.get("body") as string | null) ?? "",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Please rate every category",
      field: typeof issue?.path[0] === "string" ? issue.path[0] : undefined,
    };
  }

  const row = await db.query.stageRequests.findFirst({
    where: and(eq(stageRequests.id, requestId), eq(stageRequests.stagiaireId, user.id)),
    columns: { id: true, status: true, restaurantId: true },
  });
  if (!row) return { ok: false, error: "Request not found" };
  if (row.status !== "reviewable") {
    return { ok: false, error: "This stage isn't open for review" };
  }

  const existing = await db.query.reviews.findFirst({
    where: and(eq(reviews.stageRequestId, row.id), eq(reviews.direction, "s_to_r")),
    columns: { id: true },
  });
  if (existing) return { ok: false, error: "You've already submitted a review" };

  const { body, ...ratings } = parsed.data;
  await db.insert(reviews).values({
    stageRequestId: row.id,
    direction: "s_to_r",
    ratings,
    body,
    submittedAt: new Date(),
  });

  await maybeRevealPair(row.id);

  const restaurant = await db.query.restaurantProfiles.findFirst({
    where: eq(restaurantProfiles.id, row.restaurantId),
    columns: { claimedByUserId: true, slug: true },
  });
  if (restaurant?.claimedByUserId) {
    await db.insert(notifications).values({
      userId: restaurant.claimedByUserId,
      type: "stage_review_submitted",
      payload: { requestId: row.id },
    });
    await notifyReviewSubmittedByStagiaire(row.id);
  }
  await capture({
    distinctId: user.id,
    event: "review_submitted",
    properties: { requestId: row.id, direction: "s_to_r" },
  });

  revalidatePath(`/app/requests/${row.id}`);
  revalidatePath(`/restaurant/requests/${row.id}`);
  if (restaurant?.slug) revalidatePath(`/r/${restaurant.slug}`);
  return { ok: true };
}
