"use client";

import { useMemo, useState } from "react";

import type { ClosedWindow } from "@/db/schema";

/*
 * Date-range picker, Airbnb-style — two months side by side, no grid
 * lines, a continuous pill spanning the selection with solid dark
 * endpoints. Adapted to our paper palette: cordon-bleu for the
 * selection pill, oak-gall for the endpoint discs, oak-gall numerals
 * on vellum.
 *
 * Click logic:
 *   - First click sets start; end clears.
 *   - Second click after start:
 *       · same day → clear range
 *       · later day → set end (range complete)
 *       · earlier day → reset start to that day, clear end
 *   - Once a complete range is set, the next click starts a new range.
 *
 * Closed-day handling: kitchens are open by default. Days inside a
 * published `closedWindows` range are struck through and unclickable.
 * If the user picks a range that straddles a closed day, the parent
 * form surfaces a hard error — the picker doesn't auto-trim.
 */

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

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]; // Sunday-first to match the Airbnb reference

export function DateRangeCalendar({
  closedWindows,
  todayIso,
  startDate,
  endDate,
  onChange,
}: {
  closedWindows: ClosedWindow[];
  todayIso: string;
  startDate: string;
  endDate: string;
  onChange: (next: { startDate: string; endDate: string }) => void;
}) {
  const [tYear, tMonth] = todayIso.split("-").map(Number);
  // cursor controls the LEFT month; right is cursor + 1.
  const [cursor, setCursor] = useState<Cursor>({ year: tYear, month: tMonth - 1 });
  const [hover, setHover] = useState<string | null>(null);

  const leftCells = useMemo(
    () => buildCells(cursor.year, cursor.month, closedWindows, todayIso),
    [cursor, closedWindows, todayIso],
  );
  const rightCursor = nextMonth(cursor);
  const rightCells = useMemo(
    () => buildCells(rightCursor.year, rightCursor.month, closedWindows, todayIso),
    [rightCursor, closedWindows, todayIso],
  );

  const goPrev = () => setCursor(prevMonth);
  const goNext = () => setCursor(nextMonth);

  function handlePick(iso: string) {
    if (!startDate || (startDate && endDate)) {
      onChange({ startDate: iso, endDate: "" });
      return;
    }
    if (iso === startDate) {
      onChange({ startDate: "", endDate: "" });
      return;
    }
    if (iso < startDate) {
      onChange({ startDate: iso, endDate: "" });
      return;
    }
    onChange({ startDate, endDate: iso });
  }

  // Effective end-of-range while picking the end. Lets the pill grow as
  // the cursor moves over later days before the second click lands.
  const previewEnd =
    !endDate && startDate && hover && hover > startDate ? hover : endDate;
  const isPreview = !endDate && Boolean(previewEnd);

  return (
    <div className="bg-white">
      <div
        className="relative grid gap-x-12 gap-y-10 md:grid-cols-2"
        onMouseLeave={() => setHover(null)}
      >
        {/* Outer chevrons sit absolute over the grid, like Airbnb */}
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous month"
          className="absolute -left-1 top-0 z-10 inline-flex h-8 w-8 items-center justify-center text-oak-gall transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
        >
          <Chevron direction="left" />
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="Next month"
          className="absolute -right-1 top-0 z-10 inline-flex h-8 w-8 items-center justify-center text-oak-gall transition-colors duration-[120ms] ease-paper hover:text-cordon-bleu"
        >
          <Chevron direction="right" />
        </button>

        <Month
          label={monthLabel(cursor)}
          cells={leftCells}
          startDate={startDate}
          endDate={previewEnd || ""}
          isPreview={isPreview}
          onPick={handlePick}
          onHover={setHover}
        />
        <Month
          label={monthLabel(rightCursor)}
          cells={rightCells}
          startDate={startDate}
          endDate={previewEnd || ""}
          isPreview={isPreview}
          onPick={handlePick}
          onHover={setHover}
        />
      </div>
    </div>
  );
}

