"use client";

import { useActionState } from "react";

import { ContinueButton, FormError, TextField } from "../../_components/text-field";
import { setName, type Result } from "../actions";

export function NameForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, isPending] = useActionState<Result | null, FormData>(setName, null);

  return (
    <form action={formAction} className="space-y-6">
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
      <ContinueButton pending={isPending} />
    </form>
  );
}
