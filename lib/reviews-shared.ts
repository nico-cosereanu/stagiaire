import type {
  RestaurantToStagiaireRatings,
  StagiaireToRestaurantRatings,
} from "@/db/schema";

/*
 * Client-safe review constants. lib/reviews.ts is server-only (it
 * does DB work) so the form and display components can't import
 * from it directly.
 */

export type ReviewDirection = "s_to_r" | "r_to_s";

export const STAGIAIRE_RATING_LABELS: Record<
  keyof Omit<StagiaireToRestaurantRatings, "hoursDescription">,
  string
> = {
  learningQuality: "Learning",
  kitchenCulture: "Kitchen culture",
  organization: "Organization",
  hygiene: "Hygiene",
  leadership: "Leadership",
};

export const RESTAURANT_RATING_LABELS: Record<keyof RestaurantToStagiaireRatings, string> = {
  skill: "Skill",
  attitude: "Attitude",
  reliability: "Reliability",
  brigadeFit: "Brigade fit",
};
