"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { stagiaireProfiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { stripe, getAppOrigin } from "@/lib/stripe";

/*
 * Kicks off Stripe Identity verification. Creates a VerificationSession
 * scoped to the current user (metadata.user_id), persists the session id
 * + flips status to 'pending', then redirects to Stripe's hosted flow.
 *
 * Stripe will redirect the user back to /onboarding/verify/return after
 * they finish, and the webhook updates the final status asynchronously.
 */

export async function startVerification(): Promise<void> {
  const user = await requireUser();

  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: { user_id: user.id },
    // No session_id in the URL: Stripe Identity doesn't expand
    // {VERIFICATION_SESSION_ID} placeholders. The return page reads the id
    // from stagiaire_profiles.stripeVerificationSessionId instead.
    return_url: `${getAppOrigin()}/onboarding/verify/return`,
    options: {
      document: {
        require_matching_selfie: true,
      },
    },
  });

  await db
    .update(stagiaireProfiles)
    .set({
      stripeVerificationSessionId: session.id,
      identityVerificationStatus: "pending",
      updatedAt: new Date(),
    })
    .where(eq(stagiaireProfiles.userId, user.id));

  if (!session.url) {
    throw new Error("Stripe did not return a hosted verification URL");
  }

  redirect(session.url);
}
