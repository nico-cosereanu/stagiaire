-- Single hero image per restaurant. Hot-linked to source CDN for MVP
-- (no storage bucket usage yet); we'll re-host once owners start
-- uploading their own. Nullable: rendering falls back to an editorial
-- placeholder when the column is empty.
ALTER TABLE "restaurant_profiles" ADD COLUMN "hero_image_url" text;
