/*
 * Drizzle schema — Stagiaire data model.
 * Source of truth: PLAN.md §14.
 *
 * Conventions:
 *   - UUID primary keys via `gen_random_uuid()` (pgcrypto, enabled on Supabase by default)
 *   - All timestamps `timestamptz`; `created_at` / `updated_at` default to NOW()
 *   - Enums for state machines and finite categorical fields
 *   - FKs spell out delete behavior explicitly (cascade vs set null vs restrict)
 *   - jsonb fields use `$type<T>()` so app code reads typed payloads
 *
 * Auth: `users.id` matches `auth.uid()` from Supabase Auth. The credential
 * itself lives in `auth.users`. We do not declare an FK to that schema here
 * because it sits in `auth`, not `public`; the trigger that mirrors signups
 * into `public.users` is configured separately in Supabase.
 */

import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ─────────────────────────────────────────────────────────────────────────
 * Enums
 * ────────────────────────────────────────────────────────────────────────*/

export const userRoleEnum = pgEnum("user_role", ["stagiaire", "restaurant_owner", "admin"]);

export const stageRequestStatusEnum = pgEnum("stage_request_status", [
  "draft",
  "submitted",
  "pending",
  "accepted",
  "confirmed",
  "declined",
  "withdrawn",
  "expired",
  "cancelled_by_stagiaire",
  "cancelled_by_restaurant",
  "no_show",
  "completed",
  "reviewable",
  "closed",
]);

export const restaurantClaimStatusEnum = pgEnum("restaurant_claim_status", [
  "pending",
  "approved",
  "rejected",
]);

export const referenceStatusEnum = pgEnum("reference_status", [
  "pending",
  "confirmed",
  "declined",
]);

export const reviewDirectionEnum = pgEnum("review_direction", ["s_to_r", "r_to_s"]);

export const teamRoleEnum = pgEnum("team_role", [
  "head_chef",
  "executive_chef",
  "chef_de_cuisine",
  "sous_chef",
  "pastry_chef",
  "chef_de_partie",
  "commis",
  "other",
]);

export const teamMemberSourceEnum = pgEnum("team_member_source", [
  "claim",
  "crowdsourced",
  "scraped",
]);

export const identityVerificationStatusEnum = pgEnum("identity_verification_status", [
  "not_started",
  "pending",
  "verified",
  "failed",
]);

/* ─────────────────────────────────────────────────────────────────────────
 * Shared types for jsonb payloads
 * ────────────────────────────────────────────────────────────────────────*/

/*
 * Date ranges where the kitchen is NOT accepting stage requests. The
 * default state (null / empty array) means the kitchen is always open.
 * Restaurants explicitly publish closures — vacations, refurb periods,
 * private-event runs — and stagiaires can't pick dates inside them.
 */
export type ClosedWindow = {
  startDate: string; // ISO date
  endDate: string; // ISO date
  note?: string;
};

export type StagiaireToRestaurantRatings = {
  learningQuality: number;
  kitchenCulture: number;
  organization: number;
  hygiene: number;
  leadership: number;
  hoursDescription: string;
};

export type RestaurantToStagiaireRatings = {
  skill: number;
  attitude: number;
  reliability: number;
  brigadeFit: number;
};

/* ─────────────────────────────────────────────────────────────────────────
 * users — public profile/role extension of auth.users
 * ────────────────────────────────────────────────────────────────────────*/

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().notNull(),
    email: text("email").notNull(),
    role: userRoleEnum("role").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

/* ─────────────────────────────────────────────────────────────────────────
 * stagiaire_profiles — one row per stagiaire user
 * ────────────────────────────────────────────────────────────────────────*/

