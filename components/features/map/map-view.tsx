"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Rosette, RosetteRow } from "@/components/ui/rosette";
import { logoutAction } from "@/lib/auth-actions";
import type { RestaurantPin } from "@/app/(public)/map/page";

/*
 * Top-level map view. Holds filter state, dynamically loads the
 * WebGL globe canvas (Three.js needs window — no SSR).
 *
 * Layout:
 *   - Globe canvas, full viewport
 *   - Top-left: wordmark, filter rail (1/2/3-star toggles)
 *   - Right edge: card overlay for the selected pin
 */

const GlobeCanvas = dynamic(() => import("./globe-canvas").then((m) => m.GlobeCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-vellum">
      <div className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Inking the world…
      </div>
    </div>
  ),
});

type Tier = 1 | 2 | 3;

type Viewer = { email: string } | null;

export function MapView({ pins, viewer }: { pins: RestaurantPin[]; viewer: Viewer }) {
  const [tiers, setTiers] = useState<Set<Tier>>(new Set([1, 2, 3]));
  const [active, setActive] = useState<RestaurantPin | null>(null);

  const visible = useMemo(
    () => pins.filter((p) => tiers.has(p.stars as Tier)),
    [pins, tiers],
  );

  function toggleTier(t: Tier) {
    setTiers((prev) => {
      const next = new Set(prev);
      if (next.has(t)) {
        if (next.size === 1) return prev; // never go to zero — disorienting
        next.delete(t);
      } else {
        next.add(t);
      }
      return next;
    });
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-vellum">
      {/* Globe canvas — fills viewport */}
      <GlobeCanvas pins={visible} onPinClick={setActive} />

      {/* Top-left: wordmark + filter rail */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 p-8">
        <Link
          href="/"
          className="pointer-events-auto inline-block font-display text-2xl italic tracking-tight text-oak-gall transition-opacity duration-[120ms] ease-paper hover:opacity-80"
        >
          Stagiaire
        </Link>

        <div className="pointer-events-auto mt-8 flex flex-col gap-3">
          <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
            Tier
          </p>
          <div className="flex flex-col gap-1.5">
            {([3, 2, 1] as const).map((t) => (
              <FilterToggle
                key={t}
                tier={t}
                active={tiers.has(t)}
                count={pins.filter((p) => p.stars === t).length}
                visibleCount={visible.filter((p) => p.stars === t).length}
                onClick={() => toggleTier(t)}
              />
            ))}
          </div>
          <p className="mt-3 font-sans text-[10px] uppercase tracking-[0.18em] text-sepia-faint">
            {visible.length} restaurants visible
          </p>
        </div>
      </div>

      {/* Bottom-left: small attribution */}
      <div className="pointer-events-none absolute bottom-0 left-0 z-10 p-8">
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
          France · v0 · 1/2/3-star Michelin
        </p>
      </div>

      {/* Top-right: auth nav */}
      <div className="pointer-events-none absolute right-0 top-0 z-10 p-8">
        <div className="pointer-events-auto flex items-center gap-5">
          {viewer ? (
            <>
              <Link
                href="/app"
                className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
              >
                Dashboard
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login?next=/map"
                className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Right-edge card overlay when a pin is selected */}
      {active && <RestaurantCard pin={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function FilterToggle({
  tier,
  active,
  count,
  visibleCount,
  onClick,
}: {
  tier: Tier;
  active: boolean;
  count: number;
  visibleCount: number;
  onClick: () => void;
}) {
  void visibleCount;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-2 text-left font-sans text-[12px] uppercase tracking-[0.12em] transition-colors duration-[120ms] ease-paper ${
        active ? "text-oak-gall" : "text-sepia-faint hover:text-sepia"
      }`}
    >
      <Rosette tier={tier} size={14} />
      <span className={active ? "underline decoration-oak-gall decoration-1 underline-offset-[3px]" : ""}>
        {tier}-star
      </span>
      <span className="font-mono text-[10px] text-sepia-faint">({count})</span>
    </button>
  );
}

function RestaurantCard({ pin, onClose }: { pin: RestaurantPin; onClose: () => void }) {
  const tier = pin.stars as Tier;
  return (
    <aside
      className="absolute right-6 top-1/2 z-20 w-[360px] -translate-y-1/2 border border-oak-gall/15 bg-ermine p-6 shadow-[0_0_24px_4px_rgba(250,246,233,0.5)]"
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
        <RosetteRow tier={tier} size={12} />
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
