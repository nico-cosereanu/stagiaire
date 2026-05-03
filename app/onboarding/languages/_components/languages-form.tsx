"use client";

import { useActionState } from "react";

import { ContinueButton, FormError, TextField } from "../../_components/text-field";
import { setLanguages, type Result } from "../actions";

export function LanguagesForm({ defaultLanguages }: { defaultLanguages: string }) {
  const [state, formAction, isPending] = useActionState<Result | null, FormData>(
    setLanguages,
    null,
  );

  return (
    <form action={formAction} className="space-y-6">
      <TextField
        label="Languages"
        name="languages"
        defaultValue={defaultLanguages}
        autoFocus
        required
        placeholder="French, English, a little Italian"
        hint="Comma-separated. Be honest — saying you speak French when you can only order coffee gets awkward."
        invalid={state?.ok === false}
      />
      {state?.ok === false && <FormError message={state.error} />}
      <ContinueButton pending={isPending} />
    </form>
  );
}
