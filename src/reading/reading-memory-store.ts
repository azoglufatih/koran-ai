import { parseAyahRef, type AyahRef } from "@/content/quran";

/**
 * Where the reader's place in the book lives — their own browser, and nowhere else. A reading
 * position is a convenience the app owes the reader, not a record it keeps about them
 * (docs/adr/0001-no-backend-client-side-ai.md), so this module is the whole of its storage: the
 * same trust boundary the AI provider config sits behind.
 *
 * Storage is passed in rather than reached for, so the seam is exercisable and so a browser that
 * denies storage (private mode, disabled cookies) is a null this handles rather than a throw.
 */
export const READING_POSITION_KEY = "koran-ai:reading-position";

/**
 * The key a shipped version of the app kept bookmarks under, named here only so it can be deleted.
 * Bookmarks are gone (#10) and the reader's list went with them; leaving it sitting in their
 * browser after removing the feature that wrote it is the small version of what ADR 0001 refuses.
 *
 * Drop this, and `forgetBookmarks` with it, a release or two after the one that removed the
 * feature — by then every reader who had a list has loaded a version that cleared it.
 */
const REMOVED_BOOKMARKS_KEY = "koran-ai:bookmarks";

// Anything under this key is untrusted: a reader's own edit, or something written by a version of
// the app that stored the position differently — so it goes through `parseAyahRef`, the same guard
// the Column arrangement reads its AI Tab groundings back through.

function parseJson(stored: string | null | undefined): unknown {
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function readReadingPosition(storage: Storage | null): AyahRef | null {
  return parseAyahRef(parseJson(storage?.getItem(READING_POSITION_KEY)));
}

export function writeReadingPosition(storage: Storage | null, ref: AyahRef): void {
  storage?.setItem(READING_POSITION_KEY, JSON.stringify(ref));
}

/**
 * Clears out what the removed Bookmarks feature left in the reader's browser. Called once a load,
 * so a reader who used the shipped version has their list deleted the next time they open the app
 * rather than carrying it around unread — see `REMOVED_BOOKMARKS_KEY`.
 */
export function forgetBookmarks(storage: Storage | null): void {
  storage?.removeItem(REMOVED_BOOKMARKS_KEY);
}
