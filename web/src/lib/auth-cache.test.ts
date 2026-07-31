import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCachedUser, loadCachedUser, saveCachedUser } from "./auth-cache";

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("cached authenticated user", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", createStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists and clears a validated user", () => {
    const user = { id: "user-1", email: "user@example.com" };

    saveCachedUser(user);
    expect(loadCachedUser()).toEqual(user);

    clearCachedUser();
    expect(loadCachedUser()).toBeNull();
  });

  it("rejects malformed cached data", () => {
    localStorage.setItem("recall_cached_user", JSON.stringify({ id: 42 }));

    expect(loadCachedUser()).toBeNull();
  });
});
