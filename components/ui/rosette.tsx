/*
 * Star-tier glyph — sitewide.
 *
 * One small filled red dot per Michelin star: 1★ = one dot, 2★ = two,
 * 3★ = three. Replaces the older inked-rosette SVG everywhere because
 * the count itself is the easiest-to-read distinguisher at small sizes
 * (and on the map at glance).
 *
 *   Rosette     — single red dot. Use for fallback/decorative spots
 *                 where a generic "Michelin" mark is wanted.
 *   RosetteRow  — N dots based on tier. The canonical tier indicator;
 *                 use in headers, cards, list rows.
 */

type RosetteProps = {
  size?: number;
  className?: string;
};

export function Rosette({ size = 10, className = "" }: RosetteProps) {
  return (
    <span
      aria-hidden
      className={`inline-block rounded-full bg-michelin-red ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function RosetteRow({
  tier,
  size = 10,
  className = "",
}: {
  tier: 1 | 2 | 3;
  size?: number;
  className?: string;
}) {
  const gap = Math.max(2, Math.round(size * 0.3));
  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{ gap }}
      aria-label={`${tier}-Michelin-star`}
    >
      {Array.from({ length: tier }).map((_, i) => (
        <Rosette key={i} size={size} />
      ))}
    </span>
  );
}
