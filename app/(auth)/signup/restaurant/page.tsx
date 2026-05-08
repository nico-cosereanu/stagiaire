import type { Metadata } from "next";
import Link from "next/link";

import { RestaurantSignupForm } from "./_components/signup-form";

export const metadata: Metadata = {
  title: "Restaurant signup",
};

export default function RestaurantSignupPage() {
  return (
    <div>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        For chefs and chefs de cuisine
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">
        Claim your restaurant
      </h1>
      <p className="mt-6 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        Create a restaurant account, then claim your profile from the directory. We&rsquo;ll
        verify the claim before opening the inbox to stage requests.
      </p>

      <div className="mt-10">
        <RestaurantSignupForm />
      </div>

      <p className="mt-10 font-serif text-sm text-oak-gall-soft">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
        >
          Log in
        </Link>
        .
      </p>

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
