import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RosetteRow } from "@/components/ui/rosette";
import { requireRole } from "@/lib/auth";

import { getOwnedRestaurant } from "../_lib/owner";
import { WindowsEditor } from "./_components/windows-editor";

export const metadata: Metadata = {
  title: "Closures",
};

/*
 * /restaurant/windows — owner editor for the closedWindows jsonb array
 * on their restaurant_profiles row. Default state is "kitchen open" —
 * this page is only for publishing explicit closures (vacations,
 * refurbs, private events) so stagiaires can't pick those dates.
 *
 * Gated to owners with an approved claim; non-claimed restaurant_owners
 * get bounced to the dashboard.
 */

export default async function ClosuresPage() {
  const user = await requireRole("restaurant_owner");
  const owned = await getOwnedRestaurant(user.id);
  if (!owned) redirect("/restaurant");

  const tier = owned.stars as 1 | 2 | 3;

  return (
    <>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        <Link
          href="/restaurant"
          className="transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
        >
          ← Dashboard
        </Link>
      </p>

      <div className="mt-6 flex items-center gap-4">
        <RosetteRow tier={tier} size={11} />
        <h1 className="font-display text-5xl italic leading-[1.05] tracking-tight">
          Closures
        </h1>
      </div>
      <p className="mt-4 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        Your kitchen is open by default. Use this to block date ranges when you&rsquo;re{" "}
        <em>not</em> taking stagiaires — vacations, refurbishments, private-event runs.
        Stagiaires can&rsquo;t pick dates inside a closure on{" "}
        <Link
          href={`/r/${owned.slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px]"
        >
          /r/{owned.slug}
        </Link>
        .
      </p>

      <hr className="my-12 border-0 border-t border-sepia/30" />

      <WindowsEditor slug={owned.slug} initialWindows={owned.closedWindows ?? []} />
    </>
  );
}
