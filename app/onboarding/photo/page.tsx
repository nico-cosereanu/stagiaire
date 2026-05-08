import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth";

import { getProfile } from "../_lib/profile";
import { PhotoForm } from "./_components/photo-form";

export const metadata: Metadata = {
  title: "Profile photo",
};

export default async function OnboardingPhotoPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const hasPhoto = Boolean(profile?.photoUrl);

  return (
    <div>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Profile photo
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">
        {hasPhoto ? "Update your photo." : "Add a profile photo."}
      </h1>
      <p className="mt-6 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
        Optional but recommended. A clean, square portrait — chef whites or
        kitchen wear is fine. Chefs read photos almost before names.
      </p>

      <div className="mt-12">
        <PhotoForm currentUrl={profile?.photoUrl ?? null} />
      </div>

      <p className="mt-12">
        <Link
          href="/app"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
        >
          ← Back to profile
        </Link>
      </p>
    </div>
  );
}
