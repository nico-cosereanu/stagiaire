"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { stagiaireProfiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { nextStepHref } from "../_lib/steps";

const schema = z.object({
  languages: z
    .string()
    .min(1, "Tell us at least one language")
    .max(200, "Keep it under 200 characters"),
});

export type Result = { ok: true } | { ok: false; error: string };

export async function setLanguages(_prev: Result | null, formData: FormData): Promise<Result> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    languages: (formData.get("languages") as string)?.trim(),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const list = parsed.data.languages
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) {
    return { ok: false, error: "Tell us at least one language" };
  }

  await db
    .update(stagiaireProfiles)
    .set({ languages: list, updatedAt: new Date() })
    .where(eq(stagiaireProfiles.userId, user.id));

  const edit = formData.get("edit") === "1";
  redirect(edit ? "/app" : nextStepHref("languages"));
}
