import { redirect } from "next/navigation";

/*
 * /onboarding (no step) -> always send to the first step.
 * Resume-from-where-you-left-off can come later; for now, restart-safe.
 */
export default function OnboardingIndex() {
  redirect("/onboarding/name");
}
