"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { experiences } from "@/db/schema";
import { requireRole } from "@/lib/auth";

/*
 * CRUD for stagiaire CV entries. Every action re-asserts the row belongs
 * to the requesting user — IDs in form data are untrusted input, even
 * though the only UI surface that emits them is the owner's edit page.
 *
 * Date inputs come from <input type="date"> as "" or "YYYY-MM-DD". We
 * keep them as ISO strings since the column is `date` (not `timestamp`).
 */

const dateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .nullable();

const baseSchema = z
  .object({
    restaurantName: z
      .string()
      .trim()
      .min(1, "Restaurant name is required")
      .max(200, "Keep it under 200 characters"),
    role: z.string().trim().max(120, "Keep the role under 120 characters").nullable(),
    station: z.string().trim().max(120, "Keep the station under 120 characters").nullable(),
    startedOn: dateField,
    endedOn: dateField,
    description: z
      .string()
      .trim()
      .max(2000, "Keep the description under 2000 characters")
      .nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.startedOn && val.endedOn && val.endedOn < val.startedOn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endedOn"],
        message: "End date must be on or after the start date",
      });
    }
  });

export type Result = { ok: true } | { ok: false; error: string };

function readForm(formData: FormData) {
  const norm = (key: string): string | null => {
    const raw = formData.get(key);
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return trimmed.length === 0 ? null : trimmed;
  };
  return {
    restaurantName: (formData.get("restaurantName") as string | null)?.trim() ?? "",
    role: norm("role"),
    station: norm("station"),
    startedOn: norm("startedOn"),
    endedOn: norm("endedOn"),
    description: norm("description"),
  };
}

export async function createExperience(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const user = await requireRole("stagiaire");
  const parsed = baseSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.insert(experiences).values({
    stagiaireId: user.id,
    restaurantName: parsed.data.restaurantName,
    role: parsed.data.role,
    station: parsed.data.station,
    startedOn: parsed.data.startedOn,
    endedOn: parsed.data.endedOn,
    description: parsed.data.description,
  });

  revalidatePath("/app");
  revalidatePath("/app/experiences");
  redirect("/app/experiences");
}

export async function updateExperience(
  id: string,
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const user = await requireRole("stagiaire");
  const parsed = baseSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await db
    .update(experiences)
    .set({
      restaurantName: parsed.data.restaurantName,
      role: parsed.data.role,
      station: parsed.data.station,
      startedOn: parsed.data.startedOn,
      endedOn: parsed.data.endedOn,
      description: parsed.data.description,
    })
    .where(and(eq(experiences.id, id), eq(experiences.stagiaireId, user.id)))
    .returning({ id: experiences.id });

  if (result.length === 0) {
    return { ok: false, error: "Experience not found" };
  }

  revalidatePath("/app");
  revalidatePath("/app/experiences");
  redirect("/app/experiences");
}

export async function deleteExperience(formData: FormData): Promise<void> {
  const user = await requireRole("stagiaire");
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;

  await db
    .delete(experiences)
    .where(and(eq(experiences.id, id), eq(experiences.stagiaireId, user.id)));

  revalidatePath("/app");
  revalidatePath("/app/experiences");
}
