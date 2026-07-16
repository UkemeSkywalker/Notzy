import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ArrowLeft,
  Bold,
  Brush,
  ChevronRight,
  Code,
  Eye,
  FileCode,
  PenLine,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Redo2,
  RotateCcw,
  Star,
  Strikethrough,
  TextQuote,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { useAppStore } from "../data/useAppStore";
import type { AccentColor, PageMargins, ViewId } from "../types";
import { formatRelative } from "../utils/time";
import { ScribbleCanvas } from "../components/ScribbleCanvas";
import { PdfViewer } from "../components/PdfViewer";
import { MarkdownViewer } from "../components/MarkdownViewer";
import {
  DEFAULT_PAGE_MARGINS,
  HorizontalRuler,
  PAGE_MIN_HEIGHT,
  PAGE_WIDTH,
  VerticalRuler,
} from "../components/PageRulers";

const COLORS: { id: AccentColor; className: string }[] = [
  { id: "red", className: "bg-rose-400" },
  { id: "blue", className: "bg-sky-400" },
  { id: "green", className: "bg-emerald-400" },
  { id: "purple", className: "bg-violet-400" },
  { id: "amber", className: "bg-amber-400" },
  { id: "slate", className: "bg-slate-400" },
];

const ACCENT_BAR: Record<AccentColor, string> = {
  red: "bg-rose-400",
  blue: "bg-sky-400",
  green: "bg-emerald-400",
  purple: "bg-violet-400",
  amber: "bg-amber-400",
  slate: "bg-slate-400",
};

function ToolButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition disabled:opacity-30 ${
        active ? "bg-black/[0.08] text-slate-900" : "text-slate-500 hover:bg-black/5"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-black/[0.06] bg-white px-1.5 py-1 shadow-sm">
      <ToolButton title="Undo (⌘Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={14} />
      </ToolButton>
      <ToolButton title="Redo (⌘⇧Z)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={14} />
      </ToolButton>
      <span className="mx-1 h-4 w-px bg-black/10" />
      <ToolButton
        title="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 size={14} />
      </ToolButton>
      <ToolButton
        title="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={14} />
      </ToolButton>
      <ToolButton
        title="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={14} />
      </ToolButton>
      <span className="mx-1 h-4 w-px bg-black/10" />
      <ToolButton title="Bold (⌘B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={14} />
      </ToolButton>
      <ToolButton
        title="Italic (⌘I)"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={14} />
      </ToolButton>
      <ToolButton
        title="Underline (⌘U)"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon size={14} />
      </ToolButton>
      <ToolButton
        title="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={14} />
      </ToolButton>
      <ToolButton title="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code size={14} />
      </ToolButton>
      <span className="mx-1 h-4 w-px bg-black/10" />
      <ToolButton
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={14} />
      </ToolButton>
      <ToolButton
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={14} />
      </ToolButton>
      <ToolButton
        title="To-do list"
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListTodo size={14} />
      </ToolButton>
      <ToolButton
        title="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <TextQuote size={14} />
      </ToolButton>
    </div>
  );
}

