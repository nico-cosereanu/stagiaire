CREATE TYPE "public"."identity_verification_status" AS ENUM('not_started', 'pending', 'verified', 'failed');--> statement-breakpoint
ALTER TABLE "stagiaire_profiles" ADD COLUMN "identity_verification_status" "identity_verification_status" DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "stagiaire_profiles" ADD COLUMN "stripe_verification_session_id" text;