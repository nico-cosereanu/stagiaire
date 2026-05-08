import { requireUser } from "@/lib/auth";

import { StepShell } from "../_components/step-shell";
import { getProfile } from "../_lib/profile";
import { NameForm } from "./_components/name-form";

export default async function OnboardingNamePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const isEdit = (await searchParams).edit === "1";

  return (
    <StepShell
      slug="name"
      eyebrow={isEdit ? "Your name" : "To begin"}
      title={isEdit ? "Edit your name." : "What should we call you?"}
      subtitle="Your full name as it should appear on your public profile and on requests sent to chefs."
      isEdit={isEdit}
    >
      <NameForm defaultName={profile?.name ?? ""} isEdit={isEdit} />
    </StepShell>
  );
}