export const stagiaireProfiles = pgTable(
  "stagiaire_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    photoUrl: text("photo_url"),
    bio: text("bio"),
    currentCity: text("current_city"),
    country: text("country"),
    languages: text("languages").array(),
    availableFrom: date("available_from"),
    availableUntil: date("available_until"),
    idVerifiedAt: timestamp("id_verified_at", { withTimezone: true }),
    identityVerificationStatus: identityVerificationStatusEnum("identity_verification_status")
      .default("not_started")
      .notNull(),
    stripeVerificationSessionId: text("stripe_verification_session_id"),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("stagiaire_profiles_slug_idx").on(t.slug),
    index("stagiaire_profiles_country_idx").on(t.country),
  ],
);

/* ─────────────────────────────────────────────────────────────────────────
 * restaurant_profiles — pre-populated from Michelin CSV; claimable
 * ────────────────────────────────────────────────────────────────────────*/

export const restaurantProfiles = pgTable(
  "restaurant_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    address: text("address").notNull(),
    lat: real("lat"),
    lng: real("lng"),
    city: text("city"),
    country: text("country"),
    stars: integer("stars").notNull(),
    cuisineTags: text("cuisine_tags").array(),
    blurb: text("blurb"),
    longDescription: text("long_description"),
    websiteUrl: text("website_url"),
    instagramHandle: text("instagram_handle"),
    heroImageUrl: text("hero_image_url"),
    photos: text("photos").array(),
    headChef: text("head_chef"),
    menuUrl: text("menu_url"),
    claimedByUserId: uuid("claimed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    closedWindows: jsonb("closed_windows").$type<ClosedWindow[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("restaurant_profiles_slug_idx").on(t.slug),
    index("restaurant_profiles_country_idx").on(t.country),
    index("restaurant_profiles_stars_idx").on(t.stars),
    index("restaurant_profiles_claimed_idx").on(t.claimedByUserId),
    check("restaurant_profiles_stars_range", sql`${t.stars} between 1 and 3`),
  ],
);

/* ─────────────────────────────────────────────────────────────────────────
 * restaurant_claims — owner association requests, admin-reviewed
 * ────────────────────────────────────────────────────────────────────────*/

export const restaurantClaims = pgTable(
  "restaurant_claims",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurantProfiles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    evidenceText: text("evidence_text"),
    evidenceUrl: text("evidence_url"),
    status: restaurantClaimStatusEnum("status").default("pending").notNull(),
    reviewedByAdminId: uuid("reviewed_by_admin_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("restaurant_claims_restaurant_idx").on(t.restaurantId),
    index("restaurant_claims_user_idx").on(t.userId),
    index("restaurant_claims_status_idx").on(t.status),
  ],
);

/* ─────────────────────────────────────────────────────────────────────────
 * team_members — restaurant brigade, filled in at claim time
 * ────────────────────────────────────────────────────────────────────────*/

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurantProfiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: teamRoleEnum("role").notNull(),
    photoUrl: text("photo_url"),
    source: teamMemberSourceEnum("source").default("claim").notNull(),
    verified: boolean("verified").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("team_members_restaurant_idx").on(t.restaurantId)],
);

/* ─────────────────────────────────────────────────────────────────────────
 * experiences — stagiaire CV entries (schools + jobs + prior stages)
 * ────────────────────────────────────────────────────────────────────────*/

export const experiences = pgTable(
  "experiences",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    stagiaireId: uuid("stagiaire_id")
      .notNull()
      .references(() => stagiaireProfiles.userId, { onDelete: "cascade" }),
    restaurantName: text("restaurant_name").notNull(),
    restaurantId: uuid("restaurant_id").references(() => restaurantProfiles.id, {
      onDelete: "set null",
    }),
    role: text("role"),
    station: text("station"),
    startedOn: date("started_on"),
    endedOn: date("ended_on"),
    description: text("description"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("experiences_stagiaire_idx").on(t.stagiaireId)],
);

/* ─────────────────────────────────────────────────────────────────────────
 * dishes — stagiaire portfolio entries
 * ────────────────────────────────────────────────────────────────────────*/

