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
  it("caches the offline shell during install", async () => {
    const { cache, listeners, worker } = loadServiceWorker();
    let completion = Promise.resolve<unknown>(undefined);
    listeners.get("install")?.({
      waitUntil: (promise) => {
        completion = promise;
      },
    } as InstallEvent as never);

    await completion;
    expect(cache.addAll).toHaveBeenCalledWith(
      expect.arrayContaining(["/offline.html", "/manifest.webmanifest"]),
    );
    expect(cache.addAll).not.toHaveBeenCalledWith(
      expect.arrayContaining(["/manifest.json"]),
    );
    expect(worker.skipWaiting).toHaveBeenCalled();
  });

  it("removes old caches during activation", async () => {
    const { caches, listeners, worker } = loadServiceWorker();
    let completion = Promise.resolve<unknown>(undefined);
    listeners.get("activate")?.({
      waitUntil: (promise) => {
        completion = promise;
      },
    } as InstallEvent as never);

    await completion;
    expect(caches.delete).toHaveBeenCalledWith("recall-v2");
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
});
