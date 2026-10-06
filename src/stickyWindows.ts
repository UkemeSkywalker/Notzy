import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { flushPersist } from "./data/persistence";
import { useAppStore } from "./data/useAppStore";
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

/**
 * Create a brand-new sticky (tray menu / global hotkey). The note lands in a
 * "Stickies" section of the first workspace; new windows cascade so they
 * don't stack exactly on top of each other.
 */
export function createDesktopSticky(): void {
  const s = useAppStore.getState();
  if (!s.hydrated || !s.workspaces.length) return;
  const ws = s.workspaces[0];
  const existing = s.sections.find((sec) => sec.workspaceId === ws.id && sec.name === "Stickies");
  const sectionId = existing?.id ?? s.addSection(ws.id, "Stickies");
  const id = s.addNote(ws.id, sectionId, { title: "Sticky note", content: "<p></p>", color: "amber" });
  const openCount = s.notes.filter((n) => n.sticky?.open).length;
  const offset = (openCount % 8) * 32;
  s.updateNote(id, { sticky: { ...DEFAULT_STICKY, x: 80 + offset, y: 80 + offset } });
  const note = useAppStore.getState().notes.find((n) => n.id === id);
  if (note) void openStickyWindow(note);
}

export async function closeStickyWindow(noteId: string): Promise<void> {
  if (!isTauri()) return;
  const win = await WebviewWindow.getByLabel(stickyLabel(noteId));
  await win?.close();
}
