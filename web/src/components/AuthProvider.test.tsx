// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_SESSION_EXPIRED } from "@/lib/api-client";
import { saveCachedUser } from "@/lib/auth-cache";
import { AuthProvider } from "./AuthProvider";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  refreshAccessToken: vi.fn(() => Promise.resolve(null)),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    apiFetch: mocks.apiFetch,
    ensureFreshAccessToken: vi.fn(),
    getAccessToken: vi.fn(() => null),
    refreshAccessToken: mocks.refreshAccessToken,
    setAccessToken: vi.fn(),
  };
});

vi.mock("./OnboardingDialog", () => ({
  OnboardingDialog: () => null,
}));

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.apiFetch.mockReset();
    mocks.refreshAccessToken.mockClear();
    mocks.replace.mockReset();
  });

  afterEach(cleanup);

  it("bootstraps an anonymous session without loading the user", async () => {
    render(<AuthProvider>content</AuthProvider>);

    await waitFor(() => expect(mocks.refreshAccessToken).toHaveBeenCalled());
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("redirects anonymous expiration without a session-expired reason", async () => {
    render(<AuthProvider>content</AuthProvider>);

    window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
  });

  it("marks expiration when a cached session existed", async () => {
    saveCachedUser({ id: "user-id", email: "user@example.com" });
    render(<AuthProvider>content</AuthProvider>);

    window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED));

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith(
        "/login?reason=session_expired",
      ),
    );
  });
});
