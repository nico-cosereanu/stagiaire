/*
 * Inked rosette — Stagiaire's pin glyph for Michelin star tiers.
 * Rendered as a small SVG. See docs/design-direction.md §3.
 *
 *   1-star: filled disc + single hairline outer ring (oak-gall)
 *   2-star: filled disc + two hairline outer rings (oak-gall)
 *   3-star: filled red disc + gold-leaf inner hairline ring
 *
 * 3-star is the only place Michelin red appears decoratively in
 * the entire product.
 */

type RosetteProps = {
  tier: 1 | 2 | 3;
  size?: number;
  className?: string;
};

export function Rosette({ tier, size = 24, className }: RosetteProps) {
  const label = `${tier}-Michelin-star marker`;

  if (tier === 3) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        aria-label={label}
        role="img"
      >
        <circle cx="12" cy="12" r="9" fill="var(--color-michelin-red)" />
        <circle
          cx="12"
          cy="12"
          r="5.5"
          fill="none"
          stroke="var(--color-gold-leaf)"
          strokeWidth="0.75"
          opacity="0.6"
        />
      </svg>
    );
  }

  if (tier === 2) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        aria-label={label}
        role="img"
      >
        <circle cx="12" cy="12" r="3.5" fill="var(--color-oak-gall)" />
        <circle
          cx="12"
          cy="12"
          r="6"
          fill="none"
          stroke="var(--color-oak-gall)"
          strokeWidth="0.75"
        />
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="var(--color-oak-gall)"
          strokeWidth="0.75"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-label={label}
      role="img"
    >
      <circle cx="12" cy="12" r="3.5" fill="var(--color-oak-gall)" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="var(--color-oak-gall)" strokeWidth="0.75" />
    </svg>
  );
}

/*
 * Small horizontal row of rosettes (e.g., three rosettes for a 3-star).
 * Used in the public restaurant header where star tier should read at a glance.
 */
export function RosetteRow({ tier, size = 14 }: { tier: 1 | 2 | 3; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${tier}-Michelin-star`}>
      {Array.from({ length: tier }).map((_, i) => (
        <Rosette key={i} tier={tier} size={size} />
      ))}
    </span>
  );
}
