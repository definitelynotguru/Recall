// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_SESSION_EXPIRED,
  apiFetch,
  ensureFreshAccessToken,
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

function jwt(exp?: number) {
  const payload = exp === undefined ? {} : { exp };
  return `e30.${btoa(JSON.stringify(payload))}.signature`;
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

  it.each([401, 403])(
    "treats refresh status %i as an expired session",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.resolve(new Response(null, { status }))),
      );

      await expect(refreshAccessToken()).resolves.toBeNull();
      expect(getAccessToken()).toBeNull();
    },
  );

  it("shares a failed refresh and retries after rejection", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 500 })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = refreshAccessToken();
    const concurrent = refreshAccessToken();
    await expect(first).rejects.toThrow("Token refresh failed (500)");
    await expect(concurrent).rejects.toThrow("Token refresh failed (500)");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await expect(refreshAccessToken()).rejects.toThrow(
      "Token refresh failed (500)",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports missing and malformed access tokens as not fresh", async () => {
    await expect(ensureFreshAccessToken()).resolves.toBe(false);

    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 204 })),
    );
    vi.stubGlobal("fetch", fetchMock);
    for (const token of ["malformed", jwt()]) {
      setAccessToken(token);
      await expect(ensureFreshAccessToken()).resolves.toBe(false);
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps access tokens outside the refresh window", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    setAccessToken(jwt(1_700_000_000 + 10 * 60));

    await expect(ensureFreshAccessToken()).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes access tokens expiring within five minutes", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const fetchMock = vi.fn(() =>
      Promise.resolve(jsonResponse({ access_token: "fresh-token" })),
    );
    vi.stubGlobal("fetch", fetchMock);
    setAccessToken(jwt(1_700_000_000 + 4 * 60));

    await expect(ensureFreshAccessToken()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("fresh-token");
  });

  it("reports refresh failures as not fresh", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(null, { status: 500 }))),
    );
    setAccessToken(jwt(1_700_000_000 + 4 * 60));

    await expect(ensureFreshAccessToken()).resolves.toBe(false);
  });

  it.each([
    ["missing access token", jsonResponse({})],
    ["non-string access token", jsonResponse({ access_token: 42 })],
    ["malformed JSON", new Response("{", { status: 200 })],
  ])("treats a 200 refresh with %s as anonymous", async (_, response) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(response)),
    );

    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it("expires an authenticated request after an invalid refresh payload", async () => {
    setAccessToken("expired-token");
    const expired = vi.fn();
    window.addEventListener(AUTH_SESSION_EXPIRED, expired);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ error: "Unauthorized" }, 401))
        .mockResolvedValueOnce(jsonResponse({})),
    );

    await expect(apiFetch("/test")).rejects.toThrow("Unauthorized");
    expect(expired).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();

    window.removeEventListener(AUTH_SESSION_EXPIRED, expired);
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
