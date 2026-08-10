/**
 * The service worker: what makes the app installable to a home screen, and what makes opening it
 * again fast. It caches the App Shell — the app's own HTML, JavaScript, CSS and icons — and
 * nothing else. The translations, the tafsir and the Retrieval Index go straight to the network
 * every time; reading offline is not something this app claims to do
 * (docs/adr/0004-app-shell-cached-corpus-not.md, which also covers why the Arabic, being bundled
 * into the shell rather than fetched, is the one part of the corpus this cannot hold back).
 *
 * Registered as a module worker by src/components/pwa/register-service-worker.tsx, which is what
 * lets it import the policy below rather than repeat it.
 */

import { CACHE_FIRST, NETWORK_ONLY, cachingFor } from "./pwa/app-shell-cache.js";

/**
 * Bump the version to have readers drop everything cached by the version before it. Within a
 * version the cache only grows: each deploy adds its own hashed build output beside the last one's,
 * which for an app this size is cheaper than working out which of them is still referenced.
 *
 * The prefix is what marks a cache as this app's. Cache storage belongs to the whole origin rather
 * than to the path the worker controls, so an app sharing a host with this one has caches here that
 * are none of its business.
 */
const APP_SHELL_PREFIX = "koran-ai-app-shell-";
const APP_SHELL = `${APP_SHELL_PREFIX}v1`;

/** A response worth keeping. A redirect replayed from the cache is a navigation the browser refuses. */
const worthCaching = (response) => response.ok && !response.redirected;

/**
 * The hashed build output. A cached file under this name cannot have gone stale — the name would
 * have changed with it — so the network is only for what the reader has not loaded before.
 */
async function fromCacheFirst(request, event) {
  const cache = await caches.open(APP_SHELL);

  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (worthCaching(response)) event.waitUntil(cache.put(request, response.clone()));

  return response;
}

/**
 * The pages, the manifest and the icons — none of which a hash renames when they change. The
 * reader gets the copy from their last visit immediately, and the copy fetched behind it is what
 * they open next time. So a deploy reaches a reader one visit late, and never leaves them waiting
 * on the network for the shell of a page they have already seen.
 */
async function revalidateWhileServing(request, event) {
  const cache = await caches.open(APP_SHELL);

  const fetched = fetch(request).then(async (response) => {
    if (worthCaching(response)) await cache.put(request, response.clone());
    return response;
  });

  const cached = await cache.match(request);
  if (!cached) return fetched;

  // Nothing is awaiting the fetch now, so say the worker is still busy with it — otherwise the
  // browser is free to stop the worker before the reader's next visit has anything new to open.
  event.waitUntil(fetched.catch(() => undefined));

  return cached;
}

self.addEventListener("install", () => {
  // Nothing to precache: the build output is named by content hashes this worker cannot know, so
  // the shell is cached as the reader loads it rather than listed here.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const outgrown = (await caches.keys()).filter(
        (name) => name.startsWith(APP_SHELL_PREFIX) && name !== APP_SHELL,
      );
      await Promise.all(outgrown.map((name) => caches.delete(name)));

      // Take over the pages that loaded before this worker existed, so a reader's first visit is
      // also caching for their second.
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const strategy = cachingFor(event.request, self.registration.scope);

  // Not answering leaves the request to the browser, exactly as if no worker were installed. This
  // is the corpus, and every request to the reader's AI provider.
  if (strategy === NETWORK_ONLY) return;

  const serve = strategy === CACHE_FIRST ? fromCacheFirst : revalidateWhileServing;
  event.respondWith(serve(event.request, event));
});
