# Stagiaire — Design direction

A synthesis of the visual direction read from `inspiration/`, `PLAN.md` §18, and the conversation that produced this document. This is the source of truth for typography, color, globe aesthetic, photography, motion, and key UI moments. When code-level decisions need to be made (component spacing, exact transition curves, fallback fonts), refer back here before improvising.

The product reference points are: a 16th-century atlas opened in a quiet library, a Le Cordon Bleu wax seal, *The Taste of Things*' kitchen, and Stripe Press / Apartamento web restraint. We are building a piece of editorial software, not a marketplace.

---

## 1. Typography

Three faces, each with a defined role. The serif does the talking; the chancery italic carries the romance; the grotesque exists only where the eye needs to scan quickly.

### Body serif — `GT Sectra` (paid) / `Source Serif 4` (free fallback)

The body face for paragraphs, blurbs, profile copy, restaurant names in lists. Old-style figures, calligraphic terminals, real italic that's a different drawing rather than a slanted regular. Justified by `typography/typography_01.png` — a humanist Caslon-style specimen with old-style figures and a true italic ampersand.

- **Recommended:** GT Sectra (Grilli Type). Standard for body, Display for headlines. The cuts are calibrated together and the chancery italic is genuinely calligraphic.
- **Free fallback:** Source Serif 4 by Frank Grießhammer (Adobe, OFL). Drawn from Fournier/Caslon roots, has optical sizes, ships with old-style figures.
- **Reject:** EB Garamond (too bookish, italic is anemic), Lora (too soft), anything from Google's "humanist serif" default rotation.

Body sizes: 16/1.6 for long-form (restaurant blurbs, reviews), 14/1.5 for dense panels (request lists, message threads). Old-style figures (`font-feature-settings: "onum"`) on by default; switch to lining figures only inside data tables.

### Display chancery — `Fraunces` (free, variable) / `GT Alpina` (paid alternative)

The calligraphic display face. Used for hero headlines, restaurant names on profile pages, globe region labels at low zoom, and any single-line "moment" typography (the request-stage CTA, the wax-seal-feel section dividers).

- **Recommended:** Fraunces (OFL, variable, by Phaedra Charles & David Jonathan Ross). Has a `slnt` axis, a `SOFT` axis, and a true cancellaresca italic. Free, modern, surprisingly close to the chancery shown in `typography/typography_02.png` (the 1574 quill-cutting plate).
- **Paid alternative:** GT Alpina with the Italic Standard cut for general moments and Italic Standard at heavier weights for big headlines.
- **Reject:** Playfair Display (too didone, terminals are too sharp), Cormorant (drifts too brittle at large sizes), anything labeled "script."

Use chancery italic at three sizes only: 56–72px (page heroes), 32–40px (restaurant names on cards/profiles), and 18–22px (decorative section openers and the primary CTA label). Never below 18px — chancery italic at 14px is illegible. Track tightly: -0.01em at hero size, 0 at mid, +0.01em at the smallest.

### Grotesque (UI) — `Söhne` (paid) / `Inter` (free fallback)

For forms, dashboards, message threads, button labels, navigation, dates, anywhere the eye is scanning rather than reading. Editorial restraint means there is *less* of this face than people are used to — most "UI" copy on this product can be set in the serif.

- **Recommended:** Söhne (Klim Type Foundry). Editorial grotesque with real italics and proper small caps. Buy.
- **Free fallback:** Inter Variable (OFL, Rasmus Andersson). Workaday, but with `cv11` enabled it gets you tabular figures and proper alternates.
- **Mono:** Söhne Mono → JetBrains Mono fallback. Used for timestamps, request IDs, short codes (e.g. claim verification codes), and the audit-log surface in admin.

Sans is set tighter than serif: 13/1.5 typical, 11px small caps for category tags ("MICHELIN", "VERIFIED", "1-STAR"). Never set body paragraphs in sans. If you find yourself reaching for it, you're probably reaching for the wrong tone.

### Hierarchy at a glance

