"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  messages,
  notifications,
  restaurantProfiles,
  reviews,
  stagiaireProfiles,
  stageRequests,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { canMarkComplete, canMessage, canRestaurantDecide, todayIso } from "@/lib/requests";
import { maybeRevealPair, restaurantReviewSchema } from "@/lib/reviews";
import {
  notifyRequestAccepted,
  notifyRequestDeclined,
  notifyReviewSubmittedByRestaurant,
  notifyStageCompleted,
} from "@/lib/email/notify";
import { capture } from "@/lib/analytics/server";

import type { ComposeResult } from "@/components/features/requests/compose-message";
import type { ReviewFormResult } from "@/components/features/requests/review-form";

/*
 * Restaurant-side mutations on a single stage request:
 *   - acceptRequest, declineRequest: state transitions
 *   - sendMessageAsRestaurant: post to thread
 *
 * Each action verifies the request is bound to a restaurant the
 * caller actually owns. claim ownership is the gate; admins are not
 * allowed through this path (they have their own admin tooling).
 *
 * On accept/decline we drop a notification for the stagiaire so their
 * inbox surfaces the change; emails come in a later step.
 */

const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a message")
    .max(4000, "Keep messages under 4000 characters"),
});

async function loadOwnedRequest(requestId: string, userId: string) {
  return db
    .select({
      id: stageRequests.id,
      status: stageRequests.status,
      stagiaireId: stageRequests.stagiaireId,
      endDate: stageRequests.endDate,
    })
    .from(stageRequests)
    .innerJoin(restaurantProfiles, eq(restaurantProfiles.id, stageRequests.restaurantId))
    .where(and(eq(stageRequests.id, requestId), eq(restaurantProfiles.claimedByUserId, userId)))
    .limit(1)
    .then((r) => r[0] ?? null);
}

export async function acceptRequest(formData: FormData): Promise<void> {
  const user = await requireRole("restaurant_owner");
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;

  const row = await loadOwnedRequest(id, user.id);
  if (!row) return;
  if (!canRestaurantDecide(row.status)) return;

  await db
    .update(stageRequests)
    .set({ status: "accepted", decidedAt: new Date(), updatedAt: new Date() })
    .where(eq(stageRequests.id, row.id));

  await db.insert(notifications).values({
    userId: row.stagiaireId,
    type: "stage_request_accepted",
    payload: { requestId: row.id },
  });
  await notifyRequestAccepted(row.id);
  await capture({
    distinctId: user.id,
    event: "stage_request_accepted",
    properties: { requestId: row.id, stagiaireId: row.stagiaireId },
  });

  revalidatePath("/restaurant/requests");
  revalidatePath(`/restaurant/requests/${row.id}`);
  revalidatePath("/app/requests");
  revalidatePath(`/app/requests/${row.id}`);
}

export async function declineRequest(formData: FormData): Promise<void> {
  const user = await requireRole("restaurant_owner");
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;

  const row = await loadOwnedRequest(id, user.id);
  if (!row) return;
  if (!canRestaurantDecide(row.status)) return;

  await db
    .update(stageRequests)
    .set({ status: "declined", decidedAt: new Date(), updatedAt: new Date() })
    .where(eq(stageRequests.id, row.id));

  await db.insert(notifications).values({
    userId: row.stagiaireId,
    type: "stage_request_declined",
    payload: { requestId: row.id },
  });
  await notifyRequestDeclined(row.id);
  await capture({
    distinctId: user.id,
    event: "stage_request_declined",
    properties: { requestId: row.id, stagiaireId: row.stagiaireId },
  });

  revalidatePath("/restaurant/requests");
  revalidatePath(`/restaurant/requests/${row.id}`);
  revalidatePath("/app/requests");
  revalidatePath(`/app/requests/${row.id}`);
}

export async function completeRequest(formData: FormData): Promise<void> {
  const user = await requireRole("restaurant_owner");
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;

  const row = await loadOwnedRequest(id, user.id);
  if (!row) return;
  if (!canMarkComplete(row.status, row.endDate, todayIso())) return;

  const now = new Date();
  await db
    .update(stageRequests)
    .set({ status: "reviewable", completedAt: now, updatedAt: now })
    .where(eq(stageRequests.id, row.id));

  await db.insert(notifications).values({
    userId: row.stagiaireId,
    type: "stage_request_completed",
    payload: { requestId: row.id },
  });
  await notifyStageCompleted(row.id);
  await capture({
    distinctId: user.id,
    event: "stage_completed",
    properties: { requestId: row.id, stagiaireId: row.stagiaireId },
  });

  revalidatePath("/restaurant/requests");
  revalidatePath(`/restaurant/requests/${row.id}`);
  revalidatePath("/app/requests");
  revalidatePath(`/app/requests/${row.id}`);
}

export async function sendMessageAsRestaurant(
  requestId: string,
  _prev: ComposeResult | null,
  formData: FormData,
): Promise<ComposeResult> {
  const user = await requireRole("restaurant_owner");

  const parsed = messageSchema.safeParse({
    body: (formData.get("body") as string | null) ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const row = await loadOwnedRequest(requestId, user.id);
  if (!row) return { ok: false, error: "Request not found" };
  if (!canMessage(row.status)) {
    return { ok: false, error: "Messaging is closed for this request" };
  }

  await db.insert(messages).values({
    stageRequestId: row.id,
    senderUserId: user.id,
    body: parsed.data.body,
  });

  await db.insert(notifications).values({
    userId: row.stagiaireId,
    type: "stage_request_message",
    payload: { requestId: row.id },
  });

  revalidatePath(`/restaurant/requests/${row.id}`);
  revalidatePath(`/app/requests/${row.id}`);
  return { ok: true };
}

export async function submitReviewAsRestaurant(
  requestId: string,
  _prev: ReviewFormResult | null,
  formData: FormData,
): Promise<ReviewFormResult> {
  const user = await requireRole("restaurant_owner");

  const parsed = restaurantReviewSchema.safeParse({
    skill: formData.get("skill"),
    attitude: formData.get("attitude"),
    reliability: formData.get("reliability"),
    brigadeFit: formData.get("brigadeFit"),
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

  const row = await loadOwnedRequest(requestId, user.id);
  if (!row) return { ok: false, error: "Request not found" };
  if (row.status !== "reviewable") {
    return { ok: false, error: "This stage isn't open for review" };
  }

  const existing = await db.query.reviews.findFirst({
    where: and(eq(reviews.stageRequestId, row.id), eq(reviews.direction, "r_to_s")),
    columns: { id: true },
  });
  if (existing) return { ok: false, error: "You've already submitted a review" };

  const { body, ...ratings } = parsed.data;
  await db.insert(reviews).values({
    stageRequestId: row.id,
    direction: "r_to_s",
    ratings,
    body,
    submittedAt: new Date(),
  });

  await maybeRevealPair(row.id);

  await db.insert(notifications).values({
    userId: row.stagiaireId,
    type: "stage_review_submitted",
    payload: { requestId: row.id },
  });
  await notifyReviewSubmittedByRestaurant(row.id);
  await capture({
    distinctId: user.id,
    event: "review_submitted",
    properties: { requestId: row.id, direction: "r_to_s" },
  });

  const stagiaire = await db.query.stagiaireProfiles.findFirst({
    where: eq(stagiaireProfiles.userId, row.stagiaireId),
    columns: { slug: true },
  });

  revalidatePath(`/restaurant/requests/${row.id}`);
  revalidatePath(`/app/requests/${row.id}`);
  if (stagiaire?.slug) revalidatePath(`/u/${stagiaire.slug}`);
  return { ok: true };
}
