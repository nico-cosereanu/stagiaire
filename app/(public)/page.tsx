import type { Metadata } from "next";
import Link from "next/link";

import { and, asc, eq } from "drizzle-orm";

import { Rosette, RosetteRow } from "@/components/ui/rosette";
import { db } from "@/lib/db";
import { restaurantProfiles } from "@/db/schema";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";

/*
 * Marketing homepage.
 *
 * Single-screen-feel editorial landing. Top nav, chancery hero, three-
 * column "how it works", a featured-restaurants strip pulling real rows
 * from the seed, footer.
 *
 * Server Component — fetches restaurants and the current user in parallel.
 */

export const metadata: Metadata = {
  title: "Stagiaire — stage at the world's best kitchens",
  description:
    "Discover and book stages at every Michelin-starred restaurant on earth. Globe-based discovery; kitchen-side reviews from the cooks who worked there.",
};

const FEATURED_SLUGS = [
  "le-clos-des-sens-annecy",
  "la-villa-madie-cassis",
  "maison-lameloise-chagny",
  "auberge-du-vieux-puits-fontjoncouse",
];

async function getFeatured() {
  const rows = await db
    .select({
      id: restaurantProfiles.id,
      slug: restaurantProfiles.slug,
      name: restaurantProfiles.name,
      city: restaurantProfiles.city,
      stars: restaurantProfiles.stars,
      blurb: restaurantProfiles.blurb,
    })
    .from(restaurantProfiles)
    .where(and(eq(restaurantProfiles.stars, 3)))
    .orderBy(asc(restaurantProfiles.name));
  // Preserve the FEATURED_SLUGS order
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return FEATURED_SLUGS.map((s) => bySlug.get(s)).filter((r): r is NonNullable<typeof r> =>
    Boolean(r),
  );
}

