import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/*
 * Service-role Supabase client. BYPASSES Row-Level Security.
 *
 * Only call from:
 *   - Cron route handlers (app/cron/*)
 *   - Webhook route handlers (app/api/webhooks/*)
 *   - Admin scripts that need to override RLS
 *
 * NEVER import this from a Server Action or Server Component used in
 * the regular request flow. The `server-only` import will surface a
 * build error if a Client Component tries to import it.
 */

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
