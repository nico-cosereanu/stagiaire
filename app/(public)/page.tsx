import Link from "next/link";

import { Rosette } from "@/components/ui/rosette";

/*
 * Type + color specimen — not a real landing page yet. Will be replaced
 * with the marketing landing once /map and the request flow exist.
 * Kept here as a visual gut-check for the design tokens.
 */

const colorTokens = [
  { name: "vellum", hex: "#F4ECD8", role: "page background", swatchClass: "bg-vellum" },
  { name: "vellum-aged", hex: "#EBE0C5", role: "hover, alt rows", swatchClass: "bg-vellum-aged" },
  { name: "ermine", hex: "#FAF6E9", role: "elevated cards", swatchClass: "bg-ermine" },
  { name: "oak-gall", hex: "#1F1A12", role: "primary text", swatchClass: "bg-oak-gall" },
  { name: "oak-gall-soft", hex: "#2D2417", role: "long-form body", swatchClass: "bg-oak-gall-soft" },
  { name: "sepia", hex: "#8B6F47", role: "secondary, hairlines", swatchClass: "bg-sepia" },
  { name: "sepia-faint", hex: "#B89F7A", role: "tertiary, disabled", swatchClass: "bg-sepia-faint" },
  { name: "cordon-bleu", hex: "#1B2C5C", role: "primary action", swatchClass: "bg-cordon-bleu" },
  { name: "cordon-bleu-dark", hex: "#0F1A38", role: "action hover/pressed", swatchClass: "bg-cordon-bleu-dark" },
  { name: "cordon-bleu-wash", hex: "#E8EAF1", role: "hover bg, pill bg", swatchClass: "bg-cordon-bleu-wash" },
  { name: "michelin-red", hex: "#B0151A", role: "3-star, alerts", swatchClass: "bg-michelin-red" },
  { name: "crimson-wash", hex: "#C97D7A", role: "territorial wash", swatchClass: "bg-crimson-wash" },
  { name: "gold-leaf", hex: "#B58A3A", role: "verified, wax seal", swatchClass: "bg-gold-leaf" },
  { name: "verdigris", hex: "#6B7A55", role: "rare success", swatchClass: "bg-verdigris" },
];

function LedgerRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="inline-flex items-end gap-1.5" aria-label={`${value} of ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`block h-3 ${i < value ? "bg-oak-gall" : "bg-sepia-faint"}`}
          style={{ width: i < value ? "1.5px" : "1px" }}
        />
      ))}
    </div>
  );
}

export default function SpecimenPage() {
  return (
    <main className="min-h-screen bg-vellum text-oak-gall">
      <div className="mx-auto max-w-4xl px-8 py-20">
        {/* Header */}
        <header className="mb-20 border-b border-sepia/30 pb-10">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            Stagiaire &middot; Design specimen
          </p>
          <h1 className="mt-4 font-headline text-8xl leading-[1.0] tracking-tight text-oak-gall">
            Vellum &amp; oak gall
          </h1>
          <p className="mt-6 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
            A visual gut-check for the design tokens defined in{" "}
            <code className="font-mono text-sm text-cordon-bleu">docs/design-direction.md</code>. No
            real content lives here &mdash; this page exists only to confirm the typography and
            palette feel right before any feature is built on top of them.
          </p>
        </header>

        {/* See it in real use */}
        <section className="mb-20">
          <h2 className="mb-3 font-serif text-3xl font-light text-oak-gall">See it in real use</h2>
          <p className="mb-6 max-w-prose font-serif text-base leading-relaxed text-oak-gall-soft">
            The same tokens applied to actual restaurants from the seeded directory (658 France-
            starred restaurants, all with coords and Michelin-written descriptions):
          </p>
          <ul className="space-y-2 font-serif">
            <li>
              <Link
                href="/r/le-clos-des-sens-annecy"
                className="text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
              >
                Le Clos des Sens
              </Link>
              <span className="ml-2 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                3-star &middot; Annecy
              </span>
            </li>
            <li>
              <Link
                href="/r/la-villa-madie-cassis"
                className="text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
              >
                La Villa Madie
              </Link>
              <span className="ml-2 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                3-star &middot; Cassis
              </span>
            </li>
            <li>
              <Link
                href="/r/le-1947-a-cheval-blanc-courchevel"
                className="text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
              >
                Le 1947 à Cheval Blanc
              </Link>
              <span className="ml-2 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                3-star &middot; Courchevel
              </span>
            </li>
          </ul>
        </section>

        {/* Color */}
        <section className="mb-20">
          <h2 className="mb-6 font-serif text-3xl font-light text-oak-gall">Color</h2>
          <div className="grid grid-cols-1 gap-px bg-sepia/20 sm:grid-cols-2">
            {colorTokens.map((c) => (
              <div key={c.name} className="flex items-center gap-4 bg-vellum px-4 py-3">
                <div
                  className={`${c.swatchClass} h-10 w-10 shrink-0 ring-1 ring-inset ring-sepia/40`}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-sans text-[13px] font-medium text-oak-gall">{c.name}</div>
                  <div className="font-mono text-[11px] text-sepia">{c.hex}</div>
                </div>
                <div className="font-sans text-[11px] uppercase tracking-wider text-sepia">
                  {c.role}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="mb-20">
          <h2 className="mb-6 font-serif text-3xl font-light text-oak-gall">Typography</h2>
          <div className="space-y-10">
            <Spec label="Hero — Opsmarckt, 96px (restaurant name)">
              <p className="font-headline text-8xl leading-none tracking-tight">
                Mirazur, Menton
              </p>
            </Spec>

            <Spec label="Section H2 — Source Serif 4 Light, 36px">
              <p className="font-serif text-4xl font-light">The team</p>
            </Spec>

            <Spec label="Restaurant name on card — Opsmarckt, 32px">
              <p className="font-headline text-3xl">L&rsquo;Arpège</p>
            </Spec>

            <Spec label="Body — Source Serif 4, 16/1.6 with old-style figures">
              <p className="font-serif text-base leading-relaxed text-oak-gall-soft">
                A young cook in Mexico City pulls up the globe, finds Mirazur on the cliffs above
                Menton, sees the team, and requests a two-week stage in March 2026. The chef
                replies the same evening.
              </p>
            </Spec>

            <Spec label="Tag / category — Inter Small Caps, 11px, +0.18em">
              <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
                Michelin &middot; 3 stars &middot; Côte d&rsquo;Azur
              </p>
            </Spec>

            <Spec label="Marquee CTA label — Opsmarckt, 24px">
              <p className="font-headline text-2xl">Request a stage</p>
            </Spec>

            <Spec label="Mono — JetBrains Mono, 12px (timestamps, IDs)">
              <p className="font-mono text-xs text-sepia">
                req_3f8c91b0 &middot; 2026-05-01 14:22 UTC
              </p>
            </Spec>
          </div>
        </section>

        {/* Pins */}
        <section className="mb-20">
          <h2 className="mb-6 font-serif text-3xl font-light text-oak-gall">Pin tiers</h2>
          <div className="flex items-center gap-12">
            <PinDemo tier={1} label="1-star" />
            <PinDemo tier={2} label="2-star" />
            <PinDemo tier={3} label="3-star" />
          </div>
          <p className="mt-6 max-w-prose font-serif text-sm text-sepia">
            Rosettes drawn as inked map marks rather than filled UI discs. 3-star is the only place
            Michelin red appears decoratively in the entire product, with a hairline gold-leaf
            inner ring.
          </p>
        </section>

        {/* Ratings */}
        <section className="mb-20">
          <h2 className="mb-6 font-serif text-3xl font-light text-oak-gall">Ratings</h2>
          <div className="space-y-3">
            {[
              { label: "Learning quality", value: 5 },
              { label: "Kitchen culture", value: 4 },
              { label: "Brigade discipline", value: 5 },
              { label: "Hygiene", value: 4 },
              { label: "Leadership", value: 3 },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-6">
                <LedgerRating value={r.value} />
                <span className="font-serif text-sm text-oak-gall-soft">{r.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-prose font-serif text-sm text-sepia">
            Ledger-tick treatment instead of gold stars &mdash; stars are Michelin&rsquo;s
            pictography and would muddy the brand on our own reviews.
          </p>
        </section>

        {/* Buttons */}
        <section className="mb-20">
          <h2 className="mb-6 font-serif text-3xl font-light text-oak-gall">Buttons</h2>

          <div className="space-y-10">
            <div>
              <p className="mb-3 font-sans text-[11px] uppercase tracking-wider text-sepia">
                Primary &mdash; standard action
              </p>
              <button
                type="button"
                className="bg-cordon-bleu px-6 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu"
              >
                Submit request
              </button>
            </div>

            <div>
              <p className="mb-3 font-sans text-[11px] uppercase tracking-wider text-sepia">
                Marquee CTA &mdash; the most important button in the product
              </p>
              <button
                type="button"
                className="group relative flex h-16 w-full max-w-sm items-center justify-center gap-3 bg-cordon-bleu px-6 font-headline text-2xl text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-1 border border-gold-leaf/50 transition-opacity duration-[120ms] ease-paper group-hover:border-gold-leaf/70"
                />
                <span
                  aria-hidden
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-gold-leaf/70 transition-transform duration-[120ms] ease-paper group-hover:translate-y-px"
                >
                  <span className="font-headline text-[9px] leading-none text-cordon-bleu-dark">
                    S
                  </span>
                </span>
                <span>Request a stage</span>
              </button>
            </div>

            <div>
              <p className="mb-3 font-sans text-[11px] uppercase tracking-wider text-sepia">
                Secondary &mdash; text link with offset hairline
              </p>
              <a
                href="#"
                className="font-sans text-sm text-cordon-bleu underline decoration-cordon-bleu decoration-1 underline-offset-[3px] transition-opacity duration-[120ms] ease-paper hover:opacity-80"
              >
                View profile
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-sepia/30 pt-6">
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
            v0 &middot; planning phase &middot; not a real landing page
          </p>
        </footer>
      </div>
    </main>
  );
}

function Spec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 font-sans text-[11px] uppercase tracking-wider text-sepia">{label}</p>
      {children}
    </div>
  );
}

function PinDemo({ tier, label }: { tier: 1 | 2 | 3; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Rosette tier={tier} />
      <span className="font-sans text-[11px] uppercase tracking-wider text-sepia">{label}</span>
    </div>
  );
}
