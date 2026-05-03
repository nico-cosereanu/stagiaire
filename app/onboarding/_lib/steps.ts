/*
 * Onboarding wizard step manifest. Single source of truth for both the
 * progress indicator (in the layout) and the next/previous links inside
 * each step. Edit here, not in individual pages.
 */

export const ONBOARDING_STEPS = [
  { slug: "name", label: "Your name" },
  { slug: "location", label: "Where you cook" },
  { slug: "languages", label: "Languages" },
  { slug: "bio", label: "Why you stage" },
  { slug: "availability", label: "When you're free" },
] as const;

export type OnboardingStepSlug = (typeof ONBOARDING_STEPS)[number]["slug"];

export function nextStepHref(slug: OnboardingStepSlug): string {
  const i = ONBOARDING_STEPS.findIndex((s) => s.slug === slug);
  if (i === ONBOARDING_STEPS.length - 1) return "/onboarding/done";
  return `/onboarding/${ONBOARDING_STEPS[i + 1]!.slug}`;
}

export function prevStepHref(slug: OnboardingStepSlug): string | null {
  const i = ONBOARDING_STEPS.findIndex((s) => s.slug === slug);
  if (i <= 0) return null;
  return `/onboarding/${ONBOARDING_STEPS[i - 1]!.slug}`;
}

export function stepIndex(slug: OnboardingStepSlug): number {
  return ONBOARDING_STEPS.findIndex((s) => s.slug === slug);
}
