"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { DateRangeCalendar } from "@/components/features/requests/date-range-calendar";
import type { CitySuggestion } from "../_lib/cities";
import type { RestaurantSuggestion } from "../_lib/restaurant-suggestions";

/*
 * Homepage search pill — Airbnb-style "Where + When + Search" widget in
 * our paper palette. Two segments separated by a hairline; the search
 * button is a cordon-bleu disc with shadow + scale animation so it
 * reads as a button, not a label.
 *
 * Two popovers:
 *   - "Where" → suggested destinations dropdown (ranked by directory
 *     density; clicking a row fills the input)
 *   - "When" → date-range calendar
 * Only one is open at a time. Outside click + Escape close.
 *
 * Submission packs the fields into /discover query params, where the
 * existing FilterBar parses them. No new filtering logic — we're just a
 * fancy preset.
 *
 * Today is server-rendered for SSR/CSR stability (a fresh `new Date()`
 * on the client would otherwise drift).
 */

type Popover = "where" | "when" | null;

export function HomeSearchBar({
  todayIso,
  cities,
  restaurants,
}: {
  todayIso: string;
  cities: CitySuggestion[];
  restaurants: RestaurantSuggestion[];
}) {
  const router = useRouter();
  const [where, setWhere] = useState("");
  // "Anywhere" / "Anytime" sentinels — visible in the pill but mean "no
  // filter". They drop the moment the user types a city or picks dates,
  // so the pill always reflects what will actually be submitted.
  const [whereAnywhere, setWhereAnywhere] = useState(false);
  const [whenAnytime, setWhenAnytime] = useState(false);
  const [range, setRange] = useState<{ startDate: string; endDate: string }>({
    startDate: "",
    endDate: "",
  });
  const [active, setActive] = useState<Popover>(null);
  const wrapperRef = useRef<HTMLFormElement>(null);
  const whereInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!active) return;
    const onPointer = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setActive(null);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onEsc);
    };
  }, [active]);

  const filteredCities = useMemo(() => {
    const q = where.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.city.toLowerCase().includes(q));
  }, [where, cities]);

  // Restaurants ranked: prefix matches first, then anywhere-in-name. Cap
  // at 6 so the dropdown stays scannable. Empty query → no restaurants
  // section (user is browsing, not seeking a specific one).
  const filteredRestaurants = useMemo(() => {
    const q = where.trim().toLowerCase();
    if (!q) return [];
    const prefix: RestaurantSuggestion[] = [];
    const contains: RestaurantSuggestion[] = [];
    for (const r of restaurants) {
      const n = r.name.toLowerCase();
      if (n.startsWith(q)) prefix.push(r);
      else if (n.includes(q)) contains.push(r);
      if (prefix.length >= 6) break;
    }
    return [...prefix, ...contains].slice(0, 6);
  }, [where, restaurants]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActive(null);
    const q = new URLSearchParams();
    const w = where.trim();
    if (w) q.set("city", w);
    if (range.startDate) q.set("start", range.startDate);
    if (range.endDate) q.set("end", range.endDate);
    const qs = q.toString();
    router.push(qs ? `/discover?${qs}` : "/discover");
  }

  function pickCity(city: string) {
    setWhere(city);
    setWhereAnywhere(false);
    setActive("when"); // natural next step — pick dates
  }

  function pickAnywhere() {
    setWhere("");
    setWhereAnywhere(true);
    setActive("when");
  }

  function pickRestaurant(slug: string) {
    setActive(null);
    router.push(`/r/${slug}`);
  }

  function pickAnytime() {
    setRange({ startDate: "", endDate: "" });
    setWhenAnytime(true);
    setActive(null);
  }

  const datesSummary =
    range.startDate && range.endDate
      ? `${fmtShort(range.startDate)} → ${fmtShort(range.endDate)}`
      : range.startDate
        ? `${fmtShort(range.startDate)} → …`
        : null;

  return (
    <form ref={wrapperRef} onSubmit={onSubmit} className="relative w-full max-w-3xl">
      <div className="flex items-stretch overflow-hidden rounded-full border border-sepia/40 bg-white shadow-[0_1px_0_rgba(43,38,26,0.04),0_8px_24px_-12px_rgba(43,38,26,0.18)]">
        {/* Where */}
        <div
          className={`flex flex-1 cursor-text flex-col px-7 py-3 transition-colors duration-[120ms] ease-paper ${
            active === "where" ? "bg-ermine" : "hover:bg-ermine/60"
          }`}
          onClick={() => {
            setActive("where");
            whereInputRef.current?.focus();
          }}
        >
          <span className="font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-sepia">
            Where
          </span>
          <input
            ref={whereInputRef}
            type="text"
            value={whereAnywhere ? "Anywhere" : where}
            onChange={(e) => {
              setWhereAnywhere(false);
              setWhere(e.target.value);
            }}
            onFocus={() => {
              // Drop the "Anywhere" sentinel on focus so typing starts
              // from a clean field rather than editing the literal string.
              if (whereAnywhere) {
                setWhereAnywhere(false);
                setWhere("");
              }
              setActive("where");
            }}
            placeholder="Cities or countries"
            autoComplete="off"
            className="mt-1 w-full bg-transparent font-serif text-base text-oak-gall placeholder:text-sepia-faint focus:outline-none"
          />
        </div>

        {/* Hairline divider */}
        <div className="my-3 w-px bg-sepia/30" aria-hidden />

        {/* When */}
        <button
          type="button"
          onClick={() => setActive((cur) => (cur === "when" ? null : "when"))}
          aria-expanded={active === "when"}
          aria-haspopup="dialog"
          className={`flex flex-1 cursor-pointer flex-col px-7 py-3 text-left transition-colors duration-[120ms] ease-paper ${
            active === "when" ? "bg-ermine" : "hover:bg-ermine/60"
          }`}
        >
          <span className="font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-sepia">
            When
          </span>
          <span
            className={`mt-1 truncate font-serif text-base ${
              datesSummary || whenAnytime ? "text-oak-gall" : "text-sepia-faint"
            }`}
          >
            {whenAnytime ? "Anytime" : (datesSummary ?? "Add dates")}
          </span>
        </button>

        {/* Search button — sized + shadowed + animated so it reads as the
            primary action, not a label. */}
        <div className="flex items-center pr-2">
          <button
            type="submit"
            aria-label="Search restaurants"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cordon-bleu text-vellum shadow-[0_2px_4px_rgba(27,44,92,0.25),0_4px_12px_-2px_rgba(27,44,92,0.35)] transition-all duration-[120ms] ease-paper hover:scale-[1.04] hover:bg-cordon-bleu-dark hover:shadow-[0_4px_8px_rgba(27,44,92,0.3),0_8px_20px_-4px_rgba(27,44,92,0.4)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu active:scale-[0.96]"
          >
            <SearchIcon />
          </button>
        </div>
      </div>

      {active === "where" && (
        <div
          role="dialog"
          aria-label="Suggested destinations"
          className="absolute left-0 top-full z-30 mt-3 max-h-[480px] w-[min(420px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-sepia/30 bg-white p-4 shadow-[0_24px_48px_-24px_rgba(43,38,26,0.35)]"
        >
          {filteredRestaurants.length > 0 && (
            <>
              <p className="px-3 pb-2 pt-1 font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-sepia">
                Restaurants
              </p>
              <ul className="mb-2">
                {filteredRestaurants.map((r) => (
                  <li key={r.slug}>
                    <button
                      type="button"
                      onClick={() => pickRestaurant(r.slug)}
                      className="flex w-full items-center gap-4 rounded-md px-3 py-2.5 text-left transition-colors duration-[80ms] ease-paper hover:bg-ermine"
                    >
                      <RestaurantGlyph />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-serif text-base text-oak-gall">{r.name}</p>
                        <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-sepia">
                          {"★".repeat(r.stars)}
                          {r.city && (
                            <>
                              <span className="mx-1.5 text-sepia-faint">·</span>
                              {r.city}
                            </>
                          )}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="px-3 pb-2 pt-1 font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-sepia">
            Suggested destinations
          </p>
          <ul>
            <li>
              <button
                type="button"
                onClick={pickAnywhere}
                className="flex w-full items-center gap-4 rounded-md px-3 py-2.5 text-left transition-colors duration-[80ms] ease-paper hover:bg-vellum"
              >
                <GlobeGlyph />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-base text-oak-gall">Anywhere</p>
                  <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-sepia">
                    Browse every kitchen
                  </p>
                </div>
              </button>
            </li>
          </ul>
          {filteredCities.length === 0 ? (
            filteredRestaurants.length === 0 ? (
              <p className="px-3 py-3 font-serif text-sm italic text-sepia">
                No matches. We&rsquo;ll still search what you&rsquo;ve typed.
              </p>
            ) : null
          ) : (
            <ul>
              {filteredCities.map((c) => (
                <li key={c.city}>
                  <button
                    type="button"
                    onClick={() => pickCity(c.city)}
                    className="flex w-full items-center gap-4 rounded-md px-3 py-2.5 text-left transition-colors duration-[80ms] ease-paper hover:bg-ermine"
                  >
                    <CityGlyph />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-base text-oak-gall">
                        {c.city}
                        {c.country && (
                          <span className="text-sepia-faint">, {c.country}</span>
                        )}
                      </p>
                      <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-sepia">
                        {c.count} starred {c.count === 1 ? "kitchen" : "kitchens"}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {active === "when" && (
        <div
          role="dialog"
          aria-label="Pick your dates"
          className="absolute left-1/2 top-full z-30 mt-3 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-sepia/30 bg-white p-6 shadow-[0_24px_48px_-24px_rgba(43,38,26,0.35)]"
        >
          <DateRangeCalendar
            closedWindows={[]}
            todayIso={todayIso}
            startDate={range.startDate}
            endDate={range.endDate}
            onChange={(next) => {
              setRange(next);
              if (next.startDate || next.endDate) setWhenAnytime(false);
            }}
          />
          <div className="mt-4 flex items-center justify-between border-t border-sepia/20 pt-4">
            <button
              type="button"
              onClick={pickAnytime}
              className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
            >
              Anytime
            </button>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="inline-flex h-10 items-center rounded-lg bg-oak-gall px-5 font-sans text-[11px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function GlobeGlyph() {
  // "Anywhere" entry — globe icon to differentiate from the pin used
  // for specific cities. Same tile shape so the row aligns with the rest.
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-sepia/30 bg-ermine">
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-cordon-bleu"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
      </svg>
    </span>
  );
}

function CityGlyph() {
  // Generic location pin glyph rendered inside a sepia-bordered tile.
  // Single icon for every row keeps the dropdown editorial — not trying
  // to be Airbnb's hand-drawn skyline collection.
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-sepia/30 bg-ermine">
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-cordon-bleu"
        aria-hidden="true"
      >
        <path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12Z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    </span>
  );
}

function RestaurantGlyph() {
  // Knife-and-fork glyph in the same tile shape as the city/globe rows.
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-sepia/30 bg-ermine">
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-cordon-bleu"
        aria-hidden="true"
      >
        <path d="M7 3v8a2 2 0 0 0 2 2v8" />
        <path d="M11 3v8" />
        <path d="M9 3v8" />
        <path d="M17 3c-1.5 0-3 1.5-3 4s1.5 4 3 4v10" />
      </svg>
    </span>
  );
}

function fmtShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}
