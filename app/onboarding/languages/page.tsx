import { requireUser } from "@/lib/auth";

import { StepShell } from "../_components/step-shell";
import { getProfile } from "../_lib/profile";
import { LanguagesForm } from "./_components/languages-form";

export default async function OnboardingLanguagesPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <StepShell
      slug="languages"
      eyebrow="Languages"
      title="What do you speak?"
      subtitle="Comma-separated. The kitchen language matters more than you'd think — chefs filter by it."
    >
      <LanguagesForm defaultLanguages={profile?.languages?.join(", ") ?? ""} />
    </StepShell>
  );
}
