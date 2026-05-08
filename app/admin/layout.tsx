import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";

/*
 * Chrome for the admin surface. Mirrors the restaurant layout but with a
 * red "Admin" wordmark badge so it's never confused for the owner UI.
 *
 * requireRole("admin") gates every nested route. Admins are promoted
 * manually (signup refuses the role) — see docs/architecture for the
 * SQL one-liner.
 */

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");

  return (
    <div className="flex min-h-screen flex-col bg-vellum text-oak-gall">
      <header className="border-b border-sepia/30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-5">
          <div className="flex items-baseline gap-4">
            <Link
              href="/admin"
              className="font-display text-2xl italic tracking-tight text-oak-gall transition-opacity duration-[120ms] ease-paper hover:opacity-80"
            >
              Stagiaire
            </Link>
            <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-michelin-red">
              Admin
            </span>
          </div>
          <nav className="flex items-center gap-5">
            <Link
              href="/admin/claims"
              className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
            >
              Claims
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
              >
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-16">{children}</main>
    </div>
  );
}