| Surface | Face | Size / treatment |
|---|---|---|
| Page hero (H1) | Fraunces Italic Display | 64–72px, tracking -0.01em |
| Section H2 | GT Sectra Display Light | 36px |
| Restaurant name on card | Fraunces Italic Display | 32px |
| Body paragraph | GT Sectra Text Regular | 16/1.6, old-style figures |
| Tag / category | Söhne Small Caps | 11px, +0.08em |
| Form label | Söhne Regular | 12px |
| Button (primary) | Söhne Medium | 13px, +0.04em, uppercase |
| Button (marquee, e.g. "Request Stage") | Fraunces Italic Display | 20px, no tracking |
| Code / timestamps / IDs | Söhne Mono | 12px |

---

## 2. Color palette

A 12-color system with explicit roles. Deep navy is the primary action color (Cordon Bleu lineage, confirmed); Michelin red is reserved exclusively for 3-star markers and destructive/alert states. Gold leaf is decorative-only and never sits behind text. Verdigris is the rare success accent. Everything else is parchment and ink.

### Surfaces

| Token | Hex | Role |
|---|---|---|
| `--vellum` | `#F4ECD8` | Default page background. Warm parchment off-white. |
| `--vellum-aged` | `#EBE0C5` | Hover backgrounds, secondary surfaces, alternating rows. |
| `--ermine` | `#FAF6E9` | Elevated surfaces — cards on the globe, modal panels, drawers. |

### Inks (text, rules, strokes)

| Token | Hex | Role |
|---|---|---|
| `--oak-gall` | `#1F1A12` | Primary text. Deep brown-black, never pure black. |
| `--oak-gall-soft` | `#2D2417` | Long-form body where `--oak-gall` reads as too heavy. |
| `--sepia` | `#8B6F47` | Secondary text, captions, hairline rules. |
| `--sepia-faint` | `#B89F7A` | Tertiary text, disabled states, watermark hints. |

### Cordon Bleu (primary action)

| Token | Hex | Role |
|---|---|---|
| `--cordon-bleu` | `#1B2C5C` | Primary action color. Buttons, links, focus rings. |
| `--cordon-bleu-dark` | `#0F1A38` | Hover/pressed states for primary actions. |
| `--cordon-bleu-wash` | `#E8EAF1` | Hover backgrounds, pill backgrounds, active row tint. |

### Reserved accents

| Token | Hex | Role |
|---|---|---|
| `--michelin-red` | `#B0151A` | 3-star pin fills only. Destructive confirmations. Error states. **Never** decorative. |
| `--crimson-wash` | `#C97D7A` | Subtle territorial wash on the globe (à la `globe_03.png`). Selection-highlight on map regions. |
| `--gold-leaf` | `#B58A3A` | Verified badge, wax-seal ornament on marquee CTAs, decorative drop caps. Never behind text. |
| `--verdigris` | `#6B7A55` | Success states (review submitted, claim approved). Rare. |

### Notes on usage

- **Default text on default background** = `--oak-gall` on `--vellum`. Contrast ratio 14.6:1, comfortably AAA.
- **Primary button** = `--vellum` text on `--cordon-bleu` background. 11.2:1, AAA.
- **3-star marker** = `--michelin-red` filled, `--gold-leaf` 1px inner ring. The only place red appears decoratively in the entire product.
- **Never** introduce a new color without it living in this list. If a new role appears (e.g., a "warning" amber), discuss before adding — there's a high chance an existing token already covers it.

---

## 3. Globe aesthetic

The globe is the most distinctive surface in the product and the one that has to convey "this is not Google Earth, this is an atlas." Every choice below is in service of that read.

### Surface

A three.js sphere with a custom shader sampling a procedurally-generated parchment texture (subtle fiber noise, faint foxing, very slight uneven coloration). The sphere is **not photographic** — there are no satellite tiles. Justified directly by `globe/globe_03.png` (the engraved France map): land and sea are the same parchment ground, distinguished by ink work, not color fills.

