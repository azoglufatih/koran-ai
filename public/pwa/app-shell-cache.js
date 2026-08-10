/**
 * What the service worker does with each request the browser makes — the whole of the caching
 * policy, kept apart from sw.js, which is only the Cache API plumbing around it, so that what is
 * cached and what deliberately isn't can be tested.
 *
 * It lives under public/ rather than src/ because a service worker is only allowed to control the
 * paths below the one it is served from: it has to sit at the root of the app as a file of its own,
 * which puts it and anything it imports outside what Next bundles.
 */

/** The build output, whose file names carry a hash of their contents: a hit can only be right. */
export const CACHE_FIRST = "cache-first";

/** Everything else of the app's own: the reader gets what was cached, and the next visit is fresh. */
export const REVALIDATE_WHILE_SERVING = "revalidate-while-serving";

/** Left to the browser, uncached and unseen — the corpus, and everything not the app's own. */
export const NETWORK_ONLY = "network-only";

const BUILD_OUTPUT = "_next/static/";
const CORPUS = "content/";

/**
 * How to serve one request.
 *
 * `scope` is what the worker controls, as a URL ending in a slash — `self.registration.scope` in
 * the service worker. Paths are read relative to it rather than to the host, since that is the
 * boundary the browser itself draws around the worker.
 *
 * @param {{ method: string, url: string }} request — a `Request`, or anything shaped like one.
 * @param {string} scope
 * @returns {typeof CACHE_FIRST | typeof REVALIDATE_WHILE_SERVING | typeof NETWORK_ONLY}
 */
export function cachingFor({ method, url }, scope) {
  // A question put to an AI provider is a POST to somewhere else entirely; both tests here keep the
  // service worker away from it. Nothing a reader asks, and no key they configured, is ever stored
  // by this app (docs/adr/0001-no-backend-client-side-ai.md).
  if (method !== "GET") return NETWORK_ONLY;
  if (!url.startsWith(scope)) return NETWORK_ONLY;

  const path = url.slice(scope.length);

  if (path.startsWith(BUILD_OUTPUT)) return CACHE_FIRST;
  // The translations, the tafsir and the Retrieval Index — everything the app fetches as it is
  // asked for — are read fresh every time and never kept
  // (docs/adr/0004-app-shell-cached-corpus-not.md, which also covers the Arabic, which is not
  // fetched at all and so cannot be kept out of the shell it is part of).
  if (path.startsWith(CORPUS)) return NETWORK_ONLY;

  return REVALIDATE_WHILE_SERVING;
}
