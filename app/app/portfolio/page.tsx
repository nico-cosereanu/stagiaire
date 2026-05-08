import type { Metadata } from "next";
import Link from "next/link";

import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { dishes } from "@/db/schema";
import { requireRole } from "@/lib/auth";

import { deleteDish } from "./actions";

export const metadata: Metadata = {
  title: "Portfolio",
};

/*
 * /app/portfolio — manage portfolio dishes.
 *
 * Grid of figure-cards that mirror the public profile layout. Each card
 * has Edit + Delete affordances pinned beneath the photo. Delete is a
 * tiny <form> bound to the deleteDish server action so we don't need
 * client JS for the destructive case.
 */

export default async function PortfolioPage() {
  const user = await requireRole("stagiaire");

  const rows = await db
    .select()
    .from(dishes)
    .where(eq(dishes.stagiaireId, user.id))
    .orderBy(asc(dishes.sortOrder), asc(dishes.createdAt));

  return (
    <div className="mx-auto max-w-4xl px-8 py-16">
      <Link
        href="/app"
        className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
      >
        ← Back to profile
      </Link>

      <div className="mt-6 flex items-baseline justify-between gap-6">
        <div>
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Your work
          </p>
          <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight text-oak-gall">
            Portfolio.
          </h1>
        </div>
        <Link
          href="/app/portfolio/new"
          className="inline-flex h-10 items-center rounded-lg bg-cordon-bleu px-5 font-sans text-[11px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
        >
          Add dish
        </Link>
      </div>

      <p className="mt-4 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        Five to ten dishes, ideally. Pick the ones that show range — pastry next to butchery, raw
        next to cured. Vertical crops read best on the profile grid.
      </p>

      <hr className="my-10 border-0 border-t border-sepia/30" />

      {rows.length === 0 ? (
        <div className="border border-sepia/30 px-6 py-10 text-center">
          <p className="font-serif text-base italic text-sepia">
            No dishes uploaded yet. Add your first to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((d) => (
            <figure key={d.id} className="flex flex-col">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.photoUrl}
                alt={d.title ?? "Dish"}
                className="aspect-[4/5] w-full object-cover"
              />
              <figcaption className="mt-3 flex flex-1 flex-col">
                {d.title && (
                  <p className="font-display text-xl italic text-oak-gall">{d.title}</p>
                )}
                {d.role && (
                  <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.12em] text-sepia">
                    {d.role}
                  </p>
                )}
                {d.techniqueNotes && (
                  <p className="mt-2 font-serif text-sm text-oak-gall-soft">{d.techniqueNotes}</p>
                )}
                <div className="mt-auto flex items-center gap-4 pt-4">
                  <Link
                    href={`/app/portfolio/${d.id}`}
                    className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
                  >
                    Edit
                  </Link>
                  <form action={deleteDish}>
                    <input type="hidden" name="id" value={d.id} />
                    <button
                      type="submit"
                      className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-michelin-red"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
