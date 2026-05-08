import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { and, desc, eq, isNotNull } from "drizzle-orm";

import { ReviewDisplay } from "@/components/features/requests/review-display";
import { RosetteRow } from "@/components/ui/rosette";
import { db } from "@/lib/db";
import { restaurantProfiles, reviews, stagiaireProfiles, stageRequests } from "@/db/schema";
import { getCurrentUser, roleHome, type CurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";

import { InteractiveStageRequest } from "./_components/interactive-stage-request";

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
  searchParams: Promise<{ start?: string; end?: string }>;
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function getRestaurant(slug: string) {
  const [row] = await db
    .select()
    .from(restaurantProfiles)
    .where(eq(restaurantProfiles.slug, slug))
    .limit(1);
  return row ?? null;
}

async function getKitchenReviews(restaurantId: string) {
  return db
    .select({
      id: reviews.id,
      body: reviews.body,
      ratings: reviews.ratings,
      visibleAt: reviews.visibleAt,
      stagiaireName: stagiaireProfiles.name,
      stagiaireSlug: stagiaireProfiles.slug,
    })
    .from(reviews)
    .innerJoin(stageRequests, eq(reviews.stageRequestId, stageRequests.id))
    .innerJoin(stagiaireProfiles, eq(stageRequests.stagiaireId, stagiaireProfiles.userId))
    .where(
      and(
        eq(stageRequests.restaurantId, restaurantId),
        eq(reviews.direction, "s_to_r"),
        isNotNull(reviews.visibleAt),
      ),
    )
    .orderBy(desc(reviews.visibleAt));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRestaurant(slug);
  if (!r) return { title: "Restaurant not found" };

  const place = r.city ?? r.country ?? "";
  const starLabel = r.stars === 1 ? "1 Michelin star" : `${r.stars} Michelin stars`;
  const title = place ? `${r.name} — ${place}` : r.name;
  const description = (r.blurb ?? `${starLabel} · ${place || r.name}.`).slice(0, 160);
  const ogImage = r.heroImageUrl ? `${r.heroImageUrl}?width=1200` : null;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      url: `/r/${r.slug}`,
      ...(ogImage
        ? { images: [{ url: ogImage, width: 1200, height: 1200, alt: r.name }] }
        : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function RestaurantProfilePage({ params, searchParams }: PageProps) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [r, user] = await Promise.all([getRestaurant(slug), getCurrentUser()]);
  if (!r) notFound();

  const kitchenReviews = await getKitchenReviews(r.id);

  // Carry the date range through from /discover or the homepage search.
  // Both endpoints must be valid ISO; otherwise we ignore the params and
  // start with an empty picker.
  const initialStartDate = sp.start && ISO_DATE_RE.test(sp.start) ? sp.start : "";
  const initialEndDate = sp.end && ISO_DATE_RE.test(sp.end) ? sp.end : "";

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
        {/* Hero image — falls back to an editorial placeholder when null */}
        <RestaurantHero src={r.heroImageUrl} name={r.name} tier={tier} />

        {/* Tagline above the name */}
        <div className="mb-6 mt-12 flex items-center gap-3">
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

        {/* Tagline (blurb) — short pitch the owner wrote in the editor */}
        {r.blurb && (
          <p className="mt-6 font-serif text-xl italic leading-snug text-oak-gall-soft sm:text-2xl">
            {r.blurb}
          </p>
        )}

        {/* The facts grid — Address / Head chef / Cuisine / Website /
            Instagram / Menu. Each cell collapses gracefully when the
            value is missing. */}
        <section className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 md:grid-cols-3">
          <DefinitionBlock label="Address">
            <p className="font-serif text-base leading-relaxed text-oak-gall-soft">{r.address}</p>
          </DefinitionBlock>

          <DefinitionBlock label="Head chef">
            <p className={`font-serif text-base ${r.headChef ? "text-oak-gall-soft" : "text-sepia-faint"}`}>
              {r.headChef ?? "—"}
            </p>
          </DefinitionBlock>

          <DefinitionBlock label="Cuisine">
            {r.cuisineTags && r.cuisineTags.length > 0 ? (
              <p className="font-serif text-base text-oak-gall-soft">
                {r.cuisineTags.join(", ")}
              </p>
            ) : (
              <p className="font-serif text-base text-sepia-faint">—</p>
            )}
          </DefinitionBlock>

          <DefinitionBlock label="Website">
            {r.websiteUrl ? (
              <a
                href={r.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words font-serif text-base text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
              >
                {prettyUrl(r.websiteUrl)} ↗
              </a>
            ) : (
              <p className="font-serif text-base text-sepia-faint">—</p>
            )}
          </DefinitionBlock>

          <DefinitionBlock label="Instagram">
            {r.instagramHandle ? (
              <a
                href={`https://instagram.com/${r.instagramHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words font-serif text-base text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
              >
                @{r.instagramHandle} ↗
              </a>
            ) : (
              <p className="font-serif text-base text-sepia-faint">—</p>
            )}
          </DefinitionBlock>

          <DefinitionBlock label="Menu">
            {r.menuUrl ? (
              <a
                href={r.menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words font-serif text-base text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
              >
                View menu ↗
              </a>
            ) : (
              <p className="font-serif text-base text-sepia-faint">—</p>
            )}
          </DefinitionBlock>
        </section>

        {/* Hairline divider */}
        <hr className="my-16 border-0 border-t border-sepia/30" />

        {/* Long description (full Michelin write-up) */}
        {r.longDescription && (
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

        <InteractiveStageRequest
          closedWindows={r.closedWindows ?? []}
          todayIso={todayIso()}
          user={user}
          restaurantSlug={r.slug}
          hasOwner={r.claimedByUserId !== null}
          initialStartDate={initialStartDate}
          initialEndDate={initialEndDate}
        >
          <section className="mb-16">
            <h2 className="mb-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
              Kitchen-side reviews
            </h2>
            {kitchenReviews.length === 0 ? (
              <EmptyState
                text="No reviews yet. Reviews are written by stagiaires who have completed a stage here."
              />
            ) : (
              <div className="space-y-6">
                {kitchenReviews.map((rv) => (
                  <ReviewDisplay
                    key={rv.id}
                    direction="s_to_r"
                    ratings={rv.ratings}
                    body={rv.body}
                    authorLabel={`From ${rv.stagiaireName}`}
                  />
                ))}
              </div>
            )}
          </section>
        </InteractiveStageRequest>

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
  const home = roleHome(user.role);
  return (
    <div className="flex items-center gap-5">
      <Link
        href={home.href}
        className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
      >
        {home.label}
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

function RestaurantHero({
  src,
  name,
  tier,
}: {
  src: string | null;
  name: string;
  tier: 1 | 2 | 3;
}) {
  if (!src) {
    return (
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-sepia/30 bg-ermine">
        <div className="absolute inset-0 flex items-center justify-center">
          <RosetteRow tier={tier} size={20} className="opacity-60" />
        </div>
      </div>
    );
  }
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden border border-sepia/30 bg-ermine">
      <Image
        src={src}
        alt={name}
        fill
        priority
        sizes="(min-width: 768px) 768px, 100vw"
        className="object-cover"
      />
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

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function prettyUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}
