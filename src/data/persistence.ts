import { Store } from "@tauri-apps/plugin-store";

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = Store.load("notzy-data.json");
  }
  return storePromise;
}

export async function loadPersisted<T>(): Promise<T | null> {
  const store = await getStore();
  const value = await store.get<T>("state");
  return value ?? null;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingState: unknown = null;

async function writeNow() {
  const state = pendingState;
  pendingState = null;
  if (state === null) return;
  try {
    const store = await getStore();
    await store.set("state", state);
    await store.save();
  } catch {
    // No Tauri runtime available (e.g. plain browser preview) — persistence is a no-op.
  }
}

export function persist(state: unknown) {
  pendingState = state;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void writeNow(), 250);
}

/** Write any pending state immediately (before opening or closing a window). */
export async function flushPersist() {
  if (saveTimer) clearTimeout(saveTimer);
  await writeNow();
}
