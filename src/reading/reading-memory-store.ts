import { sameAyah, type AyahRef } from "@/content/quran";

/**
 * Where the reader's place in the book lives — their own browser, and nowhere else. Bookmarks and
 * a reading position are a convenience the app owes the reader, not a record it keeps about them
 * (docs/adr/0001-no-backend-client-side-ai.md), so this module is the whole of their storage: the
 * same trust boundary the AI provider config sits behind.
 *
 * Storage is passed in rather than reached for, so the seam is exercisable and so a browser that
 * denies storage (private mode, disabled cookies) is an empty list this handles rather than a throw.
 */
export const READING_POSITION_KEY = "koran-ai:reading-position";
export const BOOKMARKS_KEY = "koran-ai:bookmarks";

/** The Quran's fixed extent — the one bound worth checking without loading any Surah to check it. */
const SURAH_COUNT = 114;

/**
 * Anything under these keys is untrusted: a reader's own edit, or something written by a version of
 * the app that stored bookmarks differently. A ref that isn't somewhere in the Quran would send the
 * reader to a Surah that doesn't exist, so it is treated as no ref at all.
 *
 * Whether the Ayah exists *within* its Surah is deliberately not checked here — that needs the
 * corpus, and this seam stays independent of it. A ref past the end of a real Surah survives to the
 * bookmarks list, which resolves refs against the content repository and shows what it can find.
 */
function parseAyahRef(value: unknown): AyahRef | null {
  if (typeof value !== "object" || value === null) return null;
  const { surah, ayah } = value as Record<string, unknown>;

  if (!Number.isInteger(surah) || !Number.isInteger(ayah)) return null;
  if ((surah as number) < 1 || (surah as number) > SURAH_COUNT || (ayah as number) < 1) return null;

  return { surah: surah as number, ayah: ayah as number };
}

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

const inReadingOrder = (refs: AyahRef[]) =>
  [...refs].sort((a, b) => a.surah - b.surah || a.ayah - b.ayah);

/**
 * The reader's bookmarks, in the order they would meet them reading front to back — a list to
 * navigate by rather than a history of when each was made.
 */
export function readBookmarks(storage: Storage | null): AyahRef[] {
  const parsed = parseJson(storage?.getItem(BOOKMARKS_KEY));
  if (!Array.isArray(parsed)) return [];

  // One unreadable entry costs the reader that bookmark, not the whole list they built up.
  return inReadingOrder(parsed.map(parseAyahRef).filter((ref): ref is AyahRef => ref !== null));
}

export const isBookmarked = (bookmarks: readonly AyahRef[], ref: AyahRef): boolean =>
  bookmarks.some((bookmark) => sameAyah(bookmark, ref));

/**
 * Bookmarks the Ayah, or removes it if the reader already had it bookmarked. Read and write live
 * together here so the list can't grow a duplicate of an Ayah that is already in it.
 */
export function toggleBookmark(storage: Storage | null, ref: AyahRef): void {
  if (!storage) return;

  const bookmarks = readBookmarks(storage);
  const next = isBookmarked(bookmarks, ref)
    ? bookmarks.filter((bookmark) => !sameAyah(bookmark, ref))
    : inReadingOrder([...bookmarks, ref]);

  storage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
}
