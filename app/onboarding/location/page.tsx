import { requireUser } from "@/lib/auth";

import { StepShell } from "../_components/step-shell";
import { getProfile } from "../_lib/profile";
import { LocationForm } from "./_components/location-form";

export default async function OnboardingLocationPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <StepShell
      slug="location"
      eyebrow="Where you cook"
      title="Where are you based?"
      subtitle="Your current city and country. Helps chefs gauge how far you're traveling for the stage."
    >
      <LocationForm
        defaultCity={profile?.currentCity ?? ""}
        defaultCountry={profile?.country ?? ""}
      />
    </StepShell>
  );
}
