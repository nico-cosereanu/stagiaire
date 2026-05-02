import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/*
 * Supabase session-refresh helper for Next.js middleware.
 *
 * Per the supabase docs, this MUST run on every request so expired auth
 * tokens are refreshed and the new cookies make it back to the browser.
 *
 * Implementation rules from the official template:
 *   - Do NOT remove `auth.getClaims()` — it's what triggers the refresh.
 *   - Do NOT mutate the response object between createServerClient and
 *     getClaims — silent session bugs.
 *   - Always return the supabaseResponse with the cookies from setAll
 *     intact, otherwise the browser and server desync.
 *
 * We intentionally do NOT redirect unauthenticated users here; most of
 * Stagiaire is public (landing, map, /r/*, /u/*). Auth gates live in the
 * Server Components / Server Actions that actually need them, via
 * lib/auth.ts requireUser() / requireRole().
 */

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the JWT. `getClaims` validates the signature against the
  // project's published public keys; safe to trust the result.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
