import Link from "next/link";

import { RosetteRow } from "@/components/ui/rosette";

import type { Recommendation } from "../_lib/recommendations";

/*
 * Compact horizontal strip of suggested restaurants. Renders nothing
 * when the user has no experiences yet — caller decides what to show
 * in that empty case (usually a prompt to fill in the CV).
 */

export function RecommendationsStrip({ recs }: { recs: Recommendation[] }) {
  if (recs.length === 0) return null;

  return (
    <section>
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Kitchens you might fit
        </h2>
        <Link
          href="/discover"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu transition-opacity duration-[120ms] ease-paper hover:opacity-80"
        >
          Discover all →
        </Link>
      </header>

      <ul className="grid grid-cols-1 gap-px bg-sepia/15 sm:grid-cols-2 lg:grid-cols-3">
        {recs.map((r) => (
          <li key={r.id} className="bg-white">
            <RecCard rec={r} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecCard({ rec }: { rec: Recommendation }) {
  return (
    <Link
      href={`/r/${rec.slug}`}
      className="flex h-full flex-col px-5 py-4 transition-colors duration-[120ms] ease-paper hover:bg-vellum"
    >
      <div className="flex items-center gap-2">
        <RosetteRow tier={rec.stars} size={11} />
        {rec.claimed && (
          <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-verdigris">
            Verified
          </span>
        )}
      </div>
      <h3 className="mt-2 font-display text-xl italic text-oak-gall">{rec.name}</h3>
      <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
        {rec.city ?? "—"}
      </p>
      <p className="mt-3 line-clamp-2 font-serif text-sm leading-snug text-oak-gall-soft">
        <ReasonLine reason={rec.reason} />
      </p>
    </Link>
  );
}

function ReasonLine({ reason }: { reason: Recommendation["reason"] }) {
  const cuisines = reason.sharedCuisines.slice(0, 2);
  if (cuisines.length === 0 && !reason.sameTierAs) {
    return <span className="italic text-sepia">Suggested for you</span>;
  }
  if (cuisines.length > 0 && reason.sameTierAs) {
    return (
      <>
        Same tier as <em className="not-italic text-oak-gall">{reason.sameTierAs}</em>, shares{" "}
        {cuisines.join(" + ")}.
      </>
    );
  }
  if (cuisines.length > 0) {
    return <>Shares {cuisines.join(" + ")} with kitchens you&rsquo;ve worked.</>;
  }
  return (
    <>
      Same tier as <em className="not-italic text-oak-gall">{reason.sameTierAs}</em>.
    </>
  );
}
