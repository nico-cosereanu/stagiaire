import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  dishes,
  experiences,
  references,
  reviews,
  stagiaireProfiles,
  stageRequests,
  users,
} from "@/db/schema";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";

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
    // Restaurant -> stagiaire reviews that have become visible
    db
      .select({
        id: reviews.id,
        body: reviews.body,
        ratings: reviews.ratings,
        visibleAt: reviews.visibleAt,
      })
      .from(reviews)
      .innerJoin(stageRequests, eq(reviews.stageRequestId, stageRequests.id))
      .where(
        and(eq(stageRequests.stagiaireId, profile.userId), eq(reviews.direction, "r_to_s")),
      ),
  ]);

  return { profile, experiences: exp, dishes: portfolio, references: refs, reviews: completedReviews };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getStagiaire(slug);
  if (!data) return { title: "Stagiaire not found · Stagiaire" };
  return {
    title: `${data.profile.name} · Stagiaire`,
    description:
      data.profile.bio ?? `${data.profile.name}, stagiaire on Stagiaire.`,
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

      <article className="mx-auto max-w-3xl px-8 py-20">
        {/* Tag bar */}
        <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          <span>Stagiaire</span>
          {profile.currentCity && (
            <>
              <span className="text-sepia-faint">·</span>
              <span>{profile.currentCity}</span>
            </>
          )}
          {profile.languages && profile.languages.length > 0 && (
            <>
              <span className="text-sepia-faint">·</span>
              <span>{profile.languages.join(" · ")}</span>
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

        {/* Name */}
        <h1 className="font-display text-6xl italic leading-[1.0] tracking-tight text-oak-gall sm:text-7xl">
          {profile.name}
        </h1>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-8 max-w-prose font-serif text-lg leading-relaxed text-oak-gall-soft">
            {profile.bio}
          </p>
        )}

        {/* Availability */}
        {(profile.availableFrom || profile.availableUntil) && (
          <p className="mt-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Available
            {profile.availableFrom && <> from {fmtDate(profile.availableFrom)}</>}
            {profile.availableUntil && <> until {fmtDate(profile.availableUntil)}</>}
          </p>
        )}

        <hr className="my-16 border-0 border-t border-sepia/30" />

        {/* Experience */}
        <section className="mb-16">
          <h2 className="mb-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Experience
          </h2>
          {exp.length === 0 ? (
            <EmptyState text="No experience listed yet." />
          ) : (
            <ol className="space-y-8">
              {exp.map((e) => (
                <li key={e.id} className="grid grid-cols-[110px_1fr] gap-6">
                  <div className="font-mono text-xs text-sepia">
                    {fmtRange(e.startedOn, e.endedOn)}
                  </div>
                  <div>
                    <p className="font-display text-2xl italic text-oak-gall">
                      {e.restaurantName}
                    </p>
                    <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.12em] text-sepia">
                      {[e.role, e.station].filter(Boolean).join(" · ")}
                    </p>
                    {e.description && (
                      <p className="mt-3 font-serif text-base leading-relaxed text-oak-gall-soft">
                        {e.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Portfolio */}
        <section className="mb-16">
          <h2 className="mb-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Portfolio
          </h2>
          {portfolio.length === 0 ? (
            <EmptyState text="No dishes uploaded yet." />
          ) : (
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
              {portfolio.map((d) => (
                <figure key={d.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.photoUrl}
                    alt={d.title ?? "Dish"}
                    className="aspect-[4/5] w-full object-cover"
                  />
                  <figcaption className="mt-3">
                    {d.title && (
                      <p className="font-display text-xl italic text-oak-gall">{d.title}</p>
                    )}
                    {d.role && (
                      <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.12em] text-sepia">
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

        {/* References */}
        <section className="mb-16">
          <h2 className="mb-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            References
          </h2>
          {refs.length === 0 ? (
            <EmptyState text="No confirmed references yet." />
          ) : (
            <ul className="space-y-3 font-serif">
              {refs.map((r) => (
                <li key={r.id} className="flex items-baseline gap-3">
                  <span className="text-oak-gall">{r.refereeName}</span>
                  {r.refereeRole && (
                    <span className="font-sans text-[11px] uppercase tracking-[0.12em] text-sepia">
                      {r.refereeRole}
                    </span>
                  )}
                  {r.relationship && (
                    <span className="font-serif text-sm text-sepia">— {r.relationship}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Reviews from past stages */}
        <section className="mb-16">
          <h2 className="mb-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Reviews from past stages
          </h2>
          {vouches.length === 0 ? (
            <EmptyState text="No reviews yet. Reviews are written by restaurants where the stagiaire has completed a stage." />
          ) : (
            <div className="space-y-8">
              {vouches.map((v) => (
                <blockquote
                  key={v.id}
                  className="border-l border-sepia/40 pl-6 font-serif text-base italic leading-relaxed text-oak-gall-soft"
                >
                  {v.body}
                </blockquote>
              ))}
            </div>
          )}
        </section>

        <footer className="border-t border-sepia/30 pt-6">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Profile self-published · Reviews from confirmed stages only
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
