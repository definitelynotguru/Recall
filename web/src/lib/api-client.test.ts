// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_SESSION_EXPIRED,
  apiFetch,
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from "./api-client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiFetch token refresh", () => {
  afterEach(() => {
    setAccessToken(null);
    vi.unstubAllGlobals();
  });

  it("shares one refresh across concurrent unauthorized requests", async () => {
    setAccessToken("expired-token");
    let refreshCalls = 0;
    let apiCalls = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        await Promise.resolve();
        return jsonResponse({ access_token: "fresh-token" });
      }
      apiCalls += 1;
      if (apiCalls <= 10) return jsonResponse({ error: "Unauthorized" }, 401);
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        apiFetch<{ ok: boolean }>(`/test/${index}`),
      ),
    );

    expect(results).toEqual(Array.from({ length: 10 }, () => ({ ok: true })));
    expect(refreshCalls).toBe(1);
    expect(apiCalls).toBe(20);
    expect(getAccessToken()).toBe("fresh-token");
  });

  it("retries a stale unauthorized response with a newer token", async () => {
    setAccessToken("old-token");
    let resolveFirst: ((response: Response) => void) | undefined;
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    const seenAuth: string[] = [];
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        seenAuth.push(headers.get("Authorization") ?? "");
        if (seenAuth.length === 1) return firstResponse;
        return jsonResponse({ ok: true });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = apiFetch<{ ok: boolean }>("/test");
    setAccessToken("newer-token");
    resolveFirst?.(jsonResponse({ error: "Unauthorized" }, 401));

    await expect(request).resolves.toEqual({ ok: true });
    expect(seenAuth).toEqual(["Bearer old-token", "Bearer newer-token"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not restore a refreshed token after logout", async () => {
    setAccessToken("old-token");
    let resolveRefresh: ((response: Response) => void) | undefined;
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => refreshResponse),
    );

    const refresh = refreshAccessToken();
    setAccessToken(null);
    resolveRefresh?.(jsonResponse({ access_token: "stale-fresh-token" }));

    await expect(refresh).resolves.toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it("treats a missing refresh session as anonymous", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))),
    );

    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it("expires an authenticated request when refresh returns anonymous", async () => {
    setAccessToken("expired-token");
    const expired = vi.fn();
    window.addEventListener(AUTH_SESSION_EXPIRED, expired);
    const seenAuth: string[] = [];
    const fetchMock = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        if (String(input).endsWith("/auth/refresh")) {
          return new Response(null, { status: 204 });
        }
        seenAuth.push(new Headers(init?.headers).get("Authorization") ?? "");
        return jsonResponse({ error: "Unauthorized" }, 401);
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/test")).rejects.toThrow("Unauthorized");
    expect(seenAuth).toEqual(["Bearer expired-token"]);
    expect(expired).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();

    window.removeEventListener(AUTH_SESSION_EXPIRED, expired);
  });

  it("does not dispatch expiration for an anonymous unauthorized request", async () => {
    const expired = vi.fn();
    window.addEventListener(AUTH_SESSION_EXPIRED, expired);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ error: "Unauthorized" }, 401))
        .mockResolvedValueOnce(new Response(null, { status: 204 })),
    );

    await expect(apiFetch("/test")).rejects.toThrow("Unauthorized");
    expect(expired).not.toHaveBeenCalled();

    window.removeEventListener(AUTH_SESSION_EXPIRED, expired);
  });

  it("shares one anonymous refresh across concurrent unauthorized requests", async () => {
    setAccessToken("expired-token");
    const expired = vi.fn();
    window.addEventListener(AUTH_SESSION_EXPIRED, expired);
    let refreshCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        if (String(input).endsWith("/auth/refresh")) {
          refreshCalls += 1;
          await Promise.resolve();
          return new Response(null, { status: 204 });
        }
        return jsonResponse({ error: "Unauthorized" }, 401);
      }),
    );

    const requests = Array.from({ length: 5 }, (_, index) =>
      apiFetch(`/test/${index}`),
    );
    await expect(Promise.all(requests)).rejects.toThrow("Unauthorized");
    expect(refreshCalls).toBe(1);
    expect(expired).toHaveBeenCalledTimes(1);

    window.removeEventListener(AUTH_SESSION_EXPIRED, expired);
  });
});
