CREATE TYPE "public"."reference_status" AS ENUM('pending', 'confirmed', 'declined');--> statement-breakpoint
CREATE TYPE "public"."restaurant_claim_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."review_direction" AS ENUM('s_to_r', 'r_to_s');--> statement-breakpoint
CREATE TYPE "public"."stage_request_status" AS ENUM('draft', 'submitted', 'pending', 'accepted', 'confirmed', 'declined', 'withdrawn', 'expired', 'cancelled_by_stagiaire', 'cancelled_by_restaurant', 'no_show', 'completed', 'reviewable', 'closed');--> statement-breakpoint
CREATE TYPE "public"."team_member_source" AS ENUM('claim', 'crowdsourced', 'scraped');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('head_chef', 'executive_chef', 'chef_de_cuisine', 'sous_chef', 'pastry_chef', 'chef_de_partie', 'commis', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('stagiaire', 'restaurant_owner', 'admin');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stagiaire_id" uuid NOT NULL,
	"photo_url" text NOT NULL,
	"title" text,
	"role" text,
	"technique_notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stagiaire_id" uuid NOT NULL,
	"restaurant_name" text NOT NULL,
	"restaurant_id" uuid,
	"role" text,
	"station" text,
	"started_on" date,
	"ended_on" date,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_request_id" uuid NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"attachment_urls" text[],
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stagiaire_id" uuid NOT NULL,
	"referee_name" text NOT NULL,
	"referee_email" text NOT NULL,
	"referee_role" text,
	"relationship" text,
	"status" "reference_status" DEFAULT 'pending' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirmation_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"evidence_text" text,
	"evidence_url" text,
	"status" "restaurant_claim_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_admin_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"address" text NOT NULL,
	"lat" real,
	"lng" real,
	"city" text,
	"country" text,
	"stars" integer NOT NULL,
	"cuisine_tags" text[],
	"blurb" text,
	"long_description" text,
	"website_url" text,
	"instagram_handle" text,
	"photos" text[],
	"menu_url" text,
	"claimed_by_user_id" uuid,
	"open_windows" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_profiles_stars_range" CHECK ("restaurant_profiles"."stars" between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_request_id" uuid NOT NULL,
	"direction" "review_direction" NOT NULL,
	"ratings" jsonb NOT NULL,
	"body" text,
	"flags" text[],
	"submitted_at" timestamp with time zone,
	"visible_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stagiaire_id" uuid NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"cover_message" text NOT NULL,
	"status" "stage_request_status" DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stage_requests_dates_order" CHECK ("stage_requests"."end_date" >= "stage_requests"."start_date")
);
--> statement-breakpoint
CREATE TABLE "stagiaire_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"photo_url" text,
	"bio" text,
	"current_city" text,
	"country" text,
	"languages" text[],
	"available_from" date,
	"available_until" date,
	"id_verified_at" timestamp with time zone,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" "team_role" NOT NULL,
	"photo_url" text,
	"source" "team_member_source" DEFAULT 'claim' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" NOT NULL,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_stagiaire_id_stagiaire_profiles_user_id_fk" FOREIGN KEY ("stagiaire_id") REFERENCES "public"."stagiaire_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_stagiaire_id_stagiaire_profiles_user_id_fk" FOREIGN KEY ("stagiaire_id") REFERENCES "public"."stagiaire_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_restaurant_id_restaurant_profiles_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_stage_request_id_stage_requests_id_fk" FOREIGN KEY ("stage_request_id") REFERENCES "public"."stage_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "references" ADD CONSTRAINT "references_stagiaire_id_stagiaire_profiles_user_id_fk" FOREIGN KEY ("stagiaire_id") REFERENCES "public"."stagiaire_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_claims" ADD CONSTRAINT "restaurant_claims_restaurant_id_restaurant_profiles_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_claims" ADD CONSTRAINT "restaurant_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_claims" ADD CONSTRAINT "restaurant_claims_reviewed_by_admin_id_users_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_profiles" ADD CONSTRAINT "restaurant_profiles_claimed_by_user_id_users_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_stage_request_id_stage_requests_id_fk" FOREIGN KEY ("stage_request_id") REFERENCES "public"."stage_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_requests" ADD CONSTRAINT "stage_requests_stagiaire_id_stagiaire_profiles_user_id_fk" FOREIGN KEY ("stagiaire_id") REFERENCES "public"."stagiaire_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_requests" ADD CONSTRAINT "stage_requests_restaurant_id_restaurant_profiles_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stagiaire_profiles" ADD CONSTRAINT "stagiaire_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_restaurant_id_restaurant_profiles_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "dishes_stagiaire_idx" ON "dishes" USING btree ("stagiaire_id");--> statement-breakpoint
CREATE INDEX "experiences_stagiaire_idx" ON "experiences" USING btree ("stagiaire_id");--> statement-breakpoint
CREATE INDEX "messages_request_sent_idx" ON "messages" USING btree ("stage_request_id","sent_at");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "references_stagiaire_idx" ON "references" USING btree ("stagiaire_id");--> statement-breakpoint
CREATE UNIQUE INDEX "references_token_idx" ON "references" USING btree ("confirmation_token");--> statement-breakpoint
CREATE INDEX "restaurant_claims_restaurant_idx" ON "restaurant_claims" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "restaurant_claims_user_idx" ON "restaurant_claims" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "restaurant_claims_status_idx" ON "restaurant_claims" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurant_profiles_slug_idx" ON "restaurant_profiles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "restaurant_profiles_country_idx" ON "restaurant_profiles" USING btree ("country");--> statement-breakpoint
CREATE INDEX "restaurant_profiles_stars_idx" ON "restaurant_profiles" USING btree ("stars");--> statement-breakpoint
CREATE INDEX "restaurant_profiles_claimed_idx" ON "restaurant_profiles" USING btree ("claimed_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_request_direction_idx" ON "reviews" USING btree ("stage_request_id","direction");--> statement-breakpoint
CREATE INDEX "reviews_visible_idx" ON "reviews" USING btree ("visible_at");--> statement-breakpoint
CREATE INDEX "stage_requests_stagiaire_status_idx" ON "stage_requests" USING btree ("stagiaire_id","status");--> statement-breakpoint
CREATE INDEX "stage_requests_restaurant_status_idx" ON "stage_requests" USING btree ("restaurant_id","status");--> statement-breakpoint
CREATE INDEX "stage_requests_expires_idx" ON "stage_requests" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "stage_requests_dates_idx" ON "stage_requests" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "stagiaire_profiles_slug_idx" ON "stagiaire_profiles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "stagiaire_profiles_country_idx" ON "stagiaire_profiles" USING btree ("country");--> statement-breakpoint
CREATE INDEX "team_members_restaurant_idx" ON "team_members" USING btree ("restaurant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");