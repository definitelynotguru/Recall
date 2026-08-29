import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiNote } from "./api-client";
import {
  clearLocalNotes,
  deleteLocalNote,
  getLocalNote,
  getLocalNotes,
  putLocalNote,
} from "./local-notes";

function note(id: string, pinnedAt: string | null, updatedAt: string): ApiNote {
  return {
    id,
    title: id,
    body: "",
    status: "active",
    pinned_at: pinnedAt,
    created_at: updatedAt,
    updated_at: updatedAt,
    deleted_at: null,
  };
}

async function deleteDatabase() {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("recall-local");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Database deletion blocked"));
  });
}

function mockWriteTransaction(error: DOMException | null = null) {
  const store = {
    put: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  } as unknown as IDBObjectStore;
  const transaction = {
    error,
    objectStore: vi.fn(() => store),
    oncomplete: null,
    onerror: null,
    onabort: null,
  } as unknown as IDBTransaction;
  const close = vi.fn();
  const db = {
    transaction: vi.fn(() => transaction),
    close,
  } as unknown as IDBDatabase;
  const request = {
    result: db,
    error: null,
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
  } as unknown as IDBOpenDBRequest;
  vi.stubGlobal("indexedDB", { open: vi.fn(() => request) });

  return {
    abort() {
      transaction.onabort?.call(transaction, new Event("abort"));
    },
    close,
    complete() {
      transaction.oncomplete?.call(transaction, new Event("complete"));
    },
    request,
  };
}

describe("local notes", () => {
  beforeEach(deleteDatabase);
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sorts pinned notes by pin time before newer unpinned notes", async () => {
    await putLocalNote(
      note("A", "2024-01-03T00:00:00.000Z", "2024-01-03T00:00:00.000Z"),
    );
    await putLocalNote(
      note("B", "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z"),
    );
    await putLocalNote(note("C", null, "2025-01-01T00:00:00.000Z"));

    await expect(getLocalNotes()).resolves.toMatchObject([
      { id: "A" },
      { id: "B" },
      { id: "C" },
    ]);
  });

  it("handles missing and invalid pin timestamps", async () => {
    await putLocalNote(
      note("valid", "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z"),
    );
    await putLocalNote(
      note("invalid", "not-a-date", "2024-01-02T00:00:00.000Z"),
    );
    await putLocalNote(note("none", null, "2025-01-01T00:00:00.000Z"));

    await expect(getLocalNotes()).resolves.toMatchObject([
      { id: "valid" },
      { id: "invalid" },
      { id: "none" },
    ]);
  });

  it("sorts unpinned notes by update time rather than database key", async () => {
    await putLocalNote(note("a-older", null, "2024-01-01T00:00:00.000Z"));
    await putLocalNote(note("z-newer", null, "2024-01-02T00:00:00.000Z"));

    await expect(getLocalNotes()).resolves.toMatchObject([
      { id: "z-newer" },
      { id: "a-older" },
    ]);
  });

  it("commits puts, deletes, and clears before resolving", async () => {
    const first = note("first", null, "2024-01-01T00:00:00.000Z");
    const second = note("second", null, "2024-01-02T00:00:00.000Z");

    await putLocalNote(first);
    await expect(getLocalNote(first.id)).resolves.toMatchObject({
      id: "first",
    });
    await deleteLocalNote(first.id);
    await expect(getLocalNote(first.id)).resolves.toBeUndefined();
    await putLocalNote(second);
    await clearLocalNotes();
    await expect(getLocalNotes()).resolves.toEqual([]);
  });

  it("closes the database when a write fails", async () => {
    const close = vi.spyOn(IDBDatabase.prototype, "close");

    await expect(putLocalNote({} as ApiNote)).rejects.toBeInstanceOf(
      DOMException,
    );
    expect(close).toHaveBeenCalled();
  });

  it.each([
    ["put", () => putLocalNote(note("note", null, "2024-01-01T00:00:00.000Z"))],
    ["delete", () => deleteLocalNote("note")],
    ["clear", () => clearLocalNotes()],
  ])("waits for transaction completion before resolving %s", async (_, run) => {
    const mocked = mockWriteTransaction();
    let settled = false;
    const operation = run().then(() => {
      settled = true;
    });
    mocked.request.onsuccess?.call(
      mocked.request,
      new Event("success") as Event & { target: IDBOpenDBRequest },
    );

    await Promise.resolve();
    expect(settled).toBe(false);
    expect(mocked.close).not.toHaveBeenCalled();

    mocked.complete();
    await operation;
    expect(mocked.close).toHaveBeenCalledTimes(1);
  });

  it("rejects aborted writes and closes the database", async () => {
    const failure = new DOMException("aborted", "AbortError");
    const mocked = mockWriteTransaction(failure);
    const operation = putLocalNote(
      note("note", null, "2024-01-01T00:00:00.000Z"),
    );
    mocked.request.onsuccess?.call(
      mocked.request,
      new Event("success") as Event & { target: IDBOpenDBRequest },
    );

    await Promise.resolve();
    mocked.abort();

    await expect(operation).rejects.toBe(failure);
    expect(mocked.close).toHaveBeenCalledTimes(1);
  });
});
