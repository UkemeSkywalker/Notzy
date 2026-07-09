import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Circle,
  Eraser,
  ImagePlus,
  Maximize,
  Minus,
  MousePointer2,
  Pencil,
  Square,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { DrawObject, ImageObject, ShapeObject, StrokeObject, TextObject } from "../types";

type Tool = "move" | "pen" | "rect" | "ellipse" | "line" | "arrow" | "text";

const PALETTE = ["#1e293b", "#f43f5e", "#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b"];
const WIDTHS = [2, 4, 7];
const MIN_SCALE = 0.1;
const MAX_SCALE = 4;
const GRID = 32;
const TEXT_SIZE = 16;
const LINE_HEIGHT = 1.3;
const FONT_STACK = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif';
const font = (size: number) => `500 ${size}px ${FONT_STACK}`;

const measureCtx = document.createElement("canvas").getContext("2d")!;

function measureText(text: string, size: number): { w: number; h: number } {
  measureCtx.font = font(size);
  const lines = text.split("\n");
  const w = Math.max(1, ...lines.map((l) => measureCtx.measureText(l).width));
  return { w, h: lines.length * size * LINE_HEIGHT };
}

interface Viewport {
  /** World coordinate at the canvas's top-left corner. */
  x: number;
  y: number;
  /** Zoom: screen px per world px. */
  s: number;
}

