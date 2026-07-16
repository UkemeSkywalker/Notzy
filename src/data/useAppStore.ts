import { create } from "zustand";
import { v4 as uuid } from "uuid";
import type { AccentColor, Note, Notification, PdfAttachment, Section, ViewId, Workspace } from "../types";
import { buildSeed } from "./seed";
import { loadPersisted, persist } from "./persistence";
import { isHtmlContent, plainToHtml } from "../utils/richtext";

interface PersistedShape {
  workspaces: Workspace[];
  sections: Section[];
  notes: Note[];
  notifications: Notification[];
  userName: string;
  skinId: string;
}

interface AppState extends PersistedShape {
  hydrated: boolean;
  view: ViewId;
  /** The list view to return to when closing a note page. */
  returnView: ViewId | null;
  searchQuery: string;

  hydrate: () => Promise<void>;
  setView: (v: ViewId) => void;
  setSearchQuery: (q: string) => void;

  addWorkspace: (name: string, icon: string) => string;
  renameWorkspace: (id: string, name: string) => void;
  deleteWorkspace: (id: string) => void;

  addSection: (workspaceId: string, name: string) => string;
  renameSection: (id: string, name: string) => void;
  deleteSection: (id: string) => void;

  addNote: (
    workspaceId: string,
    sectionId: string,
    data: { title: string; content: string; color: AccentColor; pdf?: PdfAttachment; markdown?: string },
  ) => string;
  updateNote: (
    id: string,
    patch: Partial<
      Pick<
        Note,
        "title" | "content" | "color" | "drawing" | "pdfHighlights" | "pdfBookmarks" | "pageMargins" | "markdown"
      >
    >,
  ) => void;
  toggleStar: (id: string) => void;
  archiveNote: (id: string) => void;
  unarchiveNote: (id: string) => void;
  trashNote: (id: string) => void;
  restoreNote: (id: string) => void;
  deleteNotePermanently: (id: string) => void;
  emptyTrash: () => void;

  addNotification: (message: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  setUserName: (name: string) => void;
  setSkin: (skinId: string) => void;
  resetAllData: () => void;
}

function persistedSlice(s: PersistedShape): PersistedShape {
  return {
    workspaces: s.workspaces,
    sections: s.sections,
    notes: s.notes,
    notifications: s.notifications,
    userName: s.userName,
    skinId: s.skinId,
  };
}

export const useAppStore = create<AppState>((set, get) => {
  const save = () => persist(persistedSlice(get()));

  return {
    workspaces: [],
    sections: [],
    notes: [],
    notifications: [],
    userName: "Ucok",
    skinId: "mist",
    hydrated: false,
    view: { kind: "workspace", workspaceId: "" },
    returnView: null,
    searchQuery: "",

    hydrate: async () => {
      let persisted: PersistedShape | null = null;
      try {
        persisted = await loadPersisted<PersistedShape>();
      } catch {
        persisted = null;
      }
      if (persisted && persisted.workspaces?.length) {
        // Migrate legacy plain-text note content to rich-text HTML.
        const notes = persisted.notes.map((n) =>
          isHtmlContent(n.content) ? n : { ...n, content: plainToHtml(n.content) },
        );
        set({
          ...persisted,
          skinId: persisted.skinId ?? "mist",
          notes,
          hydrated: true,
          view: { kind: "workspace", workspaceId: persisted.workspaces[0].id },
        });
        if (notes.some((n, i) => n !== persisted!.notes[i])) save();
      } else {
        const seed = buildSeed();
        set({
          workspaces: seed.workspaces,
          sections: seed.sections,
          notes: seed.notes.map((n) => ({ ...n, content: plainToHtml(n.content) })),
          notifications: [
            { id: uuid(), message: "Welcome to Notzy! This is your notification center.", createdAt: Date.now(), read: false },
          ],
          hydrated: true,
          view: { kind: "workspace", workspaceId: seed.workspaces[0].id },
        });
        save();
      }
    },

    setView: (v) =>
      set((s) => ({
        view: v,
        // Entering a note page remembers the list view we came from.
        returnView: v.kind === "note" ? (s.view.kind === "note" ? s.returnView : s.view) : null,
      })),
    setSearchQuery: (q) => set({ searchQuery: q }),

    addWorkspace: (name, icon) => {
      const id = uuid();
      const order = get().workspaces.length;
      const workspace: Workspace = { id, name, icon, order };
      const defaultSections: Section[] = [
        { id: uuid(), workspaceId: id, name: "Ideas", order: 0 },
        { id: uuid(), workspaceId: id, name: "Drafts", order: 1 },
      ];
      set((s) => ({
        workspaces: [...s.workspaces, workspace],
        sections: [...s.sections, ...defaultSections],
      }));
      save();
      return id;
    },

    renameWorkspace: (id, name) => {
      set((s) => ({ workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, name } : w)) }));
      save();
    },

