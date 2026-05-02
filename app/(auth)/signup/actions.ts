"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/*
 * Stagiaire signup. Creates the auth.users row via supabase.auth.signUp;
 * the handle_new_user() trigger fires and mirrors into public.users with
 * role='stagiaire' (the default when raw_app_meta_data is empty, which
 * it is on a normal client signup).
 *
 * Restaurant-owner signup goes through a separate /signup/restaurant flow
 * (TODO) which uses the admin client to set app_metadata.role = 'restaurant_owner'
 * before the trigger fires.
 *
 * If Supabase email confirmation is ON (default), the user must confirm
 * via the email link before logging in. The success state below tells
 * them so.
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

export async function signupAction(
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
  if (error) {
    return { ok: false, error: error.message };
  }

  // If session is null, Supabase requires email confirmation.
  const needsEmailConfirmation = !data.session;
  return {
    ok: true,
    needsEmailConfirmation,
    email: parsed.data.email,
  };
}
