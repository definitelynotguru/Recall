import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOnboardingDone,
  isOnboardingDone,
  setOnboardingDone,
} from "./user-prefs";

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

describe("onboarding preference", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", createStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists dismissal until explicitly cleared", () => {
    expect(isOnboardingDone()).toBe(false);

    setOnboardingDone();
    expect(isOnboardingDone()).toBe(true);

    clearOnboardingDone();
    expect(isOnboardingDone()).toBe(false);
  });
});
