"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/*
 * Sign out. Used by the header logout button across all public + app pages.
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
