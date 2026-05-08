import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { and, asc, desc, eq, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  dishes,
  experiences,
  references,
  restaurantProfiles,
  reviews,
  stagiaireProfiles,
  stageRequests,
  users,
} from "@/db/schema";
import { getCurrentUser, roleHome, type CurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";

import { ReviewDisplay } from "@/components/features/requests/review-display";

/*
 * Public stagiaire profile — /u/[slug]
 *
 * Server Component, direct Drizzle query. Mirrors the structure of
 * /r/[slug]: hero (name + city + ID-verified badge), bio, experience,
 * portfolio, references, reviews. Hairline-bordered empty states
 * for sections that don't have data yet.
 *
 * Note: getStagiaire() pulls all child collections in parallel since
 * they're independent. Drizzle could do this with `with` but discrete
 * queries are simpler to type.
 */

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function getStagiaire(slug: string) {
  const profile = await db
    .select({
      userId: stagiaireProfiles.userId,
      name: stagiaireProfiles.name,
      photoUrl: stagiaireProfiles.photoUrl,
      bio: stagiaireProfiles.bio,
      currentCity: stagiaireProfiles.currentCity,
      country: stagiaireProfiles.country,
      languages: stagiaireProfiles.languages,
      availableFrom: stagiaireProfiles.availableFrom,
      availableUntil: stagiaireProfiles.availableUntil,
      idVerifiedAt: stagiaireProfiles.idVerifiedAt,
      slug: stagiaireProfiles.slug,
      email: users.email,
    })
    .from(stagiaireProfiles)
    .innerJoin(users, eq(stagiaireProfiles.userId, users.id))
    .where(eq(stagiaireProfiles.slug, slug))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!profile) return null;

  const [exp, portfolio, refs, completedReviews] = await Promise.all([
    db
      .select()
      .from(experiences)
      .where(eq(experiences.stagiaireId, profile.userId))
      .orderBy(desc(experiences.startedOn), asc(experiences.sortOrder)),
    db
      .select()
      .from(dishes)
      .where(eq(dishes.stagiaireId, profile.userId))
      .orderBy(asc(dishes.sortOrder)),
    db
      .select()
      .from(references)
      .where(
        and(eq(references.stagiaireId, profile.userId), eq(references.status, "confirmed")),
      )
      .orderBy(desc(references.confirmedAt)),
    // Restaurant -> stagiaire reviews that have been revealed (both
    // sides submitted, or 14-day window elapsed and we marked visibleAt).
    db
      .select({
        id: reviews.id,
        body: reviews.body,
        ratings: reviews.ratings,
        visibleAt: reviews.visibleAt,
        restaurantName: restaurantProfiles.name,
        restaurantSlug: restaurantProfiles.slug,
      })
      .from(reviews)
      .innerJoin(stageRequests, eq(reviews.stageRequestId, stageRequests.id))
      .innerJoin(restaurantProfiles, eq(stageRequests.restaurantId, restaurantProfiles.id))
      .where(
        and(
          eq(stageRequests.stagiaireId, profile.userId),
          eq(reviews.direction, "r_to_s"),
          isNotNull(reviews.visibleAt),
        ),
      )
      .orderBy(desc(reviews.visibleAt)),
  ]);

  return { profile, experiences: exp, dishes: portfolio, references: refs, reviews: completedReviews };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getStagiaire(slug);
  if (!data) return { title: "Stagiaire not found", robots: { index: false } };
  const description = (
    data.profile.bio ?? `${data.profile.name}, stagiaire on Stagiaire.`
  ).slice(0, 160);
  return {
    title: data.profile.name,
    description,
    // Stagiaire profiles are publicly viewable but not optimised for SEO —
    // chefs aren't the indexed asset, the directory is. Match the sitemap
    // omission with a noindex hint.
    robots: { index: false, follow: true },
  };
}

