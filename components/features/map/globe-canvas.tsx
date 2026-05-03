"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";

import type { RestaurantPin } from "@/app/(public)/map/page";
import { buildParchmentTexture } from "./parchment-texture";

/*
 * WebGL globe rendering.
 *
 * - Sphere: MeshPhongMaterial with a procedurally generated parchment
 *   texture (vellum + value-noise grain + sepia foxing + paper streaks +
 *   polar vignetting). See parchment-texture.ts.
 * - Country polygons: oak-gall hairline outlines, transparent fills.
 * - Restaurant pins: Rosette SVGs as HTML overlays projected onto the
 *   sphere (htmlElementsData). 658 DOM nodes is fine — react-globe.gl
 *   uses GPU-accelerated CSS transforms per frame. Pins keep a constant
 *   on-screen size as you zoom.
 *     - 3-star: red disc + gold inner ring, 22px
 *     - 2-star: oak-gall double-ring rosette, 18px
 *     - 1-star: oak-gall single-ring rosette, 14px
 * - Camera defaults to a view of France since all v0 pins live there.
 *
 * Deferred for later checkpoints (per design-direction.md §3):
 *   - Engraved hatching texture on the ocean
 *   - Ornamental cartouches at corners + compass rose
 *   - Great-circle camera arc on pin click
 *   - Pin clustering at low zoom
 */

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: { type: string; coordinates: unknown };
  }>;
};

const COLORS = {
  oakGallSoft: "#2D2417",
  oakGall: "#1F1A12",
  michelinRed: "#B0151A",
  goldLeaf: "#B58A3A",
  sepia: "#8B6F47",
} as const;

export function GlobeCanvas({
  pins,
  onPinClick,
}: {
  pins: RestaurantPin[];
  onPinClick: (pin: RestaurantPin | null) => void;
}) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [countries, setCountries] = useState<GeoJsonFeatureCollection["features"]>([]);

  useEffect(() => {
    const update = () => setDims({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    fetch("/data/countries-110m.geojson")
      .then((r) => r.json() as Promise<GeoJsonFeatureCollection>)
      .then((g) => setCountries(g.features));
  }, []);

  // Overlay layer: rosette pins + place-name labels share a single
  // htmlElementsData collection (react-globe.gl supports only one).
  const overlays = useMemo<GlobeOverlay[]>(() => {
    const out: GlobeOverlay[] = pins.map((pin) => ({ kind: "pin", pin }));
    for (const c of CITY_LABELS) out.push({ kind: "city", ...c });
    for (const r of REGION_LABELS) out.push({ kind: "region", ...r });
    return out;
  }, [pins]);

  const globeMaterial = useMemo(() => {
    const texture = buildParchmentTexture();
    return new THREE.MeshPhongMaterial({
      map: texture,
      color: 0xffffff,
      shininess: 0,
      specular: new THREE.Color(0x000000),
    });
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.pointOfView({ lat: 46.5, lng: 2.5, altitude: 1.5 }, 0);
    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = false;
      controls.enableZoom = true;
      controls.minDistance = 110;
      controls.maxDistance = 600;
    }
  }, [dims.width]);

  function handleGlobeClick() {
    onPinClick(null);
  }

  if (dims.width === 0) return null;

  return (
    <Globe
      ref={globeRef}
      width={dims.width}
      height={dims.height}
      backgroundColor="rgba(244, 236, 216, 0)"
      showAtmosphere={false}
      globeMaterial={globeMaterial}
      onGlobeClick={handleGlobeClick}
      // Country outlines + coastlines
      polygonsData={countries}
      polygonAltitude={0.005}
      polygonCapColor={() => "rgba(0,0,0,0)"}
      polygonSideColor={() => "rgba(0,0,0,0)"}
      polygonStrokeColor={() => COLORS.oakGallSoft}
      // Restaurant pins (rosettes) + place-name labels (cities, regions)
      htmlElementsData={overlays}
      htmlLat={(d: object) => latOf(d as GlobeOverlay)}
      htmlLng={(d: object) => lngOf(d as GlobeOverlay)}
      htmlAltitude={0.005}
      htmlElement={(d: object) => makeOverlayEl(d as GlobeOverlay, onPinClick)}
      htmlElementVisibilityModifier={(el, isVisible) => {
        (el as HTMLElement).style.opacity = isVisible ? "1" : "0";
        (el as HTMLElement).style.pointerEvents = isVisible ? "auto" : "none";
      }}
    />
  );
}

/*
 * Build a DOM rosette pin. Returned to react-globe.gl which positions
 * it via CSS transforms each frame. Self-contained — no React, no class
 * hooks (the globe lib mounts/unmounts these outside the React tree).
 */
