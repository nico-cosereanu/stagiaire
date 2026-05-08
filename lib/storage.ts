import "server-only";

import { randomUUID } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Server-side helpers for the `stagiaire-photos` Supabase Storage bucket.
 *
 * Uses the service-role admin client (bypasses RLS). Callers MUST
 * authenticate the user themselves and pass an `ownerId` they've
 * verified — these helpers don't re-check who's uploading.
 *
 * Layout: <prefix>/<ownerId>/<random>.<ext>
 *   prefix scopes the asset by feature (dishes, refs, etc.); the per-user
 *   subdir keeps a user's objects together so we can list/delete them
 *   wholesale on account deletion later.
 */

const BUCKET = "stagiaire-photos";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

export type UploadResult = { path: string; publicUrl: string };
export type UploadError = { error: string };

export async function uploadStagiairePhoto(
  prefix: "dishes" | "avatars",
  ownerId: string,
  file: File,
): Promise<UploadResult | UploadError> {
  if (file.size === 0) return { error: "Pick a photo to upload" };
  if (file.size > MAX_BYTES) return { error: "Photo must be under 8 MB" };
  if (!ALLOWED_MIME.has(file.type)) {
    return { error: "Photo must be JPEG, PNG, or WebP" };
  }

  const ext = extensionFor(file.type);
  const path = `${prefix}/${ownerId}/${randomUUID()}.${ext}`;

  const supabase = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: "Upload failed — try again" };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/*
 * Best-effort delete of an object referenced by its public URL. Used when
 * a user removes a dish — keeping orphan files around when they decided
 * to remove the row is rude. We swallow errors: leaking one image on
 * delete is preferable to surfacing a confusing failure to the user
 * after their row has already been deleted.
 */
export async function deleteStagiairePhotoByUrl(publicUrl: string): Promise<void> {
  const path = pathFromPublicUrl(publicUrl);
  if (!path) return;

  const supabase = createAdminClient();
  await supabase.storage.from(BUCKET).remove([path]);
}

function extensionFor(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "webp";
}

function pathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = publicUrl.indexOf(marker);
  if (i === -1) return null;
  return publicUrl.slice(i + marker.length);
}