export const dishes = pgTable(
  "dishes",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    stagiaireId: uuid("stagiaire_id")
      .notNull()
      .references(() => stagiaireProfiles.userId, { onDelete: "cascade" }),
    photoUrl: text("photo_url").notNull(),
    title: text("title"),
    role: text("role"),
    techniqueNotes: text("technique_notes"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("dishes_stagiaire_idx").on(t.stagiaireId)],
);

/* ─────────────────────────────────────────────────────────────────────────
 * references — chefs vouching for the stagiaire, confirmed by email
 * (Postgres reserves REFERENCES as a constraint keyword, not a table name —
 * Drizzle quotes the identifier in generated SQL, so this is safe.)
 * ────────────────────────────────────────────────────────────────────────*/

export const references = pgTable(
  "references",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    stagiaireId: uuid("stagiaire_id")
      .notNull()
      .references(() => stagiaireProfiles.userId, { onDelete: "cascade" }),
    refereeName: text("referee_name").notNull(),
    refereeEmail: text("referee_email").notNull(),
    refereeRole: text("referee_role"),
    relationship: text("relationship"),
    status: referenceStatusEnum("status").default("pending").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    confirmationToken: text("confirmation_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("references_stagiaire_idx").on(t.stagiaireId),
    uniqueIndex("references_token_idx").on(t.confirmationToken),
  ],
);

/* ─────────────────────────────────────────────────────────────────────────
 * stage_requests — the lifecycle core
 * ────────────────────────────────────────────────────────────────────────*/

export const stageRequests = pgTable(
  "stage_requests",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    stagiaireId: uuid("stagiaire_id")
      .notNull()
      .references(() => stagiaireProfiles.userId, { onDelete: "restrict" }),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurantProfiles.id, { onDelete: "restrict" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    coverMessage: text("cover_message").notNull(),
    status: stageRequestStatusEnum("status").default("submitted").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("stage_requests_stagiaire_status_idx").on(t.stagiaireId, t.status),
    index("stage_requests_restaurant_status_idx").on(t.restaurantId, t.status),
    index("stage_requests_expires_idx").on(t.status, t.expiresAt),
    index("stage_requests_dates_idx").on(t.startDate, t.endDate),
    check("stage_requests_dates_order", sql`${t.endDate} >= ${t.startDate}`),
  ],
);

/* ─────────────────────────────────────────────────────────────────────────
 * messages — per-request thread, opens at submit, persists post-completion
 * ────────────────────────────────────────────────────────────────────────*/

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    stageRequestId: uuid("stage_request_id")
      .notNull()
      .references(() => stageRequests.id, { onDelete: "cascade" }),
    senderUserId: uuid("sender_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    attachmentUrls: text("attachment_urls").array(),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [index("messages_request_sent_idx").on(t.stageRequestId, t.sentAt)],
);

/* ─────────────────────────────────────────────────────────────────────────
 * reviews — symmetric two-way reveal
 * ────────────────────────────────────────────────────────────────────────*/

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    stageRequestId: uuid("stage_request_id")
      .notNull()
      .references(() => stageRequests.id, { onDelete: "cascade" }),
    direction: reviewDirectionEnum("direction").notNull(),
    ratings: jsonb("ratings")
      .$type<StagiaireToRestaurantRatings | RestaurantToStagiaireRatings>()
      .notNull(),
    body: text("body"),
    flags: text("flags").array(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    visibleAt: timestamp("visible_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("reviews_request_direction_idx").on(t.stageRequestId, t.direction),
    index("reviews_visible_idx").on(t.visibleAt),
  ],
);

/* ─────────────────────────────────────────────────────────────────────────
 * notifications — per-user inbox; payload shape is type-specific
 * ────────────────────────────────────────────────────────────────────────*/

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("notifications_user_unread_idx").on(t.userId, t.readAt)],
);

