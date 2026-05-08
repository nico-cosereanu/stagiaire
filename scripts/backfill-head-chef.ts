/*
 * Two-pass backfill of restaurant_profiles.head_chef.
 *
 *   Pass 1 — read the france-only Michelin CSV's explicit Chef column.
 *            Highest confidence; populates ~30 rows.
 *
 *   Pass 2 — for rows still null, mine the long_description (the full
 *            Michelin write-up) for the chef's name. The Guide
 *            consistently mentions the chef in the first sentence or
 *            two — patterns like "Chef Foo Bar", "Foo Bar is at the
 *            helm", "Foo Bar has been the chef". Conservative: prefers
 *            high-confidence patterns and skips ambiguous matches.
 *
 * Idempotent: only updates rows where head_chef IS NULL.
 *
 * Usage:
 *   node --env-file=.env.local --experimental-strip-types scripts/backfill-head-chef.ts
 *   node --env-file=.env.local --experimental-strip-types scripts/backfill-head-chef.ts --dry-run-descriptions
 */

import { createReadStream } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, isNull, isNotNull, and } from "drizzle-orm";
import postgres from "postgres";

import { restaurantProfiles } from "../db/schema.ts";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set; ensure --env-file=.env.local is passed");
}

const CSV_PATH = resolve(process.cwd(), "data/michelin_starred_france.csv");

type SourceRow = {
  Name: string;
  City: string;
  Chef: string;
};

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/*
 * Heuristic chef extraction from a Michelin Guide write-up.
 *
 * The Guide writes in a consistent house style — the chef is named
 * within the first ~600 chars using one of a few stock phrasings. We
 * match the highest-confidence patterns first and stop on the first
 * hit. Returning null is intentionally common: it's better to miss a
 * chef than to extract a non-chef name (a sommelier, an architect, the
 * owner's grandfather) which would then sit in the database as a lie.
 *
 * The capital-letter character class is widened to include accented
 * Latin letters; otherwise "Frédéric Anton" or "Pénélope" never match.
 */
const NAME_TOKEN = "[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ\\-']{1,}";
const FULL_NAME = `${NAME_TOKEN}(?:\\s${NAME_TOKEN}){1,3}`;

// Words that look like names but aren't — usually grabbed by a greedy
// match. Mostly the first word of common stop-phrases ("This Place",
// "The Restaurant") plus title-cased trailing words from prior sentences.
const NAME_BLOCKLIST = new Set([
  "Restaurant",
  "Chef",
  "Hotel",
  "Hôtel",
  "Maison",
  "Château",
  "Auberge",
  "Place",
  "Born",
  "Today",
  "Together",
  "After",
  "There",
  "Welcome",
  "France",
  "Paris",
  "Michelin",
  "Guide",
]);

