import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/lib/db";
import { stagiaireProfiles } from "@/db/schema";
import { stripe } from "@/lib/stripe";

/*
 * Stripe Identity webhook. Source of truth for verification status.
 *
 * Events handled:
 *   - identity.verification_session.verified       -> verified + idVerifiedAt
 *   - identity.verification_session.requires_input -> failed (canceled or rejected)
 *   - identity.verification_session.processing     -> pending
 *
 * The user_id we set in metadata at session creation is how we route the
 * status update to the right profile row.
 *
 * Signature verification uses STRIPE_WEBHOOK_SECRET. Without a valid
 * signature we 400 and never touch the DB.
 */

export const runtime = "nodejs";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!event.type.startsWith("identity.verification_session.")) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Identity.VerificationSession;
  const userId = session.metadata?.user_id;
  if (!userId) {
    return NextResponse.json({ received: true, ignored: "no user_id in metadata" });
  }

  switch (event.type) {
    case "identity.verification_session.verified":
      await db
        .update(stagiaireProfiles)
        .set({
          identityVerificationStatus: "verified",
          idVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(stagiaireProfiles.userId, userId));
      break;

    case "identity.verification_session.requires_input":
    case "identity.verification_session.canceled":
      await db
        .update(stagiaireProfiles)
        .set({ identityVerificationStatus: "failed", updatedAt: new Date() })
        .where(eq(stagiaireProfiles.userId, userId));
      break;

    case "identity.verification_session.processing":
      await db
        .update(stagiaireProfiles)
        .set({ identityVerificationStatus: "pending", updatedAt: new Date() })
        .where(eq(stagiaireProfiles.userId, userId));
      break;

    default:
      // Other identity.* events (created, redacted) are not relevant.
      break;
  }

  return NextResponse.json({ received: true });
}
