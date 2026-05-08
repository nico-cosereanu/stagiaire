"use client";

import { APIProvider, AdvancedMarker, Map, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";

import type { RestaurantPin } from "@/app/(public)/discover/_lib/filters";

/*
 * Google-Maps-backed map view (replaces the old WebGL globe).
 *
 * - Vector map via @vis.gl/react-google-maps with a Map ID. If the
 *   user hasn't set NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID, we fall back to
 *   Google's DEMO_MAP_ID so AdvancedMarker still renders.
 * - Pins are AdvancedMarkers wrapping the existing Rosette SVG, so
 *   they sit inside the React tree (no manual DOM management like the
 *   old globe lib required).
 * - Click empty map → onPinClick(null) (closes the side card).
 * - When pins change, fit the viewport to their bounds — keeps the
 *   filtered set framed without us hard-coding a France-centric view.
 */

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

const DEFAULT_CENTER = { lat: 46.5, lng: 2.5 };
const DEFAULT_ZOOM = 5.5;

export type LatLngBoundsLiteral = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export function GlobeCanvas({
  pins,
  onPinClick,
  onBoundsChange,
}: {
  pins: RestaurantPin[];
  onPinClick: (pin: RestaurantPin | null) => void;
  onBoundsChange?: (bounds: LatLngBoundsLiteral) => void;
}) {
  if (!API_KEY) return <SetupNotice />;

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        mapId={MAP_ID}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        clickableIcons={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        zoomControl
        onClick={() => onPinClick(null)}
        className="h-full w-full"
      >
        <PinFitter pins={pins} />
        {onBoundsChange && <BoundsReporter onBoundsChange={onBoundsChange} />}
        {pins.map((pin) => (
          <AdvancedMarker
            key={pin.id}
            position={{ lat: pin.lat, lng: pin.lng }}
            title={pin.name + (pin.city ? `, ${pin.city}` : "")}
            onClick={() => onPinClick(pin)}
            zIndex={pin.stars}
          >
            <StarPin tier={pin.stars} />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  );
}

/*
 * Forward the current viewport bounds upward whenever the camera
 * settles. We listen to the "idle" event rather than firing during
 * the pan/zoom gesture so the consumer doesn't refilter on every
 * frame — once-per-settle is enough for the list-by-viewport feature.
 */
function BoundsReporter({
  onBoundsChange,
}: {
  onBoundsChange: (b: LatLngBoundsLiteral) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const emit = () => {
      const b = map.getBounds();
      if (b) onBoundsChange(b.toJSON());
    };
    const listener = map.addListener("idle", emit);
    // Emit once on mount in case the camera is already at rest.
    emit();
    return () => listener.remove();
  }, [map, onBoundsChange]);

  return null;
}

/*
 * Re-frame the map to fit the current pin set whenever it changes.
 * Skips the run on the very first mount so the user lands on the
 * default France view instead of an immediate jump.
 */
function PinFitter({ pins }: { pins: RestaurantPin[] }) {
  const map = useMap();
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (!map) return;
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (pins.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    pins.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, 64);
  }, [map, pins]);

  return null;
}

/*
 * Map pin glyph — sitewide rule: 1★ = 1 red dot, 2★ = 2, 3★ = 3.
 * Each dot has a thin white halo so it reads on any basemap color, and
 * the cluster gets a soft drop shadow. Width scales with tier (1 dot
 * = 14px, 3 dots = ~42px) so the count itself signals tier at glance.
 */
function StarPin({ tier }: { tier: 1 | 2 | 3 }) {
  const dot = 12;
  const gap = 3;
  const width = tier * dot + (tier - 1) * gap;
  return (
    <span
      className="inline-flex cursor-pointer items-center drop-shadow-[0_1px_2px_rgba(31,26,18,0.5)] transition-transform duration-[120ms] ease-paper hover:scale-[1.18]"
      style={{ gap, width, height: dot }}
    >
      {Array.from({ length: tier }).map((_, i) => (
        <span
          key={i}
          className="rounded-full bg-michelin-red"
          style={{
            width: dot,
            height: dot,
            boxShadow: "0 0 0 1.5px #ffffff",
          }}
        />
      ))}
    </span>
  );
}

function SetupNotice() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-ermine p-8">
      <div className="max-w-md text-center">
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Map setup needed
        </p>
        <h3 className="mt-3 font-display text-2xl italic text-oak-gall">
          Add a Google Maps API key.
        </h3>
        <p className="mt-4 font-serif text-sm leading-relaxed text-oak-gall-soft">
          Set <code className="font-mono text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{" "}
          <code className="font-mono text-xs">.env.local</code>, then restart the dev server.
        </p>
      </div>
    </div>
  );
}
