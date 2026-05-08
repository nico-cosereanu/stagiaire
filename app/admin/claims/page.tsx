import type { Metadata } from "next";
import Link from "next/link";

import { desc, eq, inArray } from "drizzle-orm";

import { RosetteRow } from "@/components/ui/rosette";
import { db } from "@/lib/db";
import { restaurantClaims, restaurantProfiles, users } from "@/db/schema";

import { ClaimDecisionForm } from "./_components/claim-decision-form";

export const metadata: Metadata = {
  title: "Claims · Stagiaire admin",
};

/*
 * /admin/claims — pending queue + recent decisions for context.
 *
 * Joins claim → restaurant + claimant in one round trip. We don't
 * paginate yet; the inbox is small during the closed alpha. Add a
 * cursor when pending+recent grows past ~50.
 */

export default async function AdminClaimsPage() {
  const pending = await db
    .select({
      id: restaurantClaims.id,
      evidenceText: restaurantClaims.evidenceText,
      evidenceUrl: restaurantClaims.evidenceUrl,
      createdAt: restaurantClaims.createdAt,
      restaurantName: restaurantProfiles.name,
      restaurantSlug: restaurantProfiles.slug,
      restaurantStars: restaurantProfiles.stars,
      restaurantCity: restaurantProfiles.city,
      restaurantCountry: restaurantProfiles.country,
      restaurantClaimedByUserId: restaurantProfiles.claimedByUserId,
      claimantId: users.id,
      claimantEmail: users.email,
    })
    .from(restaurantClaims)
    .innerJoin(restaurantProfiles, eq(restaurantProfiles.id, restaurantClaims.restaurantId))
    .innerJoin(users, eq(users.id, restaurantClaims.userId))
    .where(eq(restaurantClaims.status, "pending"))
    .orderBy(desc(restaurantClaims.createdAt));

  const recent = await db
    .select({
      id: restaurantClaims.id,
      status: restaurantClaims.status,
      reviewedAt: restaurantClaims.reviewedAt,
      restaurantName: restaurantProfiles.name,
      restaurantSlug: restaurantProfiles.slug,
      claimantEmail: users.email,
    })
    .from(restaurantClaims)
    .innerJoin(restaurantProfiles, eq(restaurantProfiles.id, restaurantClaims.restaurantId))
    .innerJoin(users, eq(users.id, restaurantClaims.userId))
    .where(inArray(restaurantClaims.status, ["approved", "rejected"]))
    .orderBy(desc(restaurantClaims.reviewedAt))
    .limit(25);

  return (
    <>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        <Link
          href="/admin"
          className="transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
        >
          ← Admin
        </Link>
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">
        Restaurant claims
      </h1>
      <p className="mt-4 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        Verify the claimant is who they say they are — usually a press contact, a bio link on the
        restaurant&rsquo;s site, or an Instagram cross-check. Approving links the public profile to
        their account immediately.
      </p>

      <hr className="my-10 border-0 border-t border-sepia/30" />

      <h2 className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Pending{pending.length > 0 ? ` · ${pending.length}` : ""}
      </h2>

      {pending.length === 0 ? (
        <div className="mt-6 border border-sepia/30 px-6 py-8">
          <p className="font-serif text-sm italic text-sepia">
            Inbox zero. Nothing to review.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-px bg-sepia/20">
          {pending.map((c) => (
            <li key={c.id} className="bg-vellum px-6 py-6">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <RosetteRow tier={c.restaurantStars as 1 | 2 | 3} size={7} />
                <h3 className="font-display text-2xl italic text-oak-gall">
                  {c.restaurantName}
                </h3>
                <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                  {c.restaurantCity ?? c.restaurantCountry ?? "—"}
                </p>
                <Link
                  href={`/r/${c.restaurantSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px]"
                >
                  View public profile ↗
                </Link>
              </div>

              <p className="mt-3 font-mono text-xs text-sepia">
                {c.claimantEmail} · req_{c.id.slice(0, 8)} · submitted{" "}
                {c.createdAt.toISOString().slice(0, 10)}
              </p>

              {c.restaurantClaimedByUserId && c.restaurantClaimedByUserId !== c.claimantId && (
                <p className="mt-3 border border-michelin-red/40 bg-michelin-red/5 px-3 py-2 font-serif text-sm text-michelin-red">
                  Heads up: this restaurant is already claimed by another account. Approving this
                  duplicate will fail — reject it.
                </p>
              )}

              <p className="mt-4 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                Evidence
              </p>
              {c.evidenceText ? (
                <p className="mt-2 whitespace-pre-wrap font-serif text-base leading-relaxed text-oak-gall">
                  {c.evidenceText}
                </p>
              ) : (
                <p className="mt-2 font-serif text-sm italic text-sepia">No evidence text.</p>
              )}
              {c.evidenceUrl && (
                <p className="mt-3">
                  <a
                    href={c.evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-serif text-sm text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px]"
                  >
                    {c.evidenceUrl} ↗
                  </a>
                </p>
              )}

              <div className="mt-6 border-t border-sepia/20 pt-5">
                <ClaimDecisionForm claimId={c.id} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-16 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Recently decided
      </h2>
      {recent.length === 0 ? (
        <p className="mt-4 font-serif text-sm italic text-sepia">No history yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {recent.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-serif text-sm text-oak-gall-soft"
            >
              <span
                className={`font-sans text-[11px] uppercase tracking-[0.18em] ${
                  r.status === "approved" ? "text-verdigris" : "text-michelin-red"
                }`}
              >
                {r.status}
              </span>
              <Link
                href={`/r/${r.restaurantSlug}`}
                target="_blank"
                rel="noreferrer"
                className="text-oak-gall hover:underline"
              >
                {r.restaurantName}
              </Link>
              <span className="text-sepia">·</span>
              <span className="font-mono text-xs">{r.claimantEmail}</span>
              <span className="ml-auto font-mono text-xs text-sepia">
                {r.reviewedAt?.toISOString().slice(0, 10) ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
