import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { dishes } from "@/db/schema";
import { requireRole } from "@/lib/auth";

import { updateDish } from "../actions";
import { DishForm } from "../_components/dish-form";

export const metadata: Metadata = {
  title: "Edit dish",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditDishPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireRole("stagiaire");

  const row = await db.query.dishes.findFirst({
    where: and(eq(dishes.id, id), eq(dishes.stagiaireId, user.id)),
  });
  if (!row) notFound();

  const boundUpdate = updateDish.bind(null, row.id);

  return (
    <div className="mx-auto max-w-2xl px-8 py-16">
      <Link
        href="/app/portfolio"
        className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
      >
        ← All dishes
      </Link>

      <p className="mt-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Edit dish
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight text-oak-gall">
        {row.title ?? "Untitled dish"}
      </h1>

      <hr className="my-8 border-0 border-t border-sepia/30" />

      <DishForm
        action={boundUpdate}
        defaults={{
          title: row.title,
          role: row.role,
          techniqueNotes: row.techniqueNotes,
          photoUrl: row.photoUrl,
        }}
        submitLabel="Save changes"
        mode="edit"
      />
    </div>
  );
}
