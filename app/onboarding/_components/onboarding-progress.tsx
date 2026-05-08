"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { ONBOARDING_STEPS } from "../_lib/steps";

/*
 * Progress strip — one dot per step, with the active step's label
 * spelled out alongside ("Step 2 of 5 · Where you cook"). Reads the
 * pathname client-side so the layout doesn't have to thread the step
 * through props.
 *
 * Suppressed in edit mode (?edit=1): the user is editing one field
 * from /app, not walking the wizard, so a step counter is misleading.
 */

export function OnboardingProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const slug = pathname.split("/")[2] ?? "";
  const currentIdx = ONBOARDING_STEPS.findIndex((s) => s.slug === slug);

  // Don't render on /onboarding/done, on edit visits, or off-route
  if (slug === "done" || currentIdx === -1) return null;
  if (searchParams.get("edit") === "1") return null;

  const total = ONBOARDING_STEPS.length;

  return (
    <div className="border-b border-sepia/30">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-4">
        <div className="flex items-center gap-2">
          {ONBOARDING_STEPS.map((step, i) => (
            <span
              key={step.slug}
              aria-hidden
              className={
                i === currentIdx
                  ? "h-1.5 w-8 bg-oak-gall transition-all duration-[120ms] ease-paper"
                  : i < currentIdx
                    ? "h-1.5 w-2 bg-oak-gall"
                    : "h-1.5 w-2 bg-sepia/30"
              }
            />
          ))}
        </div>
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Step {currentIdx + 1} of {total}
          <span className="mx-2 text-sepia-faint">·</span>
          {ONBOARDING_STEPS[currentIdx]?.label}
        </p>
      </div>
    </div>
  );
}
