import Link from "next/link";

import { requireUser } from "@/lib/auth";

import { HeaderAction } from "./_components/header-action";
import { OnboardingProgress } from "./_components/onboarding-progress";

/*
 * Onboarding wizard chrome. Same shape across every step:
 *   - Top: wordmark (left) + Save & exit (right)
 *   - Below top: progress strip with current step name
 *   - Children: the step form
 */

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="flex min-h-screen flex-col bg-vellum text-oak-gall">
      <header className="border-b border-sepia/30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-5">
          <Link
            href="/"
            className="font-display text-2xl italic tracking-tight text-oak-gall transition-opacity duration-[120ms] ease-paper hover:opacity-80"
          >
            Stagiaire
          </Link>
          <HeaderAction />
        </div>
      </header>

      <OnboardingProgress />

      <main className="flex flex-1 items-start justify-center px-8 pb-24 pt-16">
        <div className="w-full max-w-xl">{children}</div>
      </main>
    </div>
  );
}
