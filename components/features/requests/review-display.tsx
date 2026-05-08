import {
  RESTAURANT_RATING_LABELS,
  STAGIAIRE_RATING_LABELS,
} from "@/lib/reviews-shared";
import type {
  RestaurantToStagiaireRatings,
  StagiaireToRestaurantRatings,
} from "@/db/schema";

/*
 * One review, rendered. Used on both detail pages and on the public
 * profiles. `hidden` toggles between full content and a "submitted but
 * waiting on the other side" placeholder — mine still gets shown to me
 * even when hidden, so I can re-read what I wrote.
 */

type Props = {
  direction: "s_to_r" | "r_to_s";
  ratings: StagiaireToRestaurantRatings | RestaurantToStagiaireRatings;
  body: string | null;
  authorLabel: string;
};

export function ReviewDisplay({ direction, ratings, body, authorLabel }: Props) {
  const labels =
    direction === "s_to_r" ? STAGIAIRE_RATING_LABELS : RESTAURANT_RATING_LABELS;

  const numericKeys = Object.keys(labels) as Array<keyof typeof labels>;

  return (
    <div className="rounded-xl border border-sepia/30 bg-vellum px-5 py-5 sm:px-6 sm:py-6">
      <p className="mb-4 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        {authorLabel}
      </p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {numericKeys.map((k) => {
          const value = (ratings as Record<string, unknown>)[k];
          if (typeof value !== "number") return null;
          return (
            <div key={k}>
              <dt className="font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
                {labels[k]}
              </dt>
              <dd className="mt-0.5 flex items-baseline gap-1.5 font-display text-2xl italic text-oak-gall">
                {value}
                <span className="font-serif text-xs not-italic text-sepia-faint">/ 5</span>
              </dd>
            </div>
          );
        })}
        {direction === "s_to_r" &&
          typeof (ratings as StagiaireToRestaurantRatings).hoursDescription === "string" && (
            <div className="col-span-2 sm:col-span-3">
              <dt className="font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
                Hours
              </dt>
              <dd className="mt-0.5 font-serif text-base italic text-oak-gall-soft">
                &ldquo;{(ratings as StagiaireToRestaurantRatings).hoursDescription}&rdquo;
              </dd>
            </div>
          )}
      </dl>
      {body && (
        <blockquote className="mt-5 border-l-2 border-michelin-red/60 pl-4 font-serif text-base italic leading-relaxed text-oak-gall">
          {body}
        </blockquote>
      )}
    </div>
  );
}
