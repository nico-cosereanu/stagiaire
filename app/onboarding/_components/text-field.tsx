/*
 * Shared form field for onboarding steps. Vellum-grounded input with
 * sepia hairline border, Source Serif body font.
 */

export function TextField({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  invalid,
  hint,
  autoFocus,
  autoComplete,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  invalid?: boolean;
  hint?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        {label}
      </span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-white px-4 py-3 font-serif text-base text-oak-gall shadow-[0_1px_2px_rgba(43,38,26,0.04)] transition-shadow duration-[120ms] ease-paper placeholder:text-sepia-faint hover:shadow-[0_2px_10px_-4px_rgba(43,38,26,0.12)] focus:shadow-[0_2px_10px_-4px_rgba(43,38,26,0.12)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu ${
          invalid ? "border-michelin-red/60" : "border-sepia/40"
        }`}
      />
      {hint && <span className="mt-2 block font-serif text-xs text-sepia">{hint}</span>}
    </label>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  required,
  invalid,
  hint,
  placeholder,
  rows = 5,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  invalid?: boolean;
  hint?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        rows={rows}
        className={`w-full resize-none rounded-xl border bg-white px-4 py-3 font-serif text-base leading-relaxed text-oak-gall shadow-[0_1px_2px_rgba(43,38,26,0.04)] transition-shadow duration-[120ms] ease-paper placeholder:text-sepia-faint hover:shadow-[0_2px_10px_-4px_rgba(43,38,26,0.12)] focus:shadow-[0_2px_10px_-4px_rgba(43,38,26,0.12)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu ${
          invalid ? "border-michelin-red/60" : "border-sepia/40"
        }`}
      />
      {hint && <span className="mt-2 block font-serif text-xs text-sepia">{hint}</span>}
    </label>
  );
}

export function ContinueButton({ pending, label = "Continue" }: { pending: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 items-center justify-center rounded-lg bg-cordon-bleu px-8 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu disabled:cursor-not-allowed disabled:bg-sepia-faint"
    >
      {pending ? "Saving…" : `${label} →`}
    </button>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="border border-michelin-red/40 bg-michelin-red/5 px-4 py-2.5 font-serif text-sm text-michelin-red"
    >
      {message}
    </p>
  );
}
