export type AccentColor = "red" | "blue" | "green" | "purple" | "amber" | "slate";

export interface Workspace {
  id: string;
  name: string;
  icon: string;
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

export interface Note {
  id: string;
  workspaceId: string;
  sectionId: string;
  title: string;
  content: string;
  drawing?: DrawObject[];
  /** Raw markdown source for imported .md files; rendered in preview mode. */
  markdown?: string;
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
