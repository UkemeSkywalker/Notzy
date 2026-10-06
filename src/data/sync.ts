import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

/**
 * Live state sync between Notzy windows (main app + sticky notes).
 * Whichever window saves broadcasts the persisted slice; every other window
 * applies it. In a plain browser (no Tauri runtime) everything is a no-op.
 */

const STATE_EVENT = "notzy://state";

export function windowLabel(): string {
  try {
    return getCurrentWebviewWindow().label;
  } catch {
    return "browser";
  }
}

export function broadcastState(state: unknown) {
  emit(STATE_EVENT, { source: windowLabel(), state }).catch(() => {});
}

export function onRemoteState<T>(cb: (state: T) => void): () => void {
  const label = windowLabel();
  const unlisten = listen<{ source: string; state: T }>(STATE_EVENT, (e) => {
    if (e.payload.source !== label) cb(e.payload.state);
  }).catch(() => undefined);
  return () => {
    void unlisten.then((f) => f?.());
  };
}
