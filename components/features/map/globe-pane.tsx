"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

import { RosetteRow } from "@/components/ui/rosette";
import type { RestaurantPin } from "@/app/(public)/discover/_lib/filters";

/*
 * Globe + pin-card pane. Lives inside the /discover page's chrome,
 * so no wordmark, nav, or filter sidebar here — those belong to the
 * parent layout. This component is only the visual map area.
 */

const GlobeCanvas = dynamic(() => import("./globe-canvas").then((m) => m.GlobeCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ermine">
      <div className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Inking the world…
      </div>
    </div>
  ),
});

export function GlobePane({ pins }: { pins: RestaurantPin[] }) {
  const [active, setActive] = useState<RestaurantPin | null>(null);

  return (
    <div className="relative h-full w-full overflow-hidden border border-sepia/30 bg-vellum">
      <GlobeCanvas pins={pins} onPinClick={setActive} />

      {pins.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="border border-sepia/30 bg-vellum/95 px-6 py-5 font-serif text-sm italic text-sepia">
            No restaurants match these filters. Loosen one and the globe will repopulate.
          </div>
        </div>
      )}

      {active && <RestaurantCard pin={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function RestaurantCard({ pin, onClose }: { pin: RestaurantPin; onClose: () => void }) {
  return (
    <aside
      className="absolute right-6 top-1/2 z-20 w-[340px] -translate-y-1/2 border border-oak-gall/15 bg-ermine p-6 shadow-[0_0_24px_4px_rgba(250,246,233,0.5)]"
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
        <RosetteRow tier={pin.stars} size={12} />
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
