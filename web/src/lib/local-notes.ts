import { v4 as uuidv4 } from "uuid";
import type { ApiNote } from "./api-client";

const DB_NAME = "recall-local";
const DB_VERSION = 1;
const STORE_NAME = "notes";

export function openLocalDB(): Promise<IDBDatabase> {
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
  return notes.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
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
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(note);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  db.close();
}

export async function deleteLocalNote(id: string): Promise<void> {
  const db = await openLocalDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  db.close();
}

export async function clearLocalNotes(): Promise<void> {
  const db = await openLocalDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  db.close();
}

export async function countLocalNotes(): Promise<number> {
  const db = await openLocalDB();
  const count = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return count;
}

export function createLocalNote(): ApiNote {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    title: "",
    body: "",
    status: "active",
    pinned_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}
