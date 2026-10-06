import { useEffect, useState } from "react";
import {
  Archive,
  Bell,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  Pencil,
  Plus,
  Settings,
  Star,
  Trash2,
} from "lucide-react";
import { useAppStore } from "../data/useAppStore";
import { getSkin } from "../data/skins";
import type { ViewId, Workspace } from "../types";
import {
  WORKSPACE_COLORS,
  WORKSPACE_ICONS,
  WorkspaceIconPicker,
  WorkspaceTile,
  defaultWorkspaceColor,
  workspaceVisual,
} from "./WorkspaceIcon";

/** The picker selection matching how a workspace currently looks. */
function currentIconKey(ws: Workspace, index: number): string {
  if (WORKSPACE_ICONS[ws.icon]) return ws.icon;
  const v = workspaceVisual(ws, index);
  if (v.emoji) return v.emoji;
  return Object.keys(WORKSPACE_ICONS).find((k) => WORKSPACE_ICONS[k] === v.Icon) ?? "folder";
}

function currentColorKey(ws: Workspace, index: number): string {
  if (ws.color && WORKSPACE_COLORS[ws.color]) return ws.color;
  const tile = workspaceVisual(ws, index).tile;
  return Object.keys(WORKSPACE_COLORS).find((k) => WORKSPACE_COLORS[k] === tile) ?? defaultWorkspaceColor(index);
}

function NavRow({
  icon,
  label,
  count,
  badge,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  badge?: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition ${
        active ? "bg-black/[0.06] text-slate-900" : "text-slate-600 hover:bg-black/[0.04]"
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {typeof count === "number" && count > 0 && (
        badge ? (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10.5px] font-semibold text-white">
            {count}
          </span>
        ) : (
          <span className="text-[12px] font-normal text-slate-400">{count}</span>
        )
      )}
    </button>
  );
}

