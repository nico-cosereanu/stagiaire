"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState } from "react";

import { RosetteRow } from "@/components/ui/rosette";
import type { LatLngBoundsLiteral } from "@/components/features/map/globe-canvas";

import type { DiscoverResult, RestaurantPin } from "../_lib/filters";
import { ResultCard } from "./result-card";

/*
 * Map view split-pane: scrollable list on the left, map on the right.
 *
 * Bounds-driven filtering: when the user pans or zooms, the map emits
 * its current viewport via onBoundsChange. We narrow the list to
 * results whose coords fall inside that box. Results without coords
 * never appear here (they can't be on the map anyway). Until the map
 * has reported bounds for the first time, we show every result with
 * coords so the list isn't empty during the brief mount window.
 *
 * Active-pin overlay (the side card) lives here rather than inside
 * GlobeCanvas so the list and the map share a single open-pin state.
 */

const GlobeCanvas = dynamic(
  () => import("@/components/features/map/globe-canvas").then((m) => m.GlobeCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-ermine">
        <div className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Inking the world…
        </div>
      </div>
    ),
  },
);

export function MapSplit({
  results,
  pins,
  startDate,
  endDate,
}: {
  results: DiscoverResult[];
  pins: RestaurantPin[];
  startDate: string | null;
  endDate: string | null;
}) {
  const [bounds, setBounds] = useState<LatLngBoundsLiteral | null>(null);
  const [active, setActive] = useState<RestaurantPin | null>(null);

  const onBoundsChange = useCallback((b: LatLngBoundsLiteral) => setBounds(b), []);

  const visible = bounds
    ? results.filter(
        (r) =>
          r.lat !== null &&
          r.lng !== null &&
          inBounds(r.lat, r.lng, bounds),
      )
    : results.filter((r) => r.lat !== null && r.lng !== null);

  return (
    <div className="flex h-full flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-6">
      <div className="order-2 flex min-h-0 flex-col lg:order-1 lg:col-span-6 lg:h-full">
        <p className="hidden shrink-0 pb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia lg:block">
          {visible.length} {visible.length === 1 ? "restaurant" : "restaurants"} in view
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto pr-2">
          {visible.length === 0 ? (
            <div className="border border-sepia/30 px-6 py-10 text-center">
              <p className="font-serif text-base italic text-sepia">
                Nothing in this view. Pan or zoom out to see more.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {visible.map((r) => (
                <li key={r.id} className="h-full">
                  <ResultCard result={r} startDate={startDate} endDate={endDate} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="relative order-1 h-[60vh] overflow-hidden rounded-xl border border-sepia/30 bg-vellum lg:order-2 lg:col-span-6 lg:h-full">
        <GlobeCanvas
          pins={pins}
          onPinClick={setActive}
          onBoundsChange={onBoundsChange}
        />
        {pins.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="rounded-xl border border-sepia/30 bg-white/95 px-6 py-5 font-serif text-sm italic text-sepia">
              No restaurants match these filters.
            </div>
          </div>
        )}
        {active && <PinCard pin={active} onClose={() => setActive(null)} />}
      </div>
    </div>
  );
}

function inBounds(lat: number, lng: number, b: LatLngBoundsLiteral): boolean {
  if (lat < b.south || lat > b.north) return false;
  // Longitude wraps the antimeridian when west > east; handle both.
  if (b.west <= b.east) return lng >= b.west && lng <= b.east;
  return lng >= b.west || lng <= b.east;
}

function PinCard({ pin, onClose }: { pin: RestaurantPin; onClose: () => void }) {
  return (
    <aside
      className="absolute right-6 top-1/2 z-20 w-[340px] -translate-y-1/2 rounded-xl border border-oak-gall/15 bg-white p-6 shadow-[0_8px_32px_rgba(31,26,18,0.18)]"
      role="dialog"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
      >
        ×
      </button>

      <div className="mb-3 flex items-center gap-2">
        <RosetteRow tier={pin.stars} size={9} />
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
          Michelin
          {pin.city && (
            <>
              <span className="mx-1.5 text-sepia-faint">·</span>
              <span>{pin.city}</span>
            </>
          )}
        </p>
      </div>

      <h2 className="font-display text-3xl italic leading-[1.1] tracking-tight text-oak-gall">
        {pin.name}
      </h2>

      {pin.blurb && (
        <p className="mt-4 font-serif text-sm leading-relaxed text-oak-gall-soft">{pin.blurb}</p>
      )}

      <div className="mt-6">
        <Link
          href={`/r/${pin.slug}`}
          className="font-sans text-[12px] uppercase tracking-[0.12em] text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
        >
          View profile →
        </Link>
      </div>
    </aside>
  );
}
