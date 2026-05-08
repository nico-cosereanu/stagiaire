"use client";

import { useActionState } from "react";

import { ContinueButton, FormError, TextField } from "../../_components/text-field";
import { setLocation, type Result } from "../actions";

export function LocationForm({
  defaultCity,
  defaultCountry,
  isEdit = false,
}: {
  defaultCity: string;
  defaultCountry: string;
  isEdit?: boolean;
}) {
  const [state, formAction, isPending] = useActionState<Result | null, FormData>(
    setLocation,
    null,
  );

  return (
    <form action={formAction} className="space-y-6">
      {isEdit && <input type="hidden" name="edit" value="1" />}
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
      <ContinueButton pending={isPending} label={isEdit ? "Save" : "Continue"} />
    </form>
  );
}
