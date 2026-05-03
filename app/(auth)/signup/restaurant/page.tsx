import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Restaurant signup · Stagiaire",
};

/*
 * Restaurant signup placeholder. The real claim flow (search restaurants
 * → submit evidence → admin review → role promotion) is a meaningful
 * piece of work that ships in a later checkpoint. For v0, an editorial
 * "by invitation" page so the link doesn't 404.
 */

export default function RestaurantSignupPage() {
  return (
    <div>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        For restaurants
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">
        By invitation, for now.
      </h1>
      <p className="mt-6 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        We&rsquo;re onboarding restaurants one at a time during the closed alpha. If you want to
        claim your restaurant&rsquo;s profile and start receiving requests, write to us with a
        line about who you are and which restaurant.
      </p>

      <div className="mt-10 border border-sepia/30 px-6 py-5">
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Email us
        </p>
        <p className="mt-2 font-mono text-base text-cordon-bleu">claims@stagiaire.app</p>
      </div>

      <hr className="my-12 border-0 border-t border-sepia/30" />

      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Or, if you&rsquo;re a stagiaire instead
      </p>
      <p className="mt-3">
        <Link
          href="/signup/stagiaire"
          className="font-display text-2xl italic text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[6px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
        >
          Sign up as a stagiaire →
        </Link>
      </p>
    </div>
  );
}
