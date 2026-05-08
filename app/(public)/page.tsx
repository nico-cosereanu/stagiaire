import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { RosetteRow } from "@/components/ui/rosette";
import { getCurrentUser, roleHome, type CurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";

import { HomeSearchBar } from "./_components/home-search-bar";
import { getTopCities } from "./_lib/cities";
import { getHotRestaurants, type HotRestaurant } from "./_lib/hot";
import { getRestaurantSuggestions } from "./_lib/restaurant-suggestions";

/*
 * Marketing homepage.
 *
 * Single-screen-feel editorial landing. Top nav, chancery hero, three-
 * column "how it works", a "hot restaurants" strip ranked by recent
 * activity (or curated placeholders until activity exists), footer.
 *
 * Server Component — fetches hot restaurants and the current user in parallel.
 */

export const metadata: Metadata = {
  title: "Stagiaire — stage at the world's best kitchens",
  description:
    "Discover and book stages at every Michelin-starred restaurant on earth. Globe-based discovery; kitchen-side reviews from the cooks who worked there.",
};

export default async function HomePage() {
  const [hot, viewer, cities, restaurants] = await Promise.all([
    getHotRestaurants(4),
    getCurrentUser(),
    getTopCities(8),
    getRestaurantSuggestions(),
  ]);

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
              href="/discover"
              className="inline-flex items-center font-sans text-[11px] font-medium uppercase leading-none tracking-[0.18em] text-oak-gall transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
            >
              Discover
            </Link>
          </nav>
          <NavAuth user={viewer} />
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-sepia/30">
        <div className="mx-auto max-w-5xl px-8 pb-12 pt-20">
          <div className="flex justify-center">
            <HomeSearchBar todayIso={todayIso()} cities={cities} restaurants={restaurants} />
          </div>

          <h1 className="mx-auto mt-16 max-w-4xl text-center font-display text-6xl italic leading-[1.0] tracking-tight text-oak-gall sm:text-7xl md:text-8xl">
            Stage at the world&rsquo;s best kitchens.
          </h1>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Link
              href="/discover?view=map"
              className="font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-sepia underline decoration-sepia/50 decoration-1 underline-offset-[6px] transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
            >
              Open the map ↗
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
                href={roleHome(viewer.role).href}
                className="font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[6px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
              >
                Go to {roleHome(viewer.role).label.toLowerCase()}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Hot restaurants */}
      <section className="border-b border-sepia/30">
        <div className="mx-auto max-w-6xl px-8 pb-24 pt-12">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                Heating up
              </p>
              <h2 className="mt-3 font-display text-4xl italic text-oak-gall">
                Hot kitchens right now
              </h2>
            </div>
            <Link
              href="/discover"
              className="font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
            >
              All restaurants →
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {hot.map((r) => (
              <HotCard key={r.id} r={r} />
            ))}
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
              body="Filter by your dates and the cuisines you want to learn. Or pull up the globe and pick a pin. 658 starred restaurants in France, every kitchen real, every chef one tap away."
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
                className="inline-flex h-14 items-center justify-center rounded-lg bg-cordon-bleu px-8 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
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
              { href: "/discover", label: "Discover restaurants" },
              { href: "/discover?view=map", label: "The globe" },
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
          className="inline-flex items-center font-sans text-[11px] uppercase leading-none tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="inline-flex h-9 items-center rounded-lg bg-cordon-bleu px-4 font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
        >
          Sign up
        </Link>
      </div>
    );
  }
  const home = roleHome(user.role);
  return (
    <div className="flex items-center gap-5">
      <Link
        href={home.href}
        className="inline-flex items-center font-sans text-[11px] uppercase leading-none tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
      >
        {home.label}
      </Link>
      <form action={logoutAction} className="inline-flex items-center">
        <button
          type="submit"
          className="inline-flex items-center font-sans text-[11px] uppercase leading-none tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-oak-gall"
        >
          Log out
        </button>
      </form>
    </div>
  );
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-3xl italic text-sepia">{number}</p>
      <h3 className="mt-3 font-display text-3xl italic text-oak-gall">{title}</h3>
      <p className="mt-4 font-serif text-base leading-relaxed text-oak-gall-soft">{body}</p>
    </div>
  );
}

function HotCard({ r }: { r: HotRestaurant }) {
  return (
    <Link
      href={`/r/${r.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-sepia/30 bg-white transition-colors duration-[120ms] ease-paper hover:border-cordon-bleu"
    >
      <HotCardThumb src={r.heroImageUrl} name={r.name} tier={r.stars} />
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-2">
          <RosetteRow tier={r.stars} size={11} />
          {r.city && (
            <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-sepia">
              {r.city}
            </span>
          )}
        </div>
        <p className="mt-3 inline-flex w-fit items-center gap-1.5 font-sans text-[10px] uppercase tracking-[0.18em] text-michelin-red">
          <FlameDot /> {r.hotReason.label}
        </p>
        <h3 className="mt-3 font-display text-2xl italic leading-tight text-oak-gall">{r.name}</h3>
        {r.blurb && (
          <p className="mt-3 line-clamp-3 font-serif text-sm leading-relaxed text-oak-gall-soft">
            {r.blurb}
          </p>
        )}
        <span className="mt-auto block pt-6 font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu">
          Read profile →
        </span>
      </div>
    </Link>
  );
}

function HotCardThumb({
  src,
  name,
  tier,
}: {
  src: string | null;
  name: string;
  tier: 1 | 2 | 3;
}) {
  if (!src) {
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-sepia/20 bg-ermine">
        <div className="absolute inset-0 flex items-center justify-center">
          <RosetteRow tier={tier} size={14} className="opacity-60" />
        </div>
      </div>
    );
  }
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-sepia/20 bg-ermine">
      <Image
        src={src}
        alt={name}
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover transition-transform duration-[280ms] ease-paper group-hover:scale-[1.03]"
      />
    </div>
  );
}

function FlameDot() {
  // Tiny filled disc echoing the rosette ink — keeps the badge visually
  // tied to the page's pin glyph language without inventing a new icon.
  return (
    <svg viewBox="0 0 8 8" width="6" height="6" aria-hidden="true">
      <circle cx="4" cy="4" r="3" fill="var(--color-michelin-red)" />
    </svg>
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

function todayIso(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
