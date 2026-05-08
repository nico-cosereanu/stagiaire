"use client";

import Link from "next/link";
import { useActionState } from "react";

import { ContinueButton, FormError, TextArea, TextField } from "@/app/onboarding/_components/text-field";

import type { Result } from "../actions";

/*
 * Shared form for both create and update. The caller passes an action
 * already bound to its row id (or the bare create action for new entries)
 * plus the labels for the submit + back affordances.
 *
 * Date fields are HTML5 type="date" — produces "YYYY-MM-DD" strings the
 * server actions accept directly.
 */

export type ExperienceFormDefaults = {
  restaurantName?: string;
  role?: string | null;
  station?: string | null;
  startedOn?: string | null;
  endedOn?: string | null;
  description?: string | null;
};

export function ExperienceForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: Result | null, formData: FormData) => Promise<Result>;
  defaults: ExperienceFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState<Result | null, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-6">
      <TextField
        label="Restaurant"
        name="restaurantName"
        defaultValue={defaults.restaurantName ?? ""}
        required
        autoFocus
        placeholder="L'Arpège"
        invalid={state?.ok === false}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <TextField
          label="Role"
          name="role"
          defaultValue={defaults.role ?? ""}
          placeholder="Commis"
          hint="Optional. Your title in the brigade."
        />
        <TextField
          label="Station"
          name="station"
          defaultValue={defaults.station ?? ""}
          placeholder="Pastry"
          hint="Optional. Where you spent most shifts."
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <DateField
          label="Started"
          name="startedOn"
          defaultValue={defaults.startedOn ?? ""}
        />
        <DateField
          label="Ended"
          name="endedOn"
          defaultValue={defaults.endedOn ?? ""}
          hint="Leave blank if you're still here."
        />
      </div>

      <TextArea
        label="What you did"
        name="description"
        defaultValue={defaults.description ?? ""}
        rows={5}
        placeholder="Ran the meat station weekend doubles, got first pass on tasting-menu plating, learned the pâté en croûte technique."
        hint="Optional. What you cooked, what you learned, what stuck."
      />

      {state?.ok === false && <FormError message={state.error} />}

      <div className="flex items-center gap-6">
        <ContinueButton pending={isPending} label={submitLabel} />
        <Link
          href="/app/experiences"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function DateField({
  label,
  name,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        {label}
      </span>
      <input
        type="date"
        name={name}
        defaultValue={defaultValue}
        className="w-full border border-sepia/40 bg-ermine px-4 py-3 font-serif text-base text-oak-gall placeholder:text-sepia-faint focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu"
      />
      {hint && <span className="mt-2 block font-serif text-xs text-sepia">{hint}</span>}
    </label>
  );
}
