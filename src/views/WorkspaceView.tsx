import { useMemo, useState } from "react";
import { Clock3, Columns2, LayoutGrid, MoreHorizontal, Plus, Search } from "lucide-react";
import { useAppStore } from "../data/useAppStore";
import { SectionBlock } from "../components/SectionBlock";
import { PromptModal } from "../components/PromptModal";
import { htmlToPreview } from "../utils/richtext";

export function WorkspaceView({ workspaceId }: { workspaceId: string }) {
  const allWorkspaces = useAppStore((s) => s.workspaces);
  const allSections = useAppStore((s) => s.sections);
  const allNotes = useAppStore((s) => s.notes);
  const userName = useAppStore((s) => s.userName);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const addNote = useAppStore((s) => s.addNote);
  const toggleStar = useAppStore((s) => s.toggleStar);
  const archiveNote = useAppStore((s) => s.archiveNote);
  const trashNote = useAppStore((s) => s.trashNote);
  const addSection = useAppStore((s) => s.addSection);
  const setView = useAppStore((s) => s.setView);

  const [addingSection, setAddingSection] = useState(false);

  const workspace = allWorkspaces.find((w) => w.id === workspaceId);
  const sections = useMemo(
    () => allSections.filter((sec) => sec.workspaceId === workspaceId),
    [allSections, workspaceId],
  );
  const notes = useMemo(
    () => allNotes.filter((n) => n.workspaceId === workspaceId && !n.trashed && !n.archived),
    [allNotes, workspaceId],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || htmlToPreview(n.content).toLowerCase().includes(q),
    );
  }, [notes, searchQuery]);

  const createNote = (sectionId: string) => {
    const id = addNote(workspaceId, sectionId, { title: "Untitled", content: "<p></p>", color: "blue" });
    setView({ kind: "note", noteId: id });
  };

  if (!workspace) return null;

  return (
    <div className="h-full overflow-y-auto px-8 pb-8 pt-5">
      <div className="drag mb-4 flex items-center justify-between">
        <h1 className="text-[19px] font-semibold text-slate-800">{workspace.name}</h1>
        <div className="no-drag flex items-center gap-2">
          <button type="button" className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-black/5">
            Share
          </button>
          <div className="flex items-center rounded-lg border border-black/[0.06] bg-white p-0.5 shadow-sm">
            <span className="flex h-7 w-9 items-center justify-center rounded-md bg-black/[0.05] text-slate-700">
              <LayoutGrid size={15} />
            </span>
            <span className="flex h-7 w-9 items-center justify-center rounded-md text-slate-400">
              <Columns2 size={15} />
            </span>
          </div>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-black/5">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
      <p className="mb-3 text-[14px] text-slate-500">Hola {userName} 👋</p>

      <div className="mb-9 flex items-center gap-2.5 rounded-xl border border-black/[0.06] bg-white px-4 py-3 shadow-sm">
        <Search size={16} className="text-slate-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search something"
          className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-slate-400"
        />
        <Clock3 size={16} className="text-slate-300" />
      </div>

      {sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          notes={filtered.filter((n) => n.sectionId === section.id)}
          onAddNote={() => createNote(section.id)}
          onOpenNote={(id) => setView({ kind: "note", noteId: id })}
          onToggleStar={toggleStar}
          onArchive={archiveNote}
          onTrash={trashNote}
        />
      ))}

      <button
        type="button"
        onClick={() => setAddingSection(true)}
        className="flex items-center gap-1.5 text-[13px] font-medium text-slate-400 hover:text-slate-600"
      >
        <Plus size={15} />
        Add section
      </button>

      {addingSection && (
        <PromptModal
          title="New section"
          placeholder="Section name"
          onConfirm={(name) => addSection(workspaceId, name)}
          onClose={() => setAddingSection(false)}
        />
      )}
    </div>
  );
}
