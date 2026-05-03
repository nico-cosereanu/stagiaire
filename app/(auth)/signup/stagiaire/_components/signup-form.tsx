"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signupAction, type SignupResult } from "../actions";

export function SignupForm() {
  const [state, formAction, isPending] = useActionState<SignupResult | null, FormData>(
    signupAction,
    null,
  );

  if (state?.ok) {
    return (
      <div className="border border-verdigris/50 bg-verdigris/5 p-6">
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-verdigris">
          Account created
        </p>
        <h2 className="mt-3 font-display text-2xl italic text-oak-gall">
          {state.needsEmailConfirmation ? "Check your inbox" : "You're in"}
        </h2>
        <p className="mt-4 font-serif text-sm leading-relaxed text-oak-gall-soft">
          {state.needsEmailConfirmation ? (
            <>
              We sent a confirmation link to <strong>{state.email}</strong>. Click it to verify
              your email, then{" "}
              <Link
                href="/login"
                className="text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px]"
              >
                log in
              </Link>
              .
            </>
          ) : (
            <>
              Email confirmation is off in this environment. You can{" "}
              <Link
                href="/login"
                className="text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px]"
              >
                log in
              </Link>{" "}
              now.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        invalid={state?.ok === false && state.field === "email"}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        invalid={state?.ok === false && state.field === "password"}
        hint="At least 8 characters."
      />
      <Field
        label="Confirm password"
        name="passwordConfirm"
        type="password"
        autoComplete="new-password"
        required
        invalid={state?.ok === false && state.field === "passwordConfirm"}
      />

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
        className="w-full bg-cordon-bleu px-6 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu disabled:cursor-not-allowed disabled:bg-sepia-faint"
      >
        {isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  required,
  invalid,
  hint,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
  invalid?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        {label}
      </span>
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        required={required}
        className={`w-full border bg-ermine px-4 py-3 font-serif text-base text-oak-gall placeholder:text-sepia-faint focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu ${
          invalid ? "border-michelin-red/60" : "border-sepia/40"
        }`}
      />
      {hint && (
        <span className="mt-2 block font-serif text-xs text-sepia">{hint}</span>
      )}
    </label>
  );
}
