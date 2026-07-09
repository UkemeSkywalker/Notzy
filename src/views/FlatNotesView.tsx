import type { Note } from "../types";
import { NoteCard } from "../components/NoteCard";
import { useAppStore } from "../data/useAppStore";

interface FlatNotesViewProps {
  title: string;
  subtitle?: string;
  notes: Note[];
  emptyLabel: string;
  mode: "starred" | "archive" | "trash";
  extraAction?: { label: string; onClick: () => void };
}

export function FlatNotesView({ title, subtitle, notes, emptyLabel, mode, extraAction }: FlatNotesViewProps) {
  const toggleStar = useAppStore((s) => s.toggleStar);
  const archiveNote = useAppStore((s) => s.archiveNote);
  const unarchiveNote = useAppStore((s) => s.unarchiveNote);
  const trashNote = useAppStore((s) => s.trashNote);
  const restoreNote = useAppStore((s) => s.restoreNote);
  const deleteNotePermanently = useAppStore((s) => s.deleteNotePermanently);
  const setView = useAppStore((s) => s.setView);

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-slate-800">{title}</h1>
        {extraAction && notes.length > 0 && (
          <button
            type="button"
            onClick={extraAction.onClick}
            className="rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-[12.5px] font-medium text-slate-500 hover:bg-white"
          >
            {extraAction.label}
          </button>
        )}
      </div>
      {subtitle && <p className="mb-5 text-[13px] text-slate-400">{subtitle}</p>}
      {!subtitle && <div className="mb-5" />}

      {notes.length === 0 ? (
        <div className="flex h-[50vh] items-center justify-center text-[13.5px] text-slate-400">{emptyLabel}</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onOpen={() => setView({ kind: "note", noteId: note.id })}
              onToggleStar={() => toggleStar(note.id)}
              onArchive={mode === "starred" ? () => archiveNote(note.id) : undefined}
              onUnarchive={mode === "archive" ? () => unarchiveNote(note.id) : undefined}
              onTrash={mode !== "trash" ? () => trashNote(note.id) : undefined}
              onRestore={mode === "trash" ? () => restoreNote(note.id) : undefined}
              onDeletePermanently={mode === "trash" ? () => deleteNotePermanently(note.id) : undefined}
            />
          ))}
        </div>
      )}

    </div>
  );
}
