/*
 * Seed: France-starred restaurants from data/michelin_starred_world.csv
 *
 *   - Source: ngshiheng/michelin-my-maps world dump
 *   - Filter: Address contains "France" AND Award ∈ {1 Star, 2 Stars, 3 Stars}
 *   - Idempotent: upsert by slug, re-running updates existing rows
 *
 * Bypasses RLS naturally — connects as the `postgres` role via the pooled
 * DATABASE_URL, which has BYPASSRLS in Supabase by default. No
 * service-role key needed for direct DB access; the RLS posture only
 * applies to PostgREST callers.
 *
 * Run via: npm run db:seed:restaurants
 */

import { createReadStream } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { restaurantProfiles } from "../schema.ts";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set; ensure --env-file=.env.local is passed");
}

const CSV_PATH = resolve(process.cwd(), "data/michelin_starred_world.csv");
const STARRED_AWARDS = new Set(["1 Star", "2 Stars", "3 Stars"]);
const FRANCE_PATTERN = /\bFrance\b/i;

type SourceRow = {
  Name: string;
  Address: string;
  Location: string;
  Price: string;
  Cuisine: string;
  Longitude: string;
  Latitude: string;
  PhoneNumber: string;
  Url: string;
  WebsiteUrl: string;
  Award: string;
  GreenStar: string;
  FacilitiesAndServices: string;
  Description: string;
};

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .toLowerCase()
    .replace(/['’]/g, "") // drop apostrophes (' and ’) without inserting -
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function awardToStars(award: string): 1 | 2 | 3 | null {
  switch (award) {
    case "1 Star":
      return 1;
    case "2 Stars":
      return 2;
    case "3 Stars":
      return 3;
    default:
      return null;
  }
}

function extractCity(location: string): string | null {
  if (!location) return null;
  const parts = location.split(",").map((p) => p.trim());
  return parts[0] || null;
}

function parseCuisineTags(cuisine: string): string[] | null {
  if (!cuisine?.trim()) return null;
  return cuisine
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function makeBlurb(description: string): string | null {
  if (!description?.trim()) return null;
  // First sentence or first 220 chars, whichever is shorter
  const firstSentence = description.split(/(?<=[.!?])\s+/)[0] ?? description;
  return firstSentence.length > 220 ? firstSentence.slice(0, 217).trimEnd() + "…" : firstSentence;
}

async function readCsv(path: string): Promise<SourceRow[]> {
  return new Promise((resolveP, rejectP) => {
    const rows: SourceRow[] = [];
    createReadStream(path)
      .pipe(parse({ columns: true, relax_quotes: true, skip_empty_lines: true }))
      .on("data", (row: SourceRow) => rows.push(row))
      .on("end", () => resolveP(rows))
      .on("error", rejectP);
  });
}

async function main() {
  console.log(`reading ${CSV_PATH} …`);
  const allRows = await readCsv(CSV_PATH);
  console.log(`  parsed ${allRows.length} rows from world dump`);

  const candidates = allRows.filter((r) => {
    const isFrance = FRANCE_PATTERN.test(r.Address) || FRANCE_PATTERN.test(r.Location);
    return isFrance && STARRED_AWARDS.has(r.Award);
  });
  console.log(`  ${candidates.length} France-starred candidates after filter`);

  // Build inserts; deduplicate slugs by appending an index when collision occurs.
  const slugSeen = new Map<string, number>();
  const inserts: (typeof restaurantProfiles.$inferInsert)[] = [];
  let skipped = 0;

  for (const r of candidates) {
    const stars = awardToStars(r.Award);
    if (stars === null || !r.Name?.trim() || !r.Address?.trim()) {
      skipped++;
      continue;
    }

    const city = extractCity(r.Location);
    const baseSlug = slugify(`${r.Name}-${city ?? ""}`);
    if (!baseSlug) {
      skipped++;
      continue;
    }

    let slug = baseSlug;
    if (slugSeen.has(baseSlug)) {
      const n = slugSeen.get(baseSlug)! + 1;
      slugSeen.set(baseSlug, n);
      slug = `${baseSlug}-${n}`;
    } else {
      slugSeen.set(baseSlug, 1);
    }

    const lat = parseFloat(r.Latitude);
    const lng = parseFloat(r.Longitude);

    inserts.push({
      name: r.Name.trim(),
      slug,
      address: r.Address.trim(),
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      city,
      country: "France",
      stars,
      cuisineTags: parseCuisineTags(r.Cuisine),
      blurb: makeBlurb(r.Description),
      longDescription: r.Description?.trim() || null,
      websiteUrl: r.WebsiteUrl?.trim() || null,
      photos: null,
      menuUrl: null,
      claimedByUserId: null,
      openWindows: null,
    });
  }

  console.log(`  prepared ${inserts.length} inserts (${skipped} skipped)`);

  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client);

  console.log(`upserting into restaurant_profiles …`);
  const before = await db.$count(restaurantProfiles);
  console.log(`  rows before: ${before}`);

  // Upsert by slug. Bulk insert in chunks to keep statement size sane.
  const CHUNK = 100;
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const batch = inserts.slice(i, i + CHUNK);
    await db
      .insert(restaurantProfiles)
      .values(batch)
      .onConflictDoUpdate({
        target: restaurantProfiles.slug,
        set: {
          name: sqlExcluded("name"),
          address: sqlExcluded("address"),
          lat: sqlExcluded("lat"),
          lng: sqlExcluded("lng"),
          city: sqlExcluded("city"),
          country: sqlExcluded("country"),
          stars: sqlExcluded("stars"),
          cuisineTags: sqlExcluded("cuisine_tags"),
          blurb: sqlExcluded("blurb"),
          longDescription: sqlExcluded("long_description"),
          websiteUrl: sqlExcluded("website_url"),
          updatedAt: new Date(),
        },
      });
    process.stdout.write(`  upserted ${Math.min(i + CHUNK, inserts.length)}/${inserts.length}\r`);
  }
  console.log();

  const after = await db.$count(restaurantProfiles);
  console.log(`  rows after:  ${after}`);
  console.log(`  net new:     ${after - before}`);

  // Per-tier breakdown
  const byTier = await db.$count(restaurantProfiles);
  for (const tier of [3, 2, 1] as const) {
    const c = await client`select count(*)::int from restaurant_profiles where stars = ${tier}`;
    console.log(`  ${tier}-star: ${c[0]?.count ?? 0}`);
  }
  void byTier;

  await client.end();
  console.log("done.");
}

// Drizzle helper: reference the EXCLUDED.column from the conflict row.
function sqlExcluded(column: string) {
  return sql.raw(`excluded."${column}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
