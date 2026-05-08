import type { Metadata } from "next";
import Link from "next/link";

import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { experiences } from "@/db/schema";
import { requireRole } from "@/lib/auth";

import { deleteExperience } from "./actions";

export const metadata: Metadata = {
  title: "Experience",
};

/*
 * /app/experiences — manage CV entries.
 *
 * Reverse-chronological list with inline edit/delete. Each row is a
 * mini-card; delete is a tiny <form> bound to the deleteExperience
 * server action so we don't need any client JS for the destructive case.
 * Edit jumps to /app/experiences/[id].
 */

export default async function ExperiencesPage() {
  const user = await requireRole("stagiaire");

  const rows = await db
    .select()
    .from(experiences)
    .where(eq(experiences.stagiaireId, user.id))
    .orderBy(desc(experiences.startedOn), asc(experiences.sortOrder));

  return (
    <div className="mx-auto max-w-3xl px-8 py-16">
      <Link
        href="/app"
        className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
      >
        ← Back to profile
      </Link>

      <div className="mt-6 flex items-baseline justify-between gap-6">
        <div>
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Your CV
          </p>
          <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight text-oak-gall">
            Experience.
          </h1>
        </div>
        <Link
          href="/app/experiences/new"
          className="inline-flex h-10 items-center rounded-lg bg-cordon-bleu px-5 font-sans text-[11px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
        >
          Add experience
        </Link>
      </div>

      <p className="mt-4 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        Schools, jobs, and prior stages — anything that shows what you&rsquo;ve cooked and where.
        Chefs read this before deciding whether to open the chat.
      </p>

      <hr className="my-10 border-0 border-t border-sepia/30" />

      {rows.length === 0 ? (
        <div className="border border-sepia/30 px-6 py-10 text-center">
          <p className="font-serif text-base italic text-sepia">
            No experience listed yet. Add your first entry to get started.
          </p>
        </div>
      ) : (
        <ol className="space-y-6">
          {rows.map((e) => (
            <li
              key={e.id}
              className="grid grid-cols-[110px_1fr_auto] gap-6 border border-sepia/30 bg-vellum px-6 py-5"
            >
              <div className="font-mono text-xs text-sepia">
                {fmtRange(e.startedOn, e.endedOn)}
              </div>
              <div>
                <p className="font-display text-2xl italic text-oak-gall">{e.restaurantName}</p>
                <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.12em] text-sepia">
                  {[e.role, e.station].filter(Boolean).join(" · ") || "—"}
                </p>
                {e.description && (
                  <p className="mt-3 font-serif text-base leading-relaxed text-oak-gall-soft">
                    {e.description}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Link
                  href={`/app/experiences/${e.id}`}
                  className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
                >
                  Edit
                </Link>
                <form action={deleteExperience}>
                  <input type="hidden" name="id" value={e.id} />
                  <button
                    type="submit"
                    className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-michelin-red"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function fmtDate(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function fmtRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Undated";
  if (!start) return fmtDate(end!);
  if (!end) return `${fmtDate(start)} – present`;
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}
