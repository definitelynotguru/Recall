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

function transactionError(tx: IDBTransaction) {
  return tx.error ?? new Error("IndexedDB transaction failed");
}

async function runWrite(
  operation: (store: IDBObjectStore) => void,
): Promise<void> {
  const db = await openLocalDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      operation(tx.objectStore(STORE_NAME));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(transactionError(tx));
      tx.onabort = () => reject(transactionError(tx));
    });
  } finally {
    db.close();
  }
}

function timestamp(value: string | null): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareLocalNotes(a: ApiNote, b: ApiNote): number {
  if (Boolean(a.pinned_at) !== Boolean(b.pinned_at)) {
    return a.pinned_at ? -1 : 1;
  }
  if (a.pinned_at && b.pinned_at) {
    const pinOrder = timestamp(b.pinned_at) - timestamp(a.pinned_at);
    if (pinOrder !== 0) return pinOrder;
  }
  return timestamp(b.updated_at) - timestamp(a.updated_at);
}

export async function getLocalNotes(): Promise<ApiNote[]> {
  const db = await openLocalDB();
  try {
    const notes = await new Promise<ApiNote[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as ApiNote[]);
      req.onerror = () =>
        reject(req.error ?? new Error("IndexedDB read failed"));
    });
    return notes.sort(compareLocalNotes);
  } finally {
    db.close();
  }
}

export async function getLocalNote(id: string): Promise<ApiNote | undefined> {
  const db = await openLocalDB();
  try {
    return await new Promise<ApiNote | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result as ApiNote | undefined);
      req.onerror = () =>
        reject(req.error ?? new Error("IndexedDB read failed"));
    });
  } finally {
    db.close();
  }
}

export async function putLocalNote(note: ApiNote): Promise<void> {
  await runWrite((store) => store.put(note));
}

export async function deleteLocalNote(id: string): Promise<void> {
  await runWrite((store) => store.delete(id));
}

export async function clearLocalNotes(): Promise<void> {
  await runWrite((store) => store.clear());
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
