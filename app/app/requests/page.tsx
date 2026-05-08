import type { Metadata } from "next";
import Link from "next/link";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { restaurantProfiles, stageRequests } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { formatDateRange } from "@/lib/requests";

import { StatusPill } from "@/components/features/requests/status-pill";

export const metadata: Metadata = {
  title: "My requests",
};

type SearchParams = Promise<{ submitted?: string }>;

/*
 * /app/requests — stagiaire-side inbox.
 *
 * Reverse-chronological list of every stage request the user has
 * submitted, with status chips and a link into the detail page. The
 * `?submitted=1` query param is set by the submit redirect — surfaces
 * a one-time success banner.
 */

export default async function MyRequestsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireRole("stagiaire");
  const { submitted } = await searchParams;

  const rows = await db
    .select({
      id: stageRequests.id,
      status: stageRequests.status,
      startDate: stageRequests.startDate,
      endDate: stageRequests.endDate,
      submittedAt: stageRequests.submittedAt,
      restaurantName: restaurantProfiles.name,
      restaurantCity: restaurantProfiles.city,
      restaurantSlug: restaurantProfiles.slug,
      restaurantStars: restaurantProfiles.stars,
    })
    .from(stageRequests)
    .innerJoin(restaurantProfiles, eq(stageRequests.restaurantId, restaurantProfiles.id))
    .where(eq(stageRequests.stagiaireId, user.id))
    .orderBy(desc(stageRequests.submittedAt));

  return (
    <div className="mx-auto max-w-3xl px-8 py-16">
      <Link
        href="/app"
        className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
      >
        ← Back to profile
      </Link>

      <p className="mt-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Your requests
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight text-oak-gall">
        Requests.
      </h1>

      {submitted && (
        <div className="mt-8 border border-cordon-bleu/40 bg-cordon-bleu-wash px-5 py-4">
          <p className="font-serif text-base text-oak-gall">
            Your request was sent. The chef has 14 days to respond — you&rsquo;ll see the reply
            here, and either side can message in the meantime.
          </p>
        </div>
      )}

      <hr className="my-10 border-0 border-t border-sepia/30" />

      {rows.length === 0 ? (
        <div className="border border-sepia/30 px-6 py-10 text-center">
          <p className="font-serif text-base italic text-sepia">
            No requests yet. Find a kitchen on{" "}
            <Link
              href="/discover"
              className="text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px]"
            >
              Discover
            </Link>{" "}
            and submit your first.
          </p>
        </div>
      ) : (
        <ul className="space-y-px bg-sepia/20">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/app/requests/${r.id}`}
                className="grid grid-cols-[1fr_auto] items-baseline gap-6 bg-vellum px-6 py-5 transition-colors duration-[120ms] ease-paper hover:bg-ermine"
              >
                <div>
                  <div className="flex items-baseline gap-3">
                    <p className="font-display text-2xl italic text-oak-gall">{r.restaurantName}</p>
                    <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
                      {r.restaurantStars}★ · {r.restaurantCity ?? "—"}
                    </p>
                  </div>
                  <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                    {formatDateRange(r.startDate, r.endDate)}
                  </p>
                </div>
                <StatusPill status={r.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