export default async function StagiaireProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const [data, viewer] = await Promise.all([getStagiaire(slug), getCurrentUser()]);
  if (!data) notFound();

  const { profile, experiences: exp, dishes: portfolio, references: refs, reviews: vouches } =
    data;
  const idVerified = profile.idVerifiedAt !== null;

  return (
    <main className="min-h-screen bg-vellum text-oak-gall">
      <header className="border-b border-sepia/30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-5">
          <Link
            href="/"
            className="font-display text-2xl italic tracking-tight text-oak-gall transition-opacity duration-[120ms] ease-paper hover:opacity-80"
          >
            Stagiaire
          </Link>
          <PublicNav user={viewer} />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 py-12">
        {/* Above-the-fold split: identity (left, sticky) + experience (right) */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          {/* LEFT — identity card */}
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-xl border border-sepia/30 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(43,38,26,0.15)] sm:p-8">
              {profile.photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.photoUrl}
                  alt={profile.name}
                  className="aspect-square w-full rounded-xl border border-sepia/20 bg-ermine object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-sepia/20 bg-ermine">
                  <span className="font-display text-6xl italic text-sepia-faint">
                    {profile.name.charAt(0)}
                  </span>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                <span>Stagiaire</span>
                {profile.currentCity && (
                  <>
                    <span className="text-sepia-faint">·</span>
                    <span>{profile.currentCity}</span>
                  </>
                )}
                {idVerified && (
                  <>
                    <span className="text-sepia-faint">·</span>
                    <span className="inline-flex items-center gap-1.5 text-gold-leaf">
                      <VerifiedDot /> ID verified
                    </span>
                  </>
                )}
              </div>

              <h1 className="mt-3 font-display text-4xl italic leading-[1.05] tracking-tight text-oak-gall sm:text-5xl">
                {profile.name}
              </h1>

              {profile.bio && (
                <p className="mt-5 font-serif text-base leading-relaxed text-oak-gall-soft">
                  {profile.bio}
                </p>
              )}

              {(profile.languages?.length || profile.availableFrom || profile.availableUntil) && (
                <dl className="mt-6 space-y-3 border-t border-sepia/20 pt-5 font-sans text-[11px] uppercase tracking-[0.18em]">
                  {profile.languages && profile.languages.length > 0 && (
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 text-sepia-faint">Languages</dt>
                      <dd className="text-oak-gall">{profile.languages.join(" · ")}</dd>
                    </div>
                  )}
                  {(profile.availableFrom || profile.availableUntil) && (
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 text-sepia-faint">Available</dt>
                      <dd className="text-oak-gall">
                        {profile.availableFrom && fmtDate(profile.availableFrom)}
                        {profile.availableFrom && profile.availableUntil && " — "}
                        {profile.availableUntil && fmtDate(profile.availableUntil)}
                      </dd>
                    </div>
                  )}
                </dl>
              )}

              {refs.length > 0 && (
                <div className="mt-6 border-t border-sepia/20 pt-5">
                  <h2 className="mb-3 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                    References
                  </h2>
                  <ul className="space-y-2 font-serif">
                    {refs.map((r) => (
                      <li key={r.id} className="text-sm">
                        <span className="text-oak-gall">{r.refereeName}</span>
                        {r.refereeRole && (
                          <span className="ml-2 font-sans text-[10px] uppercase tracking-[0.12em] text-sepia">
                            {r.refereeRole}
                          </span>
                        )}
                        {r.relationship && (
                          <span className="ml-1 text-sepia"> — {r.relationship}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT — experience, portfolio, reviews stacked */}
          <div className="space-y-6">
            {/* Experience */}
            <section className="rounded-xl border border-sepia/30 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(43,38,26,0.15)] sm:p-8">
              <h2 className="mb-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                Experience
              </h2>
              {exp.length === 0 ? (
                <EmptyState text="No experience listed yet." />
              ) : (
                <ol className="space-y-8">
                  {exp.map((e, i) => (
                    <li key={e.id} className="relative">
                      {i !== exp.length - 1 && (
                        <span
                          aria-hidden
                          className="absolute left-1.5 top-4 h-full w-px bg-sepia/20"
                        />
                      )}
                      <div className="grid grid-cols-[1rem_1fr] gap-4">
                        <span
                          aria-hidden
                          className="mt-1.5 h-3 w-3 rounded-full bg-michelin-red ring-2 ring-white"
                        />
                        <div>
                          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-sepia">
                            {fmtRange(e.startedOn, e.endedOn)}
                          </p>
                          <p className="mt-1 font-display text-2xl italic leading-tight text-oak-gall">
                            {e.restaurantName}
                          </p>
                          {(e.role || e.station) && (
                            <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.12em] text-sepia">
                              {[e.role, e.station].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          {e.description && (
                            <p className="mt-3 font-serif text-sm leading-relaxed text-oak-gall-soft">
                              {e.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Portfolio */}
            <section className="rounded-xl border border-sepia/30 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(43,38,26,0.15)] sm:p-8">
              <h2 className="mb-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                Portfolio
              </h2>
              {portfolio.length === 0 ? (
                <EmptyState text="No dishes uploaded yet." />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {portfolio.map((d) => (
                    <figure key={d.id} className="overflow-hidden rounded-xl border border-sepia/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={d.photoUrl}
                        alt={d.title ?? "Dish"}
                        className="aspect-[4/5] w-full object-cover"
                      />
                      <figcaption className="bg-white p-4">
                        {d.title && (
                          <p className="font-display text-lg italic text-oak-gall">{d.title}</p>
                        )}
                        {d.role && (
                          <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.12em] text-sepia">
                            {d.role}
                          </p>
                        )}
                        {d.techniqueNotes && (
                          <p className="mt-2 font-serif text-sm text-oak-gall-soft">
                            {d.techniqueNotes}
                          </p>
                        )}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </section>

            {/* Reviews */}
            <section className="rounded-xl border border-sepia/30 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(43,38,26,0.15)] sm:p-8">
              <h2 className="mb-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                Reviews from past stages
              </h2>
              {vouches.length === 0 ? (
                <EmptyState text="No reviews yet. Reviews are written by restaurants where the stagiaire has completed a stage." />
              ) : (
                <div className="space-y-6">
                  {vouches.map((v) => (
                    <ReviewDisplay
                      key={v.id}
                      direction="r_to_s"
                      ratings={v.ratings}
                      body={v.body}
                      authorLabel={`From ${v.restaurantName}`}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="mt-6">
          <footer className="pt-2">
            <p className="text-center font-sans text-[11px] uppercase tracking-[0.18em] text-sepia-faint">
              Profile self-published · Reviews from confirmed stages only
            </p>
          </footer>
        </div>
      </div>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-sepia/30 px-6 py-8">
      <p className="font-serif text-sm italic text-sepia">{text}</p>
    </div>
  );
}

function VerifiedDot() {
  return (
    <svg viewBox="0 0 8 8" width="8" height="8" aria-hidden="true">
      <circle cx="4" cy="4" r="3.5" fill="var(--color-gold-leaf)" />
    </svg>
  );
}

function fmtDate(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function fmtRange(start: string | null, end: string | null): string {
  if (!start) return "";
  if (!end) return `${fmtDate(start)} – present`;
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}
