"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

/*
 * Root error boundary. Caught by Next when a Server Component or Server
 * Action throws past every nested boundary. Stays brand-coherent — same
 * vellum + oak-gall as the rest of the site, no naked stack trace.
 *
 * The reset() function re-renders the segment that errored, which works
 * for transient failures (DB hiccup, etc.). Hard failures will trip
 * again immediately — that's expected.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error.tsx]", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-vellum px-8 py-16 text-oak-gall">
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Something cracked
      </p>
      <h1 className="mt-4 max-w-xl text-center font-display text-6xl italic leading-[1.05] tracking-tight">
        Service is paused.
      </h1>
      <p className="mt-6 max-w-md text-center font-serif text-base italic text-sepia">
        An error reached the kitchen pass. We&rsquo;ve logged it. Try once
        more, or head back to the directory.
      </p>
      {error.digest && (
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-sepia/70">
          Reference · {error.digest}
        </p>
      )}
      <div className="mt-10 flex items-center gap-5">
        <button
          type="button"
          onClick={reset}
          className="bg-oak-gall px-6 py-2.5 font-sans text-[11px] uppercase tracking-[0.18em] text-vellum transition-opacity duration-[120ms] ease-paper hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
        >
          Back to the directory
        </Link>
      </div>
    </main>
  );
}