export function Sidebar() {
  const workspaces = useAppStore((s) => s.workspaces);
  const notes = useAppStore((s) => s.notes);
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const addWorkspace = useAppStore((s) => s.addWorkspace);
  const renameWorkspace = useAppStore((s) => s.renameWorkspace);
  const updateWorkspaceIcon = useAppStore((s) => s.updateWorkspaceIcon);
  const updateNote = useAppStore((s) => s.updateNote);
  const notifications = useAppStore((s) => s.notifications);
  const skin = getSkin(useAppStore((s) => s.skinId));

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceIcon, setNewWorkspaceIcon] = useState({ icon: "folder", color: "emerald" });
  /** Workspace whose icon picker is open in the list. */
  const [iconPickerFor, setIconPickerFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ kind: "workspace" | "note"; id: string; value: string } | null>(null);

  const commitRename = () => {
    if (!renaming) return;
    const name = renaming.value.trim();
    if (name) {
      if (renaming.kind === "workspace") renameWorkspace(renaming.id, name);
      else updateNote(renaming.id, { title: name });
    }
    setRenaming(null);
  };

  const renameInput = (
    <input
      autoFocus
      value={renaming?.value ?? ""}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => renaming && setRenaming({ ...renaming, value: e.target.value })}
      onKeyDown={(e) => {
        if (e.key === "Enter") commitRename();
        if (e.key === "Escape") setRenaming(null);
      }}
      onBlur={commitRename}
      onClick={(e) => e.stopPropagation()}
      className="w-full min-w-0 flex-1 rounded bg-white/70 px-1 py-0.5 text-inherit outline-none ring-1 ring-sky-300"
    />
  );

  const renamePencil = (kind: "workspace" | "note", id: string, value: string, label: string) => (
    <span
      role="button"
      tabIndex={-1}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        setRenaming({ kind, id, value });
      }}
      className="hidden h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-black/10 hover:text-slate-600 group-hover:flex"
    >
      <Pencil size={11} />
    </span>
  );

  const startNewWorkspace = () => {
    setNewWorkspaceIcon({ icon: "folder", color: defaultWorkspaceColor(workspaces.length) });
    setCreatingWorkspace(true);
  };

  const cancelNewWorkspace = () => {
    setCreatingWorkspace(false);
    setNewWorkspaceName("");
  };

  const commitNewWorkspace = () => {
    const name = newWorkspaceName.trim();
    if (!name) return cancelNewWorkspace();
    const id = addWorkspace(name, newWorkspaceIcon.icon, newWorkspaceIcon.color);
    setView({ kind: "workspace", workspaceId: id });
    cancelNewWorkspace();
  };

  useEffect(() => {
    if (workspaces.length && expanded.size === 0) {
      setExpanded(new Set(workspaces.slice(0, 2).map((w) => w.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces.length]);

  const activeNotes = notes.filter((n) => !n.trashed);
  const starredCount = activeNotes.filter((n) => n.starred && !n.archived).length;
  const archivedCount = activeNotes.filter((n) => n.archived).length;
  const trashCount = notes.filter((n) => n.trashed).length;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const recentNotes = [...activeNotes]
    .filter((n) => !n.archived)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 8);

  const isActive = (v: ViewId) => JSON.stringify(v) === JSON.stringify(view);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="drag flex h-full w-64 shrink-0 flex-col border-r border-black/[0.06] pt-9 backdrop-blur-2xl"
      style={{ background: skin.sidebar }}
    >
      <div className="no-drag flex-1 overflow-y-auto px-3 pb-3">
        <div className="mb-4 flex flex-col gap-0.5">
          <NavRow
            icon={<Star size={15} className="text-amber-400" fill="currentColor" />}
            label="Starred"
            count={starredCount}
            active={isActive({ kind: "starred" })}
            onClick={() => setView({ kind: "starred" })}
          />
          <NavRow
            icon={<Archive size={15} className="text-slate-500" />}
            label="Archive"
            count={archivedCount}
            active={isActive({ kind: "archive" })}
            onClick={() => setView({ kind: "archive" })}
          />
          <NavRow
            icon={<Trash2 size={15} className="text-slate-500" />}
            label="Trash"
            count={trashCount}
            active={isActive({ kind: "trash" })}
            onClick={() => setView({ kind: "trash" })}
          />
        </div>

        <div className="mb-5 flex flex-col gap-0.5">
          <NavRow
            icon={<Bell size={15} className="text-slate-500" />}
            label="Notifications"
            count={unreadCount}
            badge
            active={isActive({ kind: "notifications" })}
            onClick={() => setView({ kind: "notifications" })}
          />
          <NavRow
            icon={<Settings size={15} className="text-slate-500" />}
            label="Settings"
            active={isActive({ kind: "settings" })}
            onClick={() => setView({ kind: "settings" })}
          />
        </div>

        <div className="mb-1.5 px-1 text-[12px] font-medium text-slate-400">Workspace</div>

        <div className="mb-5 flex flex-col gap-0.5">
          {workspaces.map((ws: Workspace, index: number) => {
            const wsNotes = activeNotes.filter((n) => n.workspaceId === ws.id && !n.archived);
            const isOpen = expanded.has(ws.id);
            const active = isActive({ kind: "workspace", workspaceId: ws.id });
            return (
              <div key={ws.id}>
                <button
                  type="button"
                  onClick={() => {
                    setView({ kind: "workspace", workspaceId: ws.id });
                    if (!isOpen) toggleExpand(ws.id);
                  }}
                  className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition ${
                    active ? "bg-black/[0.06] font-semibold text-slate-900" : "font-medium text-slate-700 hover:bg-black/[0.04]"
                  }`}
                >
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(ws.id);
                    }}
                    className="flex h-4 w-4 items-center justify-center text-slate-400"
                  >
                    {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </span>
                  <span
                    role="button"
                    tabIndex={-1}
                    title="Change icon"
                    // Keep the picker's outside-click handler from closing it first,
                    // so a second click on the tile toggles it shut.
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIconPickerFor((cur) => (cur === ws.id ? null : ws.id));
                    }}
                    className="rounded-[6px] transition hover:ring-2 hover:ring-black/15"
                  >
                    <WorkspaceTile ws={ws} index={index} />
                  </span>
                  {renaming?.kind === "workspace" && renaming.id === ws.id ? (
                    renameInput
                  ) : (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenaming({ kind: "workspace", id: ws.id, value: ws.name });
                      }}
                      className="flex-1 truncate text-left"
                    >
                      {ws.name}
                    </span>
                  )}
                  {renamePencil("workspace", ws.id, ws.name, "Rename workspace")}
                </button>
                {iconPickerFor === ws.id && (
                  <div className="my-1 ml-6">
                    <WorkspaceIconPicker
                      icon={currentIconKey(ws, index)}
                      color={currentColorKey(ws, index)}
                      onChange={({ icon, color }) => updateWorkspaceIcon(ws.id, icon, color)}
                      onClose={() => setIconPickerFor(null)}
                    />
                  </div>
                )}
                {isOpen && (
                  <div className="ml-[26px] flex flex-col gap-0.5 pl-2">
                    {wsNotes.length === 0 && (
                      <div className="px-2 py-1 text-[11.5px] text-slate-300">No notes yet</div>
                    )}
                    {wsNotes.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => setView({ kind: "note", noteId: note.id })}
                        className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-[12.5px] text-slate-500 hover:bg-black/[0.04]"
                      >
                        <FileText size={12} className="shrink-0 text-slate-300" />
                        {renaming?.kind === "note" && renaming.id === note.id ? (
                          renameInput
                        ) : (
                          <span
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setRenaming({ kind: "note", id: note.id, value: note.title });
                            }}
                            className="flex-1 truncate"
                          >
                            {note.title}
                          </span>
                        )}
                        {renamePencil("note", note.id, note.title, "Rename note")}
                        {note.starred && <Star size={11} className="shrink-0 text-amber-400" fill="currentColor" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <NavRow
            icon={<Layers size={15} className="text-slate-500" />}
            label="Browse All"
            active={isActive({ kind: "all" })}
            onClick={() => setView({ kind: "all" })}
          />
          {creatingWorkspace ? (
            <div
              // Leaving the whole block (not just the name field) cancels, so the
              // picker's emoji field can take focus without discarding the draft.
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) cancelNewWorkspace();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNewWorkspace();
                if (e.key === "Escape") cancelNewWorkspace();
              }}
              className="flex flex-col gap-1.5"
            >
            <div className="flex items-center gap-1.5 rounded-lg bg-black/[0.04] py-1 pl-2 pr-1">
              <WorkspaceTile
                ws={{ id: "new", name: newWorkspaceName, icon: newWorkspaceIcon.icon, color: newWorkspaceIcon.color, order: 0 }}
                index={workspaces.length}
              />
              <input
                autoFocus
                value={newWorkspaceName}
                placeholder="Workspace name"
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="w-full min-w-0 flex-1 bg-transparent text-[13px] font-medium text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-300"
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  commitNewWorkspace();
                }}
                disabled={!newWorkspaceName.trim()}
                className="shrink-0 rounded-md bg-slate-900 px-2 py-0.5 text-[11.5px] font-medium text-white disabled:opacity-30"
              >
                Add
              </button>
            </div>
            <WorkspaceIconPicker
              icon={newWorkspaceIcon.icon}
              color={newWorkspaceIcon.color}
              onChange={setNewWorkspaceIcon}
            />
            </div>
          ) : (
            <button
              type="button"
              onClick={startNewWorkspace}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium text-slate-400 hover:bg-black/[0.04] hover:text-slate-600"
            >
              <Plus size={15} />
              New workspace
            </button>
          )}
        </div>

        <div className="mb-1.5 px-1 text-[12px] font-medium text-slate-400">Recent Notes</div>
        <div className="flex flex-col gap-0.5">
          {recentNotes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => setView({ kind: "note", noteId: note.id })}
              className="group flex items-center gap-1.5 rounded-lg px-2.5 py-[5px] text-left text-[13px] text-slate-600 hover:bg-black/[0.04]"
            >
              {renaming?.kind === "note" && renaming.id === note.id ? (
                renameInput
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setRenaming({ kind: "note", id: note.id, value: note.title });
                  }}
                  className="flex-1 truncate"
                >
                  {note.title}
                </span>
              )}
              {renamePencil("note", note.id, note.title, "Rename note")}
              {note.starred && <Star size={12} className="shrink-0 text-amber-400" fill="currentColor" />}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

