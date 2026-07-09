import { useEffect, useState } from "react";
import {
  Archive,
  Bell,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  Hash,
  Layers,
  Leaf,
  Megaphone,
  MessageSquare,
  Plus,
  Settings,
  Star,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppStore } from "../data/useAppStore";
import type { ViewId, Workspace } from "../types";
import { PromptModal } from "./PromptModal";

const WORKSPACE_TILE_COLORS = ["bg-emerald-500", "bg-orange-500", "bg-amber-500", "bg-violet-500", "bg-sky-500", "bg-rose-500"];

function workspaceVisual(ws: Workspace, index: number): { Icon: LucideIcon; tile: string } {
  const name = ws.name.toLowerCase();
  if (name.includes("cansaas") || ws.icon === "#") return { Icon: Hash, tile: "bg-emerald-500" };
  if (name.includes("marketing") || ws.icon === "📣") return { Icon: Megaphone, tile: "bg-orange-500" };
  if (name.includes("garden") || ws.icon === "🌱") return { Icon: Leaf, tile: "bg-amber-500" };
  if (name.includes("social") || ws.icon === "💬") return { Icon: MessageSquare, tile: "bg-violet-500" };
  return { Icon: FolderOpen, tile: WORKSPACE_TILE_COLORS[index % WORKSPACE_TILE_COLORS.length] };
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
  const notifications = useAppStore((s) => s.notifications);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);

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
    <div className="drag flex h-full w-64 shrink-0 flex-col border-r border-black/[0.06] bg-white/85 pt-9 backdrop-blur-2xl">
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
            const { Icon, tile } = workspaceVisual(ws, index);
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
                  <span className={`flex h-5 w-5 items-center justify-center rounded-[6px] ${tile}`}>
                    <Icon size={12} className="text-white" strokeWidth={2.5} />
                  </span>
                  <span className="flex-1 truncate text-left">{ws.name}</span>
                </button>
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
                        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-[12.5px] text-slate-500 hover:bg-black/[0.04]"
                      >
                        <FileText size={12} className="shrink-0 text-slate-300" />
                        <span className="flex-1 truncate">{note.title}</span>
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
            label="Brows All"
            active={isActive({ kind: "all" })}
            onClick={() => setView({ kind: "all" })}
          />
          <button
            type="button"
            onClick={() => setCreatingWorkspace(true)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium text-slate-400 hover:bg-black/[0.04] hover:text-slate-600"
          >
            <Plus size={15} />
            New workspace
          </button>
        </div>

        <div className="mb-1.5 px-1 text-[12px] font-medium text-slate-400">Recent Notes</div>
        <div className="flex flex-col gap-0.5">
          {recentNotes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => setView({ kind: "note", noteId: note.id })}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-[5px] text-left text-[13px] text-slate-600 hover:bg-black/[0.04]"
            >
              <span className="flex-1 truncate">{note.title}</span>
              {note.starred && <Star size={12} className="shrink-0 text-amber-400" fill="currentColor" />}
            </button>
          ))}
        </div>
      </div>

      {creatingWorkspace && (
        <PromptModal
          title="New workspace"
          placeholder="Workspace name"
          confirmLabel="Create"
          onConfirm={(name) => {
            const id = addWorkspace(name, "📁");
            setView({ kind: "workspace", workspaceId: id });
          }}
          onClose={() => setCreatingWorkspace(false)}
        />
      )}

    </div>
  );
}

