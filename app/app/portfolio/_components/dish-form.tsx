"use client";

import Link from "next/link";
import { useActionState } from "react";

import { ContinueButton, FormError, TextArea, TextField } from "@/app/onboarding/_components/text-field";

import type { Result } from "../actions";
import { PhotoInput } from "./photo-input";

/*
 * Shared form for both create and update. The caller passes an action
 * already bound to the row id (or the bare create action) plus the
 * defaults and submit label.
 *
 * On create, the photo is required. On edit, the photo input is
 * optional — leaving it empty keeps the existing photoUrl.
 */

export type DishFormDefaults = {
  title?: string | null;
  role?: string | null;
  techniqueNotes?: string | null;
  photoUrl?: string | null;
};

export function DishForm({
  action,
  defaults,
  submitLabel,
  mode,
}: {
  action: (state: Result | null, formData: FormData) => Promise<Result>;
  defaults: DishFormDefaults;
  submitLabel: string;
  mode: "create" | "edit";
}) {
  const [state, formAction, isPending] = useActionState<Result | null, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-6">
      <PhotoInput
        name="photo"
        required={mode === "create"}
        currentUrl={defaults.photoUrl ?? undefined}
        hint={
          mode === "create"
            ? "JPEG, PNG, or WebP. Up to 8 MB. Vertical crops read best on the profile grid."
            : "Optional. Pick a new file to replace the current photo."
        }
      />

      <TextField
        label="Title"
        name="title"
        defaultValue={defaults.title ?? ""}
        placeholder="Beetroot tartare, smoked yolk"
        hint="Optional. What you'd call it on a menu."
      />

      <TextField
        label="Your role"
        name="role"
        defaultValue={defaults.role ?? ""}
        placeholder="Lead — plated solo on tasting menu"
        hint="Optional. Your part in the dish."
      />

      <TextArea
        label="Technique notes"
        name="techniqueNotes"
        defaultValue={defaults.techniqueNotes ?? ""}
        rows={5}
        placeholder="Beetroot baked in salt crust 90 min, peeled warm, brunoise. Yolk cured in koji 24h, lightly smoked."
        hint="Optional. What chefs will want to know — the move, not the recipe."
      />

      {state?.ok === false && <FormError message={state.error} />}

      <div className="flex items-center gap-6">
        <ContinueButton pending={isPending} label={submitLabel} />
        <Link
          href="/app/portfolio"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
