import { afterEach, describe, expect, it, vi } from "vitest";
import {
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
    vi.stubGlobal("fetch", vi.fn(() => refreshResponse));

    const refresh = refreshAccessToken();
    setAccessToken(null);
    resolveRefresh?.(jsonResponse({ access_token: "stale-fresh-token" }));

    await expect(refresh).resolves.toBeNull();
    expect(getAccessToken()).toBeNull();
  });
});
