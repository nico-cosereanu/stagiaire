"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { stagiaireProfiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { nextStepHref } from "../_lib/steps";

const schema = z
  .object({
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a calendar date")
      .optional()
      .or(z.literal("")),
    until: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a calendar date")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (d) => {
      if (d.from && d.until) return d.from <= d.until;
      return true;
    },
    { message: "End date must be on or after the start date" },
  );

export type Result = { ok: true } | { ok: false; error: string };

export async function setAvailability(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    from: (formData.get("from") as string) ?? "",
    until: (formData.get("until") as string) ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db
    .update(stagiaireProfiles)
    .set({
      availableFrom: parsed.data.from || null,
      availableUntil: parsed.data.until || null,
      updatedAt: new Date(),
    })
    .where(eq(stagiaireProfiles.userId, user.id));

  const edit = formData.get("edit") === "1";
  redirect(edit ? "/app" : nextStepHref("availability"));
}
