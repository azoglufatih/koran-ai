"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  isBookmarked,
  readBookmarks,
  readReadingPosition,
  toggleBookmark,
  writeReadingPosition,
} from "@/reading/reading-memory-store";
import type { AyahRef } from "@/content/quran";

/** A browser that denies storage is a reader who keeps no place in the book, not a crash. */
function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * One thing the reader's browser remembers, as something React can subscribe to.
 *
 * Each remembered thing keeps its own subscribers, so noting where the reader has scrolled to does
 * not tell every bookmark on the page to re-render — which, on a Surah the length of Al-Baqara,
 * would be a few hundred of them for every Ayah scrolled past.
 *
 * The parsed value is held between reads because useSyncExternalStore compares snapshots by
 * identity, and reading storage builds a fresh object every time.
 */
function rememberedInBrowser<T>(read: (storage: Storage | null) => T, whileServerRendering: T) {
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
      // handles: a reader who bookmarks an Ayah in one tab shouldn't see a second tab still
      // calling it unbookmarked. Anything changed while nothing was mounted is caught by dropping
      // what was held the moment something subscribes again.
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

/** Stable across renders, so a prerender and a reader with no bookmarks both settle immediately. */
const NO_BOOKMARKS: AyahRef[] = [];

const bookmarksInBrowser = rememberedInBrowser(readBookmarks, NO_BOOKMARKS);
const positionInBrowser = rememberedInBrowser<AyahRef | null>(readReadingPosition, null);

export interface BookmarksValue {
  /** Every Ayah the reader has bookmarked, in reading order. Empty while prerendering. */
  bookmarks: AyahRef[];
  /** Bookmarks the Ayah, or removes it if it is already bookmarked. */
  toggle(ref: AyahRef): void;
}

/**
 * The reader's bookmarks, shared by every toggle in the Reading Pane and the bookmarks list.
 * Empty during the prerender: a static export has no reader's browser to read localStorage from
 * until hydration, the same reason the Translation Tab's language is unknowable until then.
 */
export function useBookmarks(): BookmarksValue {
  const bookmarks = useSyncExternalStore(
    bookmarksInBrowser.subscribe,
    bookmarksInBrowser.getSnapshot,
    bookmarksInBrowser.getServerSnapshot,
  );

  const toggle = useCallback((ref: AyahRef) => {
    bookmarksInBrowser.change((storage) => toggleBookmark(storage, ref));
  }, []);

  return { bookmarks, toggle };
}

export interface BookmarkValue {
  bookmarked: boolean;
  toggle(): void;
}

/** One Ayah's bookmark, for the mark beside it — which is all that Ayah's toggle has to know. */
export function useBookmark(ref: AyahRef): BookmarkValue {
  const { bookmarks, toggle } = useBookmarks();

  return { bookmarked: isBookmarked(bookmarks, ref), toggle: () => toggle(ref) };
}

/**
 * The reading position outside React — for the tracker, which follows the reader's scrolling rather
 * than their rendering. It reads the place they left off at the moment they arrive, and writes as
 * they read on; subscribing to either would only re-render it for news it already has.
 */
export const storedReadingPosition = (): AyahRef | null => readReadingPosition(browserStorage());

export function rememberReadingPosition(ref: AyahRef): void {
  positionInBrowser.change((storage) => writeReadingPosition(storage, ref));
}

export interface ReadingPositionValue {
  /** Where the reader left off, or null if they have not read yet — including while prerendering. */
  position: AyahRef | null;
  remember(ref: AyahRef): void;
}

export function useReadingPosition(): ReadingPositionValue {
  const position = useSyncExternalStore(
    positionInBrowser.subscribe,
    positionInBrowser.getSnapshot,
    positionInBrowser.getServerSnapshot,
  );

  return { position, remember: rememberReadingPosition };
}
