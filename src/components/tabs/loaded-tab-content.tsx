"use client";

import { Suspense, use, useState } from "react";

type LoadResult<T> = { ok: true; value: T } | { ok: false; message: string };

// `use` re-reads this on every render, so the promise per cache key has to be the same object each
// time. Failures are cached alongside successes — evicting one as it settles would suspend,
// resolve and render again in a loop — so retrying is the reader's call, via the button below.
const loads = new Map<string, Promise<LoadResult<unknown>>>();

function loadOnce<T>(cacheKey: string, load: () => Promise<T>): Promise<LoadResult<T>> {
  let loaded = loads.get(cacheKey);
  if (!loaded) {
    loaded = load().then(
      (value): LoadResult<unknown> => ({ ok: true, value }),
      (error: unknown): LoadResult<unknown> => ({
        ok: false,
        message: error instanceof Error ? error.message : "This Tab's text could not be loaded",
      }),
    );
    loads.set(cacheKey, loaded);
  }
  return loaded as Promise<LoadResult<T>>;
}

/**
 * A Tab's content, fetched once per cache key and held across renders. Every Tab that reads the
 * Quran Content Repository loads the same way — on demand, in the browser, with a failure the
 * reader can retry — so the loading, error and retry states live here rather than in each Tab.
 */
export function LoadedTabContent<T>({
  cacheKey,
  load,
  loadingLabel,
  children,
}: {
  cacheKey: string;
  load: () => Promise<T>;
  loadingLabel: string;
  children: (value: T) => React.ReactNode;
}) {
  return (
    <Suspense
      fallback={<p className="px-1 py-6 text-sm text-black/45 dark:text-white/45">{loadingLabel}</p>}
    >
      <LoadedOrRetry cacheKey={cacheKey} load={load}>
        {children}
      </LoadedOrRetry>
    </Suspense>
  );
}

function LoadedOrRetry<T>({
  cacheKey,
  load,
  children,
}: {
  cacheKey: string;
  load: () => Promise<T>;
  children: (value: T) => React.ReactNode;
}) {
  // Bumping this re-renders past the forgotten cache entry, so the load is attempted afresh.
  const [attempt, setAttempt] = useState(0);
  const loaded = use(loadOnce(cacheKey, load));

  if (loaded.ok) return children(loaded.value);

  return (
    <div className="px-1 py-6 text-sm">
      <p className="text-red-700 dark:text-red-400">{loaded.message}</p>
      <button
        type="button"
        onClick={() => {
          loads.delete(cacheKey);
          setAttempt(attempt + 1);
        }}
        className="mt-2 rounded-lg border border-black/15 px-3 py-1.5 hover:bg-black/[0.06] dark:border-white/15 dark:hover:bg-white/[0.08]"
      >
        Try again
      </button>
    </div>
  );
}
