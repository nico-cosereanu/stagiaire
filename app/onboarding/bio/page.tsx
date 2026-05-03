import { requireUser } from "@/lib/auth";

import { StepShell } from "../_components/step-shell";
import { getProfile } from "../_lib/profile";
import { BioForm } from "./_components/bio-form";

export default async function OnboardingBioPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <StepShell
      slug="bio"
      eyebrow="Why you stage"
      title="Tell chefs who you are."
      subtitle="A short pitch — where you've trained, what you want to learn, what kind of kitchen you're after. Two to four sentences. This is what chefs read first."
    >
      <BioForm defaultBio={profile?.bio ?? ""} />
    </StepShell>
  );
}
