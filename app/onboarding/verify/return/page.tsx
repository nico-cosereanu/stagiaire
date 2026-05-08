import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { stagiaireProfiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

import { StepShell } from "../../_components/step-shell";

/*
 * Stripe redirects the user here after the hosted flow.
 * The webhook is the source of truth for status, but we also reconcile
 * synchronously here so the user sees the right thing immediately
 * (webhook may not have fired yet, especially in dev).
 *
 * We look the session id up from the profile rather than the URL — Stripe
 * Identity (unlike Checkout) doesn't substitute {VERIFICATION_SESSION_ID}
 * placeholders in return_url, and we already persisted the id at creation.
 *
 * Stripe session.status values:
 *   - requires_input -> user canceled or document was rejected -> failed
 *   - processing     -> manual review or just submitted -> pending
 *   - verified       -> done -> verified
 *   - canceled       -> failed
 */

function mapStripeStatus(s: string): "verified" | "pending" | "failed" {
  if (s === "verified") return "verified";
  if (s === "processing") return "pending";
  return "failed";
}

export default async function OnboardingVerifyReturnPage() {
  const user = await requireUser();

  const profile = await db.query.stagiaireProfiles.findFirst({
    where: eq(stagiaireProfiles.userId, user.id),
    columns: { stripeVerificationSessionId: true },
  });

  if (!profile?.stripeVerificationSessionId) {
    redirect("/onboarding/verify");
  }

  const session = await stripe.identity.verificationSessions.retrieve(
    profile.stripeVerificationSessionId,
  );

  // Defense in depth: confirm Stripe didn't return someone else's session.
  if (session.metadata?.user_id !== user.id) {
    redirect("/onboarding/verify");
  }

  const newStatus = mapStripeStatus(session.status);

  // Reconcile in case the webhook hasn't fired yet. Mirror the webhook's
  // behaviour: stamp idVerifiedAt the same moment we flip to verified, so
  // surfaces that key off `idVerifiedAt !== null` (the verified badge,
  // public profile dot) update without waiting on the webhook.
  await db
    .update(stagiaireProfiles)
    .set({
      identityVerificationStatus: newStatus,
      ...(newStatus === "verified" ? { idVerifiedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(stagiaireProfiles.userId, user.id));

  if (newStatus === "verified") {
    redirect("/onboarding/done");
  }

  if (newStatus === "pending") {
    return (
      <StepShell
        slug="verify"
        eyebrow="Documents received"
        title="We&rsquo;re reviewing your ID"
        subtitle="Stripe is double-checking your documents. This usually clears in a couple of minutes — you&rsquo;ll get an email when it&rsquo;s done. You can keep going in the meantime."
      >
        <Link
          href="/onboarding/done"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-cordon-bleu px-8 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
        >
          Continue →
        </Link>
      </StepShell>
    );
  }

  return (
    <StepShell
      slug="verify"
      eyebrow="Try again"
      title="Verification didn&rsquo;t go through"
      subtitle="Most issues are a blurry photo, glare on the document, or the wrong document type. Give it another go."
    >
      <Link
        href="/onboarding/verify"
        className="inline-flex h-12 items-center justify-center rounded-lg bg-cordon-bleu px-8 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
      >
        Try again →
      </Link>
    </StepShell>
  );
}
