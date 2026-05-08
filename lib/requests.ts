import "server-only";

import type { stageRequestStatusEnum } from "@/db/schema";

/*
 * Lifecycle helpers for stage_requests. The status enum is intentionally
 * wide (every state we'll ever reach lives in the column type), so this
 * file is the single place that turns a status into something a renderer
 * can use without a long switch.
 *
 * Two axes a status answers:
 *   1. is the thread still mutable (can either party message)?
 *   2. is the request actionable by the restaurant (accept/decline)
 *      or by the stagiaire (withdraw)?
 *
 * Display labels live here too so the chip on the inbox list and the
 * banner on the detail page stay in sync.
 */

export type StageRequestStatus =
  (typeof stageRequestStatusEnum.enumValues)[number];

export const ACTIVE_FOR_RESTAURANT: ReadonlyArray<StageRequestStatus> = ["submitted", "pending"];
export const ACTIVE_FOR_STAGIAIRE: ReadonlyArray<StageRequestStatus> = ["submitted", "pending"];
export const MESSAGEABLE: ReadonlyArray<StageRequestStatus> = [
  "submitted",
  "pending",
  "accepted",
  "confirmed",
  "completed",
  "reviewable",
];

export function canRestaurantDecide(status: StageRequestStatus): boolean {
  return ACTIVE_FOR_RESTAURANT.includes(status);
}

export function canStagiaireWithdraw(status: StageRequestStatus): boolean {
  return ACTIVE_FOR_STAGIAIRE.includes(status);
}

export function canMessage(status: StageRequestStatus): boolean {
  return MESSAGEABLE.includes(status);
}

/*
 * Owner can mark a stage complete once it's been accepted AND the stage's
 * last day has passed. We compare ISO dates lexically (both YYYY-MM-DD)
 * so we don't have to worry about timezones — the stage's "end of day"
 * is whatever calendar day the owner is in when they confirm.
 */
export function canMarkComplete(status: StageRequestStatus, endDateIso: string, todayIso: string): boolean {
  return status === "accepted" && endDateIso <= todayIso;
}

export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export type StatusTone = "neutral" | "positive" | "warning" | "danger" | "muted";

export function statusLabel(status: StageRequestStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "submitted":
    case "pending":
      return "Pending";
    case "accepted":
      return "Accepted";
    case "confirmed":
      return "Confirmed";
    case "declined":
      return "Declined";
    case "withdrawn":
      return "Withdrawn";
    case "expired":
      return "Expired";
    case "cancelled_by_stagiaire":
      return "Cancelled by stagiaire";
    case "cancelled_by_restaurant":
      return "Cancelled by restaurant";
    case "no_show":
      return "No-show";
    case "completed":
      return "Completed";
    case "reviewable":
      return "Awaiting reviews";
    case "closed":
      return "Closed";
  }
}

export function statusTone(status: StageRequestStatus): StatusTone {
  switch (status) {
    case "submitted":
    case "pending":
      return "neutral";
    case "accepted":
    case "confirmed":
    case "completed":
    case "closed":
      return "positive";
    case "reviewable":
      return "warning";
    case "declined":
    case "withdrawn":
    case "expired":
    case "cancelled_by_stagiaire":
    case "cancelled_by_restaurant":
    case "no_show":
      return "danger";
    case "draft":
      return "muted";
  }
}

/*
 * "in 4 days", "in 12 hours", "today", "expired". Used on the request
 * detail banner. Returns null if the status isn't time-sensitive.
 */
export function formatExpiry(expiresAt: Date, now = new Date()): string {
  const diffMs = expiresAt.getTime() - now.getTime();
  if (diffMs <= 0) return "expired";
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `in ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "in 1 day";
  return `in ${diffDays} days`;
}

/*
 * "May 12 → May 18 · 7 days". Trailing day count is inclusive of both
 * endpoints since chefs and stagiaires both count it that way.
 */
export function formatDateRange(startIso: string, endIso: string): string {
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const start = new Date(startIso);
  const end = new Date(endIso);
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return `${fmt.format(start)} → ${fmt.format(end)} · ${days} ${days === 1 ? "day" : "days"}`;
}