function Month({
  label,
  cells,
  startDate,
  endDate,
  isPreview,
  onPick,
  onHover,
}: {
  label: string;
  cells: CellData[];
  startDate: string;
  endDate: string;
  isPreview: boolean;
  onPick: (iso: string) => void;
  onHover: (iso: string | null) => void;
}) {
  // Group cells into rows of 7 so we can compute the leftmost / rightmost
  // selected position per row — that's what makes the pill round only at
  // the row edges of the selection (and stay flat through the middle).
  const rows: CellData[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <div>
      <div className="mb-6 flex items-center justify-center">
        <p className="font-display text-lg italic text-oak-gall">{label}</p>
      </div>

      <div className="mb-2 grid grid-cols-7">
        {DAY_LABELS.map((d, i) => (
          <div
            key={i}
            className="text-center font-sans text-[11px] font-medium text-sepia"
          >
            {d}
          </div>
        ))}
      </div>

      <div>
        {rows.map((row, ri) => {
          let firstSelIdx = -1;
          let lastSelIdx = -1;
          if (startDate && endDate) {
            for (let i = 0; i < row.length; i++) {
              const c = row[i];
              if (!c) continue;
              if (c.iso >= startDate && c.iso <= endDate) {
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
                  startDate={startDate}
                  endDate={endDate}
                  isPreview={isPreview}
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
  startDate,
  endDate,
  isPreview,
  isFirstInRowSel,
  isLastInRowSel,
  onPick,
  onHover,
}: {
  cell: CellData;
  startDate: string;
  endDate: string;
  isPreview: boolean;
  isFirstInRowSel: boolean;
  isLastInRowSel: boolean;
  onPick: (iso: string) => void;
  onHover: (iso: string | null) => void;
}) {
  if (!cell) return <div className="aspect-square" />;
  const { iso, day, isClosed, past, isToday } = cell;

  const isStart = iso === startDate;
  const isEnd = iso === endDate;
  const isInRange =
    Boolean(startDate) && Boolean(endDate) && iso >= startDate && iso <= endDate;
  const disabled = past || isClosed;

  // Pill background covers the cell across its full width (no horizontal
  // padding) so adjacent cells join into one continuous shape.
  const pillRounding =
    isFirstInRowSel && isLastInRowSel
      ? "rounded-full"
      : isFirstInRowSel
        ? "rounded-l-full"
        : isLastInRowSel
          ? "rounded-r-full"
          : "";
  const pillColor = isPreview ? "bg-cordon-bleu/15" : "bg-cordon-bleu/20";

  return (
    <div className="relative aspect-square">
      {isInRange && (
        <div
          aria-hidden
          className={`absolute inset-y-1 left-0 right-0 ${pillColor} ${pillRounding}`}
        />
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onPick(iso)}
        onMouseEnter={() => onHover(iso)}
        aria-label={`${iso}${isStart ? " — start of range" : ""}${isEnd ? " — end of range" : ""}${isClosed ? " — kitchen closed" : ""}`}
        aria-pressed={isStart || isEnd}
        title={isClosed && !past ? "Kitchen is closed on this day" : undefined}
        className={`group relative z-[1] flex h-full w-full items-center justify-center rounded-full font-serif text-base transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-offset-[2px] focus-visible:outline-cordon-bleu ${
          past
            ? "cursor-not-allowed text-sepia-faint line-through decoration-sepia-faint/60"
            : isClosed
              ? "cursor-not-allowed text-sepia-faint line-through decoration-michelin-red/40"
              : isStart || isEnd
                ? "cursor-pointer bg-oak-gall text-vellum"
                : isInRange
                  ? "cursor-pointer text-oak-gall hover:bg-cordon-bleu/35"
                  : "cursor-pointer text-oak-gall hover:bg-ermine"
        } ${isToday && !isStart && !isEnd ? "ring-1 ring-inset ring-sepia/40" : ""}`}
      >
        <span>{day}</span>
        {!disabled && !isStart && !isEnd && !isInRange && (
          <span
            aria-hidden
            className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cordon-bleu"
          />
        )}
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
  closedWindows: ClosedWindow[],
  todayIso: string,
): CellData[] {
  const firstOfMonth = new Date(year, month, 1);
  // Sunday-first: getDay() returns 0..6 with Sun=0, so use it directly.
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: CellData[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({
      iso,
      day: d,
      isClosed: closedWindows.some((w) => iso >= w.startDate && iso <= w.endDate),
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
