import { useRef, useState } from "react";
import { Node, NodeViewWrapper, ReactNodeViewRenderer, mergeAttributes } from "@tiptap/react";
import type { Editor, NodeViewProps } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import { AlignCenter, AlignLeft, AlignRight, Maximize2, Trash2 } from "lucide-react";

type Align = "left" | "center" | "right";

const MAX_DIMENSION = 1600;
const MIN_WIDTH = 48;

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = src;
  });
}

/**
 * Turn a pasted/dropped/picked file into a data URL small enough to live in
 * the note: images are stored inline in the note's HTML, so a raw 6 MB
 * screenshot would bloat every save.
 */
export async function prepareImage(file: File): Promise<string> {
  // Animated / vector formats would lose their nature on a canvas round-trip.
  if (file.type === "image/gif" || file.type === "image/svg+xml") return readAsDataUrl(file);

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && file.size <= 500_000) return readAsDataUrl(file);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let out = canvas.toDataURL(file.type === "image/jpeg" ? "image/jpeg" : "image/png", 0.9);
    if (out.length > 1_500_000) {
      // Still heavy (usually a photo saved as PNG): flatten onto white as JPEG.
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      out = canvas.toDataURL("image/jpeg", 0.85);
    }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function imageFiles(data: DataTransfer | null): File[] {
  if (!data) return [];
  return Array.from(data.files).filter((f) => f.type.startsWith("image/"));
}

/** Insert image files at a document position (defaults to the cursor). */
export async function insertImageFiles(editor: Editor, files: File[], pos?: number) {
  let at = pos ?? editor.state.selection.from;
  for (const file of files) {
    try {
      const src = await prepareImage(file);
      editor.chain().focus().insertContentAt(at, { type: "image", attrs: { src, alt: file.name } }).run();
      at = editor.state.selection.to;
    } catch (err) {
      console.error("Image insert failed:", err);
    }
  }
}

function ImageView({ node, updateAttributes, selected, editor, deleteNode }: NodeViewProps) {
  const { src, alt, width, align } = node.attrs as { src: string; alt: string | null; width: number | null; align: Align };
  const boxRef = useRef<HTMLDivElement>(null);
  const [draftWidth, setDraftWidth] = useState<number | null>(null);
  const editable = editor.isEditable;
  const shownWidth = draftWidth ?? width;

  const startResize = (e: React.MouseEvent, side: "left" | "right") => {
    e.preventDefault();
    e.stopPropagation();
    const box = boxRef.current;
    if (!box) return;
    const startX = e.clientX;
    const startW = box.getBoundingClientRect().width;
    const maxW = editor.view.dom.clientWidth;
    // A centered image grows on both sides, so the pointer covers half the change.
    const factor = align === "center" ? 2 : 1;
    let latest = startW;
    const onMove = (ev: MouseEvent) => {
      const dx = side === "right" ? ev.clientX - startX : startX - ev.clientX;
      latest = Math.round(Math.min(maxW, Math.max(MIN_WIDTH, startW + dx * factor)));
      setDraftWidth(latest);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDraftWidth(null);
      updateAttributes({ width: latest });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const alignButtons: { value: Align; title: string; Icon: typeof AlignLeft }[] = [
    { value: "left", title: "Left, text wraps on the right", Icon: AlignLeft },
    { value: "center", title: "Center", Icon: AlignCenter },
    { value: "right", title: "Right, text wraps on the left", Icon: AlignRight },
  ];

  return (
    <NodeViewWrapper className={`note-image note-image--${align}`} data-drag-handle="">
      <div
        ref={boxRef}
        className="relative inline-block max-w-full align-top"
        style={{ width: shownWidth ? `${shownWidth}px` : undefined }}
      >
        <img
          src={src}
          alt={alt ?? ""}
          draggable={false}
          className={`block w-full rounded-md ${selected && editable ? "outline outline-2 outline-offset-2 outline-sky-500" : ""}`}
        />
        {selected && editable && (
          <>
            {(["left", "right"] as const).map((side) => (
              <span
                key={side}
                title="Drag to resize"
                onMouseDown={(e) => startResize(e, side)}
                className={`absolute top-1/2 h-10 w-2.5 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-white bg-sky-500 shadow ${
                  side === "left" ? "-left-1.5" : "-right-1.5"
                }`}
              />
            ))}
            <div
              onMouseDown={(e) => e.preventDefault()}
              className="absolute -top-10 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-black/10 bg-white p-0.5 shadow-lg"
            >
              {alignButtons.map(({ value, title, Icon }) => (
                <button
                  key={value}
                  type="button"
                  title={title}
                  aria-pressed={align === value}
                  onClick={() => updateAttributes({ align: value })}
                  className={`flex h-7 w-7 items-center justify-center rounded-md ${
                    align === value ? "bg-black/[0.08] text-slate-900" : "text-slate-500 hover:bg-black/5"
                  }`}
                >
                  <Icon size={14} />
                </button>
              ))}
              <span className="mx-0.5 h-4 w-px bg-black/10" />
              <button
                type="button"
                title="Original size"
                onClick={() => updateAttributes({ width: null })}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-black/5"
              >
                <Maximize2 size={13} />
              </button>
              <button
                type="button"
                title="Delete image"
                onClick={() => deleteNode()}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

/**
 * Block image that flows with the text: drag to move it between paragraphs,
 * drag its side handles to resize, and align it left/right (text wraps around)
 * or center. Width and alignment are kept in the saved HTML.
 */
export const NoteImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      width: {
        default: null,
        parseHTML: (el) => {
          const w = parseInt(el.getAttribute("width") ?? "", 10);
          return Number.isFinite(w) ? w : null;
        },
        renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}),
      },
      align: {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-align") ?? "center",
        renderHTML: (attrs) => ({ "data-align": attrs.align }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const files = imageFiles(event.clipboardData);
            if (!files.length || !editor.isEditable) return false;
            event.preventDefault();
            void insertImageFiles(editor, files);
            return true;
          },
          handleDrop: (view, event, _slice, moved) => {
            // `moved` drops are images being dragged within the note: let ProseMirror move them.
            if (moved) return false;
            const files = imageFiles(event.dataTransfer);
            if (!files.length || !editor.isEditable) return false;
            event.preventDefault();
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
            void insertImageFiles(editor, files, pos);
            return true;
          },
        },
      }),
    ];
  },
});
