export type AccentColor = "red" | "blue" | "green" | "purple" | "amber" | "slate";

export interface Workspace {
  id: string;
  name: string;
  /** A key of WORKSPACE_ICONS, or an emoji. Older workspaces may hold "#" or "📁". */
  icon: string;
  /** A key of WORKSPACE_COLORS; unset on older workspaces. */
  color?: string;
  order: number;
}

export interface Section {
  id: string;
  workspaceId: string;
  name: string;
  order: number;
}

export interface StrokeObject {
  type: "stroke";
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface ShapeObject {
  type: "rect" | "ellipse" | "line" | "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  /** Optional label rendered centered inside the shape. */
  text?: string;
}

export interface TextObject {
  type: "text";
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
}

export interface ImageObject {
  type: "image";
  dataUrl: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type DrawObject = StrokeObject | ShapeObject | ImageObject | TextObject;

export interface PdfAttachment {
  name: string;
  dataUrl: string;
  pages: number;
}

export interface PdfHighlight {
  id: string;
  /** 1-based page number. */
  page: number;
  /** Rects normalized to the page box (0..1), so they hold at any zoom. */
  rects: { x: number; y: number; w: number; h: number }[];
  color: string;
  /** Excerpt of the highlighted text, for the annotations panel. */
  snippet: string;
  note?: string;
  createdAt: number;
}

export interface PdfBookmark {
  id: string;
  /** 1-based page number. */
  page: number;
  label?: string;
  createdAt: number;
}

export interface PageMargins {
  top: number;
  left: number;
  right: number;
}

/** Desktop sticky-note window state for a note. */
export interface StickyMeta {
  /** Whether the sticky window should be on the desktop. */
  open: boolean;
  /** Window geometry in logical pixels. */
  x?: number;
  y?: number;
  w: number;
  h: number;
  /** Always-on-top. */
  pinned: boolean;
  /** Rolled up to just the title bar. */
  collapsed?: boolean;
  /** Height to restore when un-collapsing. */
  restoreH?: number;
  /** Paper opacity 0.55–1. */
  opacity?: number;
  /** Content font scale, 1 = default. */
  fontScale?: number;
  /** Visible on all macOS Spaces. */
  allSpaces?: boolean;
  /** Show the drawing canvas instead of text. */
  scribble?: boolean;
  /** Epoch ms for a reminder notification. */
  reminderAt?: number;
}

export interface Note {
  id: string;
  workspaceId: string;
  sectionId: string;
  title: string;
  content: string;
  drawing?: DrawObject[];
  /** Raw markdown source for imported .md files; rendered in preview mode. */
  markdown?: string;
  /** Present when the note has (or had) a desktop sticky window. */
  sticky?: StickyMeta;
  /** Document margins in px (96 dpi), adjustable via the page rulers. */
  pageMargins?: PageMargins;
  pdf?: PdfAttachment;
  pdfHighlights?: PdfHighlight[];
  pdfBookmarks?: PdfBookmark[];
  color: AccentColor;
  starred: boolean;
  archived: boolean;
  trashed: boolean;
  createdAt: number;
  updatedAt: number;
  trashedAt?: number;
}

export interface Notification {
  id: string;
  message: string;
  createdAt: number;
  read: boolean;
}

export type ViewId =
  | { kind: "workspace"; workspaceId: string }
  | { kind: "note"; noteId: string }
  | { kind: "all" }
  | { kind: "starred" }
  | { kind: "archive" }
  | { kind: "trash" }
  | { kind: "notifications" }
  | { kind: "settings" };
