import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUser, roleHome, type CurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";

import { FilterBar } from "./_components/filter-bar";
import { MapSplit } from "./_components/map-split";
import { ResultCard } from "./_components/result-card";
import { SortControl } from "./_components/sort-control";
import {
  filtersToQuery,
  getFacetOptions,
  parseFilters,
  queryRestaurantPins,
  queryRestaurants,
  type SearchParams,
} from "./_lib/filters";
import { getRestaurantSuggestions } from "../_lib/restaurant-suggestions";

export const metadata: Metadata = {
  title: "Discover",
  description:
    "Filter every Michelin-starred restaurant by date, cuisine, star tier, and city. Free to browse — login only when you're ready to request a stage.",
  openGraph: {
    title: "Discover",
    description:
      "Filter every Michelin-starred restaurant by date, cuisine, star tier, and city.",
    url: "/discover",
  },
};

/*
 * /discover — public filtered directory.
 *
 * Anyone (signed in or not) can browse and filter. The wall lives on
 * the request action over on /r/[slug] — discovery itself is free.
 *
 * `view` URL param toggles between the result-card list (default) and
 * the globe. Both views share the same FilterBar in the left sidebar
 * so constraints carry across the toggle.
 */

type View = "list" | "map";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [params, viewer] = await Promise.all([searchParams, getCurrentUser()]);
  const filters = parseFilters(params);

  // Map is the default view — list is opt-in via ?view=list.
  const view: View = params.view === "list" ? "list" : "map";

  // List always renders results; map view adds pins for the right pane.
  const [results, pins, facets, suggestions] = await Promise.all([
    queryRestaurants(filters),
    view === "map" ? queryRestaurantPins(filters) : Promise.resolve([]),
    getFacetOptions(),
    getRestaurantSuggestions(),
  ]);

  const hasDateFilter = filters.startDate && filters.endDate;
  const fullyAvailable = hasDateFilter
    ? results.filter(
        (r) => r.availability && r.availability.availableDays === r.availability.rangeDays,
      ).length
    : null;

  const visibleCount = results.length;

  // Build hrefs for the view toggle, preserving every other filter.
  // Map is the default so its href omits ?view=; list explicitly opts in.
  const baseQuery = filtersToQuery(filters);
  const listQuery = new URLSearchParams(baseQuery);
  const mapQuery = new URLSearchParams(baseQuery);
  listQuery.set("view", "list");
  const listHref = `/discover?${listQuery}`;
  const mapHref = mapQuery.toString() ? `/discover?${mapQuery}` : "/discover";

  /*
   * Two layouts: list view is a normal scrolling page; map view is
   * viewport-locked so only the cards column scrolls and the map sits
   * still on the right. Header is shared.
   */
  const headerEl = (
    <header className="shrink-0 border-b border-sepia/30">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
        <Link
          href="/"
          className="font-display text-2xl italic tracking-tight text-oak-gall transition-opacity duration-[120ms] ease-paper hover:opacity-80"
        >
          Stagiaire
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          <Link
            href="/discover"
            className="font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-oak-gall transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
          >
            Discover
          </Link>
        </nav>
        <PublicNav user={viewer} />
      </div>
    </header>
  );

  if (view === "map") {
    return (
      <main className="flex h-[100dvh] flex-col overflow-hidden bg-vellum text-oak-gall">
        {headerEl}
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-8 py-5 lg:min-h-0">
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
              Discover · {visibleCount} {visibleCount === 1 ? "restaurant" : "restaurants"}
              {fullyAvailable !== null && (
                <>
                  {" · "}
                  <span className="text-cordon-bleu">
                    {fullyAvailable} for your dates
                  </span>
                </>
              )}
            </p>
            <ViewToggle current={view} listHref={listHref} mapHref={mapHref} />
          </div>
          <FilterBar filters={filters} facets={facets} suggestions={suggestions} />
          <div className="mt-4 flex-1 lg:min-h-0">
            <MapSplit
              results={results}
              pins={pins}
              startDate={filters.startDate}
              endDate={filters.endDate}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-vellum text-oak-gall">
      {headerEl}

      <div className="mx-auto max-w-7xl px-8 py-12">
        <div className="flex flex-wrap items-baseline justify-between gap-6">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            The directory
          </p>
          <ViewToggle current={view} listHref={listHref} mapHref={mapHref} />
        </div>

        <h1 className="mt-3 font-display text-6xl italic leading-[1.05] tracking-tight">
          Discover.
        </h1>

        <div className="mt-10">
          <FilterBar filters={filters} facets={facets} suggestions={suggestions} />
        </div>

        <header className="mb-6 mt-8 flex flex-wrap items-baseline justify-between gap-4 border-b border-sepia/30 pb-4">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            {visibleCount} {visibleCount === 1 ? "restaurant" : "restaurants"}
            {fullyAvailable !== null && (
              <>
                {" · "}
                <span className="text-cordon-bleu">{fullyAvailable} available for your dates</span>
              </>
            )}
          </p>
          <SortControl current={filters.sort} hasDateFilter={Boolean(hasDateFilter)} />
        </header>

        {results.length === 0 ? (
          <div className="border border-sepia/30 px-6 py-10 text-center">
            <p className="font-serif text-base italic text-sepia">
              No restaurants match these filters. Loosen a constraint or clear the filters above.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <li key={r.id} className="h-full">
                <ResultCard
                  result={r}
                  startDate={filters.startDate}
                  endDate={filters.endDate}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function ViewToggle({
  current,
  listHref,
  mapHref,
}: {
  current: View;
  listHref: string;
  mapHref: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Discover view"
      className="inline-flex border border-sepia/40"
    >
      <Link
        href={mapHref}
        role="tab"
        aria-selected={current === "map"}
        className={`px-4 py-1.5 font-sans text-[11px] uppercase tracking-[0.18em] transition-colors duration-[120ms] ease-paper ${
          current === "map"
            ? "bg-oak-gall text-vellum"
            : "text-sepia hover:bg-ermine hover:text-oak-gall"
        }`}
      >
        Map
      </Link>
      <Link
        href={listHref}
        role="tab"
        aria-selected={current === "list"}
        className={`border-l border-sepia/40 px-4 py-1.5 font-sans text-[11px] uppercase tracking-[0.18em] transition-colors duration-[120ms] ease-paper ${
          current === "list"
            ? "bg-oak-gall text-vellum"
            : "text-sepia hover:bg-ermine hover:text-oak-gall"
        }`}
      >
        List
      </Link>
    </div>
  );
}

function PublicNav({ user }: { user: CurrentUser | null }) {
  if (!user) {
    return (
      <div className="flex items-center gap-5">
        <Link
          href="/login"
          className="inline-flex items-center font-sans text-[11px] uppercase leading-none tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
        >
          Sign up
        </Link>
      </div>
    );
  }
  const home = roleHome(user.role);
  return (
    <div className="flex items-center gap-5">
      <Link
        href={home.href}
        className="inline-flex items-center font-sans text-[11px] uppercase leading-none tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
      >
        {home.label}
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          className="inline-flex items-center font-sans text-[11px] uppercase leading-none tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
