import { useMemo } from "react";
import { MoreHorizontal, Star } from "lucide-react";
import type { Note } from "../types";
import { formatRelative } from "../utils/time";
import { htmlToPreview } from "../utils/richtext";
import { Menu, MenuItem } from "./Menu";

const BORDER_COLOR: Record<Note["color"], string> = {
  red: "border-t-rose-400",
  blue: "border-t-sky-400",
  green: "border-t-emerald-400",
  purple: "border-t-violet-400",
  amber: "border-t-amber-400",
  slate: "border-t-slate-400",
};

interface NoteCardProps {
  note: Note;
  onOpen: () => void;
  onToggleStar: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onTrash?: () => void;
  onRestore?: () => void;
  onDeletePermanently?: () => void;
}

export function NoteCard({
  note,
  onOpen,
  onToggleStar,
  onArchive,
  onUnarchive,
  onTrash,
  onRestore,
  onDeletePermanently,
}: NoteCardProps) {
  const preview = useMemo(() => htmlToPreview(note.content), [note.content]);
  return (
    <div
      onClick={onOpen}
      className={`group flex h-[200px] cursor-pointer flex-col rounded-xl border border-t-4 border-black/[0.04] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition hover:shadow-md ${BORDER_COLOR[note.color]}`}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-slate-800 line-clamp-1">{note.title}</h3>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar();
            }}
            className={`flex h-6 w-6 items-center justify-center rounded-md hover:bg-black/5 ${
              note.starred ? "text-amber-400" : "text-slate-300"
            }`}
          >
            <Star size={14} fill={note.starred ? "currentColor" : "none"} />
          </button>
          <Menu trigger={<MoreHorizontal size={15} />}>
            {onTrash && <MenuItem onClick={onToggleStar}>{note.starred ? "Unstar" : "Star"}</MenuItem>}
            {onArchive && <MenuItem onClick={onArchive}>Archive</MenuItem>}
            {onUnarchive && <MenuItem onClick={onUnarchive}>Unarchive</MenuItem>}
            {onTrash && <MenuItem onClick={onTrash}>Move to Trash</MenuItem>}
            {onRestore && <MenuItem onClick={onRestore}>Restore</MenuItem>}
            {onDeletePermanently && (
              <MenuItem danger onClick={onDeletePermanently}>
                Delete Permanently
              </MenuItem>
            )}
          </Menu>
        </div>
      </div>
      <p className="flex-1 overflow-hidden whitespace-pre-line text-[12.5px] leading-relaxed text-slate-500 line-clamp-5">
        {preview || "No content"}
      </p>
      <div className="mt-2 text-[11px] text-slate-400">{formatRelative(note.updatedAt)}</div>
    </div>
  );
}
