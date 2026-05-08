import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign up",
};

/*
 * Role selector. Two tiles, one per role. Picks the path; account
 * creation happens on the next page.
 */

export default function SignupPage() {
  return (
    <div>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Get on the list
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">
        Who are you?
      </h1>
      <p className="mt-6 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        Two kinds of accounts. Pick the one that fits — you can&rsquo;t change your mind later.
      </p>

      <div className="mt-12 grid grid-cols-1 gap-px bg-sepia/20">
        <RoleTile
          href="/signup/stagiaire"
          eyebrow="For aspiring chefs"
          title="A stagiaire"
          body="You stage at a restaurant. You browse the map, request stages, write reviews from the kitchen side."
          cta="Continue as stagiaire"
        />
        <RoleTile
          href="/signup/restaurant"
          eyebrow="For chefs and chefs de cuisine"
          title="A restaurant"
          body="You manage incoming stage requests for your restaurant. Claim your profile, set open windows, accept or decline."
          cta="Continue as restaurant"
        />
      </div>

      <p className="mt-12 font-serif text-sm text-oak-gall-soft">
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

function RoleTile({
  href,
  eyebrow,
  title,
  body,
  cta,
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl bg-white p-8 transition-colors duration-[120ms] ease-paper hover:bg-vellum"
    >
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl italic text-oak-gall">{title}</h2>
      <p className="mt-3 font-serif text-base leading-relaxed text-oak-gall-soft">{body}</p>
      <p className="mt-6 font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu transition-opacity duration-[120ms] ease-paper group-hover:opacity-80">
        {cta} →
      </p>
    </Link>
  );
}
