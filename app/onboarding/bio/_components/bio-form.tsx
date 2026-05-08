"use client";

import { useActionState } from "react";

import { ContinueButton, FormError, TextArea } from "../../_components/text-field";
import { setBio, type Result } from "../actions";

export function BioForm({
  defaultBio,
  isEdit = false,
}: {
  defaultBio: string;
  isEdit?: boolean;
}) {
  const [state, formAction, isPending] = useActionState<Result | null, FormData>(setBio, null);

  return (
    <form action={formAction} className="space-y-6">
      {isEdit && <input type="hidden" name="edit" value="1" />}
      <TextArea
        label="Bio"
        name="bio"
        defaultValue={defaultBio}
        required
        rows={6}
        placeholder="Lyon-trained line cook, three years on the meat station at a one-star bistro. Looking for stages that go further into pâtisserie and fermentation."
        hint="40–800 characters. You can edit this later from your profile."
        invalid={state?.ok === false}
      />
      {state?.ok === false && <FormError message={state.error} />}
      <ContinueButton pending={isPending} label={isEdit ? "Save" : "Continue"} />
    </form>
  );
}
