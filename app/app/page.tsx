import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { dishes, experiences, references, reviews, stageRequests } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/app/onboarding/_lib/profile";

import { RecommendationsStrip } from "./_components/recommendations-strip";
import { getRecommendationsForStagiaire } from "./_lib/recommendations";

export const metadata: Metadata = {
  title: "My profile",
};

/*
 * /app — the stagiaire's profile, owner view.
 *
 * Same shape as the public /u/[slug] read, but with edit affordances
 * pointing at the /onboarding/* step pages (which read the existing
 * profile, so they double as field editors). Sections without dedicated
 * editors yet (experience, portfolio, references) render their state
 * with a small "Editor coming soon" hint.
 *
 * Restaurant_owner / admin roles get punted to their dashboards —
 * /app is the stagiaire surface and there's no useful render here for
 * the other roles.
 */

export default async function MyProfilePage() {
  const user = await requireUser();
  if (user.role === "restaurant_owner") redirect("/restaurant");
  if (user.role === "admin") redirect("/admin");

  const profile = await getProfile(user.id);
  // Layout already gates incomplete profiles to /onboarding/*, so a
  // signed-in stagiaire reaching this page has at least name + slug.
  if (!profile) redirect("/onboarding/name");

  const verificationPending = profile.identityVerificationStatus === "pending";
  const idVerified = profile.idVerifiedAt !== null;
  const verificationFailed = profile.identityVerificationStatus === "failed";
  const verificationNotStarted =
    profile.identityVerificationStatus === "not_started" && !idVerified;

  const [exp, portfolio, refs, vouches, recs] = await Promise.all([
    db
      .select()
      .from(experiences)
      .where(eq(experiences.stagiaireId, user.id))
      .orderBy(desc(experiences.startedOn), asc(experiences.sortOrder)),
    db
      .select()
      .from(dishes)
      .where(eq(dishes.stagiaireId, user.id))
      .orderBy(asc(dishes.sortOrder)),
    db
      .select()
      .from(references)
      .where(and(eq(references.stagiaireId, user.id), eq(references.status, "confirmed"))),
    db
      .select({
        id: reviews.id,
        body: reviews.body,
        ratings: reviews.ratings,
        visibleAt: reviews.visibleAt,
      })
      .from(reviews)
      .innerJoin(stageRequests, eq(reviews.stageRequestId, stageRequests.id))
      .where(and(eq(stageRequests.stagiaireId, user.id), eq(reviews.direction, "r_to_s"))),
    getRecommendationsForStagiaire(user.id, 6),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-8 py-12">
      {verificationPending && (
        <div className="mb-6 rounded-xl border border-sepia/30 bg-ermine px-5 py-4 font-serif text-sm text-oak-gall">
          <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            ID verification in review
          </span>
          <p className="mt-1">
            Stripe is still checking your documents. You can browse and request stages, but
            chefs will see a &ldquo;pending&rdquo; badge on your profile until it clears.
          </p>
        </div>
      )}

      {(verificationNotStarted || verificationFailed) && (
        <div className="mb-6 rounded-xl border border-sepia/30 bg-ermine px-5 py-4 font-serif text-sm text-oak-gall">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
              {verificationFailed ? "ID verification didn’t go through" : "Verify your ID"}
            </span>
            <Link
              href="/onboarding/verify"
              className="font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
            >
              {verificationFailed ? "Try again →" : "Start verification →"}
            </Link>
          </div>
          <p className="mt-1">
            Verified profiles get a green dot on your public page and respond
            rates from restaurants tend to be much higher. Takes about a
            minute through Stripe&rsquo;s hosted flow.
          </p>
        </div>
      )}

      {/* Action bar */}
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">My profile</p>
        <div className="flex items-baseline gap-6">
          <Link
            href="/app/requests"
            className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
          >
            My requests →
          </Link>
          <Link
            href={`/u/${profile.slug}`}
            target="_blank"
            rel="noreferrer"
            className="font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
          >
            View public profile ↗
          </Link>
        </div>
      </div>

      {/* Above-the-fold split: identity (left, sticky) + experience (right) */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        {/* LEFT — identity card */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-xl border border-sepia/30 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(43,38,26,0.15)] sm:p-8">
            <Link
              href="/onboarding/photo"
              className="group relative block aspect-square w-full overflow-hidden rounded-xl border border-sepia/20 bg-ermine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cordon-bleu"
            >
              {profile.photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.photoUrl}
                  alt={profile.name}
                  className="h-full w-full object-cover transition-opacity duration-[120ms] ease-paper group-hover:opacity-80"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="font-display text-6xl italic text-sepia-faint">
                    {profile.name.charAt(0)}
                  </span>
                </div>
              )}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center bg-oak-gall/85 py-2 font-sans text-[11px] uppercase tracking-[0.18em] text-vellum opacity-0 transition-opacity duration-[120ms] ease-paper group-hover:opacity-100">
                {profile.photoUrl ? "Change photo" : "Add photo"}
              </span>
            </Link>

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

            <div className="mt-3 flex items-start justify-between gap-3">
              <h1 className="font-display text-4xl italic leading-[1.05] tracking-tight text-oak-gall sm:text-5xl">
                {profile.name}
              </h1>
              <Link
                href="/onboarding/name?edit=1"
                className="mt-2 shrink-0 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
              >
                Edit
              </Link>
            </div>

            {/* Bio */}
            <FieldRow
              label="Bio"
              editHref="/onboarding/bio?edit=1"
              missingHint="Add a short pitch — what you've trained, what you want to learn."
            >
              {profile.bio ? (
                <p className="font-serif text-base leading-relaxed text-oak-gall-soft">
                  {profile.bio}
                </p>
              ) : null}
            </FieldRow>

            {/* Languages */}
            <FieldRow
              label="Languages"
              editHref="/onboarding/languages?edit=1"
              missingHint="What you speak in the kitchen."
            >
              {profile.languages && profile.languages.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {profile.languages.map((l) => (
                    <li
                      key={l}
                      className="rounded-md border border-sepia/30 px-2 py-0.5 font-sans text-[10px] uppercase tracking-[0.14em] text-sepia"
                    >
                      {l}
                    </li>
                  ))}
                </ul>
              ) : null}
            </FieldRow>

            {/* Location */}
            <FieldRow
              label="Based in"
              editHref="/onboarding/location?edit=1"
              missingHint="Add your city + country."
            >
              {profile.currentCity || profile.country ? (
                <p className="font-serif text-sm text-oak-gall-soft">
                  {[profile.currentCity, profile.country].filter(Boolean).join(", ")}
                </p>
              ) : null}
            </FieldRow>

            {/* Availability */}
            <FieldRow
              label="Available"
              editHref="/onboarding/availability?edit=1"
              missingHint="Set a window so chefs see when you're free."
            >
              {profile.availableFrom || profile.availableUntil ? (
                <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-oak-gall">
                  {profile.availableFrom && fmtDate(profile.availableFrom)}
                  {profile.availableFrom && profile.availableUntil && " — "}
                  {profile.availableUntil && fmtDate(profile.availableUntil)}
                </p>
              ) : null}
            </FieldRow>

            {/* References */}
            <FieldRow label="References" status="Editor coming soon">
              {refs.length > 0 ? (
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
              ) : null}
            </FieldRow>
          </div>
        </aside>

        {/* RIGHT — experience, portfolio, reviews stacked */}
        <div className="space-y-6">
          {/* Experience */}
          <section className="rounded-xl border border-sepia/30 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(43,38,26,0.15)] sm:p-8">
            <div className="mb-6 flex items-baseline justify-between gap-4">
              <h2 className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                Experience
              </h2>
              <Link
                href="/app/experiences"
                className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
              >
                Manage
              </Link>
            </div>
            {exp.length === 0 ? (
              <EmptyState text="No experience listed yet. Add your first entry from the manage page." />
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
            <div className="mb-6 flex items-baseline justify-between gap-4">
              <h2 className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                Portfolio
              </h2>
              <Link
                href="/app/portfolio"
                className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
              >
                Manage
              </Link>
            </div>
            {portfolio.length === 0 ? (
              <EmptyState text="No dishes uploaded yet. Add your first from the manage page." />
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
              <EmptyState text="No reviews yet. Restaurants where you complete a stage write these." />
            ) : (
              <div className="space-y-6">
                {vouches.map((v) => (
                  <blockquote
                    key={v.id}
                    className="border-l-2 border-michelin-red/60 pl-5 font-serif text-base italic leading-relaxed text-oak-gall-soft"
                  >
                    {v.body}
                  </blockquote>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {recs.length > 0 && (
        <section className="mt-6 rounded-xl border border-sepia/30 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(43,38,26,0.15)] sm:p-8">
          <RecommendationsStrip recs={recs} />
        </section>
      )}
    </div>
  );
}

function FieldRow({
  label,
  editHref,
  status,
  missingHint,
  children,
}: {
  label: string;
  editHref?: string;
  status?: string;
  missingHint?: string;
  children: React.ReactNode;
}) {
  const isEmpty = children === null;
  return (
    <div className="mt-5 border-t border-sepia/20 pt-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia-faint">
          {label}
        </h3>
        {editHref ? (
          <Link
            href={editHref}
            className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
          >
            {isEmpty ? "Add" : "Edit"}
          </Link>
        ) : status ? (
          <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-sepia-faint">
            {status}
          </span>
        ) : null}
      </div>
      {isEmpty && missingHint ? (
        <p className="font-serif text-sm italic text-sepia">{missingHint}</p>
      ) : isEmpty ? (
        <p className="font-serif text-sm italic text-sepia-faint">No entries yet.</p>
      ) : (
        children
      )}
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
