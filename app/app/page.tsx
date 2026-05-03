import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { getProfile } from "@/app/onboarding/_lib/profile";

export const metadata: Metadata = {
  title: "Dashboard · Stagiaire",
};

/*
 * /app — stagiaire dashboard overview.
 *
 * v0 stub. Real surfaces (upcoming stages, pending requests, unread
 * messages) land when the lifecycle features ship. For now: a welcome
 * message confirming auth + middleware are working end-to-end.
 */

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = user.role === "stagiaire" ? await getProfile(user.id) : null;
  const verificationPending = profile?.identityVerificationStatus === "pending";

  return (
    <div className="mx-auto max-w-3xl px-8 py-20">
      {verificationPending && (
        <div className="mb-10 border border-sepia/30 bg-ermine px-5 py-4 font-serif text-sm text-oak-gall">
          <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            ID verification in review
          </span>
          <p className="mt-1">
            Stripe is still checking your documents. You can browse and request stages, but
            chefs will see a &ldquo;pending&rdquo; badge on your profile until it clears.
          </p>
        </div>
      )}
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        {user.role === "stagiaire" ? "Stagiaire dashboard" : `Dashboard · ${user.role}`}
      </p>
      <h1 className="mt-3 font-display text-6xl italic leading-[1.05] tracking-tight">
        Welcome back.
      </h1>
      <p className="mt-6 max-w-prose font-serif text-lg leading-relaxed text-oak-gall-soft">
        You&rsquo;re signed in as <strong>{user.email}</strong>. The real dashboard surfaces
        (upcoming stages, pending requests, unread messages) land in a later checkpoint &mdash;
        for now, this page exists to confirm auth and middleware work end-to-end.
      </p>

      <hr className="my-12 border-0 border-t border-sepia/30" />

      <div className="space-y-4">
        <h2 className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          What you can do right now
        </h2>
        <ul className="space-y-3 font-serif text-base leading-relaxed text-oak-gall-soft">
          <li>
            Open{" "}
            <Link
              href="/map"
              className="text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px]"
            >
              the map
            </Link>{" "}
            and pick a restaurant.
          </li>
          <li>
            Read a profile, e.g.{" "}
            <Link
              href="/r/le-clos-des-sens-annecy"
              className="text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px]"
            >
              Le Clos des Sens
            </Link>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}
