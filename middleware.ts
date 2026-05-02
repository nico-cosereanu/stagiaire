import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/*
 * Refreshes the Supabase auth session on every matched request.
 * See lib/supabase/middleware.ts for rationale.
 */

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match every path except:
     *   - _next/static (static files)
     *   - _next/image (image optimization)
     *   - favicon.ico
     *   - common image extensions
     *   - /data/* (our static geojson)
     */
    "/((?!_next/static|_next/image|favicon.ico|data/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
