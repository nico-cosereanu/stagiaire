"use client";

import { useActionState } from "react";

import { ContinueButton, FormError, TextField } from "../../_components/text-field";
import { setAvailability, type Result } from "../actions";

export function AvailabilityForm({
  defaultFrom,
  defaultUntil,
}: {
  defaultFrom: string;
  defaultUntil: string;
}) {
  const [state, formAction, isPending] = useActionState<Result | null, FormData>(
    setAvailability,
    null,
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <TextField
          label="From"
          name="from"
          type="date"
          defaultValue={defaultFrom}
          autoFocus
          invalid={state?.ok === false}
        />
        <TextField
          label="Until"
          name="until"
          type="date"
          defaultValue={defaultUntil}
          invalid={state?.ok === false}
        />
      </div>
      {state?.ok === false && <FormError message={state.error} />}
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia-faint">
        Both optional — leave blank if you'd rather not commit yet.
      </p>
      <ContinueButton pending={isPending} label="Finish" />
    </form>
  );
}
