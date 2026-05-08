"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import type { ClosedWindow } from "@/db/schema";

import { saveClosuresAction, type SaveClosuresResult } from "../actions";

type Row = ClosedWindow & { _key: string };

type Props = {
  slug: string;
  initialWindows: ClosedWindow[];
};

/*
 * Dynamic editor for the closedWindows array. Local React state holds
 * the row list with stable keys; on every render we serialise it into a
 * single hidden `windows` JSON field so the server action gets the
 * whole array in one go.
 */
export function WindowsEditor({ slug, initialWindows }: Props) {
  const [rows, setRows] = useState<Row[]>(() =>
    initialWindows.map((w) => ({ ...w, _key: crypto.randomUUID() })),
  );
  const [state, formAction, isPending] = useActionState<SaveClosuresResult | null, FormData>(
    saveClosuresAction,
    null,
  );

  const update = (key: string, patch: Partial<ClosedWindow>) =>
    setRows((rs) => rs.map((r) => (r._key === key ? { ...r, ...patch } : r)));

  const remove = (key: string) =>
    setRows((rs) => rs.filter((r) => r._key !== key));

  const add = () =>
    setRows((rs) => [
      ...rs,
      { _key: crypto.randomUUID(), startDate: "", endDate: "", note: "" },
    ]);

  const payload = JSON.stringify(
    rows.map((r) => {
      const note = r.note?.trim();
      return note
        ? { startDate: r.startDate, endDate: r.endDate, note }
        : { startDate: r.startDate, endDate: r.endDate };
    }),
  );

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="windows" value={payload} />

      {rows.length === 0 ? (
        <div className="border border-sepia/30 px-6 py-8">
          <p className="font-serif text-sm italic text-sepia">
            No closures published. Your kitchen reads as fully open — stagiaires can request any
            date.
          </p>
        </div>
      ) : (
        <ul className="space-y-px bg-sepia/20">
          {rows.map((row, i) => (
            <li key={row._key} className="bg-vellum px-6 py-5">
              <div className="flex items-baseline justify-between">
                <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                  Closure {i + 1}
                </p>
                <button
                  type="button"
                  onClick={() => remove(row._key)}
                  className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-michelin-red"
                >
                  Remove
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DateField
                  label="From"
                  value={row.startDate}
                  onChange={(v) => update(row._key, { startDate: v })}
                />
                <DateField
                  label="Until"
                  value={row.endDate}
                  onChange={(v) => update(row._key, { endDate: v })}
                />
              </div>
              <label className="mt-4 block">
                <span className="mb-2 block font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                  Reason (optional)
                </span>
                <input
                  type="text"
                  value={row.note ?? ""}
                  onChange={(e) => update(row._key, { note: e.target.value })}
                  maxLength={140}
                  placeholder="Annual closure · refurb · private events only"
                  className="w-full border border-sepia/40 bg-ermine px-4 py-3 font-serif text-base text-oak-gall placeholder:text-sepia-faint focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu"
                />
              </label>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={add}
        className="inline-flex h-10 items-center justify-center border border-sepia/40 px-5 font-sans text-[12px] font-medium uppercase tracking-[0.04em] text-oak-gall transition-colors duration-[120ms] ease-paper hover:bg-ermine"
      >
        + Add closure
      </button>

      {state?.ok === false && (
        <p
          role="alert"
          className="border border-michelin-red/40 bg-michelin-red/5 px-4 py-2.5 font-serif text-sm text-michelin-red"
        >
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-6 border-t border-sepia/30 pt-8">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-12 items-center justify-center rounded-lg bg-cordon-bleu px-8 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu disabled:cursor-not-allowed disabled:bg-sepia-faint"
        >
          {isPending ? "Saving…" : "Save & publish"}
        </button>

        <Link
          href={`/r/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
        >
          View public profile ↗
        </Link>

        {state?.ok && (
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-verdigris">
            Saved · live now
          </p>
        )}
      </div>
    </form>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full border border-sepia/40 bg-ermine px-4 py-3 font-serif text-base text-oak-gall focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu"
      />
    </label>
  );
}