export function NotePage({ noteId }: { noteId: string }) {
  const note = useAppStore((s) => s.notes.find((n) => n.id === noteId));
  const workspace = useAppStore((s) => s.workspaces.find((w) => w.id === note?.workspaceId));
  const section = useAppStore((s) => s.sections.find((sec) => sec.id === note?.sectionId));
  const returnView = useAppStore((s) => s.returnView);
  const setView = useAppStore((s) => s.setView);
  const updateNote = useAppStore((s) => s.updateNote);
  const toggleStar = useAppStore((s) => s.toggleStar);
  const trashNote = useAppStore((s) => s.trashNote);
  const restoreNote = useAppStore((s) => s.restoreNote);

  const [title, setTitle] = useState(note?.title ?? "");
  const [scribbleMode, setScribbleMode] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<{ title?: string; content?: string; markdown?: string } | null>(null);
  const readOnly = !!note?.trashed;
  const isMd = note?.markdown != null;
  const [mdMode, setMdMode] = useState<"preview" | "raw">("preview");

  /* Page margins, live while dragging a ruler marker, persisted on release. */
  const [margins, setMargins] = useState<PageMargins>(note?.pageMargins ?? DEFAULT_PAGE_MARGINS);
  const commitMargins = useCallback(
    (m: PageMargins) => updateNote(noteId, { pageMargins: m }),
    [noteId, updateNote],
  );
  const [guide, setGuide] = useState<{ x?: number | null; y?: number | null }>({});
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(PAGE_MIN_HEIGHT);

  // Reset local title/scribble mode when navigating between notes.
  useEffect(() => {
    const fresh = useAppStore.getState().notes.find((n) => n.id === noteId);
    setTitle(fresh?.title ?? "");
    setScribbleMode(false);
    setMdMode("preview");
    setMargins(fresh?.pageMargins ?? DEFAULT_PAGE_MARGINS);
  }, [noteId]);

  const goBack = useCallback(() => {
    const fallback: ViewId = note
      ? { kind: "workspace", workspaceId: note.workspaceId }
      : { kind: "all" };
    setView(returnView && returnView.kind !== "note" ? returnView : fallback);
  }, [note, returnView, setView]);

  const scheduleSave = useCallback(
    (patch: { title?: string; content?: string; markdown?: string }) => {
      pendingPatch.current = { ...pendingPatch.current, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (pendingPatch.current) updateNote(noteId, pendingPatch.current);
        pendingPatch.current = null;
      }, 400);
    },
    [noteId, updateNote],
  );

  const editor = useEditor(
    {
      editable: !readOnly,
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Underline,
        TaskList,
        TaskItem.configure({ nested: true }),
        Placeholder.configure({ placeholder: "Write something…" }),
      ],
      content: note?.content || "<p></p>",
      onUpdate: ({ editor: e }) => scheduleSave({ content: e.getHTML() }),
    },
    [noteId, readOnly],
  );

  // Track the sheet's height so the vertical ruler always spans it.
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSheetHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [editor, scribbleMode, note?.pdf]);

  // Flush any pending save when leaving the page or switching notes.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (pendingPatch.current) {
        updateNote(noteId, pendingPatch.current);
        pendingPatch.current = null;
      }
    };
  }, [noteId, updateNote]);

  if (!note) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-[13.5px] text-slate-400">
        This note no longer exists.
        <button
          type="button"
          onClick={goBack}
          className="rounded-lg border border-black/10 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50"
        >
          Go back
        </button>
      </div>
    );
  }
  if (!editor) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="drag flex items-center justify-between px-5 pb-2 pt-5">
        <div className="no-drag flex min-w-0 items-center gap-1.5 text-[13px] text-slate-500">
          <button
            type="button"
            onClick={goBack}
            className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-black/5"
          >
            <ArrowLeft size={16} />
          </button>
          {workspace && (
            <>
              <button type="button" onClick={goBack} className="max-w-[140px] truncate hover:text-slate-800">
                {workspace.name}
              </button>
              <ChevronRight size={13} className="shrink-0 text-slate-300" />
            </>
          )}
          {section && (
            <>
              <span className="max-w-[140px] truncate">{section.name}</span>
              <ChevronRight size={13} className="shrink-0 text-slate-300" />
            </>
          )}
          <span className="max-w-[220px] truncate font-medium text-slate-700">{note.title || "Untitled"}</span>
        </div>

        <div className="no-drag flex shrink-0 items-center gap-1">
          <span className="mr-2 text-[12px] text-slate-400">Edited {formatRelative(note.updatedAt)}</span>
          {isMd && (
            <div className="mr-1 flex items-center rounded-lg border border-black/10 bg-white p-0.5">
              {(["preview", "raw"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMdMode(m)}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium transition ${
                    mdMode === m ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-black/5"
                  }`}
                >
                  {m === "preview" ? <Eye size={12} /> : <FileCode size={12} />}
                  {m === "preview" ? "Preview" : "Markdown"}
                </button>
              ))}
            </div>
          )}
          {!note.pdf && !isMd && (
          <button
            type="button"
            onClick={() => setScribbleMode((v) => !v)}
            className={`mr-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12.5px] font-medium transition ${
              scribbleMode
                ? "bg-slate-900 text-white hover:bg-slate-700"
                : "border border-black/10 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {scribbleMode ? <PenLine size={13} /> : <Brush size={13} />}
            {scribbleMode ? "Back to writing" : "Scribble mode"}
          </button>
          )}
          {!readOnly && !scribbleMode && (
            <div className="mr-1 flex items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={`Accent: ${c.id}`}
                  onClick={() => updateNote(note.id, { color: c.id })}
                  className={`h-3.5 w-3.5 rounded-full ${c.className} ${
                    note.color === c.id ? "ring-2 ring-slate-400 ring-offset-1" : "opacity-50 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            title={note.starred ? "Unstar" : "Star"}
            onClick={() => toggleStar(note.id)}
            className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-black/5 ${
              note.starred ? "text-amber-400" : "text-slate-400"
            }`}
          >
            <Star size={15} fill={note.starred ? "currentColor" : "none"} />
          </button>
          {readOnly ? (
            <button
              type="button"
              onClick={() => restoreNote(note.id)}
              className="ml-1 flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 py-1 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw size={13} />
              Restore
            </button>
          ) : (
            <button
              type="button"
              title="Move to Trash"
              onClick={() => {
                trashNote(note.id);
                goBack();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {note.pdf ? (
        <div className="no-drag flex min-h-0 flex-1 flex-col px-6 pb-4">
          <input
            value={title}
            readOnly={readOnly}
            placeholder="Untitled"
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleSave({ title: e.target.value });
            }}
            className="mb-2 w-full bg-transparent text-[24px] font-bold leading-tight text-slate-900 outline-none placeholder:text-slate-300"
          />
          <PdfViewer note={note} readOnly={readOnly} onUpdate={(patch) => updateNote(note.id, patch)} />
        </div>
      ) : scribbleMode ? (
        <div className="no-drag min-h-0 flex-1">
          <ScribbleCanvas
            value={note.drawing ?? []}
            onChange={(drawing) => updateNote(note.id, { drawing })}
            readOnly={readOnly}
          />
        </div>
      ) : (
        <div className="no-drag flex min-h-0 flex-1 flex-col">
          {readOnly && (
            <div className="mx-auto mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-700">
              This note is in the Trash. Restore it to continue editing.
            </div>
          )}
          {/* Document canvas: neutral backdrop, centered paper sheet, rulers. */}
          <div className="min-h-0 flex-1 overflow-auto rounded-t-xl bg-slate-500/[0.13]">
            <div className="mx-auto w-max px-8 pb-16 pt-2">
              {!readOnly && !isMd && (
                <div className="sticky top-2 z-20 mb-1.5" style={{ width: PAGE_WIDTH }}>
                  <Toolbar editor={editor} />
                </div>
              )}
              <div className="sticky z-10" style={{ width: PAGE_WIDTH, top: readOnly || isMd ? 8 : 52 }}>
                <HorizontalRuler
                  margins={margins}
                  disabled={readOnly}
                  onChange={setMargins}
                  onCommit={commitMargins}
                  onGuide={(x) => setGuide((g) => ({ ...g, x }))}
                />
              </div>
              <div className="relative mt-1.5">
                <div className="absolute -left-6 top-0">
                  <VerticalRuler
                    height={sheetHeight}
                    margins={margins}
                    disabled={readOnly}
                    onChange={setMargins}
                    onCommit={commitMargins}
                    onGuide={(y) => setGuide((g) => ({ ...g, y }))}
                  />
                </div>
                <div
                  ref={sheetRef}
                  onClick={(e) => {
                    // Clicking bare paper (margins / below the text) puts the caret at the end.
                    if (e.target === e.currentTarget && !readOnly && !isMd) editor.commands.focus("end");
                  }}
                  className="relative rounded-[3px] bg-[#fffefb] shadow-[0_1px_2px_rgba(15,23,42,0.10),0_12px_32px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.06]"
                  style={{
                    width: PAGE_WIDTH,
                    minHeight: PAGE_MIN_HEIGHT,
                    paddingTop: margins.top,
                    paddingLeft: margins.left,
                    paddingRight: margins.right,
                    paddingBottom: 96,
                  }}
                >
                  {typeof guide.x === "number" && (
                    <div
                      className="pointer-events-none absolute inset-y-0 z-10 border-l border-dashed border-sky-400"
                      style={{ left: guide.x }}
                    />
                  )}
                  {typeof guide.y === "number" && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-sky-400"
                      style={{ top: guide.y }}
                    />
                  )}
                  <div className={`mb-5 h-1 w-12 rounded-full ${ACCENT_BAR[note.color]}`} />
                  <input
                    value={title}
                    readOnly={readOnly}
                    placeholder="Untitled"
                    onChange={(e) => {
                      setTitle(e.target.value);
                      scheduleSave({ title: e.target.value });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        editor.commands.focus("start");
                      }
                    }}
                    className="mb-3 w-full bg-transparent text-[28px] font-bold leading-tight text-slate-900 outline-none placeholder:text-slate-300"
                  />
                  {isMd ? (
                    <MarkdownViewer
                      markdown={note.markdown ?? ""}
                      mode={mdMode}
                      readOnly={readOnly}
                      onChange={(markdown) => scheduleSave({ markdown })}
                    />
                  ) : (
                    <EditorContent editor={editor} className="note-editor" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
