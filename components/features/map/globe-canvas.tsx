"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";

import type { RestaurantPin } from "@/app/(public)/map/page";

/*
 * WebGL globe rendering.
 *
 * - Sphere uses MeshPhongMaterial in vellum (no satellite texture)
 * - Country polygons drawn as oak-gall hairline outlines (transparent fills)
 * - Restaurant pins via pointsData (merged mesh, much faster than 658 DOM nodes)
 *   - 3-star: michelin red, slightly larger
 *   - 2-star: oak-gall medium
 *   - 1-star: oak-gall small
 * - Camera defaults to a view of France since all v0 pins are there
 *
 * Deferred for later checkpoints (per design-direction.md §3):
 *   - Custom parchment shader with fiber noise + foxing
 *   - Engraved hatching texture on the ocean
 *   - Concentric inked rosettes (currently flat dots)
 *   - Ornamental cartouches at corners + compass rose
 *   - Great-circle camera arc on pin click
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
  vellum: "#F4ECD8",
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

  // Bind to viewport size
  useEffect(() => {
    const update = () => setDims({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Load country polygons (one-time)
  useEffect(() => {
    fetch("/data/countries-110m.geojson")
      .then((r) => r.json() as Promise<GeoJsonFeatureCollection>)
      .then((g) => setCountries(g.features));
  }, []);

  // Vellum sphere material — solid color, no texture
  const globeMaterial = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: COLORS.vellum,
        shininess: 0,
      }),
    [],
  );

  // Default camera view: centered on France (all v0 pins live there)
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.pointOfView({ lat: 46.5, lng: 2.5, altitude: 1.5 }, 0);
    // Calmer auto-rotation than the default
    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = false;
      controls.enableZoom = true;
      controls.minDistance = 110;
      controls.maxDistance = 600;
    }
  }, [dims.width]);

  // Click on empty globe -> close active card
  function handleGlobeClick() {
    onPinClick(null);
  }

  if (dims.width === 0) return null;

  return (
    <Globe
      ref={globeRef}
      width={dims.width}
      height={dims.height}
      backgroundColor="rgba(244, 236, 216, 0)" /* page bg shows through */
      showAtmosphere={false}
      globeMaterial={globeMaterial}
      onGlobeClick={handleGlobeClick}
      // Country outlines
      polygonsData={countries}
      polygonAltitude={0.005}
      polygonCapColor={() => "rgba(0,0,0,0)"}
      polygonSideColor={() => "rgba(0,0,0,0)"}
      polygonStrokeColor={() => COLORS.oakGallSoft}
      // Restaurant pins
      pointsData={pins}
      pointLat={(d: object) => (d as RestaurantPin).lat}
      pointLng={(d: object) => (d as RestaurantPin).lng}
      pointAltitude={0.008}
      pointRadius={(d: object) => {
        const p = d as RestaurantPin;
        return p.stars === 3 ? 0.5 : p.stars === 2 ? 0.4 : 0.3;
      }}
      pointColor={(d: object) =>
        (d as RestaurantPin).stars === 3 ? COLORS.michelinRed : COLORS.oakGall
      }
      pointResolution={8}
      pointsMerge={false}
      onPointClick={(d: object) => onPinClick(d as RestaurantPin)}
      pointLabel={(d: object) => {
        const p = d as RestaurantPin;
        return `<div style="font-family: serif; font-style: italic; font-size: 14px; color: ${COLORS.oakGall}; background: ${COLORS.vellum}; padding: 4px 8px; border: 1px solid ${COLORS.oakGallSoft}33;">${escapeHtml(p.name)}</div>`;
      }}
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
