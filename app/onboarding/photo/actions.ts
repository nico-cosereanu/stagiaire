"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { stagiaireProfiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { deleteStagiairePhotoByUrl, uploadStagiairePhoto } from "@/lib/storage";

export type Result = { ok: true } | { ok: false; error: string };

function readPhoto(formData: FormData): File | null {
  const raw = formData.get("photo");
  if (!(raw instanceof File)) return null;
  if (raw.size === 0) return null;
  return raw;
}

export async function setProfilePhoto(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const user = await requireUser();

  const photo = readPhoto(formData);
  if (!photo) return { ok: false, error: "Pick a photo to upload" };

  const upload = await uploadStagiairePhoto("avatars", user.id, photo);
  if ("error" in upload) return { ok: false, error: upload.error };

  const existing = await db.query.stagiaireProfiles.findFirst({
    where: eq(stagiaireProfiles.userId, user.id),
    columns: { photoUrl: true, slug: true },
  });

  await db
    .update(stagiaireProfiles)
    .set({ photoUrl: upload.publicUrl, updatedAt: new Date() })
    .where(eq(stagiaireProfiles.userId, user.id));

  if (existing?.photoUrl) {
    await deleteStagiairePhotoByUrl(existing.photoUrl);
  }

  revalidatePath("/app");
  if (existing?.slug) revalidatePath(`/u/${existing.slug}`);

  redirect("/app");
}

export async function removeProfilePhoto(): Promise<void> {
  const user = await requireUser();

  const existing = await db.query.stagiaireProfiles.findFirst({
    where: eq(stagiaireProfiles.userId, user.id),
    columns: { photoUrl: true, slug: true },
  });

  await db
    .update(stagiaireProfiles)
    .set({ photoUrl: null, updatedAt: new Date() })
    .where(eq(stagiaireProfiles.userId, user.id));

  if (existing?.photoUrl) {
    await deleteStagiairePhotoByUrl(existing.photoUrl);
  }

  revalidatePath("/app");
  if (existing?.slug) revalidatePath(`/u/${existing.slug}`);

  redirect("/app");
}
