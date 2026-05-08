import Link from "next/link";

/*
 * Catches any unmatched route and any explicit notFound() call from
 * server components. Static — pre-rendered at build.
 */

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-vellum px-8 py-16 text-oak-gall">
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        404 · off the menu
      </p>
      <h1 className="mt-4 max-w-xl text-center font-display text-6xl italic leading-[1.05] tracking-tight">
        Not on tonight&rsquo;s service.
      </h1>
      <p className="mt-6 max-w-md text-center font-serif text-base italic text-sepia">
        That page either moved or never existed. The directory and the
        front door are both still here.
      </p>
      <div className="mt-10 flex items-center gap-5">
        <Link
          href="/discover"
          className="bg-oak-gall px-6 py-2.5 font-sans text-[11px] uppercase tracking-[0.18em] text-vellum transition-opacity duration-[120ms] ease-paper hover:opacity-90"
        >
          Open the directory
        </Link>
        <Link
          href="/"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
        >
          Front door
        </Link>
      </div>
    </main>
  );
}
