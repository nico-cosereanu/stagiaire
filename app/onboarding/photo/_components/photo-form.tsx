"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { FormError } from "@/app/onboarding/_components/text-field";

import { removeProfilePhoto, setProfilePhoto } from "../actions";

/*
 * Pan-and-zoom cropper for the profile photo.
 *
 * Math: the image is rendered at `baseScale * zoom` inside a square
 * viewport. baseScale = max(viewportW/imgW, viewportW/imgH), so the
 * smaller image dimension fully covers the square (cover behavior).
 * `pan` is the translation of the image's top-left in viewport pixels
 * and is clamped so the image always covers the viewport.
 *
 * On submit, the visible viewport region is mapped back to image space
 * (sx,sy,sw,sh) and drawn onto an OUTPUT_SIZE canvas, encoded as JPEG,
 * then handed to the existing setProfilePhoto server action.
 */

const OUTPUT_SIZE = 800;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export function PhotoForm({ currentUrl }: { currentUrl: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [src, setSrc] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [viewportSize, setViewportSize] = useState(320);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);

  useEffect(
    () => () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    },
    [],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setViewportSize(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [src]);

  const baseScale = imgSize ? Math.max(viewportSize / imgSize.w, viewportSize / imgSize.h) : 1;
  const scale = baseScale * zoom;
  const dispW = imgSize ? imgSize.w * scale : 0;
  const dispH = imgSize ? imgSize.h * scale : 0;

  const clampPan = useCallback(
    (x: number, y: number) => {
      const minX = viewportSize - dispW;
      const minY = viewportSize - dispH;
      return {
        x: Math.min(0, Math.max(minX, x)),
        y: Math.min(0, Math.max(minY, y)),
      };
    },
    [viewportSize, dispW, dispH],
  );

  // Re-clamp pan when zoom changes or image loads — center initially.
  useEffect(() => {
    if (!imgSize) return;
    setPan((p) => clampPan(p.x, p.y));
  }, [imgSize, viewportSize, zoom, clampPan]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = URL.createObjectURL(f);
    blobUrlRef.current = url;
    setSrc(url);
    setZoom(1);
    setImgSize(null);
  }

  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const el = e.currentTarget;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    setImgSize({ w, h });
    // center: image is `viewportSize - dispW` (negative) at most, so half of that centers
    const bs = Math.max(viewportSize / w, viewportSize / h);
    const dW = w * bs;
    const dH = h * bs;
    setPan({ x: (viewportSize - dW) / 2, y: (viewportSize - dH) / 2 });
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!imgSize) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan(clampPan(dragRef.current.panX + dx, dragRef.current.panY + dy));
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  }

  async function submit() {
    if (!imgRef.current || !imgSize) {
      setError("Pick a photo first");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Couldn't process photo");
      return;
    }

    const sx = -pan.x / scale;
    const sy = -pan.y / scale;
    const sw = viewportSize / scale;
    const sh = viewportSize / scale;

    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", 0.9),
    );
    if (!blob) {
      setError("Couldn't process photo");
      return;
    }

    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    const fd = new FormData();
    fd.append("photo", file);

    setError(null);
    startTransition(async () => {
      const result = await setProfilePhoto(null, fd);
      // Server action redirects on success; only an error result reaches here.
      if (result && result.ok === false) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* File picker */}
      <label className="block">
        <span className="mb-2 block font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          {src ? "Pick a different photo" : "Choose a photo"}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFile}
          className="block w-full font-serif text-sm text-oak-gall file:mr-4 file:cursor-pointer file:rounded-md file:border file:border-sepia/40 file:bg-ermine file:px-4 file:py-2 file:font-sans file:text-[11px] file:font-medium file:uppercase file:tracking-[0.04em] file:text-oak-gall hover:file:bg-vellum"
        />
        <p className="mt-2 font-serif text-xs text-sepia">
          JPEG, PNG, or WebP. Up to 8 MB. Drag to pan, slide to zoom.
        </p>
      </label>

      {/* Cropper */}
      {src && (
        <div className="space-y-4">
          <div
            ref={viewportRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative mx-auto aspect-square w-full max-w-sm cursor-grab touch-none select-none overflow-hidden rounded-xl border border-sepia/30 bg-ermine active:cursor-grabbing"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={onImgLoad}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: imgSize ? `${dispW}px` : "auto",
                height: imgSize ? `${dispH}px` : "auto",
                transform: `translate(${pan.x}px, ${pan.y}px)`,
                maxWidth: "none",
              }}
              className="pointer-events-none"
            />
            {/* Crosshair overlay */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/40"
            />
          </div>

          <div className="mx-auto flex w-full max-w-sm items-center gap-3">
            <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
              Zoom
            </span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer accent-cordon-bleu"
            />
            <span className="w-8 text-right font-mono text-[11px] text-sepia">
              {zoom.toFixed(1)}×
            </span>
          </div>
        </div>
      )}

      {/* Static current photo when no new file picked */}
      {!src && currentUrl && (
        <div className="space-y-2">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Current photo
          </p>
          <div className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl border border-sepia/30 bg-ermine">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentUrl} alt="Current profile" className="h-full w-full object-cover" />
          </div>
        </div>
      )}

      {error && <FormError message={error} />}

      <div>
        <button
          type="button"
          onClick={submit}
          disabled={!src || pending}
          className="inline-flex h-12 items-center justify-center rounded-lg bg-cordon-bleu px-8 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu disabled:cursor-not-allowed disabled:bg-sepia-faint"
        >
          {pending ? "Saving…" : src ? "Save photo →" : "Pick a file to continue"}
        </button>
      </div>

      {currentUrl && !src && (
        <form action={removeProfilePhoto}>
          <button
            type="submit"
            className="font-sans text-[11px] uppercase tracking-[0.18em] text-michelin-red underline decoration-michelin-red/40 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
          >
            Remove current photo
          </button>
        </form>
      )}
    </div>
  );
}
