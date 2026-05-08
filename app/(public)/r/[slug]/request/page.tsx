import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { eq } from "drizzle-orm";

import { RosetteRow } from "@/components/ui/rosette";
import { db } from "@/lib/db";
import { restaurantProfiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

import { submitRequest } from "./actions";
import { RequestForm } from "./_components/request-form";

export const metadata: Metadata = {
  title: "Request a stage",
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
};

/*
 * /r/[slug]/request — the submission form.
 *
 * Auth gate: must be a signed-in stagiaire. Restaurant owners and
 * admins are pushed back to the public profile (they're not the
 * audience for this CTA). Logged-out users are sent to /login with a
 * return path.
 *
 * If the user came in from the restaurant page's calendar, ?start and
 * ?end are pre-filled into the picker so they only need to write the
 * cover and confirm. They can still adjust dates here if needed.
 */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function RequestStagePage({ params, searchParams }: PageProps) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [restaurant, user] = await Promise.all([
    db.query.restaurantProfiles.findFirst({
      where: eq(restaurantProfiles.slug, slug),
      columns: {
        id: true,
        name: true,
        slug: true,
        city: true,
        stars: true,
        closedWindows: true,
      },
    }),
    getCurrentUser(),
  ]);
  if (!restaurant) notFound();

  // Preserve the date selection through login.
  const initialStartDate = sp.start && ISO_DATE_RE.test(sp.start) ? sp.start : "";
  const initialEndDate = sp.end && ISO_DATE_RE.test(sp.end) ? sp.end : "";
  const qs =
    initialStartDate && initialEndDate
      ? `?start=${initialStartDate}&end=${initialEndDate}`
      : "";

  if (!user) redirect(`/login?next=${encodeURIComponent(`/r/${slug}/request${qs}`)}`);
  if (user.role !== "stagiaire") redirect(`/r/${slug}`);

  const tier = restaurant.stars as 1 | 2 | 3;
  const boundSubmit = submitRequest.bind(null, restaurant.id, restaurant.slug);
  const hasPrefilledDates = Boolean(initialStartDate && initialEndDate);

  return (
    <main className="min-h-screen bg-vellum text-oak-gall">
      <header className="border-b border-sepia/30">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-8 py-5">
          <Link
            href="/"
            className="font-display text-2xl italic tracking-tight text-oak-gall transition-opacity duration-[120ms] ease-paper hover:opacity-80"
          >
            Stagiaire
          </Link>
          <Link
            href={`/r/${slug}`}
            className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
          >
            ← Back to {restaurant.name}
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-8 py-16">
        <div className="flex items-center gap-3">
          <RosetteRow tier={tier} size={12} />
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            {restaurant.city ?? "—"}
          </p>
        </div>

        <p className="mt-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Request a stage at
        </p>
        <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">
          {restaurant.name}.
        </h1>

        <p className="mt-4 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
          {hasPrefilledDates
            ? "Your dates are locked in. Add a short cover and submit. Your full profile — CV, portfolio, references — goes with the request."
            : "Pick the dates you'd like to stage and write a short cover. Your full profile travels with the request."}
        </p>

        <hr className="my-8 border-0 border-t border-sepia/30" />

        <RequestForm
          action={boundSubmit}
          restaurantSlug={restaurant.slug}
          closedWindows={restaurant.closedWindows ?? []}
          todayIso={todayIso()}
          initialStartDate={initialStartDate}
          initialEndDate={initialEndDate}
        />
      </article>
    </main>
  );
}

function todayIso(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
