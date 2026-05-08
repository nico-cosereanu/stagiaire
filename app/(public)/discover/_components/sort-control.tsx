"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type { Filters } from "../_lib/filters";

/*
 * Inline sort dropdown that lives next to the result count. Pulled out
 * of the filter bar because Airbnb keeps sort separate from search,
 * and because it reads more naturally as a sentence ("Sorted by …")
 * than as a bare filter chip.
 */

type SortKey = Filters["sort"];

type Props = {
  current: SortKey;
  hasDateFilter: boolean;
};

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: "availability", label: "Best overlap" },
  { value: "stars", label: "Star tier" },
  { value: "name", label: "Name (A→Z)" },
];

export function SortControl({ current, hasDateFilter }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const setSort = (next: SortKey) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (next === "availability") sp.delete("sort");
    else sp.set("sort", next);
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    setOpen(false);
  };

  // The default "availability" sort silently falls back to star tier
  // when no date range is set, so reflect that in the visible label.
  const effective: SortKey = current === "availability" && !hasDateFilter ? "stars" : current;
  const activeLabel = OPTIONS.find((o) => o.value === effective)?.label ?? "Star tier";

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      <p
        className={`font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-opacity duration-[120ms] ease-paper ${isPending ? "opacity-60" : "opacity-100"}`}
      >
        Sorted by{" "}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 text-oak-gall transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
        >
          {activeLabel}
          <span
            aria-hidden
            className={`text-[9px] text-sepia transition-transform duration-[120ms] ease-paper ${open ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </button>
      </p>

      {open && (
        <ul className="absolute right-0 top-[calc(100%+6px)] z-30 w-48 rounded-xl border border-sepia/40 bg-white p-1 shadow-[0_8px_32px_rgba(31,26,18,0.12)]">
          {OPTIONS.map((opt) => {
            const isActive = opt.value === current;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => setSort(opt.value)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left font-serif text-sm transition-colors duration-[120ms] ease-paper ${
                    isActive
                      ? "bg-cordon-bleu/10 text-oak-gall"
                      : "text-oak-gall-soft hover:bg-ermine"
                  }`}
                >
                  <span>{opt.label}</span>
                  {isActive && (
                    <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-cordon-bleu">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
