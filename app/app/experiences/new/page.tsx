import type { Metadata } from "next";
import Link from "next/link";

import { requireRole } from "@/lib/auth";

import { createExperience } from "../actions";
import { ExperienceForm } from "../_components/experience-form";

export const metadata: Metadata = {
  title: "Add experience",
};

export default async function NewExperiencePage() {
  await requireRole("stagiaire");

  return (
    <div className="mx-auto max-w-2xl px-8 py-16">
      <Link
        href="/app/experiences"
        className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia underline decoration-sepia/40 underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
      >
        ← All experience
      </Link>

      <p className="mt-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        New entry
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight text-oak-gall">
        Add an experience.
      </h1>
      <p className="mt-4 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        One entry per restaurant or school. Be precise about your role and dates — chefs notice.
      </p>

      <hr className="my-8 border-0 border-t border-sepia/30" />

      <ExperienceForm
        action={createExperience}
        defaults={{}}
        submitLabel="Add experience"
      />
    </div>
  );
}
