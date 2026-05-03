import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";

import { StepShell } from "../_components/step-shell";
import { getProfile } from "../_lib/profile";
import { nextStepHref } from "../_lib/steps";
import { StartVerificationForm } from "./_components/start-verification-form";

/*
 * ID verification step. Three states from the profile column:
 *   - not_started: show the "start verification" CTA
 *   - pending:     they came back without finishing OR webhook hasn't
 *                  fired yet — show "we're reviewing" + a "retry" link
 *   - verified:    auto-advance to /onboarding/done
 *   - failed:      show retry CTA with error tone
 */

export default async function OnboardingVerifyPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const status = profile?.identityVerificationStatus ?? "not_started";

  if (status === "verified") {
    redirect(nextStepHref("verify"));
  }

  return (
    <StepShell
      slug="verify"
      eyebrow="One quick check"
      title="Verify your identity"
      subtitle="Chefs are letting strangers into their kitchens. A quick ID check keeps the platform trusted on both sides — no chef will see your documents, only that you've passed."
    >
      {status === "pending" ? (
        <div className="space-y-6">
          <p className="border border-sepia/30 bg-ermine px-5 py-4 font-serif text-sm text-oak-gall">
            <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
              In review
            </span>
            <br />
            We&rsquo;ve received your documents. This usually clears in a couple of minutes —
            you&rsquo;ll get an email when it&rsquo;s done. You can keep going in the meantime.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Link
              href="/onboarding/done"
              className="inline-flex h-12 items-center justify-center bg-cordon-bleu px-8 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
            >
              Continue →
            </Link>
            <StartVerificationForm />
          </div>
        </div>
      ) : (
        <>
          {status === "failed" && (
            <p className="mb-6 border border-michelin-red/40 bg-michelin-red/5 px-5 py-4 font-serif text-sm text-michelin-red">
              Verification didn&rsquo;t go through last time. Try again — most issues are a blurry
              photo or a glare on the document.
            </p>
          )}
          <StartVerificationForm />
        </>
      )}
    </StepShell>
  );
}
