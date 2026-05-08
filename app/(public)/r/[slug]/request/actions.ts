"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { notifications, restaurantProfiles, stageRequests } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { notifyRequestSubmitted } from "@/lib/email/notify";
import { capture } from "@/lib/analytics/server";

/*
 * Stage request submission. Stagiaire only — restaurant owners and
 * admins are bounced by requireRole.
 *
 * Date convention: HTML date inputs return "YYYY-MM-DD". We treat them
 * as the user's intended calendar dates regardless of timezone — i.e. a
 * stagiaire saying "May 12 → May 18" means those exact local days. We
 * compare them as plain ISO date strings (lex order matches calendar
 * order for that format). Today is computed in UTC; close enough for
 * "is the start date in the past" since being off by a few hours
 * doesn't materially affect a 14-day window.
 *
 * On submit:
 *   1. insert stage_requests row, status = "submitted"
 *   2. expiresAt = now + 14 days (PLAN §9.6 — auto-decline window)
 *   3. drop a notification row for the restaurant owner so their inbox
 *      can show an unread badge (cheap; emails come in a later step)
 */

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

const schema = z
  .object({
    startDate: dateField,
    endDate: dateField,
    coverMessage: z
      .string()
      .trim()
      .max(2000, "Keep the cover message under 2000 characters"),
  })
  .superRefine((val, ctx) => {
    const today = todayIso();
    if (val.startDate < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "Start date can't be in the past",
      });
    }
    if (val.endDate < val.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after the start date",
      });
    }
  });

export type Result = { ok: true } | { ok: false; error: string };

export async function submitRequest(
  restaurantId: string,
  restaurantSlug: string,
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const user = await requireRole("stagiaire");

  const parsed = schema.safeParse({
    startDate: (formData.get("startDate") as string | null)?.trim() ?? "",
    endDate: (formData.get("endDate") as string | null)?.trim() ?? "",
    coverMessage: (formData.get("coverMessage") as string | null) ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Verify the restaurant exists and resolve owner (if any) for notification.
  const restaurant = await db.query.restaurantProfiles.findFirst({
    where: eq(restaurantProfiles.id, restaurantId),
    columns: { id: true, claimedByUserId: true, closedWindows: true },
  });
  if (!restaurant) return { ok: false, error: "Restaurant not found" };

  // Reject ranges that straddle a published closure. The picker disables
  // closed days client-side, but a stale page or a hand-crafted POST
  // could still reach here.
  const closures = restaurant.closedWindows ?? [];
  const conflict = closures.find(
    (w) =>
      w.startDate <= parsed.data.endDate && w.endDate >= parsed.data.startDate,
  );
  if (conflict) {
    return {
      ok: false,
      error: `Your range overlaps a closure (${conflict.startDate} → ${conflict.endDate}). Pick dates outside it.`,
    };
  }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const [inserted] = await db
    .insert(stageRequests)
    .values({
      stagiaireId: user.id,
      restaurantId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      coverMessage: parsed.data.coverMessage.trim(),
      status: "submitted",
      expiresAt,
    })
    .returning({ id: stageRequests.id });

  if (restaurant.claimedByUserId && inserted) {
    await db.insert(notifications).values({
      userId: restaurant.claimedByUserId,
      type: "stage_request_submitted",
      payload: { requestId: inserted.id },
    });
    await notifyRequestSubmitted(inserted.id);
  }

  if (inserted) {
    await capture({
      distinctId: user.id,
      event: "stage_request_submitted",
      properties: {
        requestId: inserted.id,
        restaurantId,
        restaurantSlug,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        durationDays:
          Math.round(
            (Date.parse(parsed.data.endDate) - Date.parse(parsed.data.startDate)) /
              86_400_000,
          ) + 1,
      },
    });
  }

  revalidatePath(`/r/${restaurantSlug}`);
  revalidatePath("/restaurant/requests");
  revalidatePath("/app/requests");
  redirect("/app/requests?submitted=1");
}

function todayIso(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

