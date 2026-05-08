"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { capture } from "@/lib/analytics/server";

/*
 * Restaurant-owner signup.
 *
 * Two-step role assignment: handle_new_user() reads raw_app_meta_data,
 * which a normal client signUp() cannot set. So the trigger fires first
 * and creates public.users with the default role='stagiaire'; we then
 * immediately promote to 'restaurant_owner' on both sides:
 *   - public.users.role            (Drizzle, source of truth for authz)
 *   - auth.users.raw_app_meta_data (admin client, so future JWT claims
 *                                    are accurate)
 *
 * The race window between trigger and update is harmless: the user can't
 * touch any RLS-gated resource until they've confirmed email + signed in.
 */

const signupSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Passwords don't match",
    path: ["passwordConfirm"],
  });

export type SignupResult =
  | { ok: true; needsEmailConfirmation: boolean; email: string }
  | { ok: false; error: string; field?: "email" | "password" | "passwordConfirm" };

export async function signupRestaurantAction(
  _prev: SignupResult | null,
  formData: FormData,
): Promise<SignupResult> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Invalid input",
      field: (issue?.path[0] as "email" | "password" | "passwordConfirm") ?? undefined,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "Signup failed: no user returned" };

  const userId = data.user.id;
  const admin = createAdminClient();
  await Promise.all([
    db
      .update(users)
      .set({ role: "restaurant_owner", updatedAt: new Date() })
      .where(eq(users.id, userId)),
    admin.auth.admin.updateUserById(userId, {
      app_metadata: { role: "restaurant_owner" },
    }),
  ]);

  await capture({
    distinctId: userId,
    event: "signup_completed",
    properties: { role: "restaurant_owner", emailConfirmationRequired: !data.session },
  });

  if (data.session) {
    redirect("/restaurant");
  }
  return {
    ok: true,
    needsEmailConfirmation: true,
    email: parsed.data.email,
  };
}
