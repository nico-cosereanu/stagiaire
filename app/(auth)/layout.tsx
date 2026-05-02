import Link from "next/link";

/*
 * Shared chrome for /login, /signup, /forgot-password etc.
 * Centered narrow column on the vellum background, with a small
 * wordmark linking back to home.
 */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
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
          <Link
            href="/"
            className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-8 pt-24">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
