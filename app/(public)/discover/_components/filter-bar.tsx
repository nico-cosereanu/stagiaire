"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { FacetOptions, Filters } from "../_lib/filters";
import type { RestaurantSuggestion } from "../../_lib/restaurant-suggestions";

/*
 * Discover filter bar — two layers, Michelin-style.
 *
 *   Top:    rounded-full search input for restaurant name (the most
 *           common direct intent).
 *   Bottom: horizontal row of independent pill buttons, one per facet.
 *           Each pill toggles a popover with its full UI; active pills
 *           show the current value inline (e.g. "2 stars" instead of
 *           the bare "Distinction" label) so the row reads like a
 *           summary of the active query.
 *
 * URL is the source of truth: every patch round-trips through
 * router.replace + useTransition. One click-outside / Escape listener
 * at the row level closes whichever popover is open.
 */

type Props = {
  filters: Filters;
  facets: FacetOptions;
  suggestions: RestaurantSuggestion[];
};

const STAR_TIERS: (1 | 2 | 3)[] = [3, 2, 1];

type PillKey = "distinction" | "cuisine" | "where" | "dates" | "reviews";

const RATING_OPTIONS: (1 | 2 | 3 | 4 | 5)[] = [5, 4, 3, 2, 1];

export function FilterBar({ filters, facets, suggestions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState<PillKey | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const patch = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  useEffect(() => {
    if (open === null) return;
    const onPointer = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const toggleStar = (tier: 1 | 2 | 3) => {
    const next = filters.stars.includes(tier)
      ? filters.stars.filter((s) => s !== tier)
      : [...filters.stars, tier].sort((a, b) => b - a);
    patch({ stars: next.length ? next.join(",") : null });
  };

  const toggleCuisine = (tag: string) => {
    const next = filters.cuisines.includes(tag)
      ? filters.cuisines.filter((c) => c !== tag)
      : [...filters.cuisines, tag];
    patch({ cuisine: next.length ? next.join(",") : null });
  };

  const hasAny =
    filters.q ||
    filters.startDate ||
    filters.endDate ||
    filters.stars.length ||
    filters.country ||
    filters.city ||
    filters.cuisines.length ||
    filters.verifiedOnly ||
    filters.minRating !== null;

  const distinctionSummary = filters.stars.length
    ? filters.stars.map((s) => `${s}★`).join(" · ")
    : null;
  const cuisineSummary =
    filters.cuisines.length === 0
      ? null
      : filters.cuisines.length === 1
        ? (filters.cuisines[0] ?? null)
        : `${filters.cuisines.length} cuisines`;
  const whereSummary =
    filters.city && filters.country
      ? `${filters.city}, ${filters.country}`
      : (filters.city ?? filters.country ?? null);
  const dateSummary =
    filters.startDate || filters.endDate
      ? `${filters.startDate ? fmtShort(filters.startDate) : "…"} → ${filters.endDate ? fmtShort(filters.endDate) : "…"}`
      : null;
  const reviewsSummary =
    filters.minRating !== null
      ? filters.minRating === 5
        ? "5★"
        : `${filters.minRating}★+`
      : null;

  const showCountry = facets.countries.length > 1;

  const togglePill = (k: PillKey) => setOpen((cur) => (cur === k ? null : k));

  return (
    <div
      className={`space-y-4 transition-opacity duration-[120ms] ease-paper ${isPending ? "opacity-60" : "opacity-100"}`}
    >
      <SearchPill
        value={filters.q ?? ""}
        onCommit={(v) => patch({ q: v || null })}
        suggestions={suggestions}
      />

      <div ref={rowRef} className="flex flex-wrap items-center gap-2">
        <FilterPill
          label="Distinction"
          icon={<StarIcon />}
          summary={distinctionSummary}
          isOpen={open === "distinction"}
          onToggle={() => togglePill("distinction")}
        >
          <ul className="space-y-1">
            {STAR_TIERS.map((tier) => {
              const active = filters.stars.includes(tier);
              return (
                <li key={tier}>
                  <button
                    type="button"
                    onClick={() => toggleStar(tier)}
                    className={`flex w-full items-baseline justify-between border px-3 py-2 text-left transition-colors duration-[120ms] ease-paper ${
                      active
                        ? "border-michelin-red bg-michelin-red/10 text-oak-gall"
                        : "border-sepia/30 text-oak-gall-soft hover:border-sepia/60"
                    }`}
                  >
                    <span className="font-serif text-base">
                      {tier} {tier === 1 ? "star" : "stars"}
                    </span>
                    {active && (
                      <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-michelin-red">
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </FilterPill>

        <FilterPill
          label="Cuisine"
          icon={<CuisineIcon />}
          summary={cuisineSummary}
          isOpen={open === "cuisine"}
          onToggle={() => togglePill("cuisine")}
          popoverWidth={360}
        >
          <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {facets.cuisines.map(({ tag, count }) => {
              const active = filters.cuisines.includes(tag);
              return (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => toggleCuisine(tag)}
                    className={`flex w-full items-baseline justify-between gap-2 px-2 py-1 text-left transition-colors duration-[120ms] ease-paper ${
                      active
                        ? "bg-michelin-red/10 text-oak-gall"
                        : "text-oak-gall-soft hover:bg-ermine"
                    }`}
                  >
                    <span className="truncate font-serif text-sm">
                      {active && (
                        <span className="mr-1 text-michelin-red" aria-hidden>
                          ✓
                        </span>
                      )}
                      {tag}
                    </span>
                    <span className="shrink-0 font-sans text-[10px] uppercase tracking-[0.18em] text-sepia-faint">
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </FilterPill>

        <FilterPill
          label="Where"
          icon={<PinIcon />}
          summary={whereSummary}
          isOpen={open === "where"}
          onToggle={() => togglePill("where")}
          popoverWidth={320}
        >
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => patch({ city: null, country: null })}
              className={`flex w-full items-center justify-between border px-3 py-2 text-left transition-colors duration-[120ms] ease-paper ${
                whereSummary === null
                  ? "border-michelin-red bg-michelin-red/10 text-oak-gall"
                  : "border-sepia/30 text-oak-gall-soft hover:border-sepia/60"
              }`}
            >
              <span className="font-serif text-base">Anywhere</span>
              {whereSummary === null && (
                <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-michelin-red">
                  ✓
                </span>
              )}
            </button>
            <label className="block">
              <span className="mb-1 block font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
                City
              </span>
              <input
                type="text"
                defaultValue={filters.city ?? ""}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (filters.city ?? "")) patch({ city: v || null });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const v = (e.target as HTMLInputElement).value.trim();
                    patch({ city: v || null });
                  }
                }}
                placeholder="Annecy, Paris, …"
                className="w-full border border-sepia/40 bg-ermine px-3 py-2 font-serif text-base text-oak-gall placeholder:text-sepia-faint focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu"
              />
            </label>
            {showCountry && (
              <label className="block">
                <span className="mb-1 block font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
                  Country
                </span>
                <select
                  value={filters.country ?? ""}
                  onChange={(e) => patch({ country: e.target.value || null })}
                  className="w-full border border-sepia/40 bg-ermine px-3 py-2 font-serif text-base text-oak-gall focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu"
                >
                  <option value="">All countries</option>
                  {facets.countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </FilterPill>

        <FilterPill
          label="Dates"
          icon={<CalendarIcon />}
          summary={dateSummary}
          isOpen={open === "dates"}
          onToggle={() => togglePill("dates")}
        >
          <div className="space-y-3">
            <DateField
              label="Start"
              value={filters.startDate ?? ""}
              onChange={(v) => patch({ start: v || null })}
            />
            <DateField
              label="End"
              value={filters.endDate ?? ""}
              min={filters.startDate ?? undefined}
              onChange={(v) => patch({ end: v || null })}
            />
            {(filters.startDate || filters.endDate) && (
              <button
                type="button"
                onClick={() => patch({ start: null, end: null })}
                className="font-sans text-[10px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-michelin-red"
              >
                Clear dates
              </button>
            )}
          </div>
        </FilterPill>

        <FilterPill
          label="Reviews"
          icon={<ReviewIcon />}
          summary={reviewsSummary}
          isOpen={open === "reviews"}
          onToggle={() => togglePill("reviews")}
          popoverWidth={240}
        >
          <ul className="space-y-1">
            {RATING_OPTIONS.map((n) => {
              const active = filters.minRating === n;
              return (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() =>
                      patch({ rating: active ? null : String(n) })
                    }
                    className={`flex w-full items-baseline justify-between border px-3 py-2 text-left transition-colors duration-[120ms] ease-paper ${
                      active
                        ? "border-michelin-red bg-michelin-red/10 text-oak-gall"
                        : "border-sepia/30 text-oak-gall-soft hover:border-sepia/60"
                    }`}
                  >
                    <span className="font-serif text-base">
                      {n === 5 ? "5 stars only" : `${n} stars or more`}
                    </span>
                    {active && (
                      <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-michelin-red">
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 font-sans text-[10px] uppercase tracking-[0.18em] text-sepia-faint">
            Reviews come from stagiaires after they cook.
          </p>
        </FilterPill>

        <VerifiedTogglePill
          active={filters.verifiedOnly}
          onToggle={() => patch({ verified: filters.verifiedOnly ? null : "1" })}
        />

        {hasAny && (
          <button
            type="button"
            onClick={() => {
              setOpen(null);
              startTransition(() => router.replace(pathname, { scroll: false }));
            }}
            className="ml-auto font-sans text-[10px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-michelin-red"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}

/*
 * Top-row search field with autocomplete dropdown. Controlled locally so
 * typing updates the suggestion list per keystroke without round-tripping
 * the URL. Two ways to commit:
 *   - Click a suggestion → navigate straight to /r/[slug] (we know which
 *     restaurant they wanted).
 *   - Press Enter or blur → commit the typed text as a `q` filter
 *     (preserves prior free-text-search behavior).
 */
function SearchPill({
  value,
  onCommit,
  suggestions,
}: {
  value: string;
  onCommit: (v: string) => void;
  suggestions: RestaurantSuggestion[];
}) {
  const router = useRouter();
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Keep local text in sync if the URL `q` changes from elsewhere
  // (e.g., Clear all filters).
  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    const prefix: RestaurantSuggestion[] = [];
    const contains: RestaurantSuggestion[] = [];
    for (const s of suggestions) {
      const n = s.name.toLowerCase();
      if (n.startsWith(q)) prefix.push(s);
      else if (n.includes(q)) contains.push(s);
      if (prefix.length >= 8) break;
    }
    return [...prefix, ...contains].slice(0, 8);
  }, [text, suggestions]);

  function pick(slug: string) {
    setOpen(false);
    router.push(`/r/${slug}`);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="flex items-center gap-3 rounded-full border border-sepia/40 bg-white px-5 py-3 shadow-[0_1px_0_rgba(43,38,26,0.04),0_8px_24px_-12px_rgba(43,38,26,0.18)] transition-colors duration-[120ms] ease-paper focus-within:border-cordon-bleu">
        <span className="text-sepia" aria-hidden>
          <SearchIcon />
        </span>
        <input
          type="text"
          value={text}
          placeholder="Search by restaurant name…"
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (text.trim().length > 0) setOpen(true);
          }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v !== value) onCommit(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (matches.length > 0) {
                pick(matches[0]!.slug);
                return;
              }
              const v = (e.target as HTMLInputElement).value.trim();
              setOpen(false);
              onCommit(v);
            }
          }}
          autoComplete="off"
          className="w-full border-0 bg-transparent p-0 font-serif text-base text-oak-gall placeholder:text-sepia-faint focus:outline-none"
        />
      </label>

      {open && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-80 overflow-y-auto rounded-xl border border-sepia/30 bg-white p-2 shadow-[0_24px_48px_-24px_rgba(43,38,26,0.35)]">
          <ul>
            {matches.map((m) => (
              <li key={m.slug}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(m.slug)}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-[80ms] ease-paper hover:bg-ermine"
                >
                  <span className="min-w-0 flex-1 truncate font-serif text-base text-oak-gall">
                    {m.name}
                  </span>
                  <span className="shrink-0 font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
                    {"★".repeat(m.stars)}
                    {m.city && (
                      <>
                        <span className="mx-1.5 text-sepia-faint">·</span>
                        {m.city}
                      </>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FilterPill({
  label,
  icon,
  summary,
  isOpen,
  onToggle,
  popoverWidth = 280,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  summary: string | null;
  isOpen: boolean;
  onToggle: () => void;
  popoverWidth?: number;
  children: React.ReactNode;
}) {
  const active = summary !== null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-sans text-[12px] tracking-[0.04em] transition-colors duration-[120ms] ease-paper ${
          active
            ? "border-michelin-red bg-michelin-red/[0.06] text-michelin-red"
            : isOpen
              ? "border-cordon-bleu bg-cordon-bleu-wash text-oak-gall"
              : "border-sepia/40 bg-white text-oak-gall hover:border-sepia/70 hover:bg-ermine"
        }`}
      >
        <span className="shrink-0" aria-hidden>
          {icon}
        </span>
        <span className="whitespace-nowrap">{summary ?? label}</span>
      </button>
      {isOpen && (
        <div
          style={{ width: popoverWidth }}
          className="absolute left-0 top-[calc(100%+8px)] z-30 max-w-[calc(100vw-32px)] rounded-xl border border-sepia/40 bg-white p-4 shadow-[0_8px_32px_rgba(31,26,18,0.12)]"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/*
 * Single-bool filter rendered as a click-to-toggle pill — no popover.
 * Same visual language as the others so it sits naturally in the row.
 */
function VerifiedTogglePill({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-sans text-[12px] tracking-[0.04em] transition-colors duration-[120ms] ease-paper ${
        active
          ? "border-michelin-red bg-michelin-red/[0.06] text-michelin-red"
          : "border-sepia/40 bg-white text-oak-gall hover:border-sepia/70 hover:bg-ermine"
      }`}
    >
      <span className="shrink-0" aria-hidden>
        <VerifiedIcon />
      </span>
      <span className="whitespace-nowrap">
        {active ? "Verified" : "Verified by chef"}
      </span>
    </button>
  );
}

function DateField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
        {label}
      </span>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-sepia/40 bg-ermine px-3 py-2 font-serif text-base text-oak-gall focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu"
      />
    </label>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M12 3.5l2.47 5.18 5.7.55-4.3 3.85 1.27 5.6L12 15.85 6.86 18.68l1.27-5.6-4.3-3.85 5.7-.55L12 3.5z"
        fill="currentColor"
      />
    </svg>
  );
}

function CuisineIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M7 3v8a2 2 0 0 0 4 0V3" />
      <path d="M9 11v10" />
      <path d="M16 3c-1.5 0-3 1.5-3 4v4c0 1.5.7 2 2 2h1v8" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M12 21s-7-7.2-7-12a7 7 0 1 1 14 0c0 4.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="m12 7 1.4 2.9 3.1.4-2.3 2.2.6 3.1L12 14l-2.8 1.6.6-3.1-2.3-2.2 3.1-.4z" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M12 2.5l2.6 1.9 3.2-.3.7 3.1 2.4 2.1-1.4 2.9 1.4 2.9-2.4 2.1-.7 3.1-3.2-.3L12 21.5l-2.6-1.9-3.2.3-.7-3.1L3.1 14.7l1.4-2.9-1.4-2.9L5.5 6.8l.7-3.1 3.2.3L12 2.5z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function fmtShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
