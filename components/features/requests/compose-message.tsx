"use client";

import { useActionState, useEffect, useRef } from "react";

export type ComposeResult = { ok: true } | { ok: false; error: string };

/*
 * Compose box for the stage-request thread. Server action returns
 * Result so we can surface a validation error inline. On success the
 * parent revalidates the page and the textarea clears (we key on the
 * `cleared` state — sentinel reset of the form via ref).
 *
 * Disabled when the parent passes `disabled` (e.g. status closed off
 * messaging — see canMessage in lib/requests).
 */

export function ComposeMessage({
  action,
  disabled,
  disabledReason,
}: {
  action: (state: ComposeResult | null, formData: FormData) => Promise<ComposeResult>;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [state, formAction, isPending] = useActionState<ComposeResult | null, FormData>(
    action,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  if (disabled) {
    return (
      <div className="border border-sepia/30 bg-ermine px-5 py-4">
        <p className="font-serif text-sm italic text-sepia">
          {disabledReason ?? "Messaging is closed for this request."}
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Write a message…"
        className="w-full resize-none border border-sepia/40 bg-ermine px-4 py-3 font-serif text-base leading-relaxed text-oak-gall placeholder:text-sepia-faint focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu"
      />
      {state?.ok === false && (
        <p
          role="alert"
          className="border border-michelin-red/40 bg-michelin-red/5 px-4 py-2 font-serif text-sm text-michelin-red"
        >
          {state.error}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center bg-cordon-bleu px-5 font-sans text-[11px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark disabled:cursor-not-allowed disabled:bg-sepia-faint"
        >
          {isPending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
