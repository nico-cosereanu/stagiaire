"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { stagiaireProfiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { nextStepHref } from "../_lib/steps";

const schema = z.object({
  bio: z.string().min(40, "Give chefs a few sentences — at least 40 characters").max(800),
});

export type Result = { ok: true } | { ok: false; error: string };

export async function setBio(_prev: Result | null, formData: FormData): Promise<Result> {
  const user = await requireUser();
  const parsed = schema.safeParse({ bio: (formData.get("bio") as string)?.trim() });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db
    .update(stagiaireProfiles)
    .set({ bio: parsed.data.bio, updatedAt: new Date() })
    .where(eq(stagiaireProfiles.userId, user.id));

  const edit = formData.get("edit") === "1";
  redirect(edit ? "/app" : nextStepHref("bio"));
}
