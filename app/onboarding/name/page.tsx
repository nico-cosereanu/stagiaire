import { requireUser } from "@/lib/auth";

import { StepShell } from "../_components/step-shell";
import { getProfile } from "../_lib/profile";
import { NameForm } from "./_components/name-form";

export default async function OnboardingNamePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <StepShell
      slug="name"
      eyebrow="To begin"
      title="What should we call you?"
      subtitle="Your full name as it should appear on your public profile and on requests sent to chefs."
    >
      <NameForm defaultName={profile?.name ?? ""} />
    </StepShell>
  );
}
