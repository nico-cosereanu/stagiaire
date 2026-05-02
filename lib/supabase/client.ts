import { createBrowserClient } from "@supabase/ssr";

/*
 * Browser-side Supabase client.
 * Use in Client Components for realtime subscriptions and anywhere
 * you need an auth-aware fetch from the browser.
 *
 * `createBrowserClient` is a singleton internally — calling this on
 * every render is cheap.
 */

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
