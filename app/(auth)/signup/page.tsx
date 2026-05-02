import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "./_components/signup-form";

export const metadata: Metadata = {
  title: "Sign up · Stagiaire",
};

export default function SignupPage() {
  return (
    <div>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Get on the list
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">
        Sign up
      </h1>
      <p className="mt-6 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        Create a stagiaire account to request stages at any of the {""}
        <Link
          href="/map"
          className="text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px]"
        >
          658 starred kitchens
        </Link>
        . Verify your email, then your ID, then start.
      </p>

      <div className="mt-10">
        <SignupForm />
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
    </div>
  );
}
