import type { Metadata } from "next";
import Link from "next/link";

import { requireRole } from "@/lib/auth";

import { createDish } from "../actions";
import { DishForm } from "../_components/dish-form";

export const metadata: Metadata = {
  title: "Add dish",
};

export default async function NewDishPage() {
  await requireRole("stagiaire");

  return (
    <div className="mx-auto max-w-2xl px-8 py-16">
      <Link
        href="/app/portfolio"
        className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
      >
        ← All dishes
      </Link>

      <p className="mt-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        New dish
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight text-oak-gall">
        Add a dish.
      </h1>
      <p className="mt-4 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        One photo, what you&rsquo;d call it, and a few lines on the technique. Brevity wins —
        chefs scan, they don&rsquo;t read.
      </p>

      <hr className="my-8 border-0 border-t border-sepia/30" />

      <DishForm
        action={createDish}
        defaults={{}}
        submitLabel="Add dish"
        mode="create"
      />
    </div>
  );
}
