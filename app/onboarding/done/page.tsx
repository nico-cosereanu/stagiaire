import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { getProfile } from "../_lib/profile";

export default async function OnboardingDonePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <div>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        You&rsquo;re in
      </p>
      <h1 className="mt-3 font-display text-6xl italic leading-[1.0] tracking-tight">
        Welcome, {profile?.name?.split(" ")[0] ?? "stagiaire"}.
      </h1>
      <p className="mt-6 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        Your profile is live. Chefs can see it the moment you submit a stage request. You can
        edit any of this later from your dashboard.
      </p>

      <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <Link
          href="/app"
          className="inline-flex h-12 items-center justify-center bg-cordon-bleu px-8 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
        >
          Go to dashboard →
        </Link>
        {profile?.slug && (
          <Link
            href={`/u/${profile.slug}`}
            className="font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[6px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
          >
            See your profile
          </Link>
        )}
      </div>
    </div>
  );
}
