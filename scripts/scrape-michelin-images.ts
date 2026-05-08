/*
 * Scrape og:image hero URLs from the Michelin Guide and write them onto
 * restaurant_profiles.hero_image_url.
 *
 * Joins by slug — re-derives slugs from the same world CSV the seed
 * uses, so the mapping is deterministic. Skips rows that already have a
 * hero (idempotent — safe to rerun until the directory is fully covered).
 *
 * Usage:
 *   node --env-file=.env.local --experimental-strip-types scripts/scrape-michelin-images.ts
 *   node --env-file=.env.local --experimental-strip-types scripts/scrape-michelin-images.ts --slug le-clos-des-sens-annecy
 *   node --env-file=.env.local --experimental-strip-types scripts/scrape-michelin-images.ts --limit 5
 *
 * Hot-links the cloudimg.io URL (no download/re-upload). Trade-off: if
 * Michelin rotates a URL, the image goes dead. We re-host later if it
 * becomes a problem.
 */

import { createReadStream } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, isNull } from "drizzle-orm";
import postgres from "postgres";

import { restaurantProfiles } from "../db/schema.ts";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set; ensure --env-file=.env.local is passed");
}

const CSV_PATH = resolve(process.cwd(), "data/michelin_starred_world.csv");
const STARRED_AWARDS = new Set(["1 Star", "2 Stars", "3 Stars"]);
const FRANCE_PATTERN = /\bFrance\b/i;
const THROTTLE_MS = 1500;

// A real desktop UA — Michelin returns 403 to anything that looks like a bot
// (verified empirically: Node fetch's default UA gets 403, Safari UA gets 200).
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

// Real photography is always served from cloudimg.io. Anything else
// (e.g. the S3 `online_list_default_*.jpg` or `michelin-default-profile-image`
// fallbacks) is a placeholder we should skip in favour of our own empty state.
const VALID_HERO_HOST = "axwwgrkdco.cloudimg.io";

type SourceRow = {
  Name: string;
  Address: string;
  Location: string;
  Url: string;
  Award: string;
};

type Args = {
  slug: string | null;
  limit: number | null;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { slug: null, limit: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slug") args.slug = argv[++i] ?? null;
    else if (a?.startsWith("--slug=")) args.slug = a.slice("--slug=".length);
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a?.startsWith("--limit=")) args.limit = Number(a.slice("--limit=".length));
  }
  if (args.limit !== null && !Number.isFinite(args.limit)) args.limit = null;
  return args;
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extractCity(location: string): string | null {
  if (!location) return null;
  const parts = location.split(",").map((p) => p.trim());
  return parts[0] || null;
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

/*
 * Build the same slug→Michelin URL map the seed implies. Slug collisions
 * follow the seed's append-index strategy so duplicate names in the same
 * city produce slug-2, slug-3, etc. — keeps us aligned with what's in
 * the DB.
 */
function buildSlugUrlMap(rows: SourceRow[]): Map<string, string> {
  const map = new Map<string, string>();
  const slugSeen = new Map<string, number>();

  const candidates = rows.filter(
    (r) =>
      (FRANCE_PATTERN.test(r.Address) || FRANCE_PATTERN.test(r.Location)) &&
      STARRED_AWARDS.has(r.Award),
  );

  for (const r of candidates) {
    if (!r.Name?.trim() || !r.Address?.trim()) continue;
    const city = extractCity(r.Location);
    const baseSlug = slugify(`${r.Name}-${city ?? ""}`);
    if (!baseSlug) continue;

    let slug = baseSlug;
    if (slugSeen.has(baseSlug)) {
      const n = slugSeen.get(baseSlug)! + 1;
      slugSeen.set(baseSlug, n);
      slug = `${baseSlug}-${n}`;
    } else {
      slugSeen.set(baseSlug, 1);
    }

    const url = r.Url?.trim();
    if (url) map.set(slug, url);
  }

  return map;
}

// Distinguishes a soft "no image on this page" from a hard "we got
// blocked, abort the whole run". Without this the script silently logs
// hundreds of false `no_image` rows once the WAF trips.
class WafChallengeError extends Error {
  constructor() {
    super("AWS WAF challenge returned (rate-limited)");
    this.name = "WafChallengeError";
  }
}

/*
 * Fetch a Michelin Guide page and pull the og:image URL out of the
 * static HTML. Returns null when no image or generic placeholder.
 * Throws WafChallengeError when AWS WAF starts challenging us — the
 * caller stops the run so we don't burn through the queue marking
 * everything as no_image.
 */
async function fetchHeroUrl(michelinUrl: string): Promise<string | null> {
  const res = await fetch(michelinUrl, {
    headers: { "user-agent": BROWSER_UA, accept: "text/html" },
    redirect: "follow",
  });

  // WAF challenge: 202 + an x-amzn-waf-action header, body is empty.
  if (res.status === 202 && res.headers.get("x-amzn-waf-action")) {
    throw new WafChallengeError();
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const html = await res.text();

  // og:image is the canonical hero. Captured from the static HTML.
  const match = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  );
  if (!match) return null;

  const raw = match[1]!;
  if (!raw.includes(VALID_HERO_HOST)) return null;

  // Strip the ?width=… param so we store a clean canonical URL — the
  // <Image> renderer adds its own width on demand via cloudimg.io.
  return raw.split("?")[0] ?? raw;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log(`reading ${CSV_PATH} …`);
  const rows = await readCsv(CSV_PATH);
  const slugUrlMap = buildSlugUrlMap(rows);
  console.log(`  built ${slugUrlMap.size} slug→Michelin-URL mappings`);

  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client);

  // Fetch the rows we need to fill. Idempotent: skip anything already set.
  const dbRows = await db
    .select({ id: restaurantProfiles.id, slug: restaurantProfiles.slug })
    .from(restaurantProfiles)
    .where(args.slug ? eq(restaurantProfiles.slug, args.slug) : isNull(restaurantProfiles.heroImageUrl));

  let targets = dbRows;
  if (args.limit !== null) targets = targets.slice(0, args.limit);

  console.log(`  ${targets.length} restaurants to scrape`);

  let okCount = 0;
  let missingUrlCount = 0;
  let noImageCount = 0;
  let errorCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const row = targets[i]!;
    const michelinUrl = slugUrlMap.get(row.slug);
    if (!michelinUrl) {
      missingUrlCount++;
      continue;
    }

    try {
      const heroUrl = await fetchHeroUrl(michelinUrl);
      if (!heroUrl) {
        noImageCount++;
      } else {
        await db
          .update(restaurantProfiles)
          .set({ heroImageUrl: heroUrl, updatedAt: new Date() })
          .where(eq(restaurantProfiles.id, row.id));
        okCount++;
      }
    } catch (err) {
      if (err instanceof WafChallengeError) {
        console.error(
          `\nWAF challenge tripped at ${row.slug} (row ${i + 1}/${targets.length}). ` +
            `Stopping early — wait 30+ minutes, then re-run to resume.`,
        );
        break;
      }
      errorCount++;
      console.error(`  [error] ${row.slug}: ${(err as Error).message}`);
    }

    if ((i + 1) % 25 === 0 || i === targets.length - 1) {
      console.log(
        `  progress ${i + 1}/${targets.length}  ok=${okCount} no_image=${noImageCount} no_url=${missingUrlCount} err=${errorCount}`,
      );
    }

    await sleep(THROTTLE_MS);
  }

  console.log(
    `done. ok=${okCount}, no_image=${noImageCount}, no_url=${missingUrlCount}, errors=${errorCount}`,
  );

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
