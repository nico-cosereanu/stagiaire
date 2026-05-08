-- Surface the head chef on the restaurant profile. Backfilled from
-- data/michelin_starred_france.csv (the france-only dump has a Chef
-- column the world dump lacks). Nullable: a sizeable share of rows in
-- the source CSV have no chef on file.
ALTER TABLE "restaurant_profiles" ADD COLUMN "head_chef" text;
