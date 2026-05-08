import { requireUser } from "@/lib/auth";

import { StepShell } from "../_components/step-shell";
import { getProfile } from "../_lib/profile";
import { LanguagesForm } from "./_components/languages-form";

export default async function OnboardingLanguagesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const isEdit = (await searchParams).edit === "1";

  return (
    <StepShell
      slug="languages"
      eyebrow="Languages"
      title={isEdit ? "Edit your languages." : "What do you speak?"}
      subtitle="Comma-separated. The kitchen language matters more than you'd think — chefs filter by it."
      isEdit={isEdit}
    >
      <LanguagesForm
        defaultLanguages={profile?.languages?.join(", ") ?? ""}
        isEdit={isEdit}
      />
    </StepShell>
  );
}
