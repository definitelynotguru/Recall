import type { ApiNote } from "./api-client";

const DB_NAME = "recall-local";
const DB_VERSION = 1;
const STORE_NAME = "notes";

function openLocalDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    let failed = false;
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => {
      if (failed) {
        req.result.close();
        return;
      }
      resolve(req.result);
    };
    req.onerror = () => {
      failed = true;
      reject(req.error ?? new Error("IndexedDB open failed"));
    };
    req.onblocked = () => {
      failed = true;
      reject(new Error("IndexedDB open blocked"));
    };
  });
}

function transactionError(tx: IDBTransaction) {
  return tx.error ?? new Error("IndexedDB transaction failed");
}

async function withDatabase<T>(
  operation: (db: IDBDatabase) => Promise<T>,
): Promise<T> {
  const db = await openLocalDB();
  try {
    return await operation(db);
  } finally {
    db.close();
  }
}

function runWrite(operation: (store: IDBObjectStore) => void): Promise<void> {
  return withDatabase(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.onerror = () => reject(transactionError(tx));
        tx.onabort = () => reject(transactionError(tx));
        operation(tx.objectStore(STORE_NAME));
        tx.oncomplete = () => resolve();
      }),
  );
}

function runRead<T>(
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return withDatabase(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const request = operation(tx.objectStore(STORE_NAME));
        tx.onerror = () => reject(transactionError(tx));
        tx.onabort = () => reject(transactionError(tx));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("IndexedDB transaction failed"));
      }),
  );
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
  const notes = await runRead(
    (store) => store.getAll() as IDBRequest<ApiNote[]>,
  );
  return notes.sort(compareLocalNotes);
}

export async function getLocalNote(id: string): Promise<ApiNote | undefined> {
  return runRead((store) => store.get(id) as IDBRequest<ApiNote | undefined>);
}

export async function putLocalNote(note: ApiNote): Promise<void> {
  await runWrite((store) => store.put(note));
}

export async function updateLocalNote(
  id: string,
  update: (note: ApiNote) => ApiNote,
): Promise<ApiNote | undefined> {
  return withDatabase(
    (db) =>
      new Promise<ApiNote | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id) as IDBRequest<ApiNote | undefined>;
        let updated: ApiNote | undefined;
        tx.onerror = () => reject(transactionError(tx));
        tx.onabort = () => reject(transactionError(tx));
        request.onerror = () =>
          reject(request.error ?? new Error("IndexedDB transaction failed"));
        request.onsuccess = () => {
          if (!request.result) return;
          updated = update(request.result);
          store.put(updated);
        };
        tx.oncomplete = () => resolve(updated);
      }),
  );
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
