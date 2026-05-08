"use client";

import { useActionState } from "react";

import { RESTAURANT_RATING_LABELS, STAGIAIRE_RATING_LABELS } from "@/lib/reviews-shared";

/*
 * One review form, two shapes. The stagiaire-side adds a free-text
 * "hours" question (chefs lie about hours; the field is the whole
 * point). The restaurant-side has fewer numeric criteria.
 *
 * 1–5 ratings render as a row of pill buttons (radio inputs styled via
 * peer-checked) so the form works without JS and submits a clean number.
 */

export type ReviewFormResult =
  | { ok: true }
  | { ok: false; error: string; field?: string };

type Props = {
  direction: "s_to_r" | "r_to_s";
  action: (prev: ReviewFormResult | null, formData: FormData) => Promise<ReviewFormResult>;
  counterpartName: string;
};

export function ReviewForm({ direction, action, counterpartName }: Props) {
  const [state, formAction, isPending] = useActionState<ReviewFormResult | null, FormData>(
    action,
    null,
  );

  const labels =
    direction === "s_to_r" ? STAGIAIRE_RATING_LABELS : RESTAURANT_RATING_LABELS;

  const fieldKeys = Object.keys(labels) as Array<keyof typeof labels>;

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-5">
        {fieldKeys.map((key) => (
          <RatingRow key={key} name={key} label={labels[key]} invalid={isInvalid(state, key)} />
        ))}

        {direction === "s_to_r" && (
          <div>
            <label
              htmlFor="hoursDescription"
              className="mb-2 block font-sans text-[11px] uppercase tracking-[0.18em] text-sepia"
            >
              Hours, in your own words
            </label>
            <input
              id="hoursDescription"
              name="hoursDescription"
              type="text"
              maxLength={200}
              placeholder="6am to 1am, 6 days, one short break"
              className={`block w-full bg-transparent border-b border-dashed py-1.5 px-0 font-serif text-base text-oak-gall placeholder:text-sepia-faint focus:outline-none transition-colors duration-[120ms] ease-paper ${
                isInvalid(state, "hoursDescription")
                  ? "border-michelin-red/60 focus:border-michelin-red"
                  : "border-sepia/40 hover:border-cordon-bleu/60 focus:border-cordon-bleu"
              }`}
            />
          </div>
        )}

        <div>
          <label
            htmlFor="body"
            className="mb-2 block font-sans text-[11px] uppercase tracking-[0.18em] text-sepia"
          >
            Public note <span className="text-sepia-faint">· optional</span>
          </label>
          <textarea
            id="body"
            name="body"
            rows={5}
            maxLength={2000}
            placeholder={
              direction === "s_to_r"
                ? `What should other stagiaires know before staging at ${counterpartName}?`
                : `What should other chefs know about working with ${counterpartName}?`
            }
            className={`block w-full resize-none bg-transparent border-b border-dashed py-2 px-0 font-serif text-base leading-relaxed text-oak-gall placeholder:text-sepia-faint focus:outline-none transition-colors duration-[120ms] ease-paper ${
              isInvalid(state, "body")
                ? "border-michelin-red/60 focus:border-michelin-red"
                : "border-sepia/40 hover:border-cordon-bleu/60 focus:border-cordon-bleu"
            }`}
          />
        </div>
      </div>

      {state?.ok === false && (
        <p
          role="alert"
          className="border border-michelin-red/40 bg-michelin-red/5 px-4 py-2.5 font-serif text-sm text-michelin-red"
        >
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-12 items-center rounded-lg bg-cordon-bleu px-6 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark disabled:cursor-not-allowed disabled:bg-sepia-faint"
        >
          {isPending ? "Submitting…" : "Submit review"}
        </button>
        <p className="font-serif text-sm italic text-sepia">
          Hidden until {counterpartName} also submits, or 14 days pass.
        </p>
      </div>
    </form>
  );
}

function RatingRow({ name, label, invalid }: { name: string; label: string; invalid: boolean }) {
  return (
    <div>
      <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">{label}</p>
      <div
        className={`flex gap-2 ${invalid ? "rounded-md ring-1 ring-michelin-red/60 ring-offset-2 ring-offset-vellum p-1" : ""}`}
        role="radiogroup"
        aria-label={label}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={n}
              required
              className="peer sr-only"
            />
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sepia/40 bg-vellum font-sans text-sm text-oak-gall transition-colors duration-[120ms] ease-paper hover:border-cordon-bleu peer-checked:border-cordon-bleu peer-checked:bg-cordon-bleu peer-checked:text-vellum">
              {n}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function isInvalid(state: ReviewFormResult | null, field: string): boolean {
  return state?.ok === false && state.field === field;
}
