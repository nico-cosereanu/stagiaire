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
      // Country outlines
      polygonsData={countries}
      polygonAltitude={0.005}
      polygonCapColor={() => "rgba(0,0,0,0)"}
      polygonSideColor={() => "rgba(0,0,0,0)"}
      polygonStrokeColor={() => COLORS.oakGallSoft}
      // Restaurant pins as inked rosettes
      htmlElementsData={pins}
      htmlLat={(d: object) => (d as RestaurantPin).lat}
      htmlLng={(d: object) => (d as RestaurantPin).lng}
      htmlAltitude={0.005}
      htmlElement={(d: object) => makeRosetteEl(d as RestaurantPin, onPinClick)}
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
