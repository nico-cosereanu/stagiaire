"use client";

import { useActionState } from "react";

import { submitClaimAction, type SubmitClaimResult } from "../actions";

export function EvidenceForm({ restaurantId }: { restaurantId: string }) {
  const [state, formAction, isPending] = useActionState<SubmitClaimResult | null, FormData>(
    submitClaimAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="restaurantId" value={restaurantId} />

      <label className="block">
        <span className="mb-2 block font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Who you are and how you&rsquo;re tied to the kitchen
        </span>
        <textarea
          name="evidenceText"
          required
          rows={6}
          placeholder="e.g. I'm Alain Passard, executive chef at L'Arpège since 1986. You can verify via the press contact on our site or by emailing reservation@alain-passard.com."
          className={`w-full resize-none border bg-ermine px-4 py-3 font-serif text-base leading-relaxed text-oak-gall placeholder:text-sepia-faint focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu ${
            state?.ok === false && state.field === "evidenceText"
              ? "border-michelin-red/60"
              : "border-sepia/40"
          }`}
        />
        <span className="mt-2 block font-serif text-xs text-sepia">
          Two or three sentences is plenty. The more concrete, the faster we approve.
        </span>
      </label>

      <label className="block">
        <span className="mb-2 block font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Verification link <span className="normal-case tracking-normal text-sepia-faint">(optional)</span>
        </span>
        <input
          type="url"
          name="evidenceUrl"
          placeholder="https://restaurant.com/team or a press feature with your name"
          className={`w-full border bg-ermine px-4 py-3 font-serif text-base text-oak-gall placeholder:text-sepia-faint focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu ${
            state?.ok === false && state.field === "evidenceUrl"
              ? "border-michelin-red/60"
              : "border-sepia/40"
          }`}
        />
      </label>

      {state?.ok === false && (
        <p
          role="alert"
          className="border border-michelin-red/40 bg-michelin-red/5 px-4 py-2.5 font-serif text-sm text-michelin-red"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 items-center justify-center rounded-lg bg-cordon-bleu px-8 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu disabled:cursor-not-allowed disabled:bg-sepia-faint"
      >
        {isPending ? "Submitting…" : "Submit claim →"}
      </button>
    </form>
  );
}
