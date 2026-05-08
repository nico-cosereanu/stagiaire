"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState } from "react";

import { RosetteRow } from "@/components/ui/rosette";

import { saveProfileAction, type SaveProfileResult } from "../actions";

/*
 * Inline editor that mirrors the live /r/[slug] page. Locked fields
 * (hero, name, stars, address, head chef) render exactly as they do
 * publicly. Editable fields render as bare inputs/textareas styled to
 * blend with the surrounding type — a dashed underline is the only
 * visual cue, until focus shows the active outline.
 *
 * The whole page is a single form. A sticky save bar at the bottom
 * commits all fields at once.
 */

export type ProfileFormProps = {
  slug: string;
  restaurant: {
    name: string;
    stars: 1 | 2 | 3;
    city: string | null;
    address: string;
    headChef: string | null;
    heroImageUrl: string | null;
    blurb: string | null;
    longDescription: string | null;
    websiteUrl: string | null;
    instagramHandle: string | null;
    menuUrl: string | null;
    cuisineTags: string[] | null;
  };
};

export function ProfileForm({ slug, restaurant }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState<SaveProfileResult | null, FormData>(
    saveProfileAction,
    null,
  );

  const fieldError = (
    name: "blurb" | "longDescription" | "websiteUrl" | "instagramHandle" | "menuUrl" | "cuisineTags",
  ) => state?.ok === false && state.field === name;

  const tier = restaurant.stars;
  const starWord = tier === 1 ? "1 star" : `${tier} stars`;

  return (
    <form action={formAction}>
      {/* Hero — locked */}
      <RestaurantHero src={restaurant.heroImageUrl} name={restaurant.name} tier={tier} />

      {/* Tag bar — locked */}
      <div className="mb-6 mt-12 flex items-center gap-3">
        <RosetteRow tier={tier} size={14} />
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          <span>Michelin</span>
          <span className="mx-2 text-sepia-faint">·</span>
          <span>{starWord}</span>
          {restaurant.city && (
            <>
              <span className="mx-2 text-sepia-faint">·</span>
              <span>{restaurant.city}</span>
            </>
          )}
        </p>
      </div>

      {/* Name — locked */}
      <h1 className="font-display text-6xl italic leading-[0.95] tracking-tight text-oak-gall sm:text-7xl">
        {restaurant.name}
      </h1>

      {/* Tagline (blurb) — editable */}
      <div className="mt-6">
        <FieldLabel>Tagline</FieldLabel>
        <textarea
          name="blurb"
          defaultValue={restaurant.blurb ?? ""}
          rows={2}
          maxLength={280}
          placeholder="A 14-seat counter where the pass is the dining room."
          className={inlineTextareaClasses(
            "font-serif text-xl italic leading-snug text-oak-gall-soft sm:text-2xl",
            fieldError("blurb"),
          )}
        />
      </div>

      {/* Facts grid — Address / Head chef are locked, rest editable */}
      <section className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 md:grid-cols-3">
        <Fact label="Address" locked>
          <p className="font-serif text-base leading-relaxed text-oak-gall-soft">
            {restaurant.address}
          </p>
        </Fact>

        <Fact label="Head chef" locked>
          <p
            className={`font-serif text-base ${
              restaurant.headChef ? "text-oak-gall-soft" : "text-sepia-faint"
            }`}
          >
            {restaurant.headChef ?? "—"}
          </p>
        </Fact>

        <Fact label="Cuisine" hint="Comma-separated. Up to 8.">
          <input
            type="text"
            name="cuisineTags"
            defaultValue={(restaurant.cuisineTags ?? []).join(", ")}
            placeholder="modern French, seasonal"
            className={inlineInputClasses(
              "font-serif text-base text-oak-gall-soft",
              fieldError("cuisineTags"),
            )}
          />
        </Fact>

        <Fact label="Website">
          <input
            type="url"
            name="websiteUrl"
            defaultValue={restaurant.websiteUrl ?? ""}
            placeholder="https://your-restaurant.com"
            className={inlineInputClasses(
              "font-serif text-base text-cordon-bleu",
              fieldError("websiteUrl"),
            )}
          />
        </Fact>

        <Fact label="Instagram" hint="Handle, without the @.">
          <input
            type="text"
            name="instagramHandle"
            defaultValue={restaurant.instagramHandle ?? ""}
            placeholder="septime_paris"
            className={inlineInputClasses(
              "font-serif text-base text-cordon-bleu",
              fieldError("instagramHandle"),
            )}
          />
        </Fact>

        <Fact label="Menu" hint="Direct URL to a menu page or PDF.">
          <input
            type="url"
            name="menuUrl"
            defaultValue={restaurant.menuUrl ?? ""}
            placeholder="https://your-restaurant.com/menu.pdf"
            className={inlineInputClasses(
              "font-serif text-base text-cordon-bleu",
              fieldError("menuUrl"),
            )}
          />
        </Fact>
      </section>

      <hr className="my-16 border-0 border-t border-sepia/30" />

      {/* About — editable */}
      <section className="mb-16">
        <h2 className="mb-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          About the restaurant
        </h2>
        <textarea
          name="longDescription"
          defaultValue={restaurant.longDescription ?? ""}
          rows={10}
          maxLength={8000}
          placeholder="Tell stagiaires about the kitchen, the brigade, and what a day looks like."
          className={inlineTextareaClasses(
            "font-serif text-base leading-relaxed text-oak-gall-soft",
            fieldError("longDescription"),
          )}
        />
      </section>

      <hr className="my-16 border-0 border-t border-sepia/30" />

      {/* Team — empty state, mirrors live profile */}
      <section className="mb-16">
        <h2 className="mb-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          The team
        </h2>
        <div className="rounded-xl border border-sepia/30 px-6 py-8">
          <p className="font-serif text-sm italic text-sepia">
            Brigade editor coming soon. For now, mention the team in the description above.
          </p>
        </div>
      </section>

      {/* Reviews — empty state, mirrors live profile */}
      <section className="mb-16">
        <h2 className="mb-6 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Kitchen-side reviews
        </h2>
        <div className="rounded-xl border border-sepia/30 px-6 py-8">
          <p className="font-serif text-sm italic text-sepia">
            Reviews are written by stagiaires after a completed stage. They&rsquo;ll appear here
            automatically.
          </p>
        </div>
      </section>

      {state?.ok === false && (
        <p
          role="alert"
          className="mb-6 border border-michelin-red/40 bg-michelin-red/5 px-4 py-2.5 font-serif text-sm text-michelin-red"
        >
          {state.error}
        </p>
      )}

      {/* Sticky save bar */}
      <div className="sticky bottom-4 z-10 mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sepia/30 bg-white/95 px-5 py-4 shadow-[0_8px_30px_-12px_rgba(43,38,26,0.25)] backdrop-blur">
        <div className="flex items-baseline gap-4">
          {state?.ok ? (
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-verdigris">
              Saved · live now
            </p>
          ) : (
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
              Editing /r/{slug}
            </p>
          )}
          <Link
            href={`/r/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="font-sans text-[11px] uppercase tracking-[0.18em] text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
          >
            View public profile ↗
          </Link>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-cordon-bleu px-7 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu disabled:cursor-not-allowed disabled:bg-sepia-faint"
        >
          {isPending ? "Saving…" : "Save & publish"}
        </button>
      </div>
    </form>
  );
}

function Fact({
  label,
  hint,
  locked,
  children,
}: {
  label: string;
  hint?: string;
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">{label}</p>
        {locked && (
          <span className="font-sans text-[10px] uppercase tracking-[0.16em] text-sepia-faint">
            · locked
          </span>
        )}
      </div>
      {children}
      {hint && <p className="mt-1.5 font-serif text-xs text-sepia">{hint}</p>}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">{children}</p>
  );
}

function inlineInputClasses(typeClasses: string, invalid: boolean): string {
  return `block w-full bg-transparent border-b border-dashed py-1.5 px-0 placeholder:text-sepia-faint focus:outline-none transition-colors duration-[120ms] ease-paper ${typeClasses} ${
    invalid
      ? "border-michelin-red/60 focus:border-michelin-red"
      : "border-sepia/40 hover:border-cordon-bleu/60 focus:border-cordon-bleu"
  }`;
}

function inlineTextareaClasses(typeClasses: string, invalid: boolean): string {
  return `block w-full resize-none bg-transparent border-b border-dashed py-2 px-0 placeholder:text-sepia-faint focus:outline-none transition-colors duration-[120ms] ease-paper ${typeClasses} ${
    invalid
      ? "border-michelin-red/60 focus:border-michelin-red"
      : "border-sepia/40 hover:border-cordon-bleu/60 focus:border-cordon-bleu"
  }`;
}

function RestaurantHero({
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
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-sepia/30 bg-ermine">
        <div className="absolute inset-0 flex items-center justify-center">
          <RosetteRow tier={tier} size={20} className="opacity-60" />
        </div>
      </div>
    );
  }
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden border border-sepia/30 bg-ermine">
      <Image
        src={src}
        alt={name}
        fill
        priority
        sizes="(min-width: 768px) 768px, 100vw"
        className="object-cover"
      />
    </div>
  );
}
