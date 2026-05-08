"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DateRangeCalendar } from "@/components/features/requests/date-range-calendar";
import type { ClosedWindow } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";

/*
 * Interactive section that combines the restaurant's date picker with
 * the bottom-of-page "Request a stage" CTA. They share local picker
 * state — `children` renders the server-side content that lives between
 * them (reviews, etc.) so we don't fight Next's RSC boundaries.
 *
 * Default model: the kitchen is open. The only constraint surfaced
 * here is `closedWindows` — explicit closures the restaurant has
 * published. If the picked range straddles a closure (e.g. start
 * before, end after a vacation), the CTA blocks with an error.
 *
 * URL doesn't carry the selection — picking is local React state. When
 * the user clicks the CTA, the range is sealed into the destination
 * URL (?start=…&end=…) and the request page reads it back from the
 * search params.
 */

export function InteractiveStageRequest({
  closedWindows,
  todayIso,
  user,
  restaurantSlug,
  hasOwner,
  initialStartDate = "",
  initialEndDate = "",
  children,
}: {
  closedWindows: ClosedWindow[];
  todayIso: string;
  user: CurrentUser | null;
  restaurantSlug: string;
  hasOwner: boolean;
  initialStartDate?: string;
  initialEndDate?: string;
  children: React.ReactNode;
}) {
  const [range, setRange] = useState<{ startDate: string; endDate: string }>({
    startDate: initialStartDate,
    endDate: initialEndDate,
  });
  const { startDate, endDate } = range;

  const dayCount = useMemo(() => {
    if (!startDate || !endDate) return null;
    if (endDate < startDate) return null;
    const a = new Date(`${startDate}T00:00:00Z`).getTime();
    const b = new Date(`${endDate}T00:00:00Z`).getTime();
    return Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  // Range overlaps a closure iff any closed window's start ≤ end AND
  // its end ≥ start (standard interval-overlap check).
  const crossesClosure = useMemo(() => {
    if (!startDate || !endDate) return null;
    return (
      closedWindows.find((w) => w.startDate <= endDate && w.endDate >= startDate) ?? null
    );
  }, [closedWindows, startDate, endDate]);

  const rangeError = crossesClosure
    ? `Your range crosses a closure (${fmtShort(crossesClosure.startDate)} → ${fmtShort(crossesClosure.endDate)})`
    : null;

  const validRange =
    Boolean(startDate) && Boolean(endDate) && dayCount !== null && rangeError === null;

  return (
    <>
      <section className="mb-16">
        <h2 className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Pick your dates
        </h2>
        <p className="mb-6 max-w-prose font-serif text-sm text-oak-gall-soft">
          {closedWindows.length > 0
            ? "This kitchen is open by default. Days struck through are closures the chef has published — vacations, refurbs, or private events. You can pick any other range."
            : "This kitchen is open by default. Pick any range you'd like — the chef will see your dates alongside your full profile."}
        </p>

        <div className="rounded-xl border border-sepia/30 bg-white p-4 shadow-[0_4px_20px_-8px_rgba(43,38,26,0.15)] sm:p-6">
          <DateRangeCalendar
            closedWindows={closedWindows}
            todayIso={todayIso}
            startDate={startDate}
            endDate={endDate}
            onChange={setRange}
          />
        </div>

        <div className="mt-4">
          <RangeSummary
            startDate={startDate}
            endDate={endDate}
            dayCount={dayCount}
            rangeError={rangeError}
          />
        </div>
      </section>

      {children}

      <section className="mb-16">
        <RequestCta
          user={user}
          restaurantSlug={restaurantSlug}
          range={range}
          validRange={validRange}
          hasOwner={hasOwner}
        />
      </section>
    </>
  );
}

function RangeSummary({
  startDate,
  endDate,
  dayCount,
  rangeError,
}: {
  startDate: string;
  endDate: string;
  dayCount: number | null;
  rangeError: string | null;
}) {
  if (!startDate) {
    return (
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Click a day to start your range.
      </p>
    );
  }
  if (!endDate) {
    return (
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        From <span className="text-oak-gall">{fmtFull(startDate)}</span> — pick the end date.
      </p>
    );
  }
  return (
    <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
      <span className="text-oak-gall">{fmtFull(startDate)}</span>
      {" → "}
      <span className="text-oak-gall">{fmtFull(endDate)}</span>
      {dayCount !== null && (
        <>
          {" · "}
          {dayCount} {dayCount === 1 ? "day" : "days"}
          {rangeError && <span className="ml-2 text-michelin-red">— {rangeError}</span>}
        </>
      )}
    </p>
  );
}

function RequestCta({
  user,
  restaurantSlug,
  range,
  validRange,
  hasOwner,
}: {
  user: CurrentUser | null;
  restaurantSlug: string;
  range: { startDate: string; endDate: string };
  validRange: boolean;
  hasOwner: boolean;
}) {
  // Restaurant owner / admin → not the audience for this CTA
  if (user?.role === "restaurant_owner" || user?.role === "admin") {
    return (
      <div className="border border-sepia/30 px-6 py-5">
        <p className="font-serif text-sm italic text-sepia">
          Stage requests are submitted by stagiaires. Your account is a{" "}
          {user.role.replace("_", " ")}.
        </p>
      </div>
    );
  }

  const requestPath = validRange
    ? `/r/${restaurantSlug}/request?start=${range.startDate}&end=${range.endDate}`
    : `/r/${restaurantSlug}/request`;

  // Logged out → CTA bounces through login with the request page as next
  if (!user) {
    const loginHref = `/login?next=${encodeURIComponent(requestPath)}`;
    return (
      <div className="space-y-3">
        <Link
          href={loginHref}
          className="group relative flex h-16 w-full items-center justify-center gap-3 bg-cordon-bleu px-6 font-display text-2xl italic text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-1 border border-gold-leaf/40"
          />
          <span>
            {validRange ? "Sign in to request these dates" : "Sign in to request a stage"}
          </span>
        </Link>
        {!hasOwner && (
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            This restaurant hasn&rsquo;t claimed its profile yet — your request will sit in the
            inbox until they do.
          </p>
        )}
      </div>
    );
  }

  // Stagiaire → primary CTA, disabled until valid range
  if (!validRange) {
    return (
      <button
        type="button"
        disabled
        className="group relative flex h-16 w-full cursor-not-allowed items-center justify-center gap-3 bg-sepia-faint px-6 font-display text-2xl italic text-vellum opacity-80"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-1 border border-vellum/20"
        />
        <span>Pick your dates above</span>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <Link
        href={requestPath}
        className="group relative flex h-16 w-full items-center justify-center gap-3 bg-cordon-bleu px-6 font-display text-2xl italic text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-1 border border-gold-leaf/40"
        />
        <span>Request a stage — {fmtShort(range.startDate)} → {fmtShort(range.endDate)}</span>
      </Link>
      {!hasOwner && (
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          This restaurant hasn&rsquo;t claimed its profile yet — your request will sit in the
          inbox until they do.
        </p>
      )}
    </div>
  );
}

function fmtFull(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

function fmtShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}
