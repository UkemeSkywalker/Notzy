import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "../data/useAppStore";
import { flushPersist } from "../data/persistence";
import { isTauri } from "../stickyWindows";
import type { AccentColor, Note, StickyMeta } from "../types";

/** Classic sticky-paper backgrounds keyed by the note's accent color. */
export const STICKY_BG: Record<AccentColor, string> = {
  amber: "#FDF0A4",
  red: "#FFD9E0",
  green: "#D5F3DE",
  blue: "#D2E9FF",
  purple: "#E6DDFF",
  slate: "#EDF0F4",
};

function StickyBody({ note }: { note: Note }) {
  const updateNote = useAppStore((s) => s.updateNote);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Merge a change into this sticky's metadata, reading the freshest store copy. */
  const patchSticky = (patch: Partial<StickyMeta>) => {
    const cur = useAppStore.getState().notes.find((n) => n.id === note.id);
    if (cur?.sticky) updateNote(note.id, { sticky: { ...cur.sticky, ...patch } });
  };

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Placeholder.configure({ placeholder: "Jot something…" }),
      ],
      content: note.content || "<p></p>",
      onUpdate: ({ editor: e }) => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        const html = e.getHTML();
        saveTimer.current = setTimeout(() => {
          saveTimer.current = null;
          updateNote(note.id, { content: html });
        }, 400);
      },
    },
    [note.id],
  );

  // Pick up edits made in the main app, unless the user is typing here.
  useEffect(() => {
    if (!editor || editor.isFocused || saveTimer.current) return;
    if (editor.getHTML() !== note.content) editor.commands.setContent(note.content || "<p></p>", false);
  }, [editor, note.content]);

  // Persist window geometry (logical px) as the sticky is moved / resized.
  useEffect(() => {
    if (!isTauri()) return;
    const win = getCurrentWindow();
    let t: ReturnType<typeof setTimeout> | null = null;
    const record = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        void (async () => {
          const factor = await win.scaleFactor();
          const pos = (await win.outerPosition()).toLogical(factor);
          const size = (await win.innerSize()).toLogical(factor);
          const cur = useAppStore.getState().notes.find((n) => n.id === note.id);
          if (!cur?.sticky || cur.sticky.collapsed) return;
          patchSticky({
            x: Math.round(pos.x),
            y: Math.round(pos.y),
            w: Math.round(size.width),
            h: Math.round(size.height),
          });
        })();
      }, 400);
    };
    const unMoved = win.onMoved(record);
    const unResized = win.onResized(record);
    return () => {
      if (t) clearTimeout(t);
      void unMoved.then((f) => f());
      void unResized.then((f) => f());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  /** Frameless window: the header drags it (buttons excluded). */
  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    if (isTauri()) void getCurrentWindow().startDragging();
  };

  /** Closing a sticky takes it off the desktop; the note stays in the app. */
  const closeSticky = async () => {
    if (saveTimer.current && editor) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      updateNote(note.id, { content: editor.getHTML() });
    }
    patchSticky({ open: false });
    await flushPersist();
    if (isTauri()) await getCurrentWindow().close();
  };

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden rounded-[10px]"
      style={{ background: STICKY_BG[note.color] }}
    >
      <div
        onMouseDown={onHeaderMouseDown}
        className="group flex h-8 shrink-0 cursor-default select-none items-center gap-1 px-2"
      >
        <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-black/45">
          {note.title || "Sticky note"}
        </span>
        <button
          type="button"
          title="Close (keeps the note in Notzy)"
          onClick={() => void closeSticky()}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-black/35 opacity-0 transition hover:bg-black/10 hover:text-black/70 group-hover:opacity-100"
        >
          <X size={13} />
        </button>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-3"
        onClick={(e) => {
          if (e.target === e.currentTarget) editor?.commands.focus("end");
        }}
      >
        <EditorContent editor={editor} className="sticky-editor" />
      </div>
    </div>
  );
}

export function StickyNoteWindow({ noteId }: { noteId: string }) {
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrate = useAppStore((s) => s.hydrate);
  const note = useAppStore((s) => s.notes.find((n) => n.id === noteId));

  useEffect(() => {
    void hydrate();
    // The window is transparent; the sticky paper paints its own rounded shape.
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // The note was deleted or trashed: take its window off the desktop.
    if (hydrated && (!note || note.trashed) && isTauri()) void getCurrentWindow().close();
  }, [hydrated, note]);

  if (!hydrated || !note || note.trashed) return null;
  return <StickyBody note={note} />;
}
