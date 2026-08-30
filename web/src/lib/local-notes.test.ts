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
    fail() {
      transaction.onerror?.call(transaction, new Event("error"));
    },
    request,
  };
}

function mockReadTransaction() {
  const readRequest = {
    result: [],
    error: null,
    onsuccess: null,
    onerror: null,
  } as unknown as IDBRequest<ApiNote[]>;
  const store = {
    getAll: vi.fn(() => readRequest),
  } as unknown as IDBObjectStore;
  const transaction = {
    error: null,
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
    close,
    failRead() {
      readRequest.onerror?.call(readRequest, new Event("error"));
    },
    request,
  };
}

function mockOpenRequest() {
  const close = vi.fn();
  const request = {
    result: { close } as unknown as IDBDatabase,
    error: null,
    onupgradeneeded: null,
    onblocked: null,
    onsuccess: null,
    onerror: null,
  } as unknown as IDBOpenDBRequest;
  vi.stubGlobal("indexedDB", { open: vi.fn(() => request) });
  return { close, request };
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

  it("uses update time to break equal pin-time ties", async () => {
    const pinnedAt = "2024-01-03T00:00:00.000Z";
    await putLocalNote(note("a-older", pinnedAt, "2024-01-01T00:00:00.000Z"));
    await putLocalNote(note("z-newer", pinnedAt, "2024-01-02T00:00:00.000Z"));

    await expect(getLocalNotes()).resolves.toMatchObject([
      { id: "z-newer" },
      { id: "a-older" },
    ]);
  });

  it("sorts invalid update times as oldest without breaking pinned-first", async () => {
    await putLocalNote(
      note("unpinned-valid", null, "2024-01-01T00:00:00.000Z"),
    );
    await putLocalNote(note("unpinned-invalid", null, "not-a-date"));
    await putLocalNote(
      note("pinned-invalid", "2024-01-01T00:00:00.000Z", "not-a-date"),
    );

    await expect(getLocalNotes()).resolves.toMatchObject([
      { id: "pinned-invalid" },
      { id: "unpinned-valid" },
      { id: "unpinned-invalid" },
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

  it("uses a fallback error and closes after transaction failure", async () => {
    const mocked = mockWriteTransaction();
    const operation = deleteLocalNote("note");
    mocked.request.onsuccess?.call(
      mocked.request,
      new Event("success") as Event & { target: IDBOpenDBRequest },
    );
    await Promise.resolve();

    mocked.fail();

    await expect(operation).rejects.toThrow("IndexedDB transaction failed");
    expect(mocked.close).toHaveBeenCalledTimes(1);
  });

  it("uses a fallback error and closes after read failure", async () => {
    const mocked = mockReadTransaction();
    const operation = getLocalNotes();
    mocked.request.onsuccess?.call(
      mocked.request,
      new Event("success") as Event & { target: IDBOpenDBRequest },
    );
    await Promise.resolve();

    mocked.failRead();

    await expect(operation).rejects.toThrow("IndexedDB transaction failed");
    expect(mocked.close).toHaveBeenCalledTimes(1);
  });

  it("rejects an IndexedDB open error without closing an unopened handle", async () => {
    const mocked = mockOpenRequest();
    const operation = getLocalNotes();

    mocked.request.onerror?.call(mocked.request, new Event("error"));

    await expect(operation).rejects.toThrow("IndexedDB open failed");
    expect(mocked.close).not.toHaveBeenCalled();
  });

  it("rejects a blocked IndexedDB open and closes only if it later opens", async () => {
    const mocked = mockOpenRequest();
    const operation = putLocalNote(
      note("note", null, "2024-01-01T00:00:00.000Z"),
    );

    mocked.request.onblocked?.call(
      mocked.request,
      new IDBVersionChangeEvent("blocked"),
    );

    await expect(operation).rejects.toThrow("IndexedDB open blocked");
    expect(mocked.close).not.toHaveBeenCalled();

    mocked.request.onsuccess?.call(mocked.request, new Event("success"));
    expect(mocked.close).toHaveBeenCalledTimes(1);
  });
});
