"use client";

import { useActionState, useMemo, useState } from "react";

import type { ClosedWindow } from "@/db/schema";

import { saveClosuresAction, type SaveClosuresResult } from "../../windows/actions";

/*
 * Two-month calendar for managing the restaurant's closures.
 *
 * Add: click an open day to start, click another to commit a new
 *   closure range. Single-day closures are allowed (click the same
 *   day twice).
 * Existing closures render in red strike-through, mirroring the
 *   stagiaire-side view. Click on one to remove it (the whole range
 *   the cell belongs to).
 * The list below shows each closure with an editable reason and a
 *   remove button — that's where notes are filled in.
 *
 * Wraps a single hidden JSON `windows` field for the existing
 * saveClosuresAction (same shape as the windows-editor).
 */

type Row = ClosedWindow & { _key: string };

type Cursor = { year: number; month: number };

type CellData =
  | {
      iso: string;
      day: number;
      isClosed: boolean;
      past: boolean;
      isToday: boolean;
    }
  | null;

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function ClosuresCalendar({
  initialWindows,
  todayIso,
  slug,
}: {
  initialWindows: ClosedWindow[];
  todayIso: string;
  slug: string;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initialWindows.map((w) => ({ ...w, _key: crypto.randomUUID() })),
  );
  const [draftStart, setDraftStart] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const [tYear, tMonth] = todayIso.split("-").map(Number);
  const [cursor, setCursor] = useState<Cursor>({ year: tYear, month: tMonth - 1 });

  const [state, formAction, isPending] = useActionState<SaveClosuresResult | null, FormData>(
    saveClosuresAction,
    null,
  );

  // Sorted view for the list — keeps the original rows order untouched
  // so React state churn is minimal when the user adds/edits.
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [rows],
  );

  const closurefor = (iso: string) =>
    rows.find((r) => iso >= r.startDate && iso <= r.endDate) ?? null;

  function handleDayClick(iso: string) {
    const existing = closurefor(iso);
    if (existing) {
      // Click a closed day → remove that whole closure
      setRows((rs) => rs.filter((r) => r._key !== existing._key));
      setDraftStart(null);
      return;
    }
    if (!draftStart) {
      setDraftStart(iso);
      return;
    }
    const [start, end] =
      iso < draftStart ? [iso, draftStart] : [draftStart, iso];
    // Reject if the proposed range would overlap an existing closure
    if (rows.some((r) => start <= r.endDate && end >= r.startDate)) {
      setDraftStart(null);
      return;
    }
    setRows((rs) => [
      ...rs,
      { _key: crypto.randomUUID(), startDate: start, endDate: end, note: "" },
    ]);
    setDraftStart(null);
  }

  function updateRow(key: string, patch: Partial<ClosedWindow>) {
    setRows((rs) => rs.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r._key !== key));
  }

  // Effective preview range while the user has clicked a draftStart and
  // is hovering a later (or earlier) cell.
  const draftRange = useMemo(() => {
    if (!draftStart) return null;
    const target = hover ?? draftStart;
    return target < draftStart
      ? { start: target, end: draftStart }
      : { start: draftStart, end: target };
  }, [draftStart, hover]);

  const leftCells = useMemo(
    () => buildCells(cursor.year, cursor.month, rows, todayIso),
    [cursor, rows, todayIso],
  );
  const rightCursor = nextMonth(cursor);
  const rightCells = useMemo(
    () => buildCells(rightCursor.year, rightCursor.month, rows, todayIso),
    [rightCursor, rows, todayIso],
  );

  const payload = JSON.stringify(
    rows.map((r) => {
      const note = r.note?.trim();
      return note
        ? { startDate: r.startDate, endDate: r.endDate, note }
        : { startDate: r.startDate, endDate: r.endDate };
    }),
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="windows" value={payload} />

      {/* Hint */}
      <p className="font-serif text-sm text-oak-gall-soft">
        Click an open day to start, click another to mark the range closed. Click an existing
        red closure to remove it. Add a reason below.
      </p>

      {/* Calendar */}
      <div className="rounded-xl border border-sepia/30 bg-white p-4 shadow-[0_4px_20px_-8px_rgba(43,38,26,0.15)] sm:p-6">
        <div
          className="relative grid gap-x-12 gap-y-10 md:grid-cols-2"
          onMouseLeave={() => setHover(null)}
        >
          <button
            type="button"
            onClick={() => setCursor(prevMonth)}
            aria-label="Previous month"
            className="absolute -left-1 top-0 z-10 inline-flex h-8 w-8 items-center justify-center text-oak-gall transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(nextMonth)}
            aria-label="Next month"
            className="absolute -right-1 top-0 z-10 inline-flex h-8 w-8 items-center justify-center text-oak-gall transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
          >
            <Chevron direction="right" />
          </button>

          <Month
            label={monthLabel(cursor)}
            cells={leftCells}
            draftRange={draftRange}
            draftStart={draftStart}
            onPick={handleDayClick}
            onHover={setHover}
          />
          <Month
            label={monthLabel(rightCursor)}
            cells={rightCells}
            draftRange={draftRange}
            draftStart={draftStart}
            onPick={handleDayClick}
            onHover={setHover}
          />
        </div>
      </div>

      {/* List of closures */}
      <div>
        <h3 className="mb-3 font-sans text-[11px] uppercase tracking-[0.18em] text-sepia">
          Closures ({rows.length})
        </h3>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-sepia/30 bg-white px-6 py-8">
            <p className="font-serif text-sm italic text-sepia">
              No closures yet. Your kitchen reads as fully open — stagiaires can request any
              future date.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sortedRows.map((row) => (
              <li
                key={row._key}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-sepia/30 bg-white px-4 py-3 sm:flex-nowrap"
              >
                <p className="min-w-[180px] font-mono text-[11px] uppercase tracking-[0.12em] text-oak-gall">
                  {fmtRange(row.startDate, row.endDate)}
                </p>
                <input
                  type="text"
                  value={row.note ?? ""}
                  onChange={(e) => updateRow(row._key, { note: e.target.value })}
                  maxLength={140}
                  placeholder="Reason (optional)"
                  className="flex-1 border-b border-dashed border-sepia/40 bg-transparent px-0 py-1 font-serif text-sm text-oak-gall placeholder:text-sepia-faint focus:border-cordon-bleu focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeRow(row._key)}
                  className="font-sans text-[10px] uppercase tracking-[0.18em] text-sepia transition-colors duration-[120ms] ease-paper hover:text-michelin-red"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {state?.ok === false && (
        <p
          role="alert"
          className="border border-michelin-red/40 bg-michelin-red/5 px-4 py-2.5 font-serif text-sm text-michelin-red"
        >
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-6 border-t border-sepia/30 pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-cordon-bleu px-7 font-sans text-[13px] font-medium uppercase tracking-[0.04em] text-vellum transition-colors duration-[120ms] ease-paper hover:bg-cordon-bleu-dark focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cordon-bleu disabled:cursor-not-allowed disabled:bg-sepia-faint"
        >
          {isPending ? "Saving…" : "Save closures"}
        </button>
        {state?.ok && (
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-verdigris">
            Saved · live on /r/{slug}
          </p>
        )}
      </div>
    </form>
  );
}

function Month({
  label,
  cells,
  draftRange,
  draftStart,
  onPick,
  onHover,
}: {
  label: string;
  cells: CellData[];
  draftRange: { start: string; end: string } | null;
  draftStart: string | null;
  onPick: (iso: string) => void;
  onHover: (iso: string | null) => void;
}) {
  const rows: CellData[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <div>
      <div className="mb-6 flex items-center justify-center">
        <p className="font-display text-lg italic text-oak-gall">{label}</p>
      </div>

      <div className="mb-2 grid grid-cols-7">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center font-sans text-[11px] font-medium text-sepia">
            {d}
          </div>
        ))}
      </div>

      <div>
        {rows.map((row, ri) => {
          // Compute draft pill row edges so a continuous selection looks
          // like one rounded shape across the row.
          let firstSelIdx = -1;
          let lastSelIdx = -1;
          if (draftRange) {
            for (let i = 0; i < row.length; i++) {
              const c = row[i];
              if (!c) continue;
              if (c.iso >= draftRange.start && c.iso <= draftRange.end) {
                if (firstSelIdx === -1) firstSelIdx = i;
                lastSelIdx = i;
              }
            }
          }

          return (
            <div key={ri} className="grid grid-cols-7">
              {row.map((cell, ci) => (
                <Cell
                  key={ci}
                  cell={cell}
                  draftRange={draftRange}
                  draftStart={draftStart}
                  isFirstInRowSel={ci === firstSelIdx}
                  isLastInRowSel={ci === lastSelIdx}
                  onPick={onPick}
                  onHover={onHover}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Cell({
  cell,
  draftRange,
  draftStart,
  isFirstInRowSel,
  isLastInRowSel,
  onPick,
  onHover,
}: {
  cell: CellData;
  draftRange: { start: string; end: string } | null;
  draftStart: string | null;
  isFirstInRowSel: boolean;
  isLastInRowSel: boolean;
  onPick: (iso: string) => void;
  onHover: (iso: string | null) => void;
}) {
  if (!cell) return <div className="aspect-square" />;
  const { iso, day, isClosed, past, isToday } = cell;

  const inDraft = draftRange ? iso >= draftRange.start && iso <= draftRange.end : false;
  const isDraftStart = iso === draftStart;
  const disabledForPick = past;

  const pillRounding =
    isFirstInRowSel && isLastInRowSel
      ? "rounded-full"
      : isFirstInRowSel
        ? "rounded-l-full"
        : isLastInRowSel
          ? "rounded-r-full"
          : "";

  return (
    <div className="relative aspect-square">
      {inDraft && !isClosed && (
        <div
          aria-hidden
          className={`absolute inset-y-1 left-0 right-0 bg-michelin-red/15 ${pillRounding}`}
        />
      )}
      <button
        type="button"
        disabled={disabledForPick}
        onClick={() => onPick(iso)}
        onMouseEnter={() => onHover(iso)}
        aria-label={`${iso}${isClosed ? " — closed (click to remove)" : " — click to mark closed"}`}
        title={
          past
            ? undefined
            : isClosed
              ? "Closure — click to remove"
              : draftStart
                ? "Click to set range end"
                : "Click to start a new closure"
        }
        className={`group relative z-[1] flex h-full w-full items-center justify-center rounded-full font-serif text-base transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-offset-[2px] focus-visible:outline-cordon-bleu ${
          past
            ? "cursor-not-allowed text-sepia-faint line-through decoration-sepia-faint/60"
            : isClosed
              ? "cursor-pointer bg-michelin-red/15 text-michelin-red line-through decoration-michelin-red/60 hover:bg-michelin-red/25"
              : isDraftStart
                ? "cursor-pointer bg-michelin-red text-vellum"
                : inDraft
                  ? "cursor-pointer text-oak-gall hover:bg-michelin-red/25"
                  : "cursor-pointer text-oak-gall hover:bg-ermine"
        } ${isToday && !isClosed && !isDraftStart ? "ring-1 ring-inset ring-sepia/40" : ""}`}
      >
        <span>{day}</span>
      </button>
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  const d = direction === "left" ? "M14 6 L8 12 L14 18" : "M10 6 L16 12 L10 18";
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function buildCells(
  year: number,
  month: number,
  closures: ClosedWindow[],
  todayIso: string,
): CellData[] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: CellData[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({
      iso,
      day: d,
      isClosed: closures.some((w) => iso >= w.startDate && iso <= w.endDate),
      past: iso < todayIso,
      isToday: iso === todayIso,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function monthLabel({ year, month }: Cursor): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function nextMonth(c: Cursor): Cursor {
  return { year: c.month === 11 ? c.year + 1 : c.year, month: (c.month + 1) % 12 };
}

function prevMonth(c: Cursor): Cursor {
  return { year: c.month === 0 ? c.year - 1 : c.year, month: (c.month + 11) % 12 };
}

function fmtRange(start: string, end: string): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const a = fmt.format(new Date(`${start}T00:00:00Z`));
  if (start === end) return a;
  const b = fmt.format(new Date(`${end}T00:00:00Z`));
  return `${a} → ${b}`;
}
