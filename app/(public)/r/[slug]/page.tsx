import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { eq } from "drizzle-orm";

import { Rosette, RosetteRow } from "@/components/ui/rosette";
import { db } from "@/lib/db";
import { restaurantProfiles } from "@/db/schema";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";

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
  const [r, user] = await Promise.all([getRestaurant(slug), getCurrentUser()]);
  if (!r) notFound();

  const tier = r.stars as 1 | 2 | 3;
  const starWord = tier === 1 ? "1 star" : `${tier} stars`;

  return (
    <main className="min-h-screen bg-vellum text-oak-gall">
      {/* Minimal chrome — wordmark + auth nav */}
      <header className="border-b border-sepia/30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-5">
          <Link
            href="/"
            className="font-display text-2xl italic tracking-tight text-oak-gall transition-opacity duration-[120ms] ease-paper hover:opacity-80"
          >
            Stagiaire
          </Link>
          <PublicNav user={user} />
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
        <h1 className="font-display text-6xl italic leading-[0.95] tracking-tight text-oak-gall sm:text-7xl">
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

        {/* Marquee CTA — auth-aware */}
        <section className="mb-16">
          <RequestCta user={user} restaurantSlug={r.slug} />
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

function PublicNav({ user }: { user: CurrentUser | null }) {
  if (!user) {
    return (
      <div className="flex items-center gap-5">
        <Link
          href="/login"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
        >
          Sign up
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-5">
      <Link
        href="/app"
        className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
      >
        Dashboard
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
        >
          Log out
        </button>
      </form>
    </div>
  );
}

function RequestCta({
  user,
  restaurantSlug,
}: {
  user: CurrentUser | null;
  restaurantSlug: string;
}) {
  // Logged out → Cordon-Bleu CTA that links to /login with the return path
  if (!user) {
    return (
      <Link
        href={`/login?next=/r/${restaurantSlug}`}
        className="group relative flex h-16 w-full items-center justify-center gap-3 bg-cordon-bleu px-6 font-display text-2xl italic text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-1 border border-gold-leaf/40"
        />
        <span>Sign in to request a stage</span>
      </Link>
    );
  }

  // Stagiaire → primary CTA (request flow itself ships in a later checkpoint)
  if (user.role === "stagiaire") {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled
          className="group relative flex h-16 w-full items-center justify-center gap-3 bg-cordon-bleu px-6 font-display text-2xl italic text-vellum opacity-95"
          title="Request flow ships in a later checkpoint"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-1 border border-gold-leaf/50"
          />
          <span>Request a stage</span>
        </button>
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          The date picker + request submission lands in the next checkpoint.
        </p>
      </div>
    );
  }

  // Restaurant owner / admin → not the audience for this CTA
  return (
    <div className="border border-sepia/30 px-6 py-5">
      <p className="font-serif text-sm italic text-sepia">
        Stage requests are submitted by stagiaires. Your account is a {user.role.replace("_", " ")}.
      </p>
    </div>
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
