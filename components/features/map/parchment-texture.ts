import * as THREE from "three";

/*
 * Procedurally generate an equirectangular parchment texture for the
 * globe sphere. No external assets, no extra deps.
 *
 * Layers (bottom -> top):
 *   1. Vellum base fill
 *   2. Value-noise grain (random pixels + 3 box-blur passes)
 *   3. Sepia foxing — small irregular brown spots scattered randomly
 *   4. Streaky paper grain — horizontal high-frequency variation
 *   5. Subtle latitude vignetting — faintly darker toward the poles
 *
 * Returned as a Three.js CanvasTexture; safe to attach as `map` on
 * any MeshStandardMaterial or MeshPhongMaterial.
 *
 * Width 2048 / height 1024 = standard equirectangular 2:1 ratio. At
 * this resolution the texture is ~8MB in GPU memory (RGBA, 2048×1024×4),
 * which is fine for desktop GPUs.
 */

const COLORS = {
  vellum: { r: 244, g: 236, b: 216 }, // #F4ECD8
  vellumDeeper: { r: 232, g: 220, b: 195 }, // shadowed parchment
  sepia: { r: 139, g: 111, b: 71 }, // #8B6F47 — foxing
  sepiaFaint: { r: 184, g: 159, b: 122 }, // #B89F7A — soft foxing
};

export function buildParchmentTexture({
  width = 2048,
  height = 1024,
  foxingDots = 280,
  noiseStrength = 12,
  seed = 1,
}: {
  width?: number;
  height?: number;
  foxingDots?: number;
  noiseStrength?: number;
  seed?: number;
} = {}): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("could not acquire 2D context for parchment texture");

  // Seeded PRNG so reloads produce the same parchment (otherwise it
  // looks subtly different on every navigation, which is distracting).
  const rng = mulberry32(seed);

  // 1. Base fill
  ctx.fillStyle = rgb(COLORS.vellum);
  ctx.fillRect(0, 0, width, height);

  // 2. Value-noise grain — random per-pixel offset, blurred so it reads
  // as paper texture instead of TV static
  const grain = ctx.createImageData(width, height);
  for (let i = 0; i < grain.data.length; i += 4) {
    const offset = (rng() - 0.5) * 2 * noiseStrength;
    grain.data[i] = COLORS.vellum.r + offset;
    grain.data[i + 1] = COLORS.vellum.g + offset;
    grain.data[i + 2] = COLORS.vellum.b + offset;
    grain.data[i + 3] = 255;
  }
  ctx.putImageData(grain, 0, 0);

  // Multi-pass blur (CSS filter is faster than ImageData manipulation)
  ctx.filter = "blur(1.5px)";
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = "none";

  // 3. Sepia foxing — irregular brown spots
  for (let i = 0; i < foxingDots; i++) {
    const x = rng() * width;
    const y = (0.15 + 0.7 * rng()) * height; // avoid extreme poles
    const radius = 1 + rng() * 6;
    const alpha = 0.06 + rng() * 0.18;

    // Some spots are rusty sepia; others are paler ivory-stained
    const color = rng() > 0.55 ? COLORS.sepia : COLORS.sepiaFaint;
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Occasionally cluster a smaller satellite dot beside it
    if (rng() > 0.7) {
      ctx.beginPath();
      ctx.arc(
        x + (rng() - 0.5) * radius * 4,
        y + (rng() - 0.5) * radius * 4,
        0.5 + rng() * 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // 4. Horizontal paper grain — long thin streaks
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = rgb(COLORS.vellumDeeper);
  ctx.lineWidth = 1;
  for (let i = 0; i < 600; i++) {
    const y = rng() * height;
    const x1 = rng() * width;
    const len = 40 + rng() * 200;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x1 + len, y + (rng() - 0.5) * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 5. Subtle latitude vignetting — slightly darker near the poles
  // (parchment edges visually "fade off")
  const polarFade = ctx.createLinearGradient(0, 0, 0, height);
  polarFade.addColorStop(0, "rgba(43, 36, 23, 0.18)");
  polarFade.addColorStop(0.15, "rgba(43, 36, 23, 0)");
  polarFade.addColorStop(0.85, "rgba(43, 36, 23, 0)");
  polarFade.addColorStop(1, "rgba(43, 36, 23, 0.18)");
  ctx.fillStyle = polarFade;
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
