import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "./data/useAppStore";
import { createDesktopSticky, isTauri, openStickyWindow } from "./stickyWindows";
import { getSkin } from "./data/skins";
import { Sidebar } from "./components/Sidebar";
import { WorkspaceView } from "./views/WorkspaceView";
import { NotePage } from "./views/NotePage";
import { FlatNotesView } from "./views/FlatNotesView";
import { NotificationsView } from "./views/NotificationsView";
import { SettingsView } from "./views/SettingsView";

function App() {
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrate = useAppStore((s) => s.hydrate);
  const view = useAppStore((s) => s.view);
  const notes = useAppStore((s) => s.notes);
  const emptyTrash = useAppStore((s) => s.emptyTrash);
  const skin = getSkin(useAppStore((s) => s.skinId));

  useEffect(() => {
    void hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Put every open sticky back on the desktop once per launch.
  useEffect(() => {
    if (!hydrated || !isTauri()) return;
    const open = useAppStore.getState().notes.filter((n) => n.sticky?.open && !n.trashed);
    open.forEach((n) => void openStickyWindow(n));
  }, [hydrated]);

  // The tray menu (and global hotkey) ask this window, even hidden, for a new sticky.
  useEffect(() => {
    if (!isTauri()) return;
    const un = listen("notzy://new-sticky", () => createDesktopSticky());
    return () => {
      void un.then((f) => f());
    };
  }, []);

  if (!hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-800 text-slate-300">
        Loading Notzy…
      </div>
    );
  }

  let content = null;
  switch (view.kind) {
    case "workspace":
      content = <WorkspaceView workspaceId={view.workspaceId} />;
      break;
    case "note":
      content = <NotePage noteId={view.noteId} />;
      break;
    case "all":
      content = (
        <FlatNotesView
          title="Browse All"
          notes={notes.filter((n) => !n.trashed && !n.archived)}
          emptyLabel="No notes yet."
          mode="starred"
        />
      );
      break;
    case "starred":
      content = (
        <FlatNotesView
          title="Starred"
          notes={notes.filter((n) => n.starred && !n.trashed && !n.archived)}
          emptyLabel="No starred notes yet. Star a note to pin it here."
          mode="starred"
        />
      );
      break;
    case "archive":
      content = (
        <FlatNotesView
          title="Archive"
          notes={notes.filter((n) => n.archived && !n.trashed)}
          emptyLabel="Nothing archived yet."
          mode="archive"
        />
      );
      break;
    case "trash":
      content = (
        <FlatNotesView
          title="Trash"
          subtitle="Items here can be restored or deleted permanently."
          notes={notes.filter((n) => n.trashed)}
          emptyLabel="Trash is empty."
          mode="trash"
          extraAction={{ label: "Empty trash", onClick: () => emptyTrash() }}
        />
      );
      break;
    case "notifications":
      content = <NotificationsView />;
      break;
    case "settings":
      content = <SettingsView />;
      break;
  }

  return (
    <div
      className="flex h-screen w-screen items-center justify-center p-5"
      style={{ background: skin.bg }}
    >
      <div className="flex h-full w-full overflow-hidden rounded-2xl border border-white/60 shadow-2xl">
        <Sidebar />
        <div className="flex-1 backdrop-blur-2xl" style={{ background: skin.main }}>
          {content}
        </div>
      </div>
    </div>
  );
}

export default App;
