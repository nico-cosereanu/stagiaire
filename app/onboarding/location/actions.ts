"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { stagiaireProfiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { nextStepHref } from "../_lib/steps";

const schema = z.object({
  city: z.string().min(1, "City is required").max(80),
  country: z.string().min(1, "Country is required").max(80),
});

export type Result = { ok: true } | { ok: false; error: string };

export async function setLocation(_prev: Result | null, formData: FormData): Promise<Result> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    city: (formData.get("city") as string)?.trim(),
    country: (formData.get("country") as string)?.trim(),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db
    .update(stagiaireProfiles)
    .set({
      currentCity: parsed.data.city,
      country: parsed.data.country,
      updatedAt: new Date(),
    })
    .where(eq(stagiaireProfiles.userId, user.id));

  redirect(nextStepHref("location"));
}
