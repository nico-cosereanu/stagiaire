"use client";

import { useState, useTransition } from "react";

import { startVerification } from "../actions";

export function StartVerificationForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={() => {
        setError(null);
        startTransition(async () => {
          try {
            await startVerification();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not start verification");
          }
        });
      }}
      className="space-y-6"
    >
      {error && (
        <p
          role="alert"
          className="border border-michelin-red/40 bg-michelin-red/5 px-4 py-2.5 font-serif text-sm text-michelin-red"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 items-center justify-center rounded-lg bg-cordon-bleu px-8 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu disabled:cursor-not-allowed disabled:bg-sepia-faint"
      >
        {isPending ? "Opening Stripe…" : "Start verification →"}
      </button>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia-faint">
        Hosted by Stripe Identity. Takes about a minute.
      </p>
    </form>
  );
}