export default async function HomePage() {
  const [featured, viewer] = await Promise.all([getFeatured(), getCurrentUser()]);

  return (
    <main className="min-h-screen bg-vellum text-oak-gall">
      {/* Top nav */}
      <header className="border-b border-sepia/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          <Link
            href="/"
            className="font-display text-2xl italic tracking-tight text-oak-gall transition-opacity duration-[120ms] ease-paper hover:opacity-80"
          >
            Stagiaire
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            <Link
              href="/map"
              className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
            >
              The map
            </Link>
            <Link
              href="/specimen"
              className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
            >
              Specimen
            </Link>
          </nav>
          <NavAuth user={viewer} />
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-sepia/30">
        <div className="mx-auto max-w-5xl px-8 pb-32 pt-32">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            For aspiring chefs
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-6xl italic leading-[1.0] tracking-tight text-oak-gall sm:text-7xl md:text-8xl">
            Stage at the world&rsquo;s best kitchens.
          </h1>
          <p className="mt-10 max-w-prose font-serif text-lg leading-relaxed text-oak-gall-soft">
            Stagiaire is the global directory of every 1, 2, and 3-star Michelin restaurant. Find
            a kitchen on a hand-inked globe, request a stage, hear back from the chef the same
            week. After the stage, both sides leave a review.
          </p>

          <div className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Link
              href="/map"
              className="group relative flex h-16 items-center justify-center gap-3 bg-cordon-bleu px-8 font-display text-2xl italic text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-1 border border-gold-leaf/40"
              />
              <span>Open the map</span>
              <span aria-hidden className="text-vellum/80">
                →
              </span>
            </Link>
            {!viewer && (
              <Link
                href="/signup"
                className="font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[6px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
              >
                Sign up as a stagiaire
              </Link>
            )}
            {viewer && (
              <Link
                href="/app"
                className="font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[6px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
              >
                Go to your dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-sepia/30">
        <div className="mx-auto max-w-6xl px-8 py-24">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            How it works
          </p>
          <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-16">
            <Step
              number="i."
              title="Discover"
              body="Pull up the globe at /map. 658 starred restaurants in France, every coastline inked, every pin a real kitchen. Click a pin to read the chef's blurb, the team, the cuisine."
            />
            <Step
              number="ii."
              title="Request"
              body="Pick the dates you want to stage. Write a short cover note. The chef sees your profile, your CV, your portfolio of dishes. They accept, decline, or send a message back."
            />
            <Step
              number="iii."
              title="Cook"
              body="Show up, work the brigade, learn. After the stage, you write the kitchen-side review you wish had existed when you were applying. The chef reviews you back. Both go live at once."
            />
          </div>
        </div>
      </section>

      {/* Featured restaurants */}
      <section className="border-b border-sepia/30">
        <div className="mx-auto max-w-6xl px-8 py-24">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                Three stars
              </p>
              <h2 className="mt-3 font-display text-4xl italic text-oak-gall">A few to start with</h2>
            </div>
            <Link
              href="/map"
              className="font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
            >
              All restaurants →
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-px bg-sepia/20 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((r) => (
              <Link
                key={r.id}
                href={`/r/${r.slug}`}
                className="group flex flex-col bg-vellum p-6 transition-colors duration-[120ms] ease-paper hover:bg-ermine"
              >
                <div className="mb-4 flex items-center gap-2">
                  <RosetteRow tier={3} size={11} />
                  <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
                    {r.city}
                  </span>
                </div>
                <h3 className="font-display text-2xl italic leading-tight text-oak-gall">
                  {r.name}
                </h3>
                {r.blurb && (
                  <p className="mt-3 line-clamp-3 font-serif text-sm leading-relaxed text-oak-gall-soft">
                    {r.blurb}
                  </p>
                )}
                <span className="mt-auto block pt-6 font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu">
                  Read profile →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-b border-sepia/30">
        <div className="mx-auto max-w-3xl px-8 py-24 text-center">
          <h2 className="font-display text-5xl italic leading-[1.05] tracking-tight text-oak-gall">
            The kitchen is private.
          </h2>
          <p className="mx-auto mt-6 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
            Diner reviews are everywhere. Ours are a different category — written by the cooks
            who worked the line. If you&rsquo;ve staged at a great restaurant, your review is
            what someone else&rsquo;s career might depend on.
          </p>
          {!viewer && (
            <div className="mt-10">
              <Link
                href="/signup"
                className="inline-flex h-14 items-center justify-center bg-cordon-bleu px-8 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-8 py-16 md:grid-cols-4">
          <div>
            <Link
              href="/"
              className="font-display text-xl italic tracking-tight text-oak-gall"
            >
              Stagiaire
            </Link>
            <p className="mt-3 font-serif text-sm text-sepia">
              Stage at the world&rsquo;s best kitchens.
            </p>
          </div>
          <FooterCol
            title="Discover"
            links={[
              { href: "/map", label: "The map" },
              { href: "/specimen", label: "Design specimen" },
            ]}
          />
          <FooterCol
            title="Account"
            links={
              viewer
                ? [{ href: "/app", label: "Dashboard" }]
                : [
                    { href: "/login", label: "Log in" },
                    { href: "/signup", label: "Sign up" },
                  ]
            }
          />
          <FooterCol
            title="Stagiaire"
            links={[
              { href: "/about", label: "About" },
              { href: "/safety", label: "Safety" },
              { href: "/legal", label: "Legal" },
            ]}
          />
        </div>
        <div className="border-t border-sepia/30">
          <div className="mx-auto max-w-6xl px-8 py-6">
            <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
              v0 · Restaurant data from the Michelin Guide · {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function NavAuth({ user }: { user: CurrentUser | null }) {
  if (!user) {
    return (
      <div className="flex items-center gap-5">
        <Link
          href="/login"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="inline-flex h-9 items-center bg-cordon-bleu px-4 font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
        >
          Sign up
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-5">
      <Link
        href="/app"
        className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
      >
        Dashboard
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
        >
          Log out
        </button>
      </form>
    </div>
  );
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  void Rosette; // silence unused-import warning when no rosette is rendered
  return (
    <div>
      <p className="font-display text-3xl italic text-sepia">{number}</p>
      <h3 className="mt-3 font-display text-3xl italic text-oak-gall">{title}</h3>
      <p className="mt-4 font-serif text-base leading-relaxed text-oak-gall-soft">{body}</p>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="font-serif text-sm text-oak-gall-soft underline-offset-[3px] transition-colors duration-[120ms] ease-paper hover:text-oak-gall hover:underline hover:decoration-1"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