    deleteWorkspace: (id) => {
      set((s) => {
        const sectionIds = new Set(s.sections.filter((sec) => sec.workspaceId === id).map((sec) => sec.id));
        const nextWorkspaces = s.workspaces.filter((w) => w.id !== id);
        const nextView: ViewId =
          s.view.kind === "workspace" && s.view.workspaceId === id
            ? nextWorkspaces[0]
              ? { kind: "workspace", workspaceId: nextWorkspaces[0].id }
              : { kind: "settings" }
            : s.view;
        return {
          workspaces: nextWorkspaces,
          sections: s.sections.filter((sec) => sec.workspaceId !== id),
          notes: s.notes.filter((n) => !sectionIds.has(n.sectionId) && n.workspaceId !== id),
          view: nextView,
        };
      });
      save();
    },

    addSection: (workspaceId, name) => {
      const id = uuid();
      set((s) => ({
        sections: [
          ...s.sections,
          { id, workspaceId, name, order: s.sections.filter((sec) => sec.workspaceId === workspaceId).length },
        ],
      }));
      save();
      return id;
    },

    renameSection: (id, name) => {
      set((s) => ({ sections: s.sections.map((sec) => (sec.id === id ? { ...sec, name } : sec)) }));
      save();
    },

    deleteSection: (id) => {
      set((s) => ({
        sections: s.sections.filter((sec) => sec.id !== id),
        notes: s.notes.filter((n) => n.sectionId !== id),
      }));
      save();
    },

    addNote: (workspaceId, sectionId, data) => {
      const id = uuid();
      const now = Date.now();
      const note: Note = {
        id,
        workspaceId,
        sectionId,
        title: data.title,
        content: data.content,
        pdf: data.pdf,
        markdown: data.markdown,
        color: data.color,
        starred: false,
        archived: false,
        trashed: false,
        createdAt: now,
        updatedAt: now,
      };
      set((s) => ({ notes: [note, ...s.notes] }));
      save();
      return id;
    },

    updateNote: (id, patch) => {
      set((s) => ({
        notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
      }));
      save();
    },

    toggleStar: (id) => {
      set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, starred: !n.starred } : n)) }));
      save();
    },

    archiveNote: (id) => {
      set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, archived: true, trashed: false } : n)) }));
      save();
    },

    unarchiveNote: (id) => {
      set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, archived: false } : n)) }));
      save();
    },

    trashNote: (id) => {
      set((s) => ({
        notes: s.notes.map((n) => (n.id === id ? { ...n, trashed: true, archived: false, trashedAt: Date.now() } : n)),
      }));
      save();
    },

    restoreNote: (id) => {
      set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, trashed: false, trashedAt: undefined } : n)) }));
      save();
    },

    deleteNotePermanently: (id) => {
      set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
      save();
    },

    emptyTrash: () => {
      set((s) => ({ notes: s.notes.filter((n) => !n.trashed) }));
      save();
    },

    addNotification: (message) => {
      set((s) => ({
        notifications: [{ id: uuid(), message, createdAt: Date.now(), read: false }, ...s.notifications],
      }));
      save();
    },

    markNotificationRead: (id) => {
      set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
      save();
    },

    markAllNotificationsRead: () => {
      set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
      save();
    },

    setUserName: (name) => {
      set({ userName: name });
      save();
    },

    setSkin: (skinId) => {
      set({ skinId });
      save();
    },

    resetAllData: () => {
      const seed = buildSeed();
      set({
        workspaces: seed.workspaces,
        sections: seed.sections,
        notes: seed.notes.map((n) => ({ ...n, content: plainToHtml(n.content) })),
        notifications: [],
        view: { kind: "workspace", workspaceId: seed.workspaces[0].id },
        returnView: null,
      });
      save();
    },
  };
});
