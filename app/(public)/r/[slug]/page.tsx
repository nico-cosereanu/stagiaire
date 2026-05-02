import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { eq } from "drizzle-orm";

import { Rosette, RosetteRow } from "@/components/ui/rosette";
import { db } from "@/lib/db";
import { restaurantProfiles } from "@/db/schema";

/*
 * Public restaurant profile — /r/[slug]
 *
 * Server Component, direct Drizzle query. RLS allows public SELECT on
 * restaurant_profiles, so SSR-via-Drizzle (which connects as the postgres
 * role and bypasses RLS at the DB level) is safe — restaurant_profiles
 * has no private fields.
 *
 * Empty-state slots are intentionally rendered for content that does not
 * yet exist (Photos, Team, Menu, Reviews, Open windows). They surface
 * what's coming and signal the page's eventual shape.
 */

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function getRestaurant(slug: string) {
  const [row] = await db
    .select()
    .from(restaurantProfiles)
    .where(eq(restaurantProfiles.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRestaurant(slug);
  if (!r) return { title: "Restaurant not found · Stagiaire" };

  const starLabel = r.stars === 1 ? "1 Michelin star" : `${r.stars} Michelin stars`;
  return {
    title: `${r.name} · ${r.city ?? r.country ?? ""} — Stagiaire`,
    description: r.blurb ?? `${starLabel}. ${r.name}, ${r.city ?? ""}.`,
  };
}

export default async function RestaurantProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const r = await getRestaurant(slug);
  if (!r) notFound();

  const tier = r.stars as 1 | 2 | 3;
  const starWord = tier === 1 ? "1 star" : `${tier} stars`;

  return (
    <main className="min-h-screen bg-vellum text-oak-gall">
      {/* Minimal chrome — wordmark + back link */}
      <header className="border-b border-sepia/30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-5">
          <Link
            href="/"
            className="font-headline text-3xl tracking-tight text-oak-gall transition-opacity duration-[120ms] ease-paper hover:opacity-80"
          >
            Stagiaire
          </Link>
          <Link
            href="/"
            className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
          >
            ← All restaurants
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-8 py-20">
        {/* Tagline above the name */}
        <div className="mb-6 flex items-center gap-3">
          <RosetteRow tier={tier} size={14} />
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            <span>Michelin</span>
            <span className="mx-2 text-sepia-faint">·</span>
            <span>{starWord}</span>
            {r.city && (
              <>
                <span className="mx-2 text-sepia-faint">·</span>
                <span>{r.city}</span>
              </>
            )}
          </p>
        </div>

        {/* Restaurant name */}
        <h1 className="font-headline text-7xl leading-[1.0] tracking-tight text-oak-gall sm:text-8xl">
          {r.name}
        </h1>

        {/* Blurb */}
        {r.blurb && (
          <p className="mt-8 max-w-prose font-serif text-lg leading-relaxed text-oak-gall-soft">
            {r.blurb}
          </p>
        )}

        {/* Hairline divider */}
        <hr className="my-16 border-0 border-t border-sepia/30" />

        {/* Long description (full Michelin write-up) */}
        {r.longDescription && r.longDescription !== r.blurb && (
          <section className="mb-16">
            <h2 className="mb-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
              About the restaurant
            </h2>
            <div className="space-y-4 font-serif text-base leading-relaxed text-oak-gall-soft">
              {splitParagraphs(r.longDescription).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* Visit — address, cuisine, website, source */}
        <section className="mb-16 grid grid-cols-1 gap-10 sm:grid-cols-2">
          <DefinitionBlock label="Address">
            <p className="font-serif text-base leading-relaxed text-oak-gall-soft">{r.address}</p>
          </DefinitionBlock>

          {r.cuisineTags && r.cuisineTags.length > 0 && (
            <DefinitionBlock label="Cuisine">
              <p className="font-serif text-base text-oak-gall-soft">
                {r.cuisineTags.join(", ")}
              </p>
            </DefinitionBlock>
          )}

          {r.websiteUrl && (
            <DefinitionBlock label="Website">
              <a
                href={r.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-serif text-base text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
              >
                {prettyUrl(r.websiteUrl)} ↗
              </a>
            </DefinitionBlock>
          )}

          {r.lat != null && r.lng != null && (
            <DefinitionBlock label="Coordinates">
              <p className="font-mono text-sm text-sepia">
                {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
              </p>
            </DefinitionBlock>
          )}
        </section>

        {/* Empty-state slots — show the page's eventual shape */}
        <hr className="my-16 border-0 border-t border-sepia/30" />

        <section className="mb-16">
          <h2 className="mb-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            The team
          </h2>
          <EmptyState
            text="No team members listed yet — restaurants fill in their brigade after claiming the profile."
          />
        </section>

        <section className="mb-16">
          <h2 className="mb-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Open windows
          </h2>
          <EmptyState
            text="The restaurant has not published stage windows. Requests for any date are still accepted."
          />
        </section>

        <section className="mb-16">
          <h2 className="mb-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Kitchen-side reviews
          </h2>
          <EmptyState
            text="No reviews yet. Reviews are written by stagiaires who have completed a stage here."
          />
        </section>

        {/* Marquee CTA — auth-walled, currently shows the logged-out state */}
        <section className="mb-16">
          <div className="flex flex-col gap-4">
            <button
              type="button"
              disabled
              className="group relative flex h-16 w-full items-center justify-center gap-3 bg-sepia px-6 font-headline text-2xl text-vellum opacity-90"
              title="Sign in to request a stage (auth flow not yet built)"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-1 border border-gold-leaf/30"
              />
              <span>Sign in to request a stage</span>
            </button>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
              Auth flows land in a later checkpoint. Once signed in, this becomes a Cordon-Bleu
              CTA opening the date picker.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-sepia/30 pt-6">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Profile data from the Michelin Guide ·{" "}
            <Link
              href="/"
              className="text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px]"
            >
              back to specimen
            </Link>
          </p>
        </footer>
      </article>
    </main>
  );
}

function DefinitionBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">{label}</p>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-sepia/30 px-6 py-8">
      <p className="font-serif text-sm italic text-sepia">{text}</p>
    </div>
  );
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}|(?<=[.!?])\s{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function prettyUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}
