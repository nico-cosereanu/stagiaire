"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { restaurantProfiles } from "@/db/schema";
import { requireRole } from "@/lib/auth";

/*
 * Save the editable subset of a restaurant_profiles row. Fields locked
 * to the seed (name, address, lat/lng, stars) are not exposed here —
 * those are Michelin facts, not owner-editable.
 *
 * Owner is identified by claimed_by_user_id matching the requester. If
 * no row matches, the owner hasn't been approved yet and shouldn't be
 * here — return an error instead of silently no-op'ing.
 *
 * After save, revalidatePath the public profile so the next request
 * doesn't serve cached HTML from before the edit.
 */

const schema = z.object({
  blurb: z.string().max(280, "Keep the tagline under 280 characters").optional().or(z.literal("")),
  longDescription: z
    .string()
    .max(8000, "Keep the long description under 8,000 characters")
    .optional()
    .or(z.literal("")),
  websiteUrl: z
    .string()
    .url("Enter a valid URL (https://…)")
    .max(500)
    .optional()
    .or(z.literal("")),
  instagramHandle: z
    .string()
    .max(60, "Handle too long")
    .regex(/^[A-Za-z0-9._]*$/, "Letters, numbers, dots, and underscores only")
    .optional()
    .or(z.literal("")),
  menuUrl: z
    .string()
    .url("Enter a valid URL (https://…)")
    .max(500)
    .optional()
    .or(z.literal("")),
  cuisineTags: z.string().max(300).optional().or(z.literal("")),
});

export type SaveProfileResult =
  | { ok: true; savedAt: string; slug: string }
  | { ok: false; error: string; field?: keyof z.infer<typeof schema> };

export async function saveProfileAction(
  _prev: SaveProfileResult | null,
  formData: FormData,
): Promise<SaveProfileResult> {
  const user = await requireRole("restaurant_owner");

  const restaurant = await db.query.restaurantProfiles.findFirst({
    where: eq(restaurantProfiles.claimedByUserId, user.id),
    columns: { id: true, slug: true },
  });
  if (!restaurant) {
    return {
      ok: false,
      error: "No restaurant linked to this account. Submit a claim first.",
    };
  }

  const parsed = schema.safeParse({
    blurb: (formData.get("blurb") as string)?.trim(),
    longDescription: (formData.get("longDescription") as string)?.trim(),
    websiteUrl: (formData.get("websiteUrl") as string)?.trim(),
    instagramHandle: (formData.get("instagramHandle") as string)?.trim().replace(/^@/, ""),
    menuUrl: (formData.get("menuUrl") as string)?.trim(),
    cuisineTags: (formData.get("cuisineTags") as string)?.trim(),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Invalid input",
      field: issue?.path[0] as keyof z.infer<typeof schema> | undefined,
    };
  }

  const cuisineTags = parsed.data.cuisineTags
    ? parsed.data.cuisineTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];

  await db
    .update(restaurantProfiles)
    .set({
      blurb: parsed.data.blurb || null,
      longDescription: parsed.data.longDescription || null,
      websiteUrl: parsed.data.websiteUrl || null,
      instagramHandle: parsed.data.instagramHandle || null,
      menuUrl: parsed.data.menuUrl || null,
      cuisineTags: cuisineTags.length > 0 ? cuisineTags : null,
      updatedAt: new Date(),
    })
    .where(eq(restaurantProfiles.id, restaurant.id));

  revalidatePath(`/r/${restaurant.slug}`);

  return { ok: true, savedAt: new Date().toISOString(), slug: restaurant.slug };
}
