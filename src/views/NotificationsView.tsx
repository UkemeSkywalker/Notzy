import { Bell } from "lucide-react";
import { useAppStore } from "../data/useAppStore";
import { formatRelative } from "../utils/time";

export function NotificationsView() {
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-slate-800">Notifications</h1>
        {notifications.some((n) => !n.read) && (
          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-[12.5px] font-medium text-slate-500 hover:bg-white"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex h-[50vh] items-center justify-center text-[13.5px] text-slate-400">
          You're all caught up.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => markNotificationRead(n.id)}
              className={`flex items-start gap-3 rounded-xl border border-black/5 px-4 py-3 text-left shadow-sm transition ${
                n.read ? "bg-white/50" : "bg-white/90"
              }`}
            >
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  n.read ? "bg-slate-100 text-slate-400" : "bg-slate-900 text-white"
                }`}
              >
                <Bell size={13} />
              </div>
              <div className="flex-1">
                <p className="text-[13.5px] text-slate-700">{n.message}</p>
                <p className="mt-0.5 text-[11.5px] text-slate-400">{formatRelative(n.createdAt)}</p>
              </div>
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
