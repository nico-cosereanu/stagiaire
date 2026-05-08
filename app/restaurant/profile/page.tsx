import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";

import { getOwnedRestaurant } from "../_lib/owner";
import { ClosuresCalendar } from "./_components/closures-calendar";
import { ProfileForm } from "./_components/profile-form";

export const metadata: Metadata = {
  title: "Edit profile",
};

/*
 * /restaurant/profile — owner editor for the public restaurant page.
 *
 * Renders the same DOM as /r/[slug] with editable fields inline. Locked
 * fields (name, stars, address, hero) come straight from the seed; the
 * form only writes the editable subset.
 */

export default async function EditProfilePage() {
  const user = await requireRole("restaurant_owner");
  const owned = await getOwnedRestaurant(user.id);
  if (!owned) redirect("/restaurant");

  return (
    <>
      <div className="mb-12 flex items-center justify-between gap-4">
        <Link
          href="/restaurant"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
        >
          ← Dashboard
        </Link>
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Editing — what you see is what stagiaires see
        </p>
      </div>

      <ProfileForm
        slug={owned.slug}
        restaurant={{
          name: owned.name,
          stars: owned.stars as 1 | 2 | 3,
          city: owned.city ?? null,
          address: owned.address,
          headChef: owned.headChef ?? null,
          heroImageUrl: owned.heroImageUrl ?? null,
          blurb: owned.blurb ?? null,
          longDescription: owned.longDescription ?? null,
          websiteUrl: owned.websiteUrl ?? null,
          instagramHandle: owned.instagramHandle ?? null,
          menuUrl: owned.menuUrl ?? null,
          cuisineTags: owned.cuisineTags ?? null,
        }}
      />

      <hr className="my-16 border-0 border-t border-sepia/30" />

      <section className="mb-16">
        <h2 className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Closures
        </h2>
        <p className="mb-6 max-w-prose font-serif text-sm text-oak-gall-soft">
          Your kitchen is open by default. Mark days you&rsquo;re <em>not</em> taking stagiaires —
          vacations, refurbs, private-event runs. Stagiaires can&rsquo;t request dates inside a
          closure.
        </p>
        <ClosuresCalendar
          slug={owned.slug}
          initialWindows={owned.closedWindows ?? []}
          todayIso={todayIso()}
        />
      </section>
    </>
  );
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
