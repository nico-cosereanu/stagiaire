import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";
import { PostHogIdentify } from "@/components/analytics/posthog-identify";

/*
 * Chrome for the restaurant-owner dashboard. Mirrors the onboarding
 * layout: wordmark on the left, log out on the right, vellum ground.
 *
 * requireRole gates every route under /restaurant — non-owners get
 * bounced to / by the helper.
 */

export default async function RestaurantLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("restaurant_owner");

  return (
    <div className="flex min-h-screen flex-col bg-vellum text-oak-gall">
      <header className="border-b border-sepia/30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-5">
          <Link
            href="/restaurant"
            className="font-display text-2xl italic tracking-tight text-oak-gall transition-opacity duration-[120ms] ease-paper hover:opacity-80"
          >
            Stagiaire
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-8 py-20">{children}</main>
      <PostHogIdentify userId={user.id} email={user.email} role={user.role} />
    </div>
  );
}