function cleanExtractedName(name: string): string {
  // Strip possessive 's and trailing punctuation that the greedy regex
  // sometimes grabs ("Oger's" → "Oger", "Saint-" → "Saint").
  return name
    .replace(/[’']s\b/g, "")
    .replace(/[\-’'\s]+$/g, "")
    .trim();
}

function looksLikeName(name: string): boolean {
  const parts = name.split(/\s+/);
  if (parts.length < 2 || parts.length > 4) return false;
  if (NAME_BLOCKLIST.has(parts[0]!)) return false;
  if (NAME_BLOCKLIST.has(parts[parts.length - 1]!)) return false;
  if (name.length < 5 || name.length > 60) return false;
  return true;
}

function extractChefFromDescription(description: string): string | null {
  // Bound to the lead — chefs almost always introduced early. Keeps
  // late mentions of guest chefs / suppliers / owners from polluting.
  const lead = description.slice(0, 700);

  // Pattern 1 — explicit role marker "chef [Name]" / "Chef [Name]".
  // Skip the next word being "de"/"du"/"des" which is a French role
  // construct ("chef de cuisine", "chef du Grill") not a name.
  {
    const m = lead.match(
      new RegExp(`\\b[Cc]hefs?\\s+(?!de\\b|du\\b|des\\b)(${FULL_NAME})`),
    );
    if (m) {
      const cleaned = cleanExtractedName(m[1]!);
      if (looksLikeName(cleaned)) return cleaned;
    }
  }

  // Pattern 2 — "[Name] is at the helm" / "[Name] is the chef" / etc.
  // The phrase "is the chef" is a strong role marker; "at the helm"
  // typically describes the head chef in Michelin's prose.
  {
    const m = lead.match(
      new RegExp(
        `(${FULL_NAME})(?:,?\\s+(?:is\\s+at\\s+the\\s+helm|is\\s+the\\s+chef|has\\s+been\\s+the\\s+chef|is\\s+at\\s+the\\s+stove|leads\\s+the\\s+kitchen|oversees\\s+the\\s+kitchen|heads\\s+up\\s+the\\s+kitchen))`,
        "i",
      ),
    );
    if (m) {
      const cleaned = cleanExtractedName(m[1]!);
      if (looksLikeName(cleaned)) return cleaned;
    }
  }

  // Pattern 3 — "Chefs Foo Bar and Baz Qux" → store both names. Picked
  // up after the singular pattern so single-chef restaurants take that
  // path first.
  {
    const m = lead.match(
      new RegExp(`\\bChefs\\s+(${FULL_NAME})\\s+and\\s+(${FULL_NAME})`),
    );
    if (m) {
      const a = cleanExtractedName(m[1]!);
      const b = cleanExtractedName(m[2]!);
      if (looksLikeName(a) && looksLikeName(b)) return `${a} & ${b}`;
    }
  }

  return null;
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
  const dryRunDescriptions = process.argv.includes("--dry-run-descriptions");

  console.log(`reading ${CSV_PATH} …`);
  const rows = await readCsv(CSV_PATH);

  // Build a slug→chef map. The seed handles slug collisions by
  // appending -2, -3 etc.; the france CSV is a different source
  // ordering so collisions might not align. Cover the base case and
  // accept that perfectly-duplicated names get only the first chef.
  const slugChef = new Map<string, string>();
  for (const r of rows) {
    const chef = r.Chef?.trim();
    if (!chef) continue;
    const slug = slugify(`${r.Name}-${r.City ?? ""}`);
    if (!slug) continue;
    if (!slugChef.has(slug)) slugChef.set(slug, chef);
  }
  console.log(`  ${slugChef.size} chefs in CSV`);

  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client);

  // Pass 1 — CSV
  if (!dryRunDescriptions) {
    const csvTargets = await db
      .select({ id: restaurantProfiles.id, slug: restaurantProfiles.slug })
      .from(restaurantProfiles)
      .where(isNull(restaurantProfiles.headChef));

    let csvUpdated = 0;
    for (const row of csvTargets) {
      const chef = slugChef.get(row.slug);
      if (!chef) continue;
      await db
        .update(restaurantProfiles)
        .set({ headChef: chef, updatedAt: new Date() })
        .where(eq(restaurantProfiles.id, row.id));
      csvUpdated++;
    }
    console.log(`pass 1 (CSV): updated ${csvUpdated} rows`);
  }

  // Pass 2 — mine long_description for the chef name. Idempotent: only
  // touches rows still null after pass 1.
  const descTargets = await db
    .select({
      id: restaurantProfiles.id,
      slug: restaurantProfiles.slug,
      longDescription: restaurantProfiles.longDescription,
    })
    .from(restaurantProfiles)
    .where(and(isNull(restaurantProfiles.headChef), isNotNull(restaurantProfiles.longDescription)));

  console.log(`pass 2: scanning ${descTargets.length} descriptions`);

  let descMatched = 0;
  let descUpdated = 0;
  const samples: Array<{ slug: string; chef: string }> = [];

  for (const row of descTargets) {
    if (!row.longDescription) continue;
    const chef = extractChefFromDescription(row.longDescription);
    if (!chef) continue;
    descMatched++;
    if (samples.length < 20) samples.push({ slug: row.slug, chef });

    if (!dryRunDescriptions) {
      await db
        .update(restaurantProfiles)
        .set({ headChef: chef, updatedAt: new Date() })
        .where(eq(restaurantProfiles.id, row.id));
      descUpdated++;
    }
  }

  console.log(`pass 2 (descriptions): matched ${descMatched}, ${dryRunDescriptions ? "dry run — no updates" : `updated ${descUpdated} rows`}`);
  if (samples.length > 0) {
    console.log(`\nsample matches (first ${samples.length}):`);
    for (const s of samples) console.log(`  ${s.slug.padEnd(50)} → ${s.chef}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
