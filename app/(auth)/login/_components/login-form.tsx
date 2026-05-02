"use client";

import { useActionState } from "react";

import { loginAction, type LoginResult } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState<LoginResult | null, FormData>(
    loginAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-6">
      {next && <input type="hidden" name="next" value={next} />}
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
        autoComplete="current-password"
        required
        invalid={state?.ok === false && state.field === "password"}
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
        {isPending ? "Signing in…" : "Log in"}
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
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
  invalid?: boolean;
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
    </label>
  );
}
