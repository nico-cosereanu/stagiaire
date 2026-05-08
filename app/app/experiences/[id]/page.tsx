import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { experiences } from "@/db/schema";
import { requireRole } from "@/lib/auth";

import { updateExperience } from "../actions";
import { ExperienceForm } from "../_components/experience-form";

export const metadata: Metadata = {
  title: "Edit experience",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditExperiencePage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireRole("stagiaire");

  const row = await db.query.experiences.findFirst({
    where: and(eq(experiences.id, id), eq(experiences.stagiaireId, user.id)),
  });
  if (!row) notFound();

  const boundUpdate = updateExperience.bind(null, row.id);

  return (
    <div className="mx-auto max-w-2xl px-8 py-16">
      <Link
        href="/app/experiences"
        className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
      >
        ← All experience
      </Link>

      <p className="mt-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Edit entry
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight text-oak-gall">
        {row.restaurantName}
      </h1>

      <hr className="my-8 border-0 border-t border-sepia/30" />

      <ExperienceForm
        action={boundUpdate}
        defaults={{
          restaurantName: row.restaurantName,
          role: row.role,
          station: row.station,
          startedOn: row.startedOn,
          endedOn: row.endedOn,
          description: row.description,
        }}
        submitLabel="Save changes"
      />
    </div>
  );
}
