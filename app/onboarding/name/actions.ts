"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { stagiaireProfiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { generateUniqueSlug } from "../_lib/profile";
import { nextStepHref } from "../_lib/steps";

const schema = z.object({
  name: z
    .string()
    .min(2, "Your name needs at least two characters")
    .max(80, "Keep it under 80 characters"),
});

export type Result = { ok: true } | { ok: false; error: string };

export async function setName(_prev: Result | null, formData: FormData): Promise<Result> {
  const user = await requireUser();
  const parsed = schema.safeParse({ name: (formData.get("name") as string)?.trim() });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid name" };
  }

  const existing = await db.query.stagiaireProfiles.findFirst({
    where: eq(stagiaireProfiles.userId, user.id),
    columns: { slug: true },
  });

  // Generate slug only on first save; preserve once set so links don't break.
  const slug = existing?.slug ?? (await generateUniqueSlug(parsed.data.name, user.id));

  await db
    .insert(stagiaireProfiles)
    .values({
      userId: user.id,
      name: parsed.data.name,
      slug,
    })
    .onConflictDoUpdate({
      target: stagiaireProfiles.userId,
      set: { name: parsed.data.name, updatedAt: new Date() },
    });

  const edit = formData.get("edit") === "1";
  redirect(edit ? "/app" : nextStepHref("name"));
}
