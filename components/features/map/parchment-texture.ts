import * as THREE from "three";

/*
 * Procedurally generate an equirectangular parchment texture for the
 * globe sphere — tuned to read like the antique-cartography reference
 * `inspiration/globe/globe_03.png`: warm uniform aged-paper sepia,
 * very subtle grain, slight darkening near the poles. Foxing dots
 * removed (they read as "stained" rather than "aged").
 *
 * Layers (bottom -> top):
 *   1. Warm cream base (#E8DCB5-ish — matches the globe_03 paper tone)
 *   2. High-frequency low-amplitude grain (paper texture, not noise)
 *   3. Sparse horizontal streaks (paper grain)
 *   4. Polar darkening — slightly darker toward 90°N/S
 *
 * Returned as a Three.js CanvasTexture; safe to attach as `map` on
 * any MeshStandardMaterial or MeshPhongMaterial.
 */

const COLORS = {
  cream: { r: 232, g: 220, b: 181 }, // #E8DCB5 — warm aged cream
  creamDeeper: { r: 215, g: 198, b: 158 }, // #D7C69E — shadowed grain
  sepiaInk: { r: 61, g: 42, b: 20 }, // #3D2A14 — dark ink, used for vignette only
};

export function buildParchmentTexture({
  width = 2048,
  height = 1024,
  noiseStrength = 5,
  streaks = 320,
  seed = 1,
}: {
  width?: number;
  height?: number;
  noiseStrength?: number;
  streaks?: number;
  seed?: number;
} = {}): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("could not acquire 2D context for parchment texture");

  const rng = mulberry32(seed);

  // 1. Base fill
  ctx.fillStyle = rgb(COLORS.cream);
  ctx.fillRect(0, 0, width, height);

  // 2. High-frequency low-amplitude grain — gives the surface "tooth"
  // without reading as noisy.
  const grain = ctx.createImageData(width, height);
  for (let i = 0; i < grain.data.length; i += 4) {
    const offset = (rng() - 0.5) * 2 * noiseStrength;
    grain.data[i] = COLORS.cream.r + offset;
    grain.data[i + 1] = COLORS.cream.g + offset;
    grain.data[i + 2] = COLORS.cream.b + offset;
    grain.data[i + 3] = 255;
  }
  ctx.putImageData(grain, 0, 0);
  ctx.filter = "blur(0.6px)"; // less aggressive blur — keep some fiber detail
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = "none";

  // 3. Horizontal paper grain — long thin streaks
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = rgb(COLORS.creamDeeper);
  ctx.lineWidth = 1;
  for (let i = 0; i < streaks; i++) {
    const y = rng() * height;
    const x1 = rng() * width;
    const len = 60 + rng() * 280;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x1 + len, y + (rng() - 0.5) * 1.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 4. Polar darkening — top + bottom edges fade slightly to dark sepia
  // (the "edges" of the spread parchment, even though it's a sphere)
  const polar = ctx.createLinearGradient(0, 0, 0, height);
  polar.addColorStop(0, `rgba(${COLORS.sepiaInk.r}, ${COLORS.sepiaInk.g}, ${COLORS.sepiaInk.b}, 0.22)`);
  polar.addColorStop(0.18, `rgba(${COLORS.sepiaInk.r}, ${COLORS.sepiaInk.g}, ${COLORS.sepiaInk.b}, 0)`);
  polar.addColorStop(0.82, `rgba(${COLORS.sepiaInk.r}, ${COLORS.sepiaInk.g}, ${COLORS.sepiaInk.b}, 0)`);
  polar.addColorStop(1, `rgba(${COLORS.sepiaInk.r}, ${COLORS.sepiaInk.g}, ${COLORS.sepiaInk.b}, 0.22)`);
  ctx.fillStyle = polar;
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function mulberry32(seed: number) {
  let t = seed;
  return function () {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function rgb({ r, g, b }: { r: number; g: number; b: number }): string {
  return `rgb(${r}, ${g}, ${b})`;
}
