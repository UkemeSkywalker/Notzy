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

export function persist(state: unknown) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void (async () => {
      try {
        const store = await getStore();
        await store.set("state", state);
        await store.save();
      } catch {
        // No Tauri runtime available (e.g. plain browser preview) — persistence is a no-op.
      }
    })();
  }, 250);
}
