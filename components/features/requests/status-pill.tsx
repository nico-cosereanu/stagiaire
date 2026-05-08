import { statusLabel, statusTone, type StageRequestStatus } from "@/lib/requests";

/*
 * Hairline-bordered status chip. Tone shifts the border + text color so
 * the inbox can be read in one scan: positive = blue, warning = gold,
 * danger = red, neutral = sepia.
 */

export function StatusPill({ status, size = "sm" }: { status: StageRequestStatus; size?: "sm" | "md" }) {
  const tone = statusTone(status);
  const toneClasses =
    tone === "positive"
      ? "border-cordon-bleu/50 text-cordon-bleu"
      : tone === "warning"
        ? "border-gold-leaf/60 text-gold-leaf"
        : tone === "danger"
          ? "border-michelin-red/50 text-michelin-red"
          : tone === "muted"
            ? "border-sepia/30 text-sepia-faint"
            : "border-sepia/40 text-sepia";
  const sizeClasses =
    size === "md"
      ? "px-2.5 py-1 text-[11px] tracking-[0.18em]"
      : "px-2 py-0.5 text-[10px] tracking-[0.14em]";

  return (
    <span
      className={`inline-flex items-center border font-sans font-medium uppercase ${toneClasses} ${sizeClasses}`}
    >
      {statusLabel(status)}
    </span>
  );
}
