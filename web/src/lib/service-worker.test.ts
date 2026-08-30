import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";

type InstallEvent = {
  waitUntil(promise: Promise<unknown>): void;
};

type FetchEvent = {
  request: Request;
  respondWith(promise: Promise<Response>): void;
};

function loadServiceWorker() {
  const listeners = new Map<string, (event: never) => void>();
  const cache = {
    addAll: vi.fn(() => Promise.resolve()),
    put: vi.fn(() => Promise.resolve()),
  };
  const match = vi.fn<
    (request: RequestInfo | URL) => Promise<Response | undefined>
  >(() => Promise.resolve(undefined));
  const caches = {
    open: vi.fn(() => Promise.resolve(cache)),
    keys: vi.fn(() => Promise.resolve(["recall-v2", "recall-v3"])),
    delete: vi.fn(() => Promise.resolve(true)),
    match,
  };
  const worker = {
    location: { origin: "https://recall.test" },
    clients: { claim: vi.fn(() => Promise.resolve()) },
    skipWaiting: vi.fn(() => Promise.resolve()),
    addEventListener: vi.fn(
      (type: string, listener: (event: never) => void) => {
        listeners.set(type, listener);
      },
    ),
  };
  const source = readFileSync(
    new URL("../../public/sw.js", import.meta.url),
    "utf8",
  );

  runInNewContext(source, {
    URL,
    Response,
    Promise,
    caches,
    fetch,
    self: worker,
  });

  return { cache, caches, listeners, worker };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("service worker", () => {
  it.each([
    {
      name: "non-GET",
      request: new Request("https://recall.test/api/v1/notes", {
        method: "POST",
      }),
    },
    {
      name: "cross-origin",
      request: new Request("https://example.com/icon.png"),
    },
  ])("bypasses $name requests", ({ request }) => {
    const { cache, caches, listeners } = loadServiceWorker();
    const respondWith = vi.fn();

    listeners.get("fetch")?.({ request, respondWith } as FetchEvent as never);

    expect(respondWith).not.toHaveBeenCalled();
    expect(caches.match).not.toHaveBeenCalled();
    expect(caches.open).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("caches the offline shell during install", async () => {
    const { cache, listeners, worker } = loadServiceWorker();
    let completion = Promise.resolve<unknown>(undefined);
    listeners.get("install")?.({
      waitUntil: (promise) => {
        completion = promise;
      },
    } as InstallEvent as never);

    await completion;
    expect(cache.addAll).toHaveBeenCalledWith([
      "/",
      "/offline.html",
      "/manifest.webmanifest",
      "/favicon.ico",
      "/icon-192.png",
      "/icon-512.png",
      "/icon-maskable-512.png",
    ]);
    expect(worker.skipWaiting).toHaveBeenCalled();
  });

  it("still activates when shell caching fails", async () => {
    const { cache, listeners, worker } = loadServiceWorker();
    cache.addAll.mockRejectedValue(new Error("cache unavailable"));
    let completion = Promise.resolve<unknown>(undefined);
    listeners.get("install")?.({
      waitUntil: (promise) => {
        completion = promise;
      },
    } as InstallEvent as never);

    await completion;
    expect(worker.skipWaiting).toHaveBeenCalledTimes(1);
  });

  it("removes old caches during activation", async () => {
    const { caches, listeners, worker } = loadServiceWorker();
    caches.keys.mockResolvedValue([
      "recall-v1",
      "recall-v2",
      "recall-v3",
      "other",
    ]);
    let completion = Promise.resolve<unknown>(undefined);
    listeners.get("activate")?.({
      waitUntil: (promise) => {
        completion = promise;
      },
    } as InstallEvent as never);

    await completion;
    expect(caches.delete).toHaveBeenCalledWith("recall-v1");
    expect(caches.delete).toHaveBeenCalledWith("recall-v2");
    expect(caches.delete).toHaveBeenCalledWith("other");
    expect(caches.delete).not.toHaveBeenCalledWith("recall-v3");
    expect(worker.clients.claim).toHaveBeenCalled();
  });

  it("returns an error response when an API request fails offline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    const { listeners } = loadServiceWorker();
    let response = Promise.resolve(Response.error());
    const request = new Request("https://recall.test/api/v1/notes");
    listeners.get("fetch")?.({
      request,
      respondWith: (promise) => {
        response = promise;
      },
    } as FetchEvent as never);

    await expect(response).resolves.toMatchObject({ status: 0 });
  });

  it("returns a cached API response when the network fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    const { caches, listeners } = loadServiceWorker();
    const cached = new Response('{"ok":true}', {
      headers: { "Content-Type": "application/json" },
    });
    caches.match.mockResolvedValue(cached);
    let response = Promise.resolve(Response.error());
    const request = new Request("https://recall.test/api/v1/notes");
    listeners.get("fetch")?.({
      request,
      respondWith: (promise) => {
        response = promise;
      },
    } as FetchEvent as never);

    await expect(response).resolves.toBe(cached);
  });

  it("returns a live API response without reading the cache", async () => {
    const network = new Response('{"ok":true}', {
      headers: { "Content-Type": "application/json" },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(network)),
    );
    const { caches, listeners } = loadServiceWorker();
    let response = Promise.resolve(Response.error());
    const request = new Request("https://recall.test/api/v1/notes");
    listeners.get("fetch")?.({
      request,
      respondWith: (promise) => {
        response = promise;
      },
    } as FetchEvent as never);

    await expect(response).resolves.toBe(network);
    expect(caches.match).not.toHaveBeenCalled();
  });

  it("serves the offline page when navigation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    const { caches, listeners } = loadServiceWorker();
    const offline = new Response("offline");
    caches.match
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(offline);
    let response = Promise.resolve(Response.error());
    const request = {
      method: "GET",
      mode: "navigate",
      url: "https://recall.test/notes",
    } as Request;
    listeners.get("fetch")?.({
      request,
      respondWith: (promise) => {
        response = promise;
      },
    } as FetchEvent as never);

    await expect(response).resolves.toBe(offline);
    expect(caches.match).toHaveBeenLastCalledWith("/offline.html");
  });

  it("prefers a cached navigation response to the offline page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    const { caches, listeners } = loadServiceWorker();
    const cached = new Response("cached route");
    caches.match.mockResolvedValueOnce(cached);
    let response = Promise.resolve(Response.error());
    const request = {
      method: "GET",
      mode: "navigate",
      url: "https://recall.test/notes",
    } as Request;
    listeners.get("fetch")?.({
      request,
      respondWith: (promise) => {
        response = promise;
      },
    } as FetchEvent as never);

    await expect(response).resolves.toBe(cached);
    expect(caches.match).toHaveBeenCalledTimes(1);
  });

  it("caches successful navigation responses", async () => {
    const network = new Response("online");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(network)),
    );
    const { cache, listeners } = loadServiceWorker();
    let response = Promise.resolve(Response.error());
    const request = {
      method: "GET",
      mode: "navigate",
      url: "https://recall.test/notes",
    } as Request;
    listeners.get("fetch")?.({
      request,
      respondWith: (promise) => {
        response = promise;
      },
    } as FetchEvent as never);

    await expect(response).resolves.toBe(network);
    await vi.waitFor(() =>
      expect(cache.put).toHaveBeenCalledWith(request, expect.any(Response)),
    );
  });

  it("returns navigation responses when cache storage rejects", async () => {
    const network = new Response("online");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(network)),
    );
    const { caches, listeners } = loadServiceWorker();
    caches.open.mockRejectedValue(new Error("cache unavailable"));
    let response = Promise.resolve(Response.error());
    const request = {
      method: "GET",
      mode: "navigate",
      url: "https://recall.test/notes",
    } as Request;
    listeners.get("fetch")?.({
      request,
      respondWith: (promise) => {
        response = promise;
      },
    } as FetchEvent as never);

    await expect(response).resolves.toBe(network);
  });

  it("serves cached assets while refreshing them", async () => {
    const cached = new Response("cached");
    const network = new Response("fresh");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(network)),
    );
    const { cache, caches, listeners } = loadServiceWorker();
    caches.match.mockResolvedValue(cached);
    let response = Promise.resolve(Response.error());
    const request = new Request("https://recall.test/icon-192.png");
    listeners.get("fetch")?.({
      request,
      respondWith: (promise) => {
        response = promise;
      },
    } as FetchEvent as never);

    await expect(response).resolves.toBe(cached);
    await vi.waitFor(() =>
      expect(cache.put).toHaveBeenCalledWith(request, expect.any(Response)),
    );
  });

  it("returns and caches a network asset after a cache miss", async () => {
    const network = new Response("fresh");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(network)),
    );
    const { cache, caches, listeners } = loadServiceWorker();
    caches.match.mockResolvedValue(undefined);
    let response = Promise.resolve(Response.error());
    const request = new Request("https://recall.test/icon-192.png");
    listeners.get("fetch")?.({
      request,
      respondWith: (promise) => {
        response = promise;
      },
    } as FetchEvent as never);

    await expect(response).resolves.toBe(network);
    await vi.waitFor(() =>
      expect(cache.put).toHaveBeenCalledWith(request, expect.any(Response)),
    );
  });

  it("returns an error response for an offline asset cache miss", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    const { caches, listeners } = loadServiceWorker();
    caches.match.mockResolvedValue(undefined);
    let response = Promise.resolve(new Response());
    const request = new Request("https://recall.test/icon-192.png");
    listeners.get("fetch")?.({
      request,
      respondWith: (promise) => {
        response = promise;
      },
    } as FetchEvent as never);

    await expect(response).resolves.toMatchObject({ status: 0 });
  });
});
