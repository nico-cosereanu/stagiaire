import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { restaurantProfiles } from "@/db/schema";
import { RosetteRow } from "@/components/ui/rosette";
import { requireRole } from "@/lib/auth";

import { hasPendingClaim, searchUnclaimed } from "../_lib/owner";
import { EvidenceForm } from "./_components/evidence-form";

export const metadata: Metadata = {
  title: "Claim your restaurant",
};

/*
 * /restaurant/claim — single-page state machine driven by search params:
 *
 *   ?id=<uuid>   → show the picked restaurant + evidence form
 *   ?q=<query>   → show search results below the input
 *   neither      → empty search prompt
 *
 * Owners with a pending claim get bounced back to /restaurant. The
 * dashboard's pending state is the right surface for them.
 */

type PageProps = {
  searchParams: Promise<{ q?: string; id?: string }>;
};

export default async function ClaimPage({ searchParams }: PageProps) {
  const user = await requireRole("restaurant_owner");
  const params = await searchParams;

  if (await hasPendingClaim(user.id)) {
    redirect("/restaurant");
  }

  if (params.id) {
    return <PickedRestaurant restaurantId={params.id} />;
  }

  const query = params.q?.trim() ?? "";
  const results = query ? await searchUnclaimed(query) : [];

  return (
    <>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Step 1 of 2
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">
        Find your restaurant.
      </h1>
      <p className="mt-6 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        Every Michelin-starred restaurant in France is in the directory already. Search by name
        or city.
      </p>

      <form method="GET" className="mt-12 flex gap-3">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Mirazur, Annecy, L'Arpège…"
          autoFocus
          className="flex-1 border border-sepia/40 bg-ermine px-4 py-3 font-serif text-base text-oak-gall placeholder:text-sepia-faint focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu"
        />
        <button
          type="submit"
          className="rounded-lg bg-cordon-bleu px-6 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
        >
          Search
        </button>
      </form>

      {query && results.length === 0 && (
        <p className="mt-10 font-serif text-sm italic text-sepia">
          No unclaimed restaurants match &ldquo;{query}&rdquo;. Try a shorter query, or check
          whether your restaurant has already been claimed.
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-10 grid grid-cols-1 gap-px bg-sepia/20">
          {results.map((r) => (
            <li key={r.id}>
              <Link
                href={{ pathname: "/restaurant/claim", query: { id: r.id } }}
                className="flex items-center justify-between gap-6 bg-vellum px-6 py-5 transition-colors duration-[120ms] ease-paper hover:bg-ermine"
              >
                <div className="flex items-center gap-4">
                  <RosetteRow tier={r.stars as 1 | 2 | 3} size={9} />
                  <div>
                    <p className="font-display text-2xl italic text-oak-gall">{r.name}</p>
                    <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                      {r.city ?? r.country ?? ""}
                      {r.city && r.country ? (
                        <span className="mx-2 text-sepia-faint">·</span>
                      ) : null}
                      {r.city && r.country ? r.country : ""}
                    </p>
                  </div>
                </div>
                <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu">
                  Claim →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-16">
        <Link
          href="/restaurant"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
        >
          ← Back
        </Link>
      </p>
    </>
  );
}

async function PickedRestaurant({ restaurantId }: { restaurantId: string }) {
  const r = await db.query.restaurantProfiles.findFirst({
    where: eq(restaurantProfiles.id, restaurantId),
    columns: {
      id: true,
      name: true,
      slug: true,
      city: true,
      country: true,
      stars: true,
      address: true,
      claimedByUserId: true,
    },
  });

  if (!r) {
    return <ClaimError message="That restaurant isn't in the directory." />;
  }
  if (r.claimedByUserId) {
    return (
      <ClaimError message="That restaurant has already been claimed by another account. If you believe this is a mistake, contact us." />
    );
  }

  const tier = r.stars as 1 | 2 | 3;

  return (
    <>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Step 2 of 2
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">
        Claim {r.name}.
      </h1>
      <p className="mt-6 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        Tell us who you are and how you&rsquo;re tied to the kitchen. We review every claim
        manually before opening the restaurant&rsquo;s inbox to stage requests.
      </p>

      <div className="mt-12 flex items-center gap-4 border border-sepia/30 px-6 py-5">
        <RosetteRow tier={tier} size={11} />
        <div>
          <p className="font-display text-2xl italic text-oak-gall">{r.name}</p>
          <p className="mt-1 font-serif text-sm text-oak-gall-soft">{r.address}</p>
        </div>
      </div>

      <div className="mt-12">
        <EvidenceForm restaurantId={r.id} />
      </div>

      <p className="mt-12">
        <Link
          href="/restaurant/claim"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
        >
          ← Pick a different restaurant
        </Link>
      </p>
    </>
  );
}

function ClaimError({ message }: { message: string }) {
  return (
    <>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-michelin-red">
        Can&rsquo;t claim that restaurant
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">
        Hmm.
      </h1>
      <p className="mt-6 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        {message}
      </p>
      <p className="mt-12">
        <Link
          href="/restaurant/claim"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-cordon-bleu px-8 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
        >
          Search again →
        </Link>
      </p>
    </>
  );
}
