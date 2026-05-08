import "server-only";

import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  restaurantProfiles,
  stageRequests,
  stagiaireProfiles,
  users,
} from "@/db/schema";

import { sendEmail, getAppOrigin } from "./send";
import * as templates from "./templates";

/*
 * One notify() per state transition. Each call:
 *   1. loads the shared request context (joined profiles + emails)
 *   2. selects the recipient (stagiaire or restaurant owner)
 *   3. renders the template, hands to sendEmail (which never throws)
 *
 * Recipients are always opt-out-able later via a notifications-prefs
 * table; for v0 every state-transition email goes out unconditionally.
 *
 * If the restaurant is unclaimed, restaurant-bound emails are skipped
 * silently — same gate the action sites already apply for the in-app
 * notifications row.
 */

type RequestContext = {
  requestId: string;
  startDate: string;
  endDate: string;
  stagiaireUserId: string;
  stagiaireName: string;
  stagiaireEmail: string | null;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  ownerUserId: string | null;
  ownerEmail: string | null;
};

async function loadRequestContext(requestId: string): Promise<RequestContext | null> {
  const row = await db
    .select({
      requestId: stageRequests.id,
      startDate: stageRequests.startDate,
      endDate: stageRequests.endDate,
      stagiaireUserId: stageRequests.stagiaireId,
      stagiaireName: stagiaireProfiles.name,
      restaurantId: stageRequests.restaurantId,
      restaurantName: restaurantProfiles.name,
      restaurantSlug: restaurantProfiles.slug,
      ownerUserId: restaurantProfiles.claimedByUserId,
    })
    .from(stageRequests)
    .innerJoin(stagiaireProfiles, eq(stagiaireProfiles.userId, stageRequests.stagiaireId))
    .innerJoin(restaurantProfiles, eq(restaurantProfiles.id, stageRequests.restaurantId))
    .where(eq(stageRequests.id, requestId))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!row) return null;

  const userIds: string[] = [row.stagiaireUserId];
  if (row.ownerUserId) userIds.push(row.ownerUserId);

  const userRows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.id, userIds));
  const emailById = new Map(userRows.map((u) => [u.id, u.email]));

  return {
    ...row,
    stagiaireEmail: emailById.get(row.stagiaireUserId) ?? null,
    ownerEmail: row.ownerUserId ? emailById.get(row.ownerUserId) ?? null : null,
  };
}

function restaurantInboxUrl(requestId: string): string {
  return `${getAppOrigin()}/restaurant/requests/${requestId}`;
}

function stagiaireInboxUrl(requestId: string): string {
  return `${getAppOrigin()}/app/requests/${requestId}`;
}

/* ─── Notify: state transitions ──────────────────────────────────────── */

export async function notifyRequestSubmitted(requestId: string): Promise<void> {
  const ctx = await loadRequestContext(requestId);
  if (!ctx || !ctx.ownerEmail) return;
  const tpl = templates.requestSubmitted({
    restaurantName: ctx.restaurantName,
    stagiaireName: ctx.stagiaireName,
    startDate: ctx.startDate,
    endDate: ctx.endDate,
    url: restaurantInboxUrl(ctx.requestId),
  });
  await sendEmail({ to: ctx.ownerEmail, ...tpl });
}

export async function notifyRequestAccepted(requestId: string): Promise<void> {
  const ctx = await loadRequestContext(requestId);
  if (!ctx || !ctx.stagiaireEmail) return;
  const tpl = templates.requestAccepted({
    restaurantName: ctx.restaurantName,
    stagiaireName: ctx.stagiaireName,
    startDate: ctx.startDate,
    endDate: ctx.endDate,
    url: stagiaireInboxUrl(ctx.requestId),
  });
  await sendEmail({ to: ctx.stagiaireEmail, ...tpl });
}

export async function notifyRequestDeclined(requestId: string): Promise<void> {
  const ctx = await loadRequestContext(requestId);
  if (!ctx || !ctx.stagiaireEmail) return;
  const tpl = templates.requestDeclined({
    restaurantName: ctx.restaurantName,
    stagiaireName: ctx.stagiaireName,
    url: `${getAppOrigin()}/discover`,
  });
  await sendEmail({ to: ctx.stagiaireEmail, ...tpl });
}

export async function notifyStageCompleted(requestId: string): Promise<void> {
  const ctx = await loadRequestContext(requestId);
  if (!ctx || !ctx.stagiaireEmail) return;
  const tpl = templates.stageCompleted({
    restaurantName: ctx.restaurantName,
    stagiaireName: ctx.stagiaireName,
    url: stagiaireInboxUrl(ctx.requestId),
  });
  await sendEmail({ to: ctx.stagiaireEmail, ...tpl });
}

export async function notifyReviewSubmittedByStagiaire(requestId: string): Promise<void> {
  const ctx = await loadRequestContext(requestId);
  if (!ctx || !ctx.ownerEmail) return;
  const tpl = templates.reviewSubmitted({
    recipientName: ctx.restaurantName,
    counterpartyName: ctx.stagiaireName,
    url: restaurantInboxUrl(ctx.requestId),
  });
  await sendEmail({ to: ctx.ownerEmail, ...tpl });
}

export async function notifyReviewSubmittedByRestaurant(requestId: string): Promise<void> {
  const ctx = await loadRequestContext(requestId);
  if (!ctx || !ctx.stagiaireEmail) return;
  const tpl = templates.reviewSubmitted({
    recipientName: ctx.stagiaireName,
    counterpartyName: ctx.restaurantName,
    url: stagiaireInboxUrl(ctx.requestId),
  });
  await sendEmail({ to: ctx.stagiaireEmail, ...tpl });
}
