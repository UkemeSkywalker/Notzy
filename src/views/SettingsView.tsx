import { useState } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { useAppStore } from "../data/useAppStore";

function WorkspaceRow({
  name,
  icon,
  onRename,
  onDelete,
}: {
  name: string;
  icon: string;
  onRename: (next: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) onRename(trimmed);
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-black/5 bg-white/80 px-3 py-2">
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="flex-1 rounded-md border border-black/10 px-2 py-1 text-[13.5px] outline-none focus:border-slate-400"
        />
      ) : (
        <span className="text-[13.5px] text-slate-700">
          {icon} {name}
        </span>
      )}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => (editing ? commit() : setEditing(true))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-black/5 hover:text-slate-600"
        >
          {editing ? <Check size={14} /> : <Pencil size={13} />}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function SettingsView() {
  const userName = useAppStore((s) => s.userName);
  const setUserName = useAppStore((s) => s.setUserName);
  const workspaces = useAppStore((s) => s.workspaces);
  const renameWorkspace = useAppStore((s) => s.renameWorkspace);
  const deleteWorkspace = useAppStore((s) => s.deleteWorkspace);
  const resetAllData = useAppStore((s) => s.resetAllData);

  const [name, setName] = useState(userName);

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <h1 className="mb-6 text-[22px] font-semibold text-slate-800">Settings</h1>

      <section className="mb-8 max-w-md">
        <h2 className="mb-2 text-[13px] font-semibold text-slate-600">Display name</h2>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-[13.5px] outline-none focus:border-slate-400"
          />
          <button
            type="button"
            onClick={() => setUserName(name.trim() || "there")}
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-slate-700"
          >
            Save
          </button>
        </div>
      </section>

      <section className="mb-8 max-w-md">
        <h2 className="mb-2 text-[13px] font-semibold text-slate-600">Workspaces</h2>
        <div className="flex flex-col gap-2">
          {workspaces.map((ws) => (
            <WorkspaceRow
              key={ws.id}
              name={ws.name}
              icon={ws.icon}
              onRename={(next) => renameWorkspace(ws.id, next)}
              onDelete={() => {
                if (confirm(`Delete "${ws.name}" and all its notes? This can't be undone.`)) {
                  deleteWorkspace(ws.id);
                }
              }}
            />
          ))}
        </div>
      </section>

      <section className="max-w-md">
        <h2 className="mb-2 text-[13px] font-semibold text-slate-600">Data</h2>
        <button
          type="button"
          onClick={() => {
            if (confirm("Reset all data back to the demo content? This deletes everything you've added.")) {
              resetAllData();
            }
          }}
          className="rounded-lg border border-black/10 bg-white/80 px-3.5 py-2 text-[13px] font-medium text-slate-600 hover:bg-white"
        >
          Reset to demo data
        </button>
        <p className="mt-3 text-[11.5px] leading-relaxed text-slate-400">
          Notes are stored locally on this Mac (in Notzy's app-data folder) — nothing is sent anywhere. This build is
          a UI/functionality replica and intentionally does not include an AI copilot panel.
        </p>
      </section>
    </div>
  );
}
