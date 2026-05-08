import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  messages,
  restaurantProfiles,
  reviews,
  stagiaireProfiles,
  stageRequests,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import {
  canMarkComplete,
  canMessage,
  canRestaurantDecide,
  formatDateRange,
  formatExpiry,
  todayIso,
} from "@/lib/requests";

import { ComposeMessage } from "@/components/features/requests/compose-message";
import { MessageThread, type ThreadMessage } from "@/components/features/requests/message-thread";
import { ReviewDisplay } from "@/components/features/requests/review-display";
import { ReviewForm } from "@/components/features/requests/review-form";
import { StatusPill } from "@/components/features/requests/status-pill";

import { getOwnedRestaurant } from "../../_lib/owner";
import {
  acceptRequest,
  completeRequest,
  declineRequest,
  sendMessageAsRestaurant,
  submitReviewAsRestaurant,
} from "./actions";

export const metadata: Metadata = {
  title: "Request",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RestaurantRequestDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireRole("restaurant_owner");
  const owned = await getOwnedRestaurant(user.id);
  if (!owned) redirect("/restaurant");

  const request = await db
    .select({
      id: stageRequests.id,
      status: stageRequests.status,
      startDate: stageRequests.startDate,
      endDate: stageRequests.endDate,
      coverMessage: stageRequests.coverMessage,
      submittedAt: stageRequests.submittedAt,
      decidedAt: stageRequests.decidedAt,
      expiresAt: stageRequests.expiresAt,
      stagiaireId: stagiaireProfiles.userId,
      stagiaireName: stagiaireProfiles.name,
      stagiaireSlug: stagiaireProfiles.slug,
      stagiaireBio: stagiaireProfiles.bio,
      stagiaireCity: stagiaireProfiles.currentCity,
      stagiaireCountry: stagiaireProfiles.country,
      stagiaireLanguages: stagiaireProfiles.languages,
      stagiaireIdVerifiedAt: stagiaireProfiles.idVerifiedAt,
    })
    .from(stageRequests)
    .innerJoin(restaurantProfiles, eq(restaurantProfiles.id, stageRequests.restaurantId))
    .innerJoin(stagiaireProfiles, eq(stageRequests.stagiaireId, stagiaireProfiles.userId))
    .where(and(eq(stageRequests.id, id), eq(restaurantProfiles.id, owned.id)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!request) notFound();

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.stageRequestId, request.id))
    .orderBy(asc(messages.sentAt));

  const thread: ThreadMessage[] = rows.map((m) => ({
    id: m.id,
    body: m.body,
    sentAt: m.sentAt,
    mine: m.senderUserId === user.id,
    senderName: m.senderUserId === user.id ? owned.name : request.stagiaireName,
  }));

  const messagingOpen = canMessage(request.status);
  const decisionOpen = canRestaurantDecide(request.status);
  const today = todayIso();
  const completionOpen = canMarkComplete(request.status, request.endDate, today);
  const acceptedAwaitingEndDate =
    request.status === "accepted" && request.endDate > today;

  const reviewableNow = request.status === "reviewable" || request.status === "closed";
  const reviewRows = reviewableNow
    ? await db
        .select({
          direction: reviews.direction,
          ratings: reviews.ratings,
          body: reviews.body,
          visibleAt: reviews.visibleAt,
        })
        .from(reviews)
        .where(eq(reviews.stageRequestId, request.id))
    : [];
  const myReview = reviewRows.find((r) => r.direction === "r_to_s") ?? null;
  const theirReview = reviewRows.find((r) => r.direction === "s_to_r") ?? null;
  const theirReviewVisible = theirReview && theirReview.visibleAt !== null;
  const boundReview = submitReviewAsRestaurant.bind(null, request.id);

  const boundSend = sendMessageAsRestaurant.bind(null, request.id);
  const idVerified = request.stagiaireIdVerifiedAt !== null;

  return (
    <>
      <Link
        href="/restaurant/requests"
        className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
      >
        ← Inbox
      </Link>

      <div className="mt-6 flex items-baseline justify-between gap-4">
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Request from
        </p>
        <StatusPill status={request.status} size="md" />
      </div>

      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">
        <Link
          href={`/u/${request.stagiaireSlug}`}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-sepia/30 decoration-1 underline-offset-[5px] transition-colors duration-[120ms] ease-paper hover:decoration-cordon-bleu hover:text-oak-gall"
        >
          {request.stagiaireName}
        </Link>
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        {request.stagiaireCity && <span>{request.stagiaireCity}</span>}
        {request.stagiaireCountry && (
          <>
            <span className="text-sepia-faint">·</span>
            <span>{request.stagiaireCountry}</span>
          </>
        )}
        {request.stagiaireLanguages && request.stagiaireLanguages.length > 0 && (
          <>
            <span className="text-sepia-faint">·</span>
            <span>{request.stagiaireLanguages.join(" · ")}</span>
          </>
        )}
        {idVerified && (
          <>
            <span className="text-sepia-faint">·</span>
            <span className="text-gold-leaf">ID verified</span>
          </>
        )}
      </div>

      {request.stagiaireBio && (
        <p className="mt-4 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
          {request.stagiaireBio}
        </p>
      )}

      <p className="mt-3">
        <Link
          href={`/u/${request.stagiaireSlug}`}
          target="_blank"
          rel="noreferrer"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px]"
        >
          See full profile, CV, portfolio ↗
        </Link>
      </p>

      <div className="mt-8 grid grid-cols-1 gap-px bg-sepia/20 sm:grid-cols-2">
        <DetailCell label="Dates requested">
          <p className="font-display text-xl italic text-oak-gall">
            {formatDateRange(request.startDate, request.endDate)}
          </p>
        </DetailCell>
        <DetailCell label="Submitted">
          <p className="font-serif text-base text-oak-gall-soft">
            {fmtDateTime(request.submittedAt)}
          </p>
        </DetailCell>
        {decisionOpen ? (
          <DetailCell label="Auto-declines">
            <p className="font-serif text-base text-oak-gall-soft">
              {formatExpiry(request.expiresAt)}
            </p>
          </DetailCell>
        ) : request.decidedAt ? (
          <DetailCell label="Decided">
            <p className="font-serif text-base text-oak-gall-soft">
              {fmtDateTime(request.decidedAt)}
            </p>
          </DetailCell>
        ) : null}
      </div>

      <section className="mt-12">
        <h2 className="mb-4 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Cover message
        </h2>
        <div className="border border-sepia/30 bg-vellum px-5 py-4">
          <p className="whitespace-pre-wrap font-serif text-base leading-relaxed text-oak-gall">
            {request.coverMessage}
          </p>
        </div>
      </section>

      {decisionOpen && (
        <section className="mt-12">
          <h2 className="mb-4 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Your decision
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <form action={acceptRequest}>
              <input type="hidden" name="id" value={request.id} />
              <button
                type="submit"
                className="inline-flex h-12 items-center rounded-lg bg-cordon-bleu px-6 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
              >
                Accept
              </button>
            </form>
            <form action={declineRequest}>
              <input type="hidden" name="id" value={request.id} />
              <button
                type="submit"
                className="inline-flex h-12 items-center rounded-lg border border-michelin-red/40 bg-vellum px-6 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-michelin-red transition-colors duration-[120ms] ease-paper hover:bg-michelin-red/5"
              >
                Decline
              </button>
            </form>
            <p className="font-serif text-sm italic text-sepia">
              You can keep messaging before deciding — many chefs do.
            </p>
          </div>
        </section>
      )}

      {completionOpen && (
        <section className="mt-12">
          <h2 className="mb-4 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Wrap up
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <form action={completeRequest}>
              <input type="hidden" name="id" value={request.id} />
              <button
                type="submit"
                className="inline-flex h-12 items-center rounded-lg bg-cordon-bleu px-6 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
              >
                Mark complete
              </button>
            </form>
            <p className="font-serif text-sm italic text-sepia">
              Opens reviews on both sides. They stay hidden until you both submit, or 14 days pass.
            </p>
          </div>
        </section>
      )}

      {acceptedAwaitingEndDate && (
        <section className="mt-12">
          <h2 className="mb-4 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Wrap up
          </h2>
          <p className="font-serif text-sm italic text-sepia">
            You can mark this complete after the stage&rsquo;s last day ({fmtDate(request.endDate)}).
          </p>
        </section>
      )}

      {reviewableNow && (
        <section className="mt-12">
          <h2 className="mb-4 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Your review of {request.stagiaireName}
          </h2>
          {myReview ? (
            <ReviewDisplay
              direction="r_to_s"
              ratings={myReview.ratings}
              body={myReview.body}
              authorLabel={
                myReview.visibleAt ? "Submitted · published" : "Submitted · waiting on the stagiaire"
              }
            />
          ) : (
            <ReviewForm
              direction="r_to_s"
              action={boundReview}
              counterpartName={request.stagiaireName}
            />
          )}
        </section>
      )}

      {reviewableNow && (
        <section className="mt-12">
          <h2 className="mb-4 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            What {request.stagiaireName} said about your kitchen
          </h2>
          {theirReviewVisible && theirReview ? (
            <ReviewDisplay
              direction="s_to_r"
              ratings={theirReview.ratings}
              body={theirReview.body}
              authorLabel={`From ${request.stagiaireName}`}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-sepia/40 bg-vellum px-5 py-6 font-serif text-sm italic text-sepia">
              {theirReview
                ? `${request.stagiaireName} has submitted their review. It unlocks once you submit yours.`
                : `Hidden until ${request.stagiaireName} submits theirs.`}
            </p>
          )}
        </section>
      )}

      <section className="mt-12">
        <h2 className="mb-4 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Messages
        </h2>
        <MessageThread messages={thread} />
        <div className="mt-6">
          <ComposeMessage
            action={boundSend}
            disabled={!messagingOpen}
            disabledReason={messagingDisabledReason(request.status)}
          />
        </div>
      </section>
    </>
  );
}

function DetailCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-vellum px-5 py-4">
      <p className="mb-2 font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">{label}</p>
      {children}
    </div>
  );
}

function fmtDateTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function messagingDisabledReason(status: string): string {
  if (status === "declined") return "You declined this request — messaging is closed.";
  if (status === "withdrawn") return "The stagiaire withdrew this request.";
  if (status === "expired") return "This request expired without a response.";
  if (status === "closed") return "This request has been closed.";
  return "Messaging is closed for this request.";
}
