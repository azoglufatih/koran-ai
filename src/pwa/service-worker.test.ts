import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The service worker driven the way a browser drives it: events in, cached responses out. It runs
 * nowhere a test can reach it — no window, no DOM, no module a page can import — so the browser's
 * side of it is stood up here, and public/sw.js is imported into that.
 *
 * What this is for is the line the worker draws: the App Shell is kept, the corpus is not, and a
 * question put to the reader's AI provider is not so much as answered
 * (docs/adr/0004-app-shell-cached-corpus-not.md).
 */

const SCOPE = "https://koran.example/";

/** A response from the network, in the shape the worker asks anything of it. */
const networkResponse = (body: string, { ok = true, redirected = false } = {}) => ({
  body,
  ok,
  redirected,
  clone() {
    return { ...this, clone: this.clone };
  },
});

type FakeResponse = ReturnType<typeof networkResponse>;

/** The browser's cache storage, keyed the way the Cache API keys it: by request URL. */
function createCacheStorage() {
  const caches = new Map<string, Map<string, FakeResponse>>();

  return {
    contentsOf: (name: string) => caches.get(name) ?? new Map<string, FakeResponse>(),
    names: () => [...caches.keys()],
    seed(name: string, url: string, response: FakeResponse) {
      const entries = caches.get(name) ?? new Map<string, FakeResponse>();
      entries.set(url, response);
      caches.set(name, entries);
    },
    api: {
      async open(name: string) {
        const entries = caches.get(name) ?? new Map<string, FakeResponse>();
        caches.set(name, entries);
        return {
          match: async ({ url }: Request) => entries.get(url),
          put: async ({ url }: Request, response: FakeResponse) => void entries.set(url, response),
        };
      },
      keys: async () => [...caches.keys()],
      delete: async (name: string) => caches.delete(name),
    },
  };
}

let cacheStorage: ReturnType<typeof createCacheStorage>;
let listeners: Map<string, (event: never) => void>;
let claimed: boolean;
let network: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  cacheStorage = createCacheStorage();
  listeners = new Map();
  claimed = false;
  network = vi.fn(async ({ url }: Request) => networkResponse(`from the network: ${url}`));

  vi.stubGlobal("self", {
    addEventListener: (type: string, handler: (event: never) => void) => listeners.set(type, handler),
    registration: { scope: SCOPE },
    skipWaiting: () => {},
    clients: {
      claim: async () => {
        claimed = true;
      },
    },
  });
  vi.stubGlobal("caches", cacheStorage.api);
  vi.stubGlobal("fetch", network);

  // Imported once the browser's side of it exists: registering its listeners is what it does when
  // the browser loads it.
  vi.resetModules();
  await import("../../public/sw.js");
});

/** The cache the worker is expected to be keeping — named here so a rename is one edit. */
const APP_SHELL = "koran-ai-app-shell-v1";

const cached = () => cacheStorage.contentsOf(APP_SHELL);

/**
 * Puts one request through the worker's fetch handler, and settles whatever it asked to be kept
 * alive for afterwards.
 *
 * `null` is a request the worker declined to answer — which is not a failure but the whole of how
 * it stays out of the way: the browser makes that request itself, unseen.
 */
async function requestThrough(url: string, init?: RequestInit): Promise<FakeResponse | null> {
  const handle = listeners.get("fetch") as (event: unknown) => void;

  let answer: Promise<FakeResponse> | null = null;
  const alive: Promise<unknown>[] = [];

  handle({
    request: new Request(url, init),
    respondWith: (response: Promise<FakeResponse>) => void (answer = response),
    waitUntil: (work: Promise<unknown>) => void alive.push(work),
  });

  if (!answer) return null;

  const response = await answer;
  await Promise.all(alive);
  return response;
}

describe("the App Shell cache", () => {
  const chunk = `${SCOPE}_next/static/chunks/main-7f3a9c.js`;

  it("keeps the hashed build output the reader has loaded", async () => {
    await requestThrough(chunk);

    expect([...cached().keys()]).toEqual([chunk]);
  });

  it("serves it back without going to the network again", async () => {
    cacheStorage.seed(APP_SHELL, chunk, networkResponse("the chunk from last visit"));

    const response = await requestThrough(chunk);

    expect(response?.body).toBe("the chunk from last visit");
    expect(network).not.toHaveBeenCalled();
  });

  it("hands a page over from the last visit, and fetches the one that replaced it", async () => {
    const page = `${SCOPE}surah/18`;
    cacheStorage.seed(APP_SHELL, page, networkResponse("Surah 18, as it was"));

    const response = await requestThrough(page);

    expect(response?.body).toBe("Surah 18, as it was");
    expect(network).toHaveBeenCalledOnce();
    expect(cached().get(page)?.body).toBe(`from the network: ${page}`);
  });

  it("waits on the network for a page the reader has not opened before", async () => {
    const response = await requestThrough(`${SCOPE}surah/36`);

    expect(response?.body).toBe(`from the network: ${SCOPE}surah/36`);
  });

  it("keeps nothing it could not fetch", async () => {
    network.mockResolvedValueOnce(networkResponse("not found", { ok: false }));

    await requestThrough(`${SCOPE}surah/999`);

    expect(cached().size).toBe(0);
  });

  it("keeps no redirect, which the browser would refuse to replay as a page", async () => {
    network.mockResolvedValueOnce(networkResponse("the page it redirected to", { redirected: true }));

    await requestThrough(`${SCOPE}surah/18`);

    expect(cached().size).toBe(0);
  });

  it("drops what an earlier version of the worker had cached, and nothing else on the host", async () => {
    cacheStorage.seed("koran-ai-app-shell-v0", `${SCOPE}old-chunk.js`, networkResponse("last release"));
    cacheStorage.seed(APP_SHELL, chunk, networkResponse("this release"));
    // Cache storage belongs to the origin, which the app may be sharing with something else.
    cacheStorage.seed("some-other-app", "https://koran.example/elsewhere.js", networkResponse("theirs"));

    const activate = listeners.get("activate") as (event: unknown) => void;
    const alive: Promise<unknown>[] = [];
    activate({ waitUntil: (work: Promise<unknown>) => void alive.push(work) });
    await Promise.all(alive);

    expect(cacheStorage.names()).toEqual([APP_SHELL, "some-other-app"]);
    // And takes over the pages already open, so a first visit is caching for the second.
    expect(claimed).toBe(true);
  });
});

/**
 * Which requests fall on which side of the line is app-shell-cache.test.ts's subject; what these
 * two ask is what the worker does with the ones that fall outside it — which is nothing at all,
 * not even a fetch of its own.
 */
describe("what the service worker leaves alone", () => {
  it("does not answer for the corpus", async () => {
    expect(await requestThrough(`${SCOPE}content/translations/en/2.json`)).toBeNull();

    expect(cached().size).toBe(0);
    expect(network).not.toHaveBeenCalled();
  });

  it("does not answer for a question put to the reader's own AI provider", async () => {
    const asked = await requestThrough("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
    });

    expect(asked).toBeNull();
    expect(cached().size).toBe(0);
    expect(network).not.toHaveBeenCalled();
  });
});
