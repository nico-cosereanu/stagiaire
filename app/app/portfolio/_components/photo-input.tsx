"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Photo input with a live preview and a "current photo" placeholder for
 * the edit case. Object URLs are revoked on unmount and on each pick to
 * keep memory bounded. Required field on create, optional on edit.
 */

export function PhotoInput({
  name,
  required,
  currentUrl,
  hint,
}: {
  name: string;
  required?: boolean;
  currentUrl?: string;
  hint?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const previewUrl = preview ?? currentUrl ?? null;

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    if (!file) {
      setPreview(null);
      objectUrlRef.current = null;
      return;
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreview(url);
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-2 block font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Photo
        </span>
        <div className="grid grid-cols-[120px_1fr] items-start gap-5">
          <div className="aspect-[4/5] w-[120px] overflow-hidden border border-sepia/30 bg-ermine">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Dish preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-serif text-xs italic text-sepia-faint">
                No photo
              </div>
            )}
          </div>
          <div className="space-y-2">
            <input
              type="file"
              name={name}
              accept="image/jpeg,image/png,image/webp"
              required={required}
              onChange={onChange}
              className="block w-full font-serif text-sm text-oak-gall file:mr-4 file:cursor-pointer file:border file:border-sepia/40 file:bg-ermine file:px-4 file:py-2 file:font-sans file:text-[11px] file:font-medium file:uppercase file:tracking-[0.04em] file:text-oak-gall hover:file:bg-vellum"
            />
            {hint && <p className="font-serif text-xs text-sepia">{hint}</p>}
          </div>
        </div>
      </label>
    </div>
  );
}
