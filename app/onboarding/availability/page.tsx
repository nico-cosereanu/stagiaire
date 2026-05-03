import { requireUser } from "@/lib/auth";

import { StepShell } from "../_components/step-shell";
import { getProfile } from "../_lib/profile";
import { AvailabilityForm } from "./_components/availability-form";

export default async function OnboardingAvailabilityPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <StepShell
      slug="availability"
      eyebrow="When you're free"
      title="When can you stage?"
      subtitle="A rough window. Doesn't lock you in — chefs see this on your profile but you can still request any dates."
    >
      <AvailabilityForm
        defaultFrom={profile?.availableFrom ?? ""}
        defaultUntil={profile?.availableUntil ?? ""}
      />
    </StepShell>
  );
}
