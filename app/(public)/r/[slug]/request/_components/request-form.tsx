"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  ContinueButton,
  FormError,
  TextArea,
} from "@/app/onboarding/_components/text-field";
import type { ClosedWindow } from "@/db/schema";

import { DateRangeCalendar } from "@/components/features/requests/date-range-calendar";

import type { Result } from "../actions";

/*
 * Stage-request submission form. Calendar range picker + cover message.
 *
 * Default model: kitchens are open. The only hard constraint here is
 * `closedWindows` — explicit closures the restaurant has published.
 * The picker disables those days, and we additionally block submission
 * if the chosen range straddles a closure.
 *
 * Calendar holds its own picker state; we mirror the chosen range into
 * hidden inputs so the existing server action keeps reading from
 * formData["startDate"] / formData["endDate"].
 */

export function RequestForm({
  action,
  restaurantSlug,
  closedWindows,
  todayIso,
  initialStartDate = "",
  initialEndDate = "",
}: {
  action: (state: Result | null, formData: FormData) => Promise<Result>;
  restaurantSlug: string;
  closedWindows: ClosedWindow[];
  todayIso: string;
  initialStartDate?: string;
  initialEndDate?: string;
}) {
  const [state, formAction, isPending] = useActionState<Result | null, FormData>(action, null);
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

  const crossesClosure = useMemo(() => {
    if (!startDate || !endDate) return null;
    return (
      closedWindows.find((w) => w.startDate <= endDate && w.endDate >= startDate) ?? null
    );
  }, [closedWindows, startDate, endDate]);

  const rangeError = crossesClosure
    ? `Your range crosses a closure (${fmtShort(crossesClosure.startDate)} → ${fmtShort(crossesClosure.endDate)})`
    : null;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="startDate" value={startDate} />
      <input type="hidden" name="endDate" value={endDate} />

      <div>
        <p className="mb-3 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Pick your dates
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
      </div>

      <RangeSummary
        startDate={startDate}
        endDate={endDate}
        dayCount={dayCount}
        rangeError={rangeError}
      />

      <TextArea
        label="Cover message"
        name="coverMessage"
        rows={8}
        placeholder="Where you've trained, what you'd bring to the brigade, what you most want to learn at this kitchen. A few honest sentences beat a polished pitch."
        hint="Optional. Up to 2000 characters. The chef sees this alongside your full profile."
        invalid={state?.ok === false}
      />

      {state?.ok === false && <FormError message={state.error} />}

      <div className="flex items-center gap-6">
        <ContinueButton pending={isPending} label="Submit request" />
        <Link
          href={`/r/${restaurantSlug}`}
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
        >
          Cancel
        </Link>
      </div>
    </form>
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
        Click a day on the calendar to start your range.
      </p>
    );
  }
  if (!endDate) {
    return (
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        From <span className="text-oak-gall">{fmtFull(startDate)}</span>{" "}
        — pick the end date.
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
