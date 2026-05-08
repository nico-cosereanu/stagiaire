"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { dishes } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { deleteStagiairePhotoByUrl, uploadStagiairePhoto } from "@/lib/storage";

/*
 * CRUD for stagiaire portfolio dishes.
 *
 * Photo upload runs through lib/storage with the service-role admin
 * client. We re-check ownership on every mutation since IDs in form
 * data are untrusted, even though only the owner's UI emits them.
 *
 * Photo replacement on update intentionally leaves the old object as an
 * orphan — keeps the action simple. A scheduled cleanup can sweep
 * unreferenced objects later. On full row delete we *do* delete the
 * object, since orphaning at user-intent-to-discard is rude.
 */

const textSchema = z.object({
  title: z.string().trim().max(200, "Keep the title under 200 characters").nullable(),
  role: z.string().trim().max(120, "Keep the role under 120 characters").nullable(),
  techniqueNotes: z
    .string()
    .trim()
    .max(2000, "Keep the notes under 2000 characters")
    .nullable(),
});

export type Result = { ok: true } | { ok: false; error: string };

function readTextFields(formData: FormData) {
  const norm = (key: string): string | null => {
    const raw = formData.get(key);
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return trimmed.length === 0 ? null : trimmed;
  };
  return {
    title: norm("title"),
    role: norm("role"),
    techniqueNotes: norm("techniqueNotes"),
  };
}

function readPhoto(formData: FormData): File | null {
  const raw = formData.get("photo");
  if (!(raw instanceof File)) return null;
  if (raw.size === 0) return null;
  return raw;
}

export async function createDish(_prev: Result | null, formData: FormData): Promise<Result> {
  const user = await requireRole("stagiaire");

  const parsed = textSchema.safeParse(readTextFields(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const photo = readPhoto(formData);
  if (!photo) return { ok: false, error: "Pick a photo to upload" };

  const upload = await uploadStagiairePhoto("dishes", user.id, photo);
  if ("error" in upload) return { ok: false, error: upload.error };

  await db.insert(dishes).values({
    stagiaireId: user.id,
    photoUrl: upload.publicUrl,
    title: parsed.data.title,
    role: parsed.data.role,
    techniqueNotes: parsed.data.techniqueNotes,
  });

  revalidatePath("/app");
  revalidatePath("/app/portfolio");
  redirect("/app/portfolio");
}

export async function updateDish(
  id: string,
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const user = await requireRole("stagiaire");

  const existing = await db.query.dishes.findFirst({
    where: and(eq(dishes.id, id), eq(dishes.stagiaireId, user.id)),
  });
  if (!existing) return { ok: false, error: "Dish not found" };

  const parsed = textSchema.safeParse(readTextFields(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let photoUrl = existing.photoUrl;
  const photo = readPhoto(formData);
  if (photo) {
    const upload = await uploadStagiairePhoto("dishes", user.id, photo);
    if ("error" in upload) return { ok: false, error: upload.error };
    photoUrl = upload.publicUrl;
  }

  await db
    .update(dishes)
    .set({
      photoUrl,
      title: parsed.data.title,
      role: parsed.data.role,
      techniqueNotes: parsed.data.techniqueNotes,
    })
    .where(and(eq(dishes.id, id), eq(dishes.stagiaireId, user.id)));

  revalidatePath("/app");
  revalidatePath("/app/portfolio");
  redirect("/app/portfolio");
}

export async function deleteDish(formData: FormData): Promise<void> {
  const user = await requireRole("stagiaire");
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;

  const existing = await db.query.dishes.findFirst({
    where: and(eq(dishes.id, id), eq(dishes.stagiaireId, user.id)),
    columns: { photoUrl: true },
  });
  if (!existing) return;

  await db
    .delete(dishes)
    .where(and(eq(dishes.id, id), eq(dishes.stagiaireId, user.id)));

  await deleteStagiairePhotoByUrl(existing.photoUrl);

  revalidatePath("/app");
  revalidatePath("/app/portfolio");
}
