import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { stagiaireProfiles, stageRequests } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import {
  ACTIVE_FOR_RESTAURANT,
  formatDateRange,
  formatExpiry,
  type StageRequestStatus,
} from "@/lib/requests";

import { StatusPill } from "@/components/features/requests/status-pill";

import { getOwnedRestaurant } from "../_lib/owner";

export const metadata: Metadata = {
  title: "Requests",
};

/*
 * /restaurant/requests — restaurant-side inbox.
 *
 * Two sections: "Awaiting your decision" (statuses where the chef is
 * the one holding the ball) and "History" (everything else, in
 * reverse-chrono). The split makes it easy to scan: anything past
 * acceptance/decline drops out of the top stack on the next page load.
 *
 * If the owner doesn't yet have an approved restaurant we send them
 * back to /restaurant — there's nothing to show.
 */

export default async function RestaurantRequestsPage() {
  const user = await requireRole("restaurant_owner");
  const restaurant = await getOwnedRestaurant(user.id);
  if (!restaurant) redirect("/restaurant");

  const all = await db
    .select({
      id: stageRequests.id,
      status: stageRequests.status,
      startDate: stageRequests.startDate,
      endDate: stageRequests.endDate,
      submittedAt: stageRequests.submittedAt,
      expiresAt: stageRequests.expiresAt,
      stagiaireName: stagiaireProfiles.name,
      stagiaireSlug: stagiaireProfiles.slug,
      stagiaireCity: stagiaireProfiles.currentCity,
    })
    .from(stageRequests)
    .innerJoin(stagiaireProfiles, eq(stageRequests.stagiaireId, stagiaireProfiles.userId))
    .where(eq(stageRequests.restaurantId, restaurant.id))
    .orderBy(desc(stageRequests.submittedAt));

  const awaiting = all.filter((r) => ACTIVE_FOR_RESTAURANT.includes(r.status));
  const history = all.filter((r) => !ACTIVE_FOR_RESTAURANT.includes(r.status));

  return (
    <>
      <Link
        href="/restaurant"
        className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
      >
        ← Back to dashboard
      </Link>

      <p className="mt-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Stage requests
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">
        Inbox.
      </h1>
      <p className="mt-4 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        Each request shows you the candidate&rsquo;s profile, their cover, and the dates they
        want to stage. Decline costs nothing — better to be honest about timing than to ghost.
      </p>

      <hr className="my-10 border-0 border-t border-sepia/30" />

      <Section title="Awaiting your decision" empty="Nothing waiting on you. Quiet kitchen.">
        {awaiting.map((r) => (
          <RequestRow
            key={r.id}
            id={r.id}
            status={r.status}
            startDate={r.startDate}
            endDate={r.endDate}
            stagiaireName={r.stagiaireName}
            stagiaireCity={r.stagiaireCity}
            extra={`Auto-declines ${formatExpiry(r.expiresAt)}`}
          />
        ))}
      </Section>

      <div className="my-12" />

      <Section title="History" empty="No past decisions yet.">
        {history.map((r) => (
          <RequestRow
            key={r.id}
            id={r.id}
            status={r.status}
            startDate={r.startDate}
            endDate={r.endDate}
            stagiaireName={r.stagiaireName}
            stagiaireCity={r.stagiaireCity}
          />
        ))}
      </Section>
    </>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.some(Boolean) && items.length > 0;

  return (
    <section>
      <h2 className="mb-4 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        {title}
      </h2>
      {hasItems ? (
        <ul className="space-y-px bg-sepia/20">{children}</ul>
      ) : (
        <div className="border border-sepia/30 px-6 py-8">
          <p className="font-serif text-sm italic text-sepia">{empty}</p>
        </div>
      )}
    </section>
  );
}

function RequestRow({
  id,
  status,
  startDate,
  endDate,
  stagiaireName,
  stagiaireCity,
  extra,
}: {
  id: string;
  status: StageRequestStatus;
  startDate: string;
  endDate: string;
  stagiaireName: string;
  stagiaireCity: string | null;
  extra?: string;
}) {
  return (
    <li>
      <Link
        href={`/restaurant/requests/${id}`}
        className="grid grid-cols-[1fr_auto] items-baseline gap-6 bg-vellum px-6 py-5 transition-colors duration-[120ms] ease-paper hover:bg-ermine"
      >
        <div>
          <div className="flex items-baseline gap-3">
            <p className="font-display text-2xl italic text-oak-gall">{stagiaireName}</p>
            {stagiaireCity && (
              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
                {stagiaireCity}
              </p>
            )}
          </div>
          <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            {formatDateRange(startDate, endDate)}
          </p>
          {extra && (
            <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.18em] text-sepia-faint">
              {extra}
            </p>
          )}
        </div>
        <StatusPill status={status} />
      </Link>
    </li>
  );
}
