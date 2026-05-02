import "server-only";

import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

import { createClient } from "@/lib/supabase/server";

/*
 * Server-side auth helpers. Use these from Server Components and Server
 * Actions to read or enforce the current user's identity and role.
 *
 * Pattern:
 *   - getCurrentUser()       -> User | null      (read; never throws/redirects)
 *   - requireUser()          -> User             (redirects to /login if missing)
 *   - requireRole('role')    -> User             (redirects if wrong role)
 *
 * Always uses getClaims() (validates JWT signature) rather than
 * getSession() (just reads the cookie) for trust-sensitive operations.
 */

export type CurrentUser = {
  id: string;
  email: string;
  role: "stagiaire" | "restaurant_owner" | "admin";
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;

  // Look up role from public.users (do NOT trust app_metadata in JWT for
  // ongoing authorization decisions — read the source of truth).
  const profile = await db.query.users.findFirst({
    where: eq(users.id, data.claims.sub),
    columns: { id: true, email: true, role: true },
  });
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(
  role: "stagiaire" | "restaurant_owner" | "admin",
): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== role) redirect("/");
  return user;
}
