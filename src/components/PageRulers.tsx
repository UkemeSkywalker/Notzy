import { useRef } from "react";
import type { PageMargins } from "../types";

/** 96 px = 1 inch, Letter width 8.5in. */
export const PAGE_DPI = 96;
export const PAGE_WIDTH = 816;
export const PAGE_MIN_HEIGHT = 1056;
export const DEFAULT_PAGE_MARGINS: PageMargins = { top: 72, left: 64, right: 64 };

const MIN_MARGIN = 24;
const MAX_MARGIN = 288;

function clampMargin(v: number) {
  return Math.round(Math.min(MAX_MARGIN, Math.max(MIN_MARGIN, v)));
}

/** Pointer-capture drag helper: reports px delta from the drag start. */
function useMarkerDrag(
  onStart: () => void,
  onDelta: (dpx: number) => void,
  onDone: () => void,
  disabled?: boolean,
) {
  const start = useRef<number | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      start.current = 0;
      onStart();
      (e.currentTarget as HTMLElement).dataset.dragOrigin = String(e.clientX) + "," + String(e.clientY);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (start.current === null) return;
      const [ox, oy] = (e.currentTarget.dataset.dragOrigin ?? "0,0").split(",").map(Number);
      const horizontal = e.currentTarget.dataset.axis !== "y";
      onDelta(horizontal ? e.clientX - ox : e.clientY - oy);
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      if (start.current === null) return;
      start.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      onDone();
    },
  };
}

function Marker({
  axis,
  pos,
  onStart,
  onDrag,
  onDone,
  disabled,
  title,
}: {
  axis: "x" | "y";
  pos: number;
  onStart: () => void;
  onDrag: (dpx: number) => void;
  onDone: () => void;
  disabled?: boolean;
  title: string;
}) {
  const handlers = useMarkerDrag(onStart, onDrag, onDone, disabled);
  const isX = axis === "x";
  return (
    <div
      role="slider"
      aria-label={title}
      title={disabled ? undefined : title}
      data-axis={axis}
      {...handlers}
      className={`absolute z-10 touch-none ${disabled ? "" : isX ? "cursor-ew-resize" : "cursor-ns-resize"}`}
      style={
        isX
          ? { left: pos - 6, top: 3, width: 12, height: 12 }
          : { top: pos - 6, left: 3, width: 12, height: 12 }
      }
    >
      <div
        className="mx-auto my-auto"
        style={{
          width: 0,
          height: 0,
          borderLeft: isX ? "4px solid transparent" : "6px solid #38bdf8",
          borderRight: isX ? "4px solid transparent" : undefined,
          borderTop: isX ? "6px solid #38bdf8" : "4px solid transparent",
          borderBottom: isX ? undefined : "4px solid transparent",
          filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.2))",
        }}
      />
    </div>
  );
}

export function HorizontalRuler({
  margins,
  onChange,
  onCommit,
  onGuide,
  disabled,
}: {
  margins: PageMargins;
  onChange: (m: PageMargins) => void;
  onCommit: (m: PageMargins) => void;
  onGuide: (x: number | null) => void;
  disabled?: boolean;
}) {
  const startMargins = useRef(margins);
  // pointerup fires before React re-renders, so the freshest value lives here.
  const latest = useRef(margins);
  const ticks: React.ReactNode[] = [];
  for (let px = 24; px < PAGE_WIDTH; px += 24) {
    const inch = px / PAGE_DPI;
    if (Number.isInteger(inch)) {
      ticks.push(
        <span
          key={px}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] leading-none text-slate-400"
          style={{ left: px }}
        >
          {inch}
        </span>,
      );
    } else {
      const half = (px / 48) % 1 === 0;
      ticks.push(
        <span
          key={px}
          className="absolute top-1/2 -translate-y-1/2 bg-slate-400/50"
          style={{ left: px, width: 1, height: half ? 5 : 3 }}
        />,
      );
    }
  }
  const rightPos = PAGE_WIDTH - margins.right;
  return (
    <div
      className="relative h-[18px] select-none overflow-hidden rounded bg-white/50"
      style={{ width: PAGE_WIDTH }}
    >
      {/* Shade the non-printable area outside the margins. */}
      <div className="absolute inset-y-0 left-0 bg-slate-400/15" style={{ width: margins.left }} />
      <div className="absolute inset-y-0 right-0 bg-slate-400/15" style={{ width: margins.right }} />
      {ticks}
      <Marker
        axis="x"
        pos={margins.left}
        disabled={disabled}
        title="Left margin"
        onStart={() => (startMargins.current = latest.current = margins)}
        onDrag={(d) => {
          const left = clampMargin(startMargins.current.left + d);
          latest.current = { ...startMargins.current, left };
          onChange(latest.current);
          onGuide(left);
        }}
        onDone={() => {
          onGuide(null);
          onCommit(latest.current);
        }}
      />
      <Marker
        axis="x"
        pos={rightPos}
        disabled={disabled}
        title="Right margin"
        onStart={() => (startMargins.current = latest.current = margins)}
        onDrag={(d) => {
          const right = clampMargin(startMargins.current.right - d);
          latest.current = { ...startMargins.current, right };
          onChange(latest.current);
          onGuide(PAGE_WIDTH - right);
        }}
        onDone={() => {
          onGuide(null);
          onCommit(latest.current);
        }}
      />
    </div>
  );
}

export function VerticalRuler({
  height,
  margins,
  onChange,
  onCommit,
  onGuide,
  disabled,
}: {
  height: number;
  margins: PageMargins;
  onChange: (m: PageMargins) => void;
  onCommit: (m: PageMargins) => void;
  onGuide: (y: number | null) => void;
  disabled?: boolean;
}) {
  const startMargins = useRef(margins);
  const latest = useRef(margins);
  const ticks: React.ReactNode[] = [];
  for (let px = 24; px < height; px += 24) {
    const inch = px / PAGE_DPI;
    if (Number.isInteger(inch)) {
      ticks.push(
        <span
          key={px}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] leading-none text-slate-400"
          style={{ top: px }}
        >
          {inch}
        </span>,
      );
    } else {
      const half = (px / 48) % 1 === 0;
      ticks.push(
        <span
          key={px}
          className="absolute left-1/2 -translate-x-1/2 bg-slate-400/50"
          style={{ top: px, height: 1, width: half ? 5 : 3 }}
        />,
      );
    }
  }
  return (
    <div
      className="relative w-[18px] select-none overflow-hidden rounded bg-white/50"
      style={{ height }}
    >
      <div className="absolute inset-x-0 top-0 bg-slate-400/15" style={{ height: margins.top }} />
      {ticks}
      <Marker
        axis="y"
        pos={margins.top}
        disabled={disabled}
        title="Top margin"
        onStart={() => (startMargins.current = latest.current = margins)}
        onDrag={(d) => {
          const top = clampMargin(startMargins.current.top + d);
          latest.current = { ...startMargins.current, top };
          onChange(latest.current);
          onGuide(top);
        }}
        onDone={() => {
          onGuide(null);
          onCommit(latest.current);
        }}
      />
    </div>
  );
}
