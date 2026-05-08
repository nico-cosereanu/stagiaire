import type { Metadata } from "next";
import Link from "next/link";

import { count, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { restaurantClaims } from "@/db/schema";

export const metadata: Metadata = {
  title: "Admin",
};

/*
 * /admin — the moderator's home. Surfaces what's queued for action.
 * v1 has only restaurant claims; disputes and review moderation slot in
 * here as the lifecycle features ship.
 */

export default async function AdminHomePage() {
  const [pending] = await db
    .select({ n: count() })
    .from(restaurantClaims)
    .where(eq(restaurantClaims.status, "pending"));

  return (
    <>
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        Admin · home
      </p>
      <h1 className="mt-3 font-display text-5xl italic leading-[1.05] tracking-tight">
        What needs your eyes.
      </h1>

      <hr className="my-12 border-0 border-t border-sepia/30" />

      <ul className="grid grid-cols-1 gap-px bg-sepia/20">
        <Tile
          href="/admin/claims"
          title="Restaurant claims"
          body="Verify owner claims against starred restaurants."
          metric={`${pending.n} pending`}
        />
      </ul>
    </>
  );
}

function Tile({
  href,
  title,
  body,
  metric,
}: {
  href: string;
  title: string;
  body: string;
  metric: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-baseline justify-between gap-6 bg-vellum px-6 py-5 transition-colors duration-[120ms] ease-paper hover:bg-ermine"
      >
        <div>
          <h3 className="font-display text-2xl italic text-oak-gall">{title}</h3>
          <p className="mt-2 font-serif text-sm text-oak-gall-soft">{body}</p>
        </div>
        <p className="shrink-0 font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu">
          {metric} →
        </p>
      </Link>
    </li>
  );
}
