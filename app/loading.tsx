/*
 * Root-level loading fallback. Shown by the streaming runtime when a
 * server-rendered route is suspending. Quiet on purpose — most pages
 * resolve fast, so a spinner reads as broken; an italic mark feels like
 * a kitchen still plating.
 */

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-vellum text-oak-gall">
      <div className="flex flex-col items-center gap-3">
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Plating up
        </p>
        <p className="font-display text-4xl italic tracking-tight text-oak-gall/40">
          …
        </p>
      </div>
    </main>
  );
}
