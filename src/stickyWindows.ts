import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { flushPersist } from "./data/persistence";
import type { Note, StickyMeta } from "./types";

export const DEFAULT_STICKY: StickyMeta = { open: true, w: 300, h: 300, pinned: false };
export const COLLAPSED_H = 40;

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function stickyLabel(noteId: string): string {
  return `sticky-${noteId}`;
}

/** Open (or focus) the desktop sticky window for a note. */
export async function openStickyWindow(note: Note): Promise<void> {
  if (!isTauri()) return;
  const label = stickyLabel(note.id);
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }
  // The new window loads state from disk, so the note must be written first.
  await flushPersist();
  const meta = note.sticky ?? DEFAULT_STICKY;
  new WebviewWindow(label, {
    url: `index.html?sticky=${note.id}`,
    width: meta.w,
    height: meta.collapsed ? COLLAPSED_H : meta.h,
    x: meta.x,
    y: meta.y,
    minWidth: 200,
    minHeight: COLLAPSED_H,
    decorations: false,
    transparent: true,
    shadow: true,
    resizable: !meta.collapsed,
    alwaysOnTop: meta.pinned,
    visibleOnAllWorkspaces: meta.allSpaces ?? false,
    skipTaskbar: true,
    title: note.title || "Sticky note",
  });
}

export async function closeStickyWindow(noteId: string): Promise<void> {
  if (!isTauri()) return;
  const win = await WebviewWindow.getByLabel(stickyLabel(noteId));
  await win?.close();
}