- **Land + ocean fill:** `--vellum` (`#F4ECD8`).
- **Coastlines:** `--oak-gall-soft` strokes at 1.25px world-space, drawn as copperplate hatching. Mirrors the engraved coastline treatment in `globe_03.png`.
- **Country borders:** dotted hairlines in `--sepia`, 0.75px, only visible at zoom level ≥ 4. Do not show borders at the globe-overview level — `globe_04.png` (Mercator's polar Septentrionalium) has none, and the silhouette of the continents reads more powerfully without them.
- **Graticule (lat/long lines):** very fine hairlines in `--sepia` at 8% opacity, only at zoom level ≥ 3. Reference: the pen-stroke graticule in `globe_04.png`.
- **Subtle ocean texture:** at low zoom only, a faint engraved hatching pattern in `--sepia` at 6% opacity, baked into the texture. At high zoom it dissolves into pure vellum so it doesn't compete with pins. Reference: the wave hatching in `globe_03.png`.

### Pins (tier markers)

PLAN §6 says pins differ by size; PLAN §18 wants 3-star in Michelin red. To avoid filled-disc-pasted-onto-parchment look, render pins as **inked rosettes**, not modern UI markers.

- **1-star:** small ink rosette in `--oak-gall`, 4.5px world-space. Single concentric ring.
- **2-star:** double rosette in `--oak-gall`, 5.5px. Two concentric rings.
- **3-star:** filled rosette in `--michelin-red`, 6.5px, with a 0.75px inner ring in `--gold-leaf` at 60% opacity. The only red on the globe.
- **Hover state:** rosette grows by 1px and emits a 14px-radius ink-bloom halo in the same color at 18% opacity, 250ms ease-out. The bloom is drawn as a soft radial gradient, not a stroke.
- **Active (selected) state:** the restaurant name appears in chancery italic (Fraunces Italic Display, 16px, `--oak-gall`) immediately to the right of the pin, connected by a 0.75px leader line in `--sepia`. Reference: the numbered place tags and lettering in `globe/globe_02.png` (the painted Eze village map).
- **Clustering at low zoom:** when ≥ 4 pins overlap, render a single rosette with the count below it set in Söhne Small Caps 10px, `--sepia`. Color of the cluster rosette is determined by the highest tier inside it.

### Margins / chrome

The globe view itself is mostly empty parchment. At the four corners, render a faint cartouche ornament — a small woodcut-style flourish in `--sepia` at 30% opacity, no larger than 80px. Reference: the four ornamental corner cartouches of `globe/globe_04.png`. Treat them as watermarks; they should not draw the eye.

A **compass rose** sits at bottom-left, ~96px diameter, drawn as fine engraving in `--oak-gall` at 70% opacity. It rotates with the globe's orientation. Reference: ornamental compasses are present in `globe_04.png`'s cartouches.

The **filter rail** (star tier, country, cuisine, language) lives top-left, set entirely in Söhne Small Caps. No chips with rounded corners; instead, hairline-underlined toggle words: `1-STAR`  `2-STAR`  `3-STAR`. Active state: oak-gall underline thickens from 0.75px to 1.5px and the text shifts from `--sepia` to `--oak-gall`. Inactive: `--sepia-faint`.

### Camera behavior

- Default state: gentle auto-rotation, 360° per ~120 seconds, easing imperceptibly. Pause on any user interaction; do not resume.
- Zoom: 8 discrete levels, smooth interpolation, no continuous wheel-zoom (creates motion sickness against the textured surface).
- Click-to-fly: when a pin is clicked, the camera glides to it along a great-circle arc with `cubic-bezier(0.32, 0.72, 0, 1)` deceleration, duration scaled by angular distance — minimum 600ms, maximum 1100ms. Like turning the page of an atlas, not like a Google Earth swoop.
- Reduced-motion: auto-rotation disabled; click-to-fly becomes an instant cut with a 200ms cross-fade.

---

## 4. Photography direction

Two registers, both confirmed: Vermeer-lit kitchen interiors and sun-on-stone Mediterranean exteriors. No documentary vérité, no overhead food porn, no corporate headshots, no staged lifestyle.

### Kitchen register

The mood lives in `photography/photography_02.png` (the *Taste of Things* prep table) and `photography_04.png` (candlelit dining alone). Heavily art-directed but feels real. The instruction is "Vermeer-lit real kitchens," not "documentary."

- **Lighting:** natural, side-lit, single-source where possible. South-facing windows in afternoon light; copper pots catching the warm. Candle and oil-lamp warmth in evening interiors. No ring lights, no flash, no even fill.
- **Composition:** still-life logic. Hands, prep boards, mortars, knives, herbs, bones, citrus skins, flour dust. The aftermath as much as the action. Empty frames where a person *just was*.
- **Color treatment:** lift shadows toward `--oak-gall` (warm dark) instead of pure black; warm highlights toward `--vellum` instead of pure white. Pull saturation 8–12% across the board. Subtle film grain at 2–3% — never more, never visible at a glance.
- **Crop:** 4:5 portrait for hero shots in cards and profile pages; 3:2 landscape for galleries; 16:9 only for the rare hero video on the landing page. Never 1:1 (Instagram-coded).

### Geographic register

Used sparingly — for the restaurant profile's location section, the about page, and the hero of regional landing pages. References: `photography/photography_05.png` (Menton harbor) and `photography_06.png` (Eze cliffs).

- **Subjects:** the village, the coastline, the alpine valley — never the building itself in a literal real-estate-photo way.
- **Time of day:** golden hour. Mediterranean light at 5pm. Avoid noon-sun postcard saturation; aim for the same desaturation treatment as the kitchen register so the two sit together.
- **Composition:** wide, restrained, lots of sky or sea. The restaurant is implied by the place, not shown.

### What we will not commission or use

- Overhead plated dishes. (Michelin Guide already owns that visual register; see `layout/layout_03.png`.)
- Chef portraits with crossed arms in front of the kitchen.
- Drone footage.
- Stock images of "fine dining."
- Anything filtered with a strong color grade (teal-orange, etc.).

---

## 5. Motion principles

Motion in this product is the exception, not the rule. The globe rotates and zooms; everything else is still or near-still. PLAN §18 calls this out and we hold the line.

### The single shared easing

Across the entire product, transitions use one curve:

```css
--ease-paper: cubic-bezier(0.32, 0.72, 0, 1);
```

Gentle, paper-like deceleration. Not Material Design's overshoot. Not iOS spring. One curve, used everywhere unless explicitly overridden (the only override is the great-circle arc on the globe, which uses the same curve but a longer duration).

### Allowed transitions

| Surface | Transition | Duration |
|---|---|---|
| Page change | Cross-fade only | 200ms |
| Modal / drawer open | Scale 0.98 → 1, opacity 0 → 1, no slide | 180ms |
| Hover on text link | Color shift only | 120ms |
| Hover on button | Background shift only | 120ms |
| Pin reveal on globe | Ink-bloom (radial scale + opacity) | 250ms |
| Pin click → camera fly | Great-circle arc | 600–1100ms (distance-scaled) |
| Form field focus | Border color + 1px ring | 120ms |
| Toast notification | Fade in, no slide | 150ms in, 250ms out, 4s visible |

### Forbidden patterns

- **No parallax**, anywhere.
- **No slide-in page transitions.**
- **No spinners.** Loading states use a 6px `--oak-gall` dot that breathes (opacity 1 → 0.4 → 1) once per second. That's it.
- **No bounce / overshoot.** The product is not playful in this register.
- **No scroll-jacking.** No scroll-triggered animations on the marketing pages, except the globe canvas itself.
- **No skeleton screens with shimmer.** If we need skeletons, they are static `--vellum-aged` rectangles.

### Reduced motion

`prefers-reduced-motion: reduce` disables: globe auto-rotation, modal scale (becomes pure opacity), the great-circle arc on the globe (becomes an instant cut with a cross-fade). The breathing loading dot becomes a static dot.

---

## 6. Concrete UI examples

Three surfaces described in prose, dense enough that the implementation should not require improvising.

### 6.1 Primary button (e.g. "Submit request" in a form)

A rectangle, 0px border-radius. Background `--cordon-bleu` (`#1B2C5C`); a 1px hairline in the same color sits at 50% opacity along the inner edge to give the impression of a stamped impression — visible only on close inspection. Label set in Söhne Medium 13px, +0.04em letter-spacing, uppercase, color `--vellum`.

Padding: 14px top/bottom, 24px left/right. The button is wider than it needs to be, on purpose — generous internal whitespace reads as confident, not cramped. Minimum width 160px even when the label is short.

States:
- Hover: background shifts to `--cordon-bleu-dark` over 120ms with `--ease-paper`. No scale, no shadow.
- Pressed: background stays `--cordon-bleu-dark`; an inset 1px shadow appears along the top edge in `--oak-gall` at 30%.
- Disabled: background `--sepia-faint`, label `--vellum` at 60%, cursor `not-allowed`. No hover.
- Focus: a 2px outline in `--cordon-bleu` offset by 3px, in addition to the existing border.

There is no "secondary button" in the gradient sense. A secondary action is rendered as a text link in `--cordon-bleu`, underlined with a 1px hairline that sits 3px below the baseline — the offset matters; default underline-offset reads cheap.

### 6.2 Restaurant card on the globe

When a pin is clicked, a card slides in from the right edge of the viewport — except it doesn't slide. It fades in over 180ms while scaling from 0.98 → 1 from its center. Anchored to `right: 24px; top: 50%; transform: translateY(-50%);` on desktop; full-width sheet from the bottom on mobile.

Dimensions: 384px wide, max-height 80vh with internal scroll if content overflows. Background `--ermine` (`#FAF6E9`). 1px hairline border in `--oak-gall` at 12% opacity. **No drop shadow** — instead a 12px outer glow in `--ermine` at 40% opacity to suggest lift without the modern card aesthetic.

Top of the card: a 4:5 hero photo, full-width, no rounded corners. Photo treated to the desaturation rules from §4. Below the photo, 24px of breathing room.

The star tier sits on the same line as the location, separated by a hairline middle dot (`·`). Stars are rendered as the same inked rosettes used on the globe, sized down to 12px each — one rosette for 1-star, three for 3-star. Next to them, in Söhne Small Caps 11px, `--sepia`: `MICHELIN` followed by the dot, then the city and country in Söhne Regular 11px also in `--sepia`.

The restaurant name is set in Fraunces Italic Display, 32px, `--oak-gall`, on the next line. This is the visual climax of the card; everything else supports it.

A two-sentence blurb follows in GT Sectra Text Regular, 15/1.6, `--oak-gall-soft`. 280 character soft cap.

A hairline rule (`--sepia-faint` at 50%, 1px) divides the blurb from the team section. The chef's name appears in Fraunces Italic Display 18px, role beneath in Söhne Regular 11px Small Caps `--sepia`. If a chef photo exists, it sits left of the name as a 40px circle, no border.

A second hairline rule. Three small textual links appear inline, separated by middle dots: `Website`, `Instagram`, `Open in map`. All set in Söhne Regular 12px, `--cordon-bleu`, with the 3px-offset hairline underline pattern from §6.1.

The card's primary action — "Request a stage" — is described separately below.

`View full profile →` is a tertiary text link beneath the primary action, set in Söhne Regular 12px, `--sepia`, with a chevron in matching color.

### 6.3 Request-stage CTA

This is a marquee call-to-action — the most important button in the product, the one that converts the entire experience into a piece of state. It deserves its own visual treatment, distinct from the primary button in §6.1.

Width: full width of the parent container (the card, in this case 336px after card padding). Height: 56px. Background `--cordon-bleu`, 0px radius. A 1px hairline border, inset 4px from the edge on all sides, in `--gold-leaf` at 50% opacity — this is the "stamped impression" detail and it is the *only* place gold-leaf hairlines appear on a button anywhere in the product.

Label: "Request a stage" set in Fraunces Italic Display 20px, `--vellum`, no tracking. The italic carries the romance; an uppercase grotesque label here would betray the moment.

To the left of the label, a 16px circular wax-seal ornament in `--gold-leaf` at 70% opacity, with a tiny `S` (for Stagiaire) embossed in the seal's center as a 1px engraved line in `--cordon-bleu-dark`. Optional, can be removed via a `feature: "seal"` flag if user testing reveals it reads as costume drama.

States:
- Hover: the wax seal "presses" — translates 1px down and the inset gold border shifts from 50% to 70% opacity. 120ms ease-paper. No background change. The button does not grow.
- Pressed: wax seal stays pressed, inset border at 90% opacity.
- Logged-out user: label changes to `Sign in to request`, wax-seal ornament replaced with a small key glyph in the same gold leaf. On click, opens the sign-in modal with the request as a return URL.
- Signed in but not ID-verified: button background dims to `--sepia` (not `--cordon-bleu`), label changes to `Verify ID to request`, wax-seal removed. On click, opens the Stripe Identity flow inline. After verification, the button restores to its full state and the original request flow resumes.
- Already requested for these dates: button is disabled and the label changes to `Requested · awaiting reply`, with a tertiary link beneath: `View thread →`.
- Restaurant has marked itself temporarily closed to requests: button disabled, label `Not accepting requests right now`, tertiary link beneath: `Get notified when they reopen →`.

On click, a drawer slides up from the bottom of the viewport — except again, it doesn't slide. It fades in over 180ms while translating up by 12px. Inside: the date picker (Airbnb-pattern UX from `layout/layout_02.png`, but visually re-skinned to vellum/oak-gall — the dates are set in Söhne tabular figures, the selected range is a 1px `--cordon-bleu` outline rather than a filled rounded chip, and "today" is marked with a tiny `--gold-leaf` rosette beneath the date, not a circle around it).

---

## 7. What we deliberately reject

Captured here so the design doesn't drift. Each of these is a real temptation; each one has been considered and turned down.

- **Rounded corners** on cards, buttons, modals, inputs. 2px radius maximum anywhere in the product, and ideally 0. The medieval-cartography register breaks the moment a `border-radius: 12px` appears.
- **Filled red primary buttons** (the Airbnb / Michelin Guide pattern from `layout/layout_01.png`–`layout_03.png`). Red is reserved for 3-star pins and destructive states only.
- **Drop shadows.** We use hairline borders and faint outer glows, never the modern soft-shadow card aesthetic.
- **Stock food photography.** Especially overhead plate shots.
- **Glass morphism, gradients, neumorphism, glow effects.** None of these belong in an atlas.
- **Emoji.** Anywhere. Not in copy, not in microcopy, not in error messages.
- **Star icons (★)** for the 1–5 review ratings. A filled gold star is Michelin's pictography and using it inside our own reviews muddies the brand. Use ledger-style ink ticks: a horizontal bar of five hairline marks in `--sepia`, with the rated portion overstroked in `--oak-gall`. Mock this up at implementation time and confirm before locking.
- **Skeuomorphic textures applied as CSS** (paper backgrounds tiled via `background-image: url(paper.jpg)`). The texture lives only inside the globe shader. Everywhere else is solid `--vellum`.
- **Animated micro-interactions** (button bounces, heart-fill animations, etc.). The product is restrained. Restraint is the point.
- **Loading spinners.** See §5.
- **A Spanish-Inquisition-style "premium" register** — gold flourishes everywhere, decorative drop caps on every paragraph, ornamental rules between every section. The atlas is restrained. One ornament per page is plenty; usually zero.

---

## 8. Open questions to resolve before code starts

These don't block writing this document but should be settled before we hit `npm create next-app`:

1. **Logo / wordmark.** PLAN §21 lists "logo direction or 'design it'" as an open input. Recommendation: a custom wordmark in Fraunces Italic Display lowercase, with a small wax-seal mark to the left of the `s`. Ship the wordmark as an SVG and never rasterize.
2. **Font licensing.** GT Sectra + Söhne are paid (Klim/Grilli). If the budget isn't there yet, the free fallback stack (Source Serif 4 + Fraunces + Inter) is genuinely good and we can ship on it for v0–v1.
3. **Star-rating glyph.** Confirm the ledger-tick approach in §7 before implementation; a stub mockup in Figma or a single component sketch is enough.
4. **Wax-seal ornament on the marquee CTA.** Confirm it doesn't read costume-drama in 2–3 user-testing sessions. Easy to disable behind a flag.
5. **Mobile-only treatment of the globe.** PLAN says web-only and mobile-responsive, not native — but the globe at 360px width is its own design problem. A dedicated mobile spec belongs in this document at a later date, after the desktop globe ships and we know what works.
