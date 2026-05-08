"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { logoutAction } from "@/lib/auth-actions";

/*
 * Top-right action in the onboarding shell. The wizard offers
 * "Save & exit" (logout); but when we re-enter a step from /app to
 * edit a single field (?edit=1), logging the user out is the wrong
 * default — show "Back to profile" instead.
 */
export function HeaderAction() {
  const searchParams = useSearchParams();
  const isEdit = searchParams.get("edit") === "1";

  if (isEdit) {
    return (
      <Link
        href="/app"
        className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
      >
        Back to profile
      </Link>
    );
  }

  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
      >
        Save &amp; exit
      </button>
    </form>
  );
}
