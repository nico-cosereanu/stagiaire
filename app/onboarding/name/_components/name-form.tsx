"use client";

import { useActionState } from "react";

import { ContinueButton, FormError, TextField } from "../../_components/text-field";
import { setName, type Result } from "../actions";

export function NameForm({
  defaultName,
  isEdit = false,
}: {
  defaultName: string;
  isEdit?: boolean;
}) {
  const [state, formAction, isPending] = useActionState<Result | null, FormData>(setName, null);

  return (
    <form action={formAction} className="space-y-6">
      {isEdit && <input type="hidden" name="edit" value="1" />}
      <TextField
        label="Your name"
        name="name"
        defaultValue={defaultName}
        autoFocus
        required
        autoComplete="name"
        placeholder="Camille Brun"
        invalid={state?.ok === false}
      />
      {state?.ok === false && <FormError message={state.error} />}
      <ContinueButton pending={isPending} label={isEdit ? "Save" : "Continue"} />
    </form>
  );
}
