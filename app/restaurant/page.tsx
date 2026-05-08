import type { Metadata } from "next";
import Link from "next/link";

import { requireRole } from "@/lib/auth";

import { getLatestClaim, getOwnedRestaurant } from "./_lib/owner";

export const metadata: Metadata = {
  title: "Restaurant dashboard",
};

/*
 * /restaurant — the owner's home.
 *
 * Three states, in order of precedence:
 *   1. owns a restaurant (claim approved, claimed_by_user_id flipped)
 *      → welcome + section list to manage profile/team/windows
 *   2. has any claim on file (pending or rejected)
 *      → status panel + cancel/retry affordance
 *   3. no claim yet
 *      → "Claim your restaurant" CTA pointing at /restaurant/claim
 *
 * Sections are placeholders this checkpoint; the editors land in the
 * next block.
 */

export default async function RestaurantDashboardPage() {
  const user = await requireRole("restaurant_owner");
  const [owned, claim] = await Promise.all([
    getOwnedRestaurant(user.id),
    getLatestClaim(user.id),
  ]);

  if (owned) {
    return <OwnedState name={owned.name} slug={owned.slug} />;
  }
  if (claim) {
    return <ClaimState claim={claim} />;
  }
  return <NoClaimState email={user.email} />;
}

function OwnedState({ name, slug }: { name: string; slug: string }) {
  return (
    <>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Restaurant dashboard
      </p>
      <h1 className="mt-3 font-display text-6xl italic leading-[1.05] tracking-tight">{name}</h1>
      <p className="mt-6 max-w-prose font-serif text-lg leading-relaxed text-oak-gall-soft">
        Your claim is approved. Anything you save here goes live on{" "}
        <Link
          href={`/r/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px]"
        >
          your public profile
        </Link>{" "}
        immediately.
      </p>

      <hr className="my-12 border-0 border-t border-sepia/30" />

      <h2 className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Manage your kitchen
      </h2>
      <ul className="mt-6 grid grid-cols-1 gap-px bg-sepia/20">
        <SectionTile
          href="/restaurant/profile"
          title="My profile"
          body="Tagline, long description, website, Instagram, menu, cuisine tags."
        />
        <SectionTile
          title="The team"
          body="Head chef, sous, pastry — listed on the public profile."
          status="Coming next"
        />
        <SectionTile
          href="/restaurant/windows"
          title="Closures"
          body="Block dates when you're not taking stagiaires — vacations, refurbs, private events."
        />
        <SectionTile
          href="/restaurant/requests"
          title="Stage requests"
          body="Incoming requests from stagiaires."
        />
      </ul>
    </>
  );
}

function ClaimState({
  claim,
}: {
  claim: NonNullable<Awaited<ReturnType<typeof getLatestClaim>>>;
}) {
  if (claim.status === "pending") {
    return (
      <>
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Claim under review
        </p>
        <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">
          We&rsquo;re verifying your claim on {claim.restaurantName}.
        </h1>
        <p className="mt-6 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
          Claims are reviewed manually during the closed alpha. We&rsquo;ll email you when it
          clears — usually within a day. Once approved, you&rsquo;ll be able to edit the public
          profile and receive stage requests.
        </p>

        <div className="mt-12 border border-sepia/30 px-6 py-5">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            What you submitted
          </p>
          {claim.evidenceText ? (
            <p className="mt-3 font-serif text-base leading-relaxed text-oak-gall-soft">
              {claim.evidenceText}
            </p>
          ) : (
            <p className="mt-3 font-serif text-sm italic text-sepia">No evidence text.</p>
          )}
          <p className="mt-4 font-mono text-xs text-sepia">
            req_{claim.id.slice(0, 8)} · submitted {claim.createdAt.toISOString().slice(0, 10)}
          </p>
        </div>
      </>
    );
  }

  // Rejected — let them try again
  return (
    <>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-michelin-red">
        Claim not approved
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">
        We couldn&rsquo;t verify your claim on {claim.restaurantName}.
      </h1>
      <p className="mt-6 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        This usually means the evidence didn&rsquo;t tie you to the restaurant clearly enough. You
        can submit a fresh claim with stronger evidence — a press contact, a kitchen photo of you
        in uniform, or a bio link on the restaurant&rsquo;s site.
      </p>
      <p className="mt-10">
        <Link
          href="/restaurant/claim"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-cordon-bleu px-8 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
        >
          Submit a new claim →
        </Link>
      </p>
    </>
  );
}

function NoClaimState({ email }: { email: string }) {
  return (
    <>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Welcome
      </p>
      <h1 className="mt-3 font-display text-6xl italic leading-[1.05] tracking-tight">
        Claim your restaurant.
      </h1>
      <p className="mt-6 max-w-prose font-serif text-lg leading-relaxed text-oak-gall-soft">
        You&rsquo;re signed in as <strong>{email}</strong>. Find your restaurant in the directory
        and submit a one-line claim. We&rsquo;ll verify and open your inbox to stage requests.
      </p>

      <p className="mt-12">
        <Link
          href="/restaurant/claim"
          className="inline-flex h-14 items-center justify-center rounded-lg bg-cordon-bleu px-8 font-display text-2xl italic text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
        >
          Find your restaurant →
        </Link>
      </p>

      <hr className="my-16 border-0 border-t border-sepia/30" />

      <h2 className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        How verification works
      </h2>
      <ol className="mt-6 space-y-4 font-serif text-base leading-relaxed text-oak-gall-soft">
        <li>
          <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">01.</span>{" "}
          Search the directory and pick your restaurant.
        </li>
        <li>
          <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">02.</span>{" "}
          Tell us who you are and how you&rsquo;re tied to the kitchen.
        </li>
        <li>
          <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">03.</span>{" "}
          We review (usually within a day) and email when you&rsquo;re cleared.
        </li>
      </ol>
    </>
  );
}

function SectionTile({
  title,
  body,
  status,
  href,
}: {
  title: string;
  body: string;
  status?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div>
        <h3 className="font-display text-2xl italic text-oak-gall">{title}</h3>
        <p className="mt-2 font-serif text-sm text-oak-gall-soft">{body}</p>
      </div>
      <p
        className={`shrink-0 font-sans text-[11px] uppercase tracking-[0.18em] ${
          href ? "text-cordon-bleu" : "text-sepia"
        }`}
      >
        {href ? "Open →" : status}
      </p>
    </>
  );

  if (href) {
    return (
      <li>
        <Link
          href={href}
          className="flex items-baseline justify-between gap-6 bg-vellum px-6 py-5 transition-colors duration-[120ms] ease-paper hover:bg-ermine"
        >
          {inner}
        </Link>
      </li>
    );
  }
  return (
    <li className="flex items-baseline justify-between gap-6 bg-vellum px-6 py-5">{inner}</li>
  );
}
