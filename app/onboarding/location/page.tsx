import { requireUser } from "@/lib/auth";

import { StepShell } from "../_components/step-shell";
import { getProfile } from "../_lib/profile";
import { LocationForm } from "./_components/location-form";

export default async function OnboardingLocationPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const isEdit = (await searchParams).edit === "1";

  return (
    <StepShell
      slug="location"
      eyebrow="Where you cook"
      title={isEdit ? "Edit where you're based." : "Where are you based?"}
      subtitle="Your current city and country. Helps chefs gauge how far you're traveling for the stage."
      isEdit={isEdit}
    >
      <LocationForm
        defaultCity={profile?.currentCity ?? ""}
        defaultCountry={profile?.country ?? ""}
        isEdit={isEdit}
      />
    </StepShell>
  );
}