function makeRosetteEl(
  pin: RestaurantPin,
  onClick: (p: RestaurantPin) => void,
): HTMLElement {
  const tier = pin.stars as 1 | 2 | 3;
  const size = tier === 3 ? 22 : tier === 2 ? 18 : 14;

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    margin-left: ${-size / 2}px;
    margin-top: ${-size / 2}px;
    cursor: pointer;
    transition: transform 120ms cubic-bezier(0.32, 0.72, 0, 1),
                filter 120ms cubic-bezier(0.32, 0.72, 0, 1);
    transform-origin: center;
    pointer-events: auto;
  `;
  wrapper.title = pin.name + (pin.city ? `, ${pin.city}` : "");
  wrapper.innerHTML = svgForTier(tier);

  // Pure-CSS hover: scale + ink-bloom drop shadow
  const baseFilter = "none";
  const hoverFilter =
    tier === 3
      ? `drop-shadow(0 0 6px ${COLORS.michelinRed}66)`
      : `drop-shadow(0 0 5px ${COLORS.oakGall}55)`;
  wrapper.addEventListener("pointerenter", () => {
    wrapper.style.transform = "scale(1.4)";
    wrapper.style.filter = hoverFilter;
  });
  wrapper.addEventListener("pointerleave", () => {
    wrapper.style.transform = "scale(1)";
    wrapper.style.filter = baseFilter;
  });
  wrapper.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick(pin);
  });

  return wrapper;
}

/*
 * Place-name labels — hand-curated subset of major French cities and
 * historic regions, matching the editorial register of antique maps.
 * Coordinates are approximate centroids.
 */

type CityLabel = { lat: number; lng: number; name: string };
type RegionLabel = { lat: number; lng: number; name: string };

const CITY_LABELS: CityLabel[] = [
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Lyon", lat: 45.764, lng: 4.8357 },
  { name: "Marseille", lat: 43.2965, lng: 5.3698 },
  { name: "Toulouse", lat: 43.6047, lng: 1.4442 },
  { name: "Nice", lat: 43.7102, lng: 7.262 },
  { name: "Nantes", lat: 47.2184, lng: -1.5536 },
  { name: "Strasbourg", lat: 48.5734, lng: 7.7521 },
  { name: "Bordeaux", lat: 44.8378, lng: -0.5792 },
  { name: "Lille", lat: 50.6292, lng: 3.0573 },
  { name: "Rennes", lat: 48.1173, lng: -1.6778 },
  { name: "Reims", lat: 49.2583, lng: 4.0317 },
  { name: "Montpellier", lat: 43.6108, lng: 3.8767 },
  { name: "Annecy", lat: 45.8992, lng: 6.1294 },
  { name: "Dijon", lat: 47.322, lng: 5.0415 },
];

const REGION_LABELS: RegionLabel[] = [
  { name: "Bretagne", lat: 48.2, lng: -3.0 },
  { name: "Normandie", lat: 49.2, lng: 0.5 },
  { name: "Provence", lat: 43.9, lng: 6.0 },
  { name: "Aquitaine", lat: 44.6, lng: -0.5 },
  { name: "Bourgogne", lat: 47.0, lng: 4.5 },
  { name: "Champagne", lat: 48.9, lng: 4.4 },
  { name: "Languedoc", lat: 43.7, lng: 3.5 },
  { name: "Alsace", lat: 48.3, lng: 7.5 },
];

type GlobeOverlay =
  | { kind: "pin"; pin: RestaurantPin }
  | (CityLabel & { kind: "city" })
  | (RegionLabel & { kind: "region" });

function latOf(o: GlobeOverlay): number {
  return o.kind === "pin" ? o.pin.lat : o.lat;
}

function lngOf(o: GlobeOverlay): number {
  return o.kind === "pin" ? o.pin.lng : o.lng;
}

function makeOverlayEl(
  o: GlobeOverlay,
  onPinClick: (p: RestaurantPin) => void,
): HTMLElement {
  if (o.kind === "pin") return makeRosetteEl(o.pin, onPinClick);
  if (o.kind === "city") return makeCityLabel(o.name);
  return makeRegionLabel(o.name);
}

/*
 * City label — italic serif, mixed case, oak-gall, slightly translucent
 * so it doesn't compete with the rosette pins overlapping it.
 */
function makeCityLabel(name: string): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = `
    font-family: var(--font-source-serif), Georgia, serif;
    font-style: italic;
    font-size: 11px;
    color: ${COLORS.oakGall};
    white-space: nowrap;
    transform: translate(8px, -50%);
    letter-spacing: 0.01em;
    pointer-events: none;
    text-shadow: 0 0 3px rgba(244, 236, 216, 0.95);
  `;
  el.textContent = name;
  return el;
}

/*
 * Region label — italic small-caps, sepia, wider tracking.
 * For historic French regions; sits behind any cities in the same area.
 */
function makeRegionLabel(name: string): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = `
    font-family: var(--font-source-serif), Georgia, serif;
    font-style: italic;
    font-size: 12px;
    color: ${COLORS.sepia};
    text-transform: uppercase;
    letter-spacing: 0.18em;
    white-space: nowrap;
    transform: translate(-50%, -50%);
    pointer-events: none;
    text-shadow: 0 0 4px rgba(244, 236, 216, 0.9);
  `;
  el.textContent = name;
  return el;
}

function svgForTier(tier: 1 | 2 | 3): string {
  if (tier === 3) {
    return `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="${COLORS.michelinRed}" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="${COLORS.goldLeaf}" stroke-width="0.75" opacity="0.6" />
    </svg>`;
  }
  if (tier === 2) {
    return `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" fill="${COLORS.oakGall}" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="${COLORS.oakGall}" stroke-width="0.75" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="${COLORS.oakGall}" stroke-width="0.75" />
    </svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
    <circle cx="12" cy="12" r="3.5" fill="${COLORS.oakGall}" />
    <circle cx="12" cy="12" r="7" fill="none" stroke="${COLORS.oakGall}" stroke-width="0.75" />
  </svg>`;
}
