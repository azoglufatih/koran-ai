"use client";

import { useSyncExternalStore } from "react";
import {
  forgetBookmarks,
  readReadingPosition,
  writeReadingPosition,
} from "@/reading/reading-memory-store";
import type { AyahRef } from "@/content/quran";
import { browserStorage, rememberedInBrowser } from "./remembered-in-browser";

const positionInBrowser = rememberedInBrowser<AyahRef | null>(readReadingPosition, null);

/** Deletes what the removed Bookmarks feature left behind — see `forgetBookmarks`. */
export const forgetRemovedBookmarks = (): void => forgetBookmarks(browserStorage());

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
