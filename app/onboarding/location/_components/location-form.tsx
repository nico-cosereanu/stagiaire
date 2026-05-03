"use client";

import { useActionState } from "react";

import { ContinueButton, FormError, TextField } from "../../_components/text-field";
import { setLocation, type Result } from "../actions";

export function LocationForm({
  defaultCity,
  defaultCountry,
}: {
  defaultCity: string;
  defaultCountry: string;
}) {
  const [state, formAction, isPending] = useActionState<Result | null, FormData>(
    setLocation,
    null,
  );

  return (
    <form action={formAction} className="space-y-6">
      <TextField
        label="City"
        name="city"
        defaultValue={defaultCity}
        autoFocus
        required
        placeholder="Lyon"
        invalid={state?.ok === false}
      />
      <TextField
        label="Country"
        name="country"
        defaultValue={defaultCountry || "France"}
        required
        placeholder="France"
        invalid={state?.ok === false}
      />
      {state?.ok === false && <FormError message={state.error} />}
      <ContinueButton pending={isPending} />
    </form>
  );
}
