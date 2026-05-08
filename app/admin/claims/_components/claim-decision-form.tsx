"use client";

import { useActionState } from "react";

import {
  approveClaimAction,
  rejectClaimAction,
  type DecisionResult,
} from "../actions";

/*
 * Two paired forms — approve (primary) and reject — sharing the same
 * claim id. Separate forms instead of one form with branching so each
 * action's pending state is independent.
 */
export function ClaimDecisionForm({ claimId }: { claimId: string }) {
  const [approveState, approveAction, approving] = useActionState<
    DecisionResult | null,
    FormData
  >(approveClaimAction, null);
  const [rejectState, rejectAction, rejecting] = useActionState<
    DecisionResult | null,
    FormData
  >(rejectClaimAction, null);

  const error =
    (approveState && !approveState.ok && approveState.error) ||
    (rejectState && !rejectState.ok && rejectState.error);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <form action={approveAction}>
          <input type="hidden" name="claimId" value={claimId} />
          <button
            type="submit"
            disabled={approving || rejecting}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-cordon-bleu px-5 font-sans text-[12px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {approving ? "Approving…" : "Approve & link"}
          </button>
        </form>

        <form action={rejectAction}>
          <input type="hidden" name="claimId" value={claimId} />
          <button
            type="submit"
            disabled={approving || rejecting}
            className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia decoration-1 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-michelin-red disabled:cursor-not-allowed disabled:opacity-50"
          >
            {rejecting ? "Rejecting…" : "Reject"}
          </button>
        </form>
      </div>

      {error && (
        <p
          role="alert"
          className="border border-michelin-red/40 bg-michelin-red/5 px-3 py-2 font-serif text-sm text-michelin-red"
        >
          {error}
        </p>
      )}
    </div>
  );
}
