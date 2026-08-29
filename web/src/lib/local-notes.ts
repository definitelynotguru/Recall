import type { ApiNote } from "./api-client";

const DB_NAME = "recall-local";
const DB_VERSION = 1;
const STORE_NAME = "notes";

function openLocalDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getLocalNotes(): Promise<ApiNote[]> {
  const db = await openLocalDB();
  const notes = await new Promise<ApiNote[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as ApiNote[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return notes.sort((a, b) => {
    if (Boolean(a.pinned_at) !== Boolean(b.pinned_at)) {
      return a.pinned_at ? -1 : 1;
    }
    if (a.pinned_at && b.pinned_at) {
      const pinOrder =
        new Date(b.pinned_at).getTime() - new Date(a.pinned_at).getTime();
      if (pinOrder !== 0) return pinOrder;
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export async function getLocalNote(id: string): Promise<ApiNote | undefined> {
  const db = await openLocalDB();
  const note = await new Promise<ApiNote | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result as ApiNote | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return note;
}

export async function putLocalNote(note: ApiNote): Promise<void> {
  const db = await openLocalDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(note);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

export async function deleteLocalNote(id: string): Promise<void> {
  const db = await openLocalDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

export async function clearLocalNotes(): Promise<void> {
  const db = await openLocalDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

export function createLocalNote(): ApiNote {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "",
    body: "",
    status: "active",
    pinned_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}
