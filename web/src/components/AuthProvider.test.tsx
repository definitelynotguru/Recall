// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_SESSION_EXPIRED } from "@/lib/api-client";
import { loadCachedUser, saveCachedUser } from "@/lib/auth-cache";
import { AuthProvider, useAuth } from "./AuthProvider";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  ensureFreshAccessToken: vi.fn(),
  getAccessToken: vi.fn<() => string | null>(() => null),
  refreshAccessToken: vi.fn<() => Promise<string | null>>(() =>
    Promise.resolve(null),
  ),
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
    ensureFreshAccessToken: mocks.ensureFreshAccessToken,
    getAccessToken: mocks.getAccessToken,
    refreshAccessToken: mocks.refreshAccessToken,
    setAccessToken: vi.fn(),
  };
});

vi.mock("./OnboardingDialog", () => ({
  OnboardingDialog: () => null,
}));

function AuthState() {
  const { status, user } = useAuth();
  return <div>{`${status}:${user?.email ?? "none"}`}</div>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.apiFetch.mockReset();
    mocks.ensureFreshAccessToken.mockReset();
    mocks.getAccessToken.mockReset().mockReturnValue(null);
    mocks.refreshAccessToken.mockReset().mockResolvedValue(null);
    mocks.replace.mockReset();
  });

  afterEach(cleanup);

  it("bootstraps an anonymous session without loading the user", async () => {
    render(<AuthProvider>content</AuthProvider>);

    await waitFor(() => expect(mocks.refreshAccessToken).toHaveBeenCalled());
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("clears a cached user when refresh finds no session", async () => {
    saveCachedUser({ id: "user-id", email: "user@example.com" });

    const view = render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    await view.findByText("anonymous:none");
    expect(loadCachedUser()).toBeNull();
    expect(localStorage).toHaveLength(0);
  });

  it("bootstraps an authenticated session", async () => {
    const user = { id: "user-id", email: "user@example.com" };
    mocks.refreshAccessToken.mockResolvedValueOnce("access-token");
    mocks.apiFetch.mockResolvedValueOnce({ user });

    const view = render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    await view.findByText("authenticated:user@example.com");
    expect(mocks.apiFetch).toHaveBeenCalledWith("/auth/me");
  });

  it("retains a cached user when bootstrap fails offline", async () => {
    saveCachedUser({ id: "user-id", email: "user@example.com" });
    mocks.refreshAccessToken.mockRejectedValueOnce(new Error("offline"));

    const view = render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    await view.findByText("offline:user@example.com");
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("retries bootstrap when an offline session comes online", async () => {
    saveCachedUser({ id: "user-id", email: "user@example.com" });
    mocks.refreshAccessToken
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(null);

    const view = render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );
    await view.findByText("offline:user@example.com");

    window.dispatchEvent(new Event("online"));

    await view.findByText("anonymous:none");
    expect(mocks.refreshAccessToken).toHaveBeenCalledTimes(2);
  });

  it("refreshes an authenticated session on the interval", async () => {
    const user = { id: "user-id", email: "user@example.com" };
    mocks.refreshAccessToken.mockResolvedValueOnce("access-token");
    mocks.apiFetch.mockResolvedValueOnce({ user });
    mocks.getAccessToken.mockReturnValue("access-token");
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    const view = render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );
    await view.findByText("authenticated:user@example.com");

    const callback = setIntervalSpy.mock.calls.find(
      ([, delay]) => delay === 60_000,
    )?.[0];
    expect(callback).toBeTypeOf("function");
    if (typeof callback === "function") callback();

    expect(mocks.ensureFreshAccessToken).toHaveBeenCalledTimes(1);
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
