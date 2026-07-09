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

export interface Note {
  id: string;
  workspaceId: string;
  sectionId: string;
  title: string;
  content: string;
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
