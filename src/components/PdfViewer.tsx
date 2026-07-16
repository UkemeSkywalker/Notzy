import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import {
  Bookmark,
  Highlighter,
  MessageSquarePlus,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  StickyNote,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { TextLayer } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { Note, PdfBookmark, PdfHighlight } from "../types";
import type { PDFDocumentProxy } from "../utils/pdf";
import { loadPdf, getPageTextContent } from "../utils/pdf";

export const HIGHLIGHT_COLORS = ["#fde047", "#86efac", "#93c5fd", "#f9a8d4", "#fdba74"];

type NormRect = { x: number; y: number; w: number; h: number };

/**
 * All pdf.js worker operations (page renders, text streaming) go through one
 * global queue. WKWebView's worker deadlocks when render and text-stream
 * requests from many pages interleave — one operation at a time is reliable.
 */
let pdfOpQueue: Promise<unknown> = Promise.resolve();
function enqueuePdfOp<T>(op: () => Promise<T>): Promise<T> {
  const run = pdfOpQueue.then(op, op);
  pdfOpQueue = run.catch(() => {});
  return run;
}

interface PdfViewerProps {
  note: Note;
  readOnly?: boolean;
  onUpdate: (patch: { pdfHighlights?: PdfHighlight[]; pdfBookmarks?: PdfBookmark[] }) => void;
}

function PdfPage({
  doc,
  pageNum,
  width,
  highlights,
  bookmarked,
  flashId,
  onHighlightClick,
}: {
  doc: PDFDocumentProxy;
  pageNum: number;
  width: number;
  highlights: PdfHighlight[];
  bookmarked: boolean;
  flashId: string | null;
  onHighlightClick: (id: string, e: React.MouseEvent) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(11 / 8.5);
  const [cssScale, setCssScale] = useState(1);
  useEffect(() => {
    let cancelled = false;
    let textLayer: TextLayer | null = null;
    (async () => {
      const page = await doc.getPage(pageNum);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      setAspect(base.height / base.width);
      const scale = width / base.width;
      setCssScale(scale);
      // Render through the global queue; re-check state once our turn comes.
      await enqueuePdfOp(async () => {
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale * dpr });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      });
      if (cancelled) return;
      // Selectable text layer. Feed it pre-accumulated text content —
      // see getPageTextContent for why we avoid pdf.js's own stream iteration.
      const textContent = await enqueuePdfOp(() => getPageTextContent(page));
      const textDiv = textRef.current;
      if (cancelled || !textDiv) return;
      textDiv.textContent = "";
      textLayer = new TextLayer({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        textContentSource: textContent as any,
        container: textDiv,
        viewport: page.getViewport({ scale }),
      });
      await textLayer.render();
    })().catch((err) => console.error(`PDF page ${pageNum} render failed:`, err));
    return () => {
      cancelled = true;
      textLayer?.cancel();
    };
  }, [doc, pageNum, width]);

  // The text layer (z-20) covers the whole page for native selection, so
  // highlight clicks are hit-tested here on the container instead of on the
  // highlight divs, which real clicks can never reach.
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.getSelection()?.toString()) return; // finishing a text selection
    const box = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width;
    const y = (e.clientY - box.top) / box.height;
    const hit = highlights.find((h) =>
      h.rects.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h),
    );
    if (hit) onHighlightClick(hit.id, e);
  };

  return (
    <div
      data-pdf-page={pageNum}
      className="relative mx-auto mb-4 rounded-md bg-white shadow-md"
      style={{ width, height: width * aspect }}
      onClick={handlePageClick}
    >
      <canvas key={width} ref={canvasRef} className="absolute inset-0 z-0 h-full w-full rounded-md" />
      <div className="pointer-events-none absolute inset-0 z-10">
        {highlights.map((h) =>
          h.rects.map((r, i) => (
            <div
              key={h.id + i}
              className="absolute rounded-[2px] transition-opacity"
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.w * 100}%`,
                height: `${r.h * 100}%`,
                background: h.color,
                opacity: flashId === h.id ? 0.75 : 0.4,
                mixBlendMode: "multiply",
              }}
            />
          )),
        )}
      </div>
      <div ref={textRef} className="pdf-text-layer" style={{ "--scale-factor": cssScale } as React.CSSProperties} />
      {/* Note indicators live above the text layer so they stay clickable. */}
      <div className="pointer-events-none absolute inset-0 z-30">
        {highlights
          .filter((h) => h.note && h.rects.length)
          .map((h) => {
            const last = h.rects[h.rects.length - 1];
            return (
              <button
                key={h.id + "-note"}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onHighlightClick(h.id, e);
                }}
                className="pointer-events-auto absolute flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow ring-1 ring-black/10"
                style={{ left: `calc(${(last.x + last.w) * 100}% + 2px)`, top: `${(last.y + last.h / 2) * 100}%` }}
              >
                <StickyNote size={10} className="text-amber-500" />
              </button>
            );
          })}
      </div>
      {bookmarked && (
        <div className="absolute right-4 top-0 z-30">
          <Bookmark size={18} className="fill-red-400 text-red-400 drop-shadow" />
        </div>
      )}
    </div>
  );
}

export function PdfViewer({ note, readOnly, onUpdate }: PdfViewerProps) {
  const pdf = note.pdf!;
  const highlights = useMemo(() => note.pdfHighlights ?? [], [note.pdfHighlights]);
  const bookmarks = useMemo(() => note.pdfBookmarks ?? [], [note.pdfBookmarks]);

  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);

  /** Pending text selection → floating color toolbar. */
  const [selection, setSelection] = useState<{
    x: number;
    y: number;
    snippet: string;
    perPage: Map<number, NormRect[]>;
  } | null>(null);

  /** Open highlight popover (edit color / note / delete). */
  const [popover, setPopover] = useState<{ id: string; x: number; y: number; editingNote: boolean } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadPdf(pdf.dataUrl)
      .then((d) => {
        if (!cancelled) setDoc(d);
      })
      .catch(() => {
        if (!cancelled) setError("This PDF couldn't be opened.");
      });
    return () => {
      cancelled = true;
    };
  }, [pdf.dataUrl]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setContainerWidth(el.clientWidth), 120);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => {
      ro.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Track the page closest to the top of the scroll viewport.
  const onScroll = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const top = scroller.getBoundingClientRect().top + 60;
    let best = 1;
    for (const el of scroller.querySelectorAll<HTMLElement>("[data-pdf-page]")) {
      if (el.getBoundingClientRect().bottom > top) {
        best = Number(el.dataset.pdfPage);
        break;
      }
    }
    setCurrentPage(best);
  }, []);

  const pageWidth = Math.max(200, Math.min((containerWidth - 48) * zoom, 2400));

  const scrollToPage = (page: number) => {
    scrollRef.current?.querySelector(`[data-pdf-page="${page}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const jumpToHighlight = (h: PdfHighlight) => {
    scrollToPage(h.page);
    setFlashId(h.id);
    setTimeout(() => setFlashId(null), 1600);
  };

  /* ---------- selection handling ---------- */

  const captureSelection = () => {
    if (readOnly) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelection(null);
      return;
    }
    const scroller = scrollRef.current;
    if (!scroller) return;
    const pages = [...scroller.querySelectorAll<HTMLElement>("[data-pdf-page]")];
    const perPage = new Map<number, NormRect[]>();
    for (let ri = 0; ri < sel.rangeCount; ri++) {
      for (const rect of Array.from(sel.getRangeAt(ri).getClientRects())) {
        if (rect.width < 2 || rect.height < 2) continue;
        const midX = rect.left + rect.width / 2;
        const midY = rect.top + rect.height / 2;
        const pageEl = pages.find((p) => {
          const b = p.getBoundingClientRect();
          return midX >= b.left && midX <= b.right && midY >= b.top && midY <= b.bottom;
        });
        if (!pageEl) continue;
        const b = pageEl.getBoundingClientRect();
        const page = Number(pageEl.dataset.pdfPage);
        const norm: NormRect = {
          x: (rect.left - b.left) / b.width,
          y: (rect.top - b.top) / b.height,
          w: rect.width / b.width,
          h: rect.height / b.height,
        };
        const list = perPage.get(page) ?? [];
        // Skip near-duplicate rects (selection APIs often report overlapping fragments).
        if (!list.some((r) => Math.abs(r.x - norm.x) < 0.004 && Math.abs(r.y - norm.y) < 0.004 && Math.abs(r.w - norm.w) < 0.008)) {
          list.push(norm);
        }
        perPage.set(page, list);
      }
    }
    if (!perPage.size) {
      setSelection(null);
      return;
    }
    const first = sel.getRangeAt(0).getBoundingClientRect();
    setSelection({
      x: first.left + first.width / 2,
      y: first.top,
      snippet: sel.toString().replace(/\s+/g, " ").trim().slice(0, 200),
      perPage,
    });
  };

  const createHighlights = (color: string, withNote: boolean) => {
    if (!selection) return;
    const created: PdfHighlight[] = [...selection.perPage.entries()].map(([page, rects]) => ({
      id: uuid(),
      page,
      rects,
      color,
      snippet: selection.snippet,
      createdAt: Date.now(),
    }));
    onUpdate({ pdfHighlights: [...highlights, ...created] });
    window.getSelection()?.removeAllRanges();
    const anchor = { x: selection.x, y: selection.y };
    setSelection(null);
    if (withNote && created.length) {
      setNoteDraft("");
      setPopover({ id: created[0].id, x: anchor.x, y: anchor.y, editingNote: true });
    }
  };

  /* ---------- popover actions ---------- */

  const openPopover = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const h = highlights.find((x) => x.id === id);
    if (!h) return;
    setNoteDraft(h.note ?? "");
    setPopover({ id, x: e.clientX, y: e.clientY, editingNote: false });
  };

  const patchHighlight = (id: string, patch: Partial<PdfHighlight>) => {
    onUpdate({ pdfHighlights: highlights.map((h) => (h.id === id ? { ...h, ...patch } : h)) });
  };

  const deleteHighlight = (id: string) => {
    onUpdate({ pdfHighlights: highlights.filter((h) => h.id !== id) });
    setPopover(null);
  };

  const saveNote = () => {
    if (!popover) return;
    const text = noteDraft.trim();
    patchHighlight(popover.id, { note: text || undefined });
    setPopover(null);
  };

  /* ---------- bookmarks ---------- */

  const bookmarkedPages = useMemo(() => new Set(bookmarks.map((b) => b.page)), [bookmarks]);

  const toggleBookmark = () => {
    if (readOnly) return;
    const existing = bookmarks.find((b) => b.page === currentPage);
    onUpdate({
      pdfBookmarks: existing
        ? bookmarks.filter((b) => b.id !== existing.id)
        : [...bookmarks, { id: uuid(), page: currentPage, createdAt: Date.now() }].sort((a, b) => a.page - b.page),
    });
  };

  const popoverHighlight = popover ? highlights.find((h) => h.id === popover.id) : null;

  if (error) {
    return <div className="flex h-40 items-center justify-center text-[13px] text-slate-400">{error}</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[12.5px] text-slate-400">
          {pdf.name}
          {doc && (
            <>
              {" "}
              · page {currentPage} / {doc.numPages}
            </>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {!readOnly && (
            <button
              type="button"
              title={bookmarkedPages.has(currentPage) ? "Remove bookmark from this page" : "Bookmark this page"}
              onClick={toggleBookmark}
              className={`flex h-7 items-center gap-1 rounded-lg border border-black/[0.08] bg-white px-2 text-[12px] font-medium shadow-sm hover:bg-slate-50 ${
                bookmarkedPages.has(currentPage) ? "text-red-500" : "text-slate-600"
              }`}
            >
              <Bookmark size={13} fill={bookmarkedPages.has(currentPage) ? "currentColor" : "none"} />
              Bookmark
            </button>
          )}
          <div className="flex items-center gap-0.5 rounded-lg border border-black/[0.08] bg-white px-1 py-0.5 shadow-sm">
            <button
              type="button"
              title="Zoom out"
              onClick={() => setZoom((z) => Math.max(0.5, +(z / 1.2).toFixed(2)))}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-black/5"
            >
              <ZoomOut size={13} />
            </button>
            <span className="w-10 text-center text-[11.5px] font-medium tabular-nums text-slate-600">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              title="Zoom in"
              onClick={() => setZoom((z) => Math.min(3, +(z * 1.2).toFixed(2)))}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-black/5"
            >
              <ZoomIn size={13} />
            </button>
          </div>
          <button
            type="button"
            title={panelOpen ? "Hide annotations" : "Show highlights & bookmarks"}
            onClick={() => setPanelOpen((v) => !v)}
            className={`flex h-7 w-7 items-center justify-center rounded-lg border border-black/[0.08] bg-white shadow-sm hover:bg-slate-50 ${
              panelOpen ? "text-slate-800" : "text-slate-500"
            }`}
          >
            {panelOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          onMouseUp={() => setTimeout(captureSelection, 10)}
          className="min-h-0 flex-1 overflow-auto rounded-xl bg-black/[0.03] p-6 [scrollbar-gutter:stable]"
        >
          <div ref={containerRef}>
            {!doc ? (
              <div className="flex h-40 items-center justify-center text-[13px] text-slate-400">Loading PDF…</div>
            ) : (
              Array.from({ length: doc.numPages }, (_, i) => (
                <PdfPage
                  key={i + 1}
                  doc={doc}
                  pageNum={i + 1}
                  width={pageWidth}
                  highlights={highlights.filter((h) => h.page === i + 1)}
                  bookmarked={bookmarkedPages.has(i + 1)}
                  flashId={flashId}
                  onHighlightClick={openPopover}
                />
              ))
            )}
          </div>
        </div>

        {panelOpen && (
          <div className="flex w-64 shrink-0 flex-col overflow-y-auto rounded-xl border border-black/[0.06] bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
              <Bookmark size={12} /> Bookmarks
            </div>
            {bookmarks.length === 0 && <div className="mb-3 text-[11.5px] text-slate-300">No bookmarks yet.</div>}
            <div className="mb-4 flex flex-col gap-1">
              {bookmarks.map((b) => (
                <BookmarkRow
                  key={b.id}
                  bookmark={b}
                  readOnly={readOnly}
                  onJump={() => scrollToPage(b.page)}
                  onRename={(label) =>
                    onUpdate({ pdfBookmarks: bookmarks.map((x) => (x.id === b.id ? { ...x, label: label || undefined } : x)) })
                  }
                  onDelete={() => onUpdate({ pdfBookmarks: bookmarks.filter((x) => x.id !== b.id) })}
                />
              ))}
            </div>

            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
              <Highlighter size={12} /> Highlights
            </div>
            {highlights.length === 0 && (
              <div className="text-[11.5px] leading-relaxed text-slate-300">
                Select some text in the PDF to highlight it.
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              {[...highlights]
                .sort((a, b) => a.page - b.page || a.createdAt - b.createdAt)
                .map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => jumpToHighlight(h)}
                    className="group rounded-lg border border-black/[0.05] p-2 text-left hover:bg-slate-50"
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: h.color }} />
                      <span className="text-[10.5px] font-medium text-slate-400">p. {h.page}</span>
                      {h.note && <StickyNote size={10} className="text-amber-500" />}
                    </div>
                    <div className="text-[11.5px] leading-snug text-slate-600 line-clamp-2">“{h.snippet}”</div>
                    {h.note && <div className="mt-1 text-[11px] italic leading-snug text-slate-400 line-clamp-2">{h.note}</div>}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating selection toolbar */}
      {selection && !readOnly && (
        <div
          className="fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-lg border border-black/10 bg-white px-1.5 py-1 shadow-xl"
          style={{ left: selection.x, top: selection.y - 8 }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title="Highlight"
              onClick={() => createHighlights(c, false)}
              className="h-5 w-5 rounded-full ring-1 ring-black/10 transition hover:scale-110"
              style={{ background: c }}
            />
          ))}
          <span className="mx-0.5 h-4 w-px bg-black/10" />
          <button
            type="button"
            title="Highlight & add note"
            onClick={() => createHighlights(HIGHLIGHT_COLORS[0], true)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-black/5"
          >
            <MessageSquarePlus size={14} />
          </button>
        </div>
      )}

      {/* Highlight popover */}
      {popover && popoverHighlight && (
        <div
          className="fixed z-50 w-64 rounded-xl border border-black/10 bg-white p-3 shadow-2xl"
          style={{ left: Math.min(popover.x, window.innerWidth - 280), top: Math.min(popover.y + 10, window.innerHeight - 220) }}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={readOnly}
                  onClick={() => patchHighlight(popover.id, { color: c })}
                  className={`h-4 w-4 rounded-full ring-1 ring-black/10 ${
                    popoverHighlight.color === c ? "ring-2 ring-slate-500" : ""
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-0.5">
              {!readOnly && (
                <button
                  type="button"
                  title="Delete highlight"
                  onClick={() => deleteHighlight(popover.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setPopover(null)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-black/5"
              >
                <X size={13} />
              </button>
            </div>
          </div>
          <div className="mb-2 text-[11px] italic leading-snug text-slate-400 line-clamp-2">“{popoverHighlight.snippet}”</div>
          {popover.editingNote || popoverHighlight.note || !readOnly ? (
            <>
              <textarea
                autoFocus={popover.editingNote}
                readOnly={readOnly}
                value={noteDraft}
                placeholder="Add a note…"
                rows={3}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNote();
                }}
                className="w-full resize-none rounded-lg border border-black/10 bg-slate-50 px-2 py-1.5 text-[12px] leading-relaxed outline-none focus:border-slate-400"
              />
              {!readOnly && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={saveNote}
                    className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11.5px] font-medium text-white hover:bg-slate-700"
                  >
                    Save note
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function BookmarkRow({
  bookmark,
  readOnly,
  onJump,
  onRename,
  onDelete,
}: {
  bookmark: PdfBookmark;
  readOnly?: boolean;
  onJump: () => void;
  onRename: (label: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(bookmark.label ?? "");

  return (
    <div className="group flex items-center gap-1.5 rounded-lg border border-black/[0.05] px-2 py-1.5 hover:bg-slate-50">
      <Bookmark size={11} className="shrink-0 fill-red-400 text-red-400" />
      {editing ? (
        <input
          autoFocus
          value={value}
          placeholder={`Page ${bookmark.page}`}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onRename(value.trim());
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={() => {
            onRename(value.trim());
            setEditing(false);
          }}
          className="w-full min-w-0 flex-1 bg-transparent text-[11.5px] outline-none"
        />
      ) : (
        <button type="button" onClick={onJump} className="min-w-0 flex-1 truncate text-left text-[11.5px] text-slate-600">
          <span className="font-medium">p. {bookmark.page}</span>
          {bookmark.label && <span className="text-slate-500"> — {bookmark.label}</span>}
        </button>
      )}
      {!readOnly && !editing && (
        <span className="flex shrink-0 items-center opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            title="Rename"
            onClick={() => {
              setValue(bookmark.label ?? "");
              setEditing(true);
            }}
            className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-black/5"
          >
            <Pencil size={10} />
          </button>
          <button
            type="button"
            title="Delete bookmark"
            onClick={onDelete}
            className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={10} />
          </button>
        </span>
      )}
    </div>
  );
}
