import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/lib/auth-actions";
import { requireUser } from "@/lib/auth";
import { getProfile, isProfileComplete } from "@/app/onboarding/_lib/profile";

/*
 * Stagiaire dashboard shell. Two gates:
 *   1. requireUser() — must be signed in
 *   2. profile must be complete enough (name + slug) — otherwise punt
 *      to onboarding. Restaurant_owner / admin roles skip this gate
 *      since they don't fill stagiaire_profiles.
 */

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  if (user.role === "stagiaire") {
    const profile = await getProfile(user.id);
    if (!isProfileComplete(profile)) {
      redirect("/onboarding/name");
    }
  }

  return (
    <div className="min-h-screen bg-vellum text-oak-gall">
      <header className="border-b border-sepia/30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-5">
          <div className="flex items-baseline gap-6">
            <Link
              href="/"
              className="font-display text-2xl italic tracking-tight text-oak-gall transition-opacity duration-[120ms] ease-paper hover:opacity-80"
            >
              Stagiaire
            </Link>
            <Link
              href="/app"
              className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
            >
              Dashboard
            </Link>
            <Link
              href="/map"
              className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
            >
              Map
            </Link>
          </div>

          <div className="flex items-center gap-5">
            <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
              {user.email}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
