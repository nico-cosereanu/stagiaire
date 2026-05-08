-- Inverted semantics: restaurants are open by default; this column now
-- holds date ranges where the kitchen is NOT accepting stage requests.
-- Existing data was set under the old (open) semantics — reset it so
-- nothing is silently inverted.
UPDATE "restaurant_profiles"
SET "open_windows" = NULL
WHERE "open_windows" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "restaurant_profiles" RENAME COLUMN "open_windows" TO "closed_windows";
