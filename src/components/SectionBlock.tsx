import { useState } from "react";
import { Plus } from "lucide-react";
import type { Note, Section } from "../types";
import { NoteCard } from "./NoteCard";

function sectionRing(name: string) {
  const key = name.toLowerCase();
  if (key.includes("idea")) {
    return <span className="h-[13px] w-[13px] rounded-full border-[1.5px] border-dashed border-rose-300" />;
  }
  if (key.includes("research")) {
    return <span className="h-[13px] w-[13px] rounded-full border-[2px] border-sky-500" />;
  }
  if (key.includes("draft")) {
    return (
      <span className="h-[13px] w-[13px] overflow-hidden rounded-full border-[1.5px] border-emerald-600">
        <span className="block h-full w-1/2 bg-emerald-600" />
      </span>
    );
  }
  return <span className="h-[13px] w-[13px] rounded-full border-[1.5px] border-slate-300" />;
}

interface SectionBlockProps {
  section: Section;
  notes: Note[];
  onAddNote: () => void;
  onOpenNote: (id: string) => void;
  onToggleStar: (id: string) => void;
  onArchive: (id: string) => void;
  onTrash: (id: string) => void;
}

export function SectionBlock({ section, notes, onAddNote, onOpenNote, onToggleStar, onArchive, onTrash }: SectionBlockProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-9">
      <div className="mb-3.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2.5 text-[14px] font-semibold text-slate-800"
        >
          {sectionRing(section.name)}
          {section.name}
          <span className="text-[13px] font-normal text-slate-400">{notes.length}</span>
        </button>
        <button
          type="button"
          onClick={onAddNote}
          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-black/5 hover:text-slate-600"
        >
          <Plus size={16} />
        </button>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          <button
            type="button"
            onClick={onAddNote}
            className="flex h-[200px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300/80 text-slate-400 transition hover:border-slate-400 hover:bg-white/60 hover:text-slate-600"
          >
            <Plus size={18} />
            <span className="text-[13px] font-medium">New note</span>
          </button>
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onOpen={() => onOpenNote(note.id)}
              onToggleStar={() => onToggleStar(note.id)}
              onArchive={() => onArchive(note.id)}
              onTrash={() => onTrash(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
