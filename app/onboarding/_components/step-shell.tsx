import Link from "next/link";

import { prevStepHref, type OnboardingStepSlug } from "../_lib/steps";

/*
 * Shared visual chrome for each step's content area: eyebrow, title,
 * optional subtitle, slot for the form, optional footer back-link.
 */

export function StepShell({
  slug,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  slug: OnboardingStepSlug;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const back = prevStepHref(slug);

  return (
    <div>
      {eyebrow && (
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">{eyebrow}</p>
      )}
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">{title}</h1>
      {subtitle && (
        <p className="mt-6 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
          {subtitle}
        </p>
      )}

      <div className="mt-12">{children}</div>

      {back && (
        <p className="mt-12">
          <Link
            href={back}
            className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
          >
            ← Back
          </Link>
        </p>
      )}
    </div>
  );
}