/* ─────────────────────────────────────────────────────────────────────────
 * audit_log — moderation-relevant actions; system-actions allow null actor
 * ────────────────────────────────────────────────────────────────────────*/

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("audit_log_actor_idx").on(t.actorUserId),
    index("audit_log_target_idx").on(t.targetType, t.targetId),
    index("audit_log_created_idx").on(t.createdAt),
  ],
);

/* ─────────────────────────────────────────────────────────────────────────
 * Relations — enables `db.query.X.findFirst({ with: { ... } })`
 * ────────────────────────────────────────────────────────────────────────*/

export const usersRelations = relations(users, ({ one, many }) => ({
  stagiaireProfile: one(stagiaireProfiles, {
    fields: [users.id],
    references: [stagiaireProfiles.userId],
  }),
  ownedRestaurants: many(restaurantProfiles, { relationName: "owner" }),
  claims: many(restaurantClaims, { relationName: "claimant" }),
  reviewedClaims: many(restaurantClaims, { relationName: "admin_reviewer" }),
  sentMessages: many(messages),
  notifications: many(notifications),
}));

export const stagiaireProfilesRelations = relations(stagiaireProfiles, ({ one, many }) => ({
  user: one(users, { fields: [stagiaireProfiles.userId], references: [users.id] }),
  experiences: many(experiences),
  dishes: many(dishes),
  references: many(references),
  stageRequests: many(stageRequests),
}));

export const restaurantProfilesRelations = relations(restaurantProfiles, ({ one, many }) => ({
  owner: one(users, {
    fields: [restaurantProfiles.claimedByUserId],
    references: [users.id],
    relationName: "owner",
  }),
  claims: many(restaurantClaims),
  teamMembers: many(teamMembers),
  stageRequests: many(stageRequests),
}));

export const restaurantClaimsRelations = relations(restaurantClaims, ({ one }) => ({
  restaurant: one(restaurantProfiles, {
    fields: [restaurantClaims.restaurantId],
    references: [restaurantProfiles.id],
  }),
  user: one(users, {
    fields: [restaurantClaims.userId],
    references: [users.id],
    relationName: "claimant",
  }),
  reviewedBy: one(users, {
    fields: [restaurantClaims.reviewedByAdminId],
    references: [users.id],
    relationName: "admin_reviewer",
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  restaurant: one(restaurantProfiles, {
    fields: [teamMembers.restaurantId],
    references: [restaurantProfiles.id],
  }),
}));

export const experiencesRelations = relations(experiences, ({ one }) => ({
  stagiaire: one(stagiaireProfiles, {
    fields: [experiences.stagiaireId],
    references: [stagiaireProfiles.userId],
  }),
  restaurant: one(restaurantProfiles, {
    fields: [experiences.restaurantId],
    references: [restaurantProfiles.id],
  }),
}));

export const dishesRelations = relations(dishes, ({ one }) => ({
  stagiaire: one(stagiaireProfiles, {
    fields: [dishes.stagiaireId],
    references: [stagiaireProfiles.userId],
  }),
}));

export const referencesRelations = relations(references, ({ one }) => ({
  stagiaire: one(stagiaireProfiles, {
    fields: [references.stagiaireId],
    references: [stagiaireProfiles.userId],
  }),
}));

export const stageRequestsRelations = relations(stageRequests, ({ one, many }) => ({
  stagiaire: one(stagiaireProfiles, {
    fields: [stageRequests.stagiaireId],
    references: [stagiaireProfiles.userId],
  }),
  restaurant: one(restaurantProfiles, {
    fields: [stageRequests.restaurantId],
    references: [restaurantProfiles.id],
  }),
  messages: many(messages),
  reviews: many(reviews),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  stageRequest: one(stageRequests, {
    fields: [messages.stageRequestId],
    references: [stageRequests.id],
  }),
  sender: one(users, { fields: [messages.senderUserId], references: [users.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  stageRequest: one(stageRequests, {
    fields: [reviews.stageRequestId],
    references: [stageRequests.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(users, { fields: [auditLog.actorUserId], references: [users.id] }),
}));
