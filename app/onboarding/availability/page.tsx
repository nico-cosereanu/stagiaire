import { requireUser } from "@/lib/auth";

import { StepShell } from "../_components/step-shell";
import { getProfile } from "../_lib/profile";
import { AvailabilityForm } from "./_components/availability-form";

export default async function OnboardingAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const isEdit = (await searchParams).edit === "1";

  return (
    <StepShell
      slug="availability"
      eyebrow="When you're free"
      title={isEdit ? "Edit your availability." : "When can you stage?"}
      subtitle="A rough window. Doesn't lock you in — chefs see this on your profile but you can still request any dates."
      isEdit={isEdit}
    >
      <AvailabilityForm
        defaultFrom={profile?.availableFrom ?? ""}
        defaultUntil={profile?.availableUntil ?? ""}
        isEdit={isEdit}
      />
    </StepShell>
  );
}
