"use client";

/** A browser that denies storage is a reader whose choices last the visit, not a crash. */
export function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * One thing the reader's browser remembers, as something React can subscribe to.
 *
 * Each remembered thing keeps its own subscribers, so noting where the reader has scrolled to only
 * re-renders what shows the reading position, and not everything else the browser is holding.
 *
 * The parsed value is held between reads because useSyncExternalStore compares snapshots by
 * identity, and reading storage builds a fresh object every time.
 */
export function rememberedInBrowser<T>(
  read: (storage: Storage | null) => T,
  whileServerRendering: T,
) {
  let cached: T = whileServerRendering;
  let isCached = false;

  const listeners = new Set<() => void>();

  const reread = () => {
    isCached = false;
    for (const listener of listeners) listener();
  };

  return {
    subscribe(listener: () => void) {
      // Storage events fire only in the browser's *other* tabs, which is exactly the case this
      // handles: a reader who changes something in one tab shouldn't have a second tab go on
      // showing what they changed away from. Anything changed while nothing was mounted is caught
      // by dropping what was held the moment something subscribes again.
      if (listeners.size === 0) window.addEventListener("storage", reread);
      isCached = false;
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", reread);
      };
    },

    getSnapshot(): T {
      if (!isCached) {
        cached = read(browserStorage());
        isCached = true;
      }
      return cached;
    },

    getServerSnapshot: () => whileServerRendering,

    /** Puts a change through storage, then tells this thing's own subscribers — and only them. */
    change(write: (storage: Storage | null) => void) {
      write(browserStorage());
      reread();
    },
  };
}
