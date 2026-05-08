import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { messages, restaurantProfiles, reviews, stageRequests } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import {
  canMessage,
  canStagiaireWithdraw,
  formatDateRange,
  formatExpiry,
} from "@/lib/requests";

import { ComposeMessage } from "@/components/features/requests/compose-message";
import { MessageThread, type ThreadMessage } from "@/components/features/requests/message-thread";
import { ReviewDisplay } from "@/components/features/requests/review-display";
import { ReviewForm } from "@/components/features/requests/review-form";
import { StatusPill } from "@/components/features/requests/status-pill";

import { sendMessageAsStagiaire, submitReviewAsStagiaire, withdrawRequest } from "./actions";

export const metadata: Metadata = {
  title: "Request",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StagiaireRequestDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireRole("stagiaire");

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
      restaurantId: restaurantProfiles.id,
      restaurantName: restaurantProfiles.name,
      restaurantSlug: restaurantProfiles.slug,
      restaurantCity: restaurantProfiles.city,
      restaurantStars: restaurantProfiles.stars,
      restaurantOwnerId: restaurantProfiles.claimedByUserId,
    })
    .from(stageRequests)
    .innerJoin(restaurantProfiles, eq(stageRequests.restaurantId, restaurantProfiles.id))
    .where(and(eq(stageRequests.id, id), eq(stageRequests.stagiaireId, user.id)))
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
    senderName: m.senderUserId === user.id ? "You" : request.restaurantName,
  }));

  const messagingOpen = canMessage(request.status);
  const canWithdraw = canStagiaireWithdraw(request.status);

  const boundSend = sendMessageAsStagiaire.bind(null, request.id);
  const boundReview = submitReviewAsStagiaire.bind(null, request.id);

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
  const myReview = reviewRows.find((r) => r.direction === "s_to_r") ?? null;
  const theirReview = reviewRows.find((r) => r.direction === "r_to_s") ?? null;
  const theirReviewVisible = theirReview && theirReview.visibleAt !== null;

  return (
    <div className="mx-auto max-w-3xl px-8 py-16">
      <Link
        href="/app/requests"
        className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
      >
        ← All requests
      </Link>

      <div className="mt-6 flex items-baseline justify-between gap-4">
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Request to
        </p>
        <StatusPill status={request.status} size="md" />
      </div>

      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight text-oak-gall">
        <Link
          href={`/r/${request.restaurantSlug}`}
          className="underline decoration-sepia/30 decoration-1 underline-offset-[5px] transition-colors duration-[120ms] ease-paper hover:decoration-cordon-bleu hover:text-oak-gall"
        >
          {request.restaurantName}
        </Link>
      </h1>
      <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        {request.restaurantStars}★ · {request.restaurantCity ?? "—"}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-px bg-sepia/20 sm:grid-cols-2">
        <DetailCell label="Dates">
          <p className="font-display text-xl italic text-oak-gall">
            {formatDateRange(request.startDate, request.endDate)}
          </p>
        </DetailCell>
        <DetailCell label="Submitted">
          <p className="font-serif text-base text-oak-gall-soft">
            {fmtDateTime(request.submittedAt)}
          </p>
        </DetailCell>
        {request.status === "submitted" || request.status === "pending" ? (
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
        {!request.restaurantOwnerId && (
          <DetailCell label="Visibility">
            <p className="font-serif text-sm italic text-sepia">
              This restaurant hasn&rsquo;t claimed its profile yet — no one is reading the inbox.
            </p>
          </DetailCell>
        )}
      </div>

      <section className="mt-12">
        <h2 className="mb-4 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Your cover message
        </h2>
        <div className="border border-sepia/30 bg-vellum px-5 py-4">
          <p className="whitespace-pre-wrap font-serif text-base leading-relaxed text-oak-gall">
            {request.coverMessage}
          </p>
        </div>
      </section>

      {reviewableNow && (
        <section className="mt-12">
          <h2 className="mb-4 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Your review of {request.restaurantName}
          </h2>
          {myReview ? (
            <ReviewDisplay
              direction="s_to_r"
              ratings={myReview.ratings}
              body={myReview.body}
              authorLabel={
                myReview.visibleAt ? "Submitted · published" : "Submitted · waiting on the chef"
              }
            />
          ) : (
            <ReviewForm
              direction="s_to_r"
              action={boundReview}
              counterpartName={request.restaurantName}
            />
          )}
        </section>
      )}

      {reviewableNow && (
        <section className="mt-12">
          <h2 className="mb-4 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            What the chef said about you
          </h2>
          {theirReviewVisible && theirReview ? (
            <ReviewDisplay
              direction="r_to_s"
              ratings={theirReview.ratings}
              body={theirReview.body}
              authorLabel={`From ${request.restaurantName}`}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-sepia/40 bg-vellum px-5 py-6 font-serif text-sm italic text-sepia">
              {theirReview
                ? `${request.restaurantName} has submitted their review. It unlocks once you submit yours.`
                : `Hidden until ${request.restaurantName} submits theirs.`}
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

      {canWithdraw && (
        <section className="mt-16 border-t border-sepia/30 pt-8">
          <h2 className="mb-3 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Change of plans?
          </h2>
          <p className="max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
            You can withdraw this request at any time before the restaurant decides. They&rsquo;ll
            see it&rsquo;s been pulled.
          </p>
          <form action={withdrawRequest} className="mt-4">
            <input type="hidden" name="id" value={request.id} />
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-lg border border-michelin-red/40 bg-vellum px-5 font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-michelin-red transition-colors duration-[120ms] ease-paper hover:bg-michelin-red/5"
            >
              Withdraw request
            </button>
          </form>
        </section>
      )}
    </div>
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

function messagingDisabledReason(status: string): string {
  if (status === "declined") return "The restaurant declined this request — messaging is closed.";
  if (status === "withdrawn") return "You withdrew this request — messaging is closed.";
  if (status === "expired") return "This request expired without a response.";
  if (status === "closed") return "This request has been closed.";
  return "Messaging is closed for this request.";
}
