"use server";

import { revalidatePath } from "next/cache";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { restaurantProfiles, type ClosedWindow } from "@/db/schema";
import { requireRole } from "@/lib/auth";

/*
 * Save the closedWindows jsonb array on the owner's restaurant_profiles
 * row. The form posts a single `windows` field carrying a JSON array —
 * dynamic-row forms are awkward in plain FormData, and a hidden JSON
 * blob keeps the action simple.
 *
 * Default model: kitchens are open. This editor publishes explicit
 * CLOSURES — vacations, refurbs, private-event runs — that block
 * stagiaires from picking those dates on the public profile.
 *
 * Validation: ISO YYYY-MM-DD strings (which sort lexicographically), no
 * inverted ranges, optional 140-char note, hard cap at 50 windows.
 *
 * Empty array stores NULL so the kitchen reads as "fully open".
 */

const windowSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD dates"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD dates"),
    note: z.string().max(140).optional().or(z.literal("")),
  })
  .refine((w) => w.startDate <= w.endDate, {
    message: "End date can't be before start date",
    path: ["endDate"],
  });

const payloadSchema = z.object({
  windows: z.array(windowSchema).max(50, "Keep it under 50 windows."),
});

export type SaveClosuresResult =
  | { ok: true; savedAt: string; slug: string }
  | { ok: false; error: string };

export async function saveClosuresAction(
  _prev: SaveClosuresResult | null,
  formData: FormData,
): Promise<SaveClosuresResult> {
  const user = await requireRole("restaurant_owner");

  const restaurant = await db.query.restaurantProfiles.findFirst({
    where: eq(restaurantProfiles.claimedByUserId, user.id),
    columns: { id: true, slug: true },
  });
  if (!restaurant) {
    return { ok: false, error: "No restaurant linked to this account." };
  }

  const raw = formData.get("windows");
  let parsedJson: unknown = [];
  if (typeof raw === "string" && raw.length > 0) {
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return { ok: false, error: "Could not read the form payload." };
    }
  }

  const parsed = payloadSchema.safeParse({ windows: parsedJson });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const idx = typeof issue?.path[1] === "number" ? issue.path[1] + 1 : null;
    const where = idx ? `Closure ${idx}: ` : "";
    return { ok: false, error: `${where}${issue?.message ?? "Invalid input"}` };
  }

  const cleaned: ClosedWindow[] = parsed.data.windows.map((w) => {
    const note = w.note?.trim();
    return note
      ? { startDate: w.startDate, endDate: w.endDate, note }
      : { startDate: w.startDate, endDate: w.endDate };
  });

  await db
    .update(restaurantProfiles)
    .set({
      closedWindows: cleaned.length > 0 ? cleaned : null,
      updatedAt: new Date(),
    })
    .where(eq(restaurantProfiles.id, restaurant.id));

  revalidatePath(`/r/${restaurant.slug}`);
  return { ok: true, savedAt: new Date().toISOString(), slug: restaurant.slug };
}
