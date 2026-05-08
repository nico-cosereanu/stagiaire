import Image from "next/image";
import Link from "next/link";

import { RosetteRow } from "@/components/ui/rosette";

import type { AvailabilityStats, DiscoverResult } from "../_lib/filters";

/*
 * Single restaurant tile in the discover grid. Vertical card with the
 * availability badge pinned to the bottom (mt-auto on a flex column) so
 * a row of tiles aligns visually regardless of blurb length.
 *
 * Multiple click targets via the "card with embedded action" pattern:
 *   - Title carries the navigation link with a `before:absolute
 *     before:inset-0` overlay so the whole card is clickable
 *   - "Request →" button is a real Link with `relative z-10`, sitting
 *     above the overlay so it captures its own clicks
 *
 * Date filter from /discover is forwarded as ?start/?end on both links
 * so the restaurant page (or the request page) starts with the picker
 * pre-filled. The Request shortcut only renders when the kitchen is
 * fully available for the chosen range — the request flow rejects any
 * range that overlaps a closure, so showing it on partially-available
 * cards would dead-end.
 */

export function ResultCard({
  result,
  startDate,
  endDate,
}: {
  result: DiscoverResult;
  startDate: string | null;
  endDate: string | null;
}) {
  const { slug, name, city, stars, cuisineTags, blurb, heroImageUrl, claimed, availability } =
    result;

  const dateQs =
    startDate && endDate ? `?start=${startDate}&end=${endDate}` : "";
  const detailHref = `/r/${slug}${dateQs}`;
  const requestHref = `/r/${slug}/request${dateQs}`;
  const showRequestShortcut =
    Boolean(dateQs) &&
    availability !== null &&
    availability.availableDays === availability.rangeDays;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-sepia/30 bg-white transition-colors duration-[120ms] ease-paper hover:border-cordon-bleu">
      <CardThumb src={heroImageUrl} name={name} tier={stars} />

      <div className="flex flex-1 flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <RosetteRow tier={stars} size={12} />
        {claimed && (
          <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-verdigris">
            Verified
          </span>
        )}
      </div>

      <h3 className="mt-3 font-display text-2xl italic leading-[1.1] text-oak-gall">
        <Link
          href={detailHref}
          className="before:absolute before:inset-0 before:z-0 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cordon-bleu"
        >
          {name}
        </Link>
      </h3>
      <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        {city ?? "—"}
      </p>

      {blurb && (
        <p className="mt-3 line-clamp-3 font-serif text-sm leading-relaxed text-oak-gall-soft">
          {blurb}
        </p>
      )}

      {cuisineTags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {cuisineTags.slice(0, 3).map((tag) => (
            <li
              key={tag}
              className="border border-sepia/30 px-1.5 py-0.5 font-sans text-[10px] uppercase tracking-[0.14em] text-sepia"
            >
              {tag}
            </li>
          ))}
          {cuisineTags.length > 3 && (
            <li className="self-center font-sans text-[10px] uppercase tracking-[0.14em] text-sepia-faint">
              +{cuisineTags.length - 3}
            </li>
          )}
        </ul>
      )}

      {availability && (
        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-3 border-t border-sepia/20 pt-3">
            <AvailabilityBadge availability={availability} />
            {showRequestShortcut && (
              <Link
                href={requestHref}
                className="relative z-10 inline-flex shrink-0 items-center bg-cordon-bleu px-3 py-1.5 font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cordon-bleu"
              >
                Request →
              </Link>
            )}
          </div>
        </div>
      )}
      </div>
    </article>
  );
}

function CardThumb({
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
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-sepia/20 bg-ermine">
        <div className="absolute inset-0 flex items-center justify-center">
          <RosetteRow tier={tier} size={14} className="opacity-60" />
        </div>
      </div>
    );
  }
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-sepia/20 bg-ermine">
      <Image
        src={src}
        alt={name}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover transition-transform duration-[280ms] ease-paper group-hover:scale-[1.03]"
      />
    </div>
  );
}

function AvailabilityBadge({ availability }: { availability: AvailabilityStats }) {
  const { rangeDays, availableDays, conflict } = availability;

  if (availableDays === rangeDays) {
    return (
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu">
        Available · {rangeDays} {rangeDays === 1 ? "day" : "days"}
      </p>
    );
  }

  if (availableDays === 0) {
    return (
      <div>
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-michelin-red">
          Closed during your dates
        </p>
        {conflict && (
          <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.18em] text-sepia-faint">
            {fmtRange(conflict.startDate, conflict.endDate)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="font-display text-xl italic text-oak-gall">
        {availableDays}
        <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          {" "}
          / {rangeDays} days available
        </span>
      </p>
      {conflict && (
        <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.18em] text-sepia-faint">
          closed {fmtRange(conflict.startDate, conflict.endDate)}
        </p>
      )}
    </div>
  );
}

function fmtRange(startIso: string, endIso: string): string {
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const a = fmt.format(new Date(`${startIso}T00:00:00Z`));
  const b = fmt.format(new Date(`${endIso}T00:00:00Z`));
  return `${a} → ${b}`;
}
