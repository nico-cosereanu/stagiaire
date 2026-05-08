"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string; field?: "email" | "password" };

export async function loginAction(_prev: LoginResult | null, formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Invalid input",
      field: (issue?.path[0] as "email" | "password") ?? undefined,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { ok: false, error: error.message };
  }

  // Honor ?next=<path> if it's a safe in-app path; otherwise pick the
  // role-appropriate default destination.
  const rawNext = formData.get("next");
  const next = typeof rawNext === "string" && rawNext.startsWith("/") && !rawNext.startsWith("//")
    ? rawNext
    : null;
  if (next) redirect(next);

  const userId = data.user?.id;
  if (!userId) redirect("/app");

  const profile = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { role: true },
  });
  if (profile?.role === "restaurant_owner") redirect("/restaurant");
  if (profile?.role === "admin") redirect("/admin");
  redirect("/app");
}