function bbox(obj: DrawObject): { x: number; y: number; w: number; h: number } {
  if (obj.type === "image") return { x: obj.x, y: obj.y, w: obj.w, h: obj.h };
  if (obj.type === "text") return { x: obj.x, y: obj.y, ...measureText(obj.text, obj.size) };
  if (obj.type === "stroke") {
    const xs = obj.points.map((p) => p.x);
    const ys = obj.points.map((p) => p.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  const x = Math.min(obj.x1, obj.x2);
  const y = Math.min(obj.y1, obj.y2);
  return { x, y, w: Math.abs(obj.x2 - obj.x1), h: Math.abs(obj.y2 - obj.y1) };
}

function translate(obj: DrawObject, dx: number, dy: number): DrawObject {
  if (obj.type === "image" || obj.type === "text") return { ...obj, x: obj.x + dx, y: obj.y + dy };
  if (obj.type === "stroke") return { ...obj, points: obj.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
  return { ...obj, x1: obj.x1 + dx, y1: obj.y1 + dy, x2: obj.x2 + dx, y2: obj.y2 + dy };
}

/** What text-editing session a canvas interaction should open, if any. */
type TextEdit =
  | { kind: "new"; x: number; y: number }
  | { kind: "text"; index: number }
  | { kind: "label"; index: number };

function drawArrowHead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const len = 10 + width * 2;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - len * Math.cos(angle - Math.PI / 6), y2 - len * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - len * Math.cos(angle + Math.PI / 6), y2 - len * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface ScribbleCanvasProps {
  value: DrawObject[];
  onChange: (objects: DrawObject[]) => void;
  readOnly?: boolean;
}

export function ScribbleCanvas({ value, onChange, readOnly }: ScribbleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const [tool, setTool] = useState<Tool>(readOnly ? "move" : "pen");
  const [color, setColor] = useState(PALETTE[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [objects, setObjects] = useState<DrawObject[]>(value);
  const [viewport, setViewport] = useState<Viewport>({ x: -40, y: -40, s: 1 });

  const draft = useRef<DrawObject | null>(null);
  const moveTarget = useRef<{ index: number; lastX: number; lastY: number; moved: boolean } | null>(null);
  const panGrab = useRef<{ lastX: number; lastY: number } | null>(null);
  const [textEdit, setTextEdit] = useState<(TextEdit & { value: string }) | null>(null);
  const textEditCancelled = useRef(false);
  const [, forceRepaint] = useState(0);
  const repaintTick = () => forceRepaint((n) => n + 1);

  useEffect(() => setObjects(value), [value]);

  const commit = (next: DrawObject[]) => {
    setObjects(next);
    onChange(next);
  };

  const fitContent = useCallback(() => {
    const wrap = wrapRef.current;
    const objs = objects;
    if (!wrap) return;
    if (!objs.length) {
      setViewport({ x: -40, y: -40, s: 1 });
      return;
    }
    const boxes = objs.map(bbox);
    const minX = Math.min(...boxes.map((b) => b.x)) - 60;
    const minY = Math.min(...boxes.map((b) => b.y)) - 60;
    const maxX = Math.max(...boxes.map((b) => b.x + b.w)) + 60;
    const maxY = Math.max(...boxes.map((b) => b.y + b.h)) + 60;
    const s = clamp(Math.min(wrap.clientWidth / (maxX - minX), wrap.clientHeight / (maxY - minY), 1.5), MIN_SCALE, MAX_SCALE);
    setViewport({
      x: minX - (wrap.clientWidth / s - (maxX - minX)) / 2,
      y: minY - (wrap.clientHeight / s - (maxY - minY)) / 2,
      s,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects]);

  // Start fitted to existing content.
  useEffect(() => {
    fitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomAt = useCallback((screenX: number, screenY: number, factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = screenX - rect.left;
    const py = screenY - rect.top;
    setViewport((v) => {
      const s2 = clamp(v.s * factor, MIN_SCALE, MAX_SCALE);
      if (s2 === v.s) return v;
      const wx = px / v.s + v.x;
      const wy = py / v.s + v.y;
      return { s: s2, x: wx - px / s2, y: wy - py / s2 };
    });
  }, []);

  const zoomCenter = useCallback(
    (factor: number) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
    },
    [zoomAt],
  );

  // Wheel: two-finger scroll pans, pinch (ctrl/cmd+wheel) zooms. Needs a non-passive listener.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.012));
      } else {
        setViewport((v) => ({ ...v, x: v.x + e.deltaX / v.s, y: v.y + e.deltaY / v.s }));
      }
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });
    return () => wrap.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Safari/WKWebView trackpad pinch fires gesture events instead of ctrl+wheel.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let lastScale = 1;
    const start = (e: Event) => {
      e.preventDefault();
      lastScale = 1;
    };
    const change = (e: Event) => {
      e.preventDefault();
      const ge = e as Event & { scale: number; clientX: number; clientY: number };
      if (!ge.scale) return;
      zoomAt(ge.clientX, ge.clientY, ge.scale / lastScale);
      lastScale = ge.scale;
    };
    wrap.addEventListener("gesturestart", start);
    wrap.addEventListener("gesturechange", change);
    return () => {
      wrap.removeEventListener("gesturestart", start);
      wrap.removeEventListener("gesturechange", change);
    };
  }, [zoomAt]);

  // Keyboard zoom: ⌘+ / ⌘- / ⌘0.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomCenter(1.2);
      } else if (e.key === "-") {
        e.preventDefault();
        zoomCenter(1 / 1.2);
      } else if (e.key === "0") {
        e.preventDefault();
        fitContent();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomCenter, fitContent]);

  const repaint = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = wrap.clientWidth;
    const ch = wrap.clientHeight;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x: vx, y: vy, s } = viewport;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    // Dot grid (spacing widens when zoomed far out so it stays sparse).
    const spacing = s < 0.35 ? GRID * 4 : GRID;
    ctx.fillStyle = "rgba(15, 23, 42, 0.08)";
    const startX = Math.floor(vx / spacing) * spacing;
    const startY = Math.floor(vy / spacing) * spacing;
    for (let wx = startX; wx < vx + cw / s; wx += spacing) {
      for (let wy = startY; wy < vy + ch / s; wy += spacing) {
        ctx.beginPath();
        ctx.arc((wx - vx) * s, (wy - vy) * s, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // World-space transform for objects.
    ctx.setTransform(dpr * s, 0, 0, dpr * s, -vx * s * dpr, -vy * s * dpr);

    const all = draft.current ? [...objects, draft.current] : objects;
    for (let i = 0; i < all.length; i++) {
      const obj = all[i];
      // Hide the text object currently being edited (the overlay shows it instead).
      if (textEdit?.kind === "text" && textEdit.index === i) continue;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (obj.type === "text") {
        ctx.fillStyle = obj.color;
        ctx.font = font(obj.size);
        ctx.textBaseline = "top";
        obj.text.split("\n").forEach((line, li) => ctx.fillText(line, obj.x, obj.y + li * obj.size * LINE_HEIGHT));
        continue;
      }
      if (obj.type === "image") {
        let img = imageCache.current.get(obj.dataUrl);
        if (!img) {
          img = new Image();
          img.onload = repaintTick;
          img.src = obj.dataUrl;
          imageCache.current.set(obj.dataUrl, img);
        }
        if (img.complete && img.naturalWidth) ctx.drawImage(img, obj.x, obj.y, obj.w, obj.h);
        continue;
      }
      ctx.strokeStyle = obj.color;
      ctx.lineWidth = obj.width;
      if (obj.type === "stroke") {
        ctx.beginPath();
        obj.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
      } else if (obj.type === "rect") {
        ctx.strokeRect(Math.min(obj.x1, obj.x2), Math.min(obj.y1, obj.y2), Math.abs(obj.x2 - obj.x1), Math.abs(obj.y2 - obj.y1));
      } else if (obj.type === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(
          (obj.x1 + obj.x2) / 2,
          (obj.y1 + obj.y2) / 2,
          Math.abs(obj.x2 - obj.x1) / 2,
          Math.abs(obj.y2 - obj.y1) / 2,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(obj.x1, obj.y1);
        ctx.lineTo(obj.x2, obj.y2);
        ctx.stroke();
        if (obj.type === "arrow") drawArrowHead(ctx, obj.x1, obj.y1, obj.x2, obj.y2, obj.width);
      }
      // Centered label inside the shape.
      if (obj.type !== "stroke" && obj.text && !(textEdit?.kind === "label" && textEdit.index === i)) {
        const b = bbox(obj);
        const lines = obj.text.split("\n");
        ctx.fillStyle = obj.color;
        ctx.font = font(TEXT_SIZE);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        lines.forEach((line, li) =>
          ctx.fillText(line, b.x + b.w / 2, b.y + b.h / 2 + (li - (lines.length - 1) / 2) * TEXT_SIZE * LINE_HEIGHT),
        );
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
      }
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(repaint);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(repaintTick);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  /** Pointer/mouse event → world coordinates. */
  const worldPos = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / viewport.s + viewport.x,
      y: (e.clientY - rect.top) / viewport.s + viewport.y,
      sx: e.clientX,
      sy: e.clientY,
    };
  };

  /** Topmost object under a world point, or -1. */
  const hitIndex = (x: number, y: number) => {
    const pad = 6 / viewport.s;
    for (let i = objects.length - 1; i >= 0; i--) {
      const b = bbox(objects[i]);
      if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad) return i;
    }
    return -1;
  };

  const openTextEditAt = (x: number, y: number) => {
    const i = hitIndex(x, y);
    const target = i >= 0 ? objects[i] : null;
    if (target?.type === "text") {
      setTextEdit({ kind: "text", index: i, value: target.text });
    } else if (target && target.type !== "stroke" && target.type !== "image") {
      setTextEdit({ kind: "label", index: i, value: target.text ?? "" });
    } else {
      setTextEdit({ kind: "new", x, y, value: "" });
    }
  };

  const commitTextEdit = () => {
    if (textEditCancelled.current) {
      textEditCancelled.current = false;
      setTextEdit(null);
      return;
    }
    if (!textEdit) return;
    const value = textEdit.value.replace(/\s+$/, "");
    if (textEdit.kind === "new") {
      if (value.trim()) {
        commit([...objects, { type: "text", x: textEdit.x, y: textEdit.y, text: value, color, size: TEXT_SIZE } satisfies TextObject]);
      }
    } else if (textEdit.kind === "text") {
      if (value.trim()) {
        commit(objects.map((o, i) => (i === textEdit.index ? { ...(o as TextObject), text: value } : o)));
      } else {
        commit(objects.filter((_, i) => i !== textEdit.index));
      }
    } else {
      commit(
        objects.map((o, i) =>
          i === textEdit.index ? { ...(o as ShapeObject), text: value.trim() ? value : undefined } : o,
        ),
      );
    }
    setTextEdit(null);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Clicking outside an open text editor commits it (blur can't be relied on —
    // the canvas suppresses default focus changes).
    if (textEdit) {
      commitTextEdit();
      return;
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic events may carry an inactive pointerId; drawing still works without capture.
    }
    const { x, y, sx, sy } = worldPos(e);
    if (tool === "text") {
      if (!readOnly) openTextEditAt(x, y);
      return;
    }
    if (tool === "move" || readOnly) {
      if (!readOnly) {
        const i = hitIndex(x, y);
        if (i >= 0) {
          moveTarget.current = { index: i, lastX: x, lastY: y, moved: false };
          return;
        }
      }
      panGrab.current = { lastX: sx, lastY: sy };
      return;
    }
    if (tool === "pen") {
      draft.current = { type: "stroke", points: [{ x, y }], color, width } satisfies StrokeObject;
    } else {
      draft.current = { type: tool, x1: x, y1: y, x2: x, y2: y, color, width } satisfies ShapeObject;
    }
    repaintTick();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (panGrab.current) {
      const { lastX, lastY } = panGrab.current;
      panGrab.current = { lastX: e.clientX, lastY: e.clientY };
      setViewport((v) => ({ ...v, x: v.x - (e.clientX - lastX) / v.s, y: v.y - (e.clientY - lastY) / v.s }));
      return;
    }
    const { x, y } = worldPos(e);
    if (moveTarget.current) {
      const { index, lastX, lastY } = moveTarget.current;
      const moved = objects.map((o, i) => (i === index ? translate(o, x - lastX, y - lastY) : o));
      moveTarget.current = { index, lastX: x, lastY: y, moved: true };
      setObjects(moved);
      return;
    }
    if (!draft.current) return;
    if (draft.current.type === "stroke") {
      draft.current.points.push({ x, y });
    } else if (draft.current.type !== "image" && draft.current.type !== "text") {
      draft.current.x2 = x;
      draft.current.y2 = y;
    }
    repaintTick();
  };

  const onPointerUp = () => {
    if (panGrab.current) {
      panGrab.current = null;
      return;
    }
    if (moveTarget.current) {
      if (moveTarget.current.moved) onChange(objects);
      moveTarget.current = null;
      return;
    }
    if (!draft.current) return;
    const finished = draft.current;
    draft.current = null;
    // Ignore accidental zero-size shapes (single click without drag).
    if (finished.type !== "stroke" && finished.type !== "image" && finished.type !== "text") {
      if (Math.abs(finished.x2 - finished.x1) < 3 && Math.abs(finished.y2 - finished.y1) < 3) {
        repaintTick();
        return;
      }
    }
    commit([...objects, finished]);
  };

  const addImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const wrap = wrapRef.current;
        const vw = (wrap?.clientWidth ?? 800) / viewport.s;
        const vh = (wrap?.clientHeight ?? 600) / viewport.s;
        const maxW = vw * 0.5;
        const maxH = vh * 0.5;
        const scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const obj: ImageObject = {
          type: "image",
          dataUrl,
          x: Math.round(viewport.x + (vw - w) / 2),
          y: Math.round(viewport.y + (vh - h) / 2),
          w,
          h,
        };
        imageCache.current.set(dataUrl, img);
        commit([...objects, obj]);
        setTool("move");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const toolButton = (t: Tool, icon: React.ReactNode, label: string) => (
    <button
      key={t}
      type="button"
      title={label}
      onClick={() => setTool(t)}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
        tool === t ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-black/5"
      }`}
    >
      {icon}
    </button>
  );

  const cursor = panGrab.current
    ? "cursor-grabbing"
    : tool === "text" && !readOnly
      ? "cursor-text"
      : tool === "move" || readOnly
        ? "cursor-grab"
        : "cursor-crosshair";

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-white/60">
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", touchAction: "none" }}
        className={cursor}
        // Keep the browser from moving focus on click — otherwise it steals
        // focus from the text editor the moment it opens.
        onMouseDown={(e) => e.preventDefault()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={(e) => {
          if (readOnly || tool !== "move" || textEdit) return;
          const { x, y } = worldPos(e);
          if (hitIndex(x, y) >= 0) openTextEditAt(x, y);
        }}
      />

      {!readOnly && (
        <div className="absolute left-1/2 top-3 flex -translate-x-1/2 flex-wrap items-center gap-1 rounded-xl border border-black/[0.08] bg-white px-2 py-1.5 shadow-lg">
          {toolButton("move", <MousePointer2 size={15} />, "Move / pan")}
          {toolButton("pen", <Pencil size={15} />, "Pen")}
          {toolButton("rect", <Square size={15} />, "Rectangle")}
          {toolButton("ellipse", <Circle size={15} />, "Ellipse")}
          {toolButton("line", <Minus size={15} />, "Line")}
          {toolButton("arrow", <ArrowUpRight size={15} />, "Arrow")}
          {toolButton("text", <Type size={15} />, "Text — click anywhere, or click a shape to label it")}
          <button
            type="button"
            title="Add picture"
            onClick={() => fileRef.current?.click()}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-black/5"
          >
            <ImagePlus size={15} />
          </button>
          <span className="mx-1 h-5 w-px bg-black/10" />
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`mx-0.5 h-4.5 w-4.5 rounded-full ${color === c ? "ring-2 ring-slate-500 ring-offset-1" : ""}`}
              style={{ background: c, width: 17, height: 17 }}
            />
          ))}
          <span className="mx-1 h-5 w-px bg-black/10" />
          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              title={`Stroke ${w}px`}
              onClick={() => setWidth(w)}
              className={`flex h-8 w-8 items-center justify-center rounded-md ${
                width === w ? "bg-black/[0.08]" : "hover:bg-black/5"
              }`}
            >
              <span className="rounded-full bg-slate-700" style={{ width: w + 3, height: w + 3 }} />
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-black/10" />
          <button
            type="button"
            title="Undo last"
            disabled={objects.length === 0}
            onClick={() => commit(objects.slice(0, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-black/5 disabled:opacity-30"
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            title="Clear canvas"
            disabled={objects.length === 0}
            onClick={() => commit([])}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
          >
            <Eraser size={15} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) addImage(f);
              e.target.value = "";
            }}
          />
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex items-center gap-0.5 rounded-lg border border-black/[0.08] bg-white px-1 py-1 shadow-lg">
        <button
          type="button"
          title="Zoom out (⌘−)"
          onClick={() => zoomCenter(1 / 1.2)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-black/5"
        >
          <ZoomOut size={14} />
        </button>
        <span className="w-12 text-center text-[12px] font-medium tabular-nums text-slate-600">
          {Math.round(viewport.s * 100)}%
        </span>
        <button
          type="button"
          title="Zoom in (⌘+)"
          onClick={() => zoomCenter(1.2)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-black/5"
        >
          <ZoomIn size={14} />
        </button>
        <span className="mx-0.5 h-4 w-px bg-black/10" />
        <button
          type="button"
          title="Fit to content (⌘0)"
          onClick={fitContent}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-black/5"
        >
          <Maximize size={14} />
        </button>
      </div>

      {textEdit &&
        (() => {
          const s = viewport.s;
          let wx: number;
          let wy: number;
          let size = TEXT_SIZE;
          let col = color;
          let centered = false;
          if (textEdit.kind === "new") {
            wx = textEdit.x;
            wy = textEdit.y;
          } else {
            const o = objects[textEdit.index];
            if (!o) return null;
            if (textEdit.kind === "text" && o.type === "text") {
              wx = o.x;
              wy = o.y;
              size = o.size;
              col = o.color;
            } else {
              const b = bbox(o);
              wx = b.x + b.w / 2;
              wy = b.y + b.h / 2;
              col = (o as ShapeObject).color;
              centered = true;
            }
          }
          const m = measureText(textEdit.value || "M", size);
          const lines = textEdit.value.split("\n").length;
          return (
            <textarea
              ref={(el) => {
                // Focus explicitly on mount and keep focus across re-renders;
                // autoFocus alone loses to the canvas click's default focus handling.
                if (el && document.activeElement !== el) {
                  el.focus();
                  el.setSelectionRange(el.value.length, el.value.length);
                }
              }}
              value={textEdit.value}
              placeholder="Type…"
              onChange={(e) => setTextEdit({ ...textEdit, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commitTextEdit();
                }
                if (e.key === "Escape") {
                  textEditCancelled.current = true;
                  setTextEdit(null);
                }
              }}
              onBlur={commitTextEdit}
              spellCheck={false}
              className={`absolute resize-none overflow-hidden rounded-md bg-white/90 shadow-[0_0_0_1.5px_rgba(59,130,246,0.6)] outline-none ${
                centered ? "text-center" : ""
              }`}
              style={{
                left: (wx - viewport.x) * s,
                top: (wy - viewport.y) * s,
                transform: centered ? "translate(-50%, -50%)" : "translate(-4px, -3px)",
                fontSize: size * s,
                lineHeight: LINE_HEIGHT,
                fontFamily: FONT_STACK,
                fontWeight: 500,
                color: col,
                caretColor: col,
                width: (m.w + 24) * s + 8,
                height: lines * size * LINE_HEIGHT * s + 6 * s + 6,
                padding: `${3 * s}px ${4 * s}px`,
              }}
            />
          );
        })()}

      {objects.length === 0 && !draft.current && !readOnly && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13.5px] text-slate-300">
          An infinite canvas — draw, type, drop in shapes and pictures. Scroll to pan, pinch or ⌘ +/− to zoom.
        </div>
      )}
    </div>
  );
}
