import { beforeEach, describe, expect, it } from "vitest";
import type { AyahRef } from "@/content/quran";
import {
  BOOKMARKS_KEY,
  READING_POSITION_KEY,
  isBookmarked,
  readBookmarks,
  readReadingPosition,
  toggleBookmark,
  writeReadingPosition,
} from "./reading-memory-store";

const ayah = (surah: number, ayah: number): AyahRef => ({ surah, ayah });

/** Stands in for the reader's own browser storage — the only place any of this ever goes. */
function createStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
    clear: () => entries.clear(),
  };
}

let storage: Storage;

beforeEach(() => {
  storage = createStorage();
});

describe("readReadingPosition", () => {
  it("returns the Ayah the reader last had in front of them", () => {
    writeReadingPosition(storage, ayah(18, 60));

    expect(readReadingPosition(storage)).toEqual(ayah(18, 60));
  });

  it("returns null before the reader has read anything", () => {
    expect(readReadingPosition(storage)).toBeNull();
  });

  it("remembers one position, the reader's most recent", () => {
    writeReadingPosition(storage, ayah(2, 30));
    writeReadingPosition(storage, ayah(2, 31));

    expect(readReadingPosition(storage)).toEqual(ayah(2, 31));
  });

  it("ignores a stored position that is not somewhere in the Quran", () => {
    for (const stored of [
      "not json at all",
      "null",
      '"2:30"',
      JSON.stringify({ surah: 2 }),
      JSON.stringify({ surah: 0, ayah: 1 }),
      JSON.stringify({ surah: 115, ayah: 1 }),
      JSON.stringify({ surah: 2, ayah: 0 }),
      JSON.stringify({ surah: 2.5, ayah: 1 }),
      JSON.stringify({ surah: "2", ayah: "30" }),
    ]) {
      storage.setItem(READING_POSITION_KEY, stored);

      expect(readReadingPosition(storage), stored).toBeNull();
    }
  });

  it("returns null when the browser denies storage entirely", () => {
    expect(readReadingPosition(null)).toBeNull();
  });
});

describe("toggleBookmark", () => {
  it("bookmarks an Ayah the reader had not bookmarked", () => {
    toggleBookmark(storage, ayah(36, 1));

    expect(readBookmarks(storage)).toEqual([ayah(36, 1)]);
  });

  it("removes a bookmark the reader already had", () => {
    toggleBookmark(storage, ayah(36, 1));
    toggleBookmark(storage, ayah(36, 1));

    expect(readBookmarks(storage)).toEqual([]);
  });

  it("leaves the reader's other bookmarks alone", () => {
    toggleBookmark(storage, ayah(2, 255));
    toggleBookmark(storage, ayah(36, 1));

    toggleBookmark(storage, ayah(2, 255));

    expect(readBookmarks(storage)).toEqual([ayah(36, 1)]);
  });

  it("keeps bookmarks in the order they are read in, not the order they were made", () => {
    toggleBookmark(storage, ayah(36, 1));
    toggleBookmark(storage, ayah(2, 255));
    toggleBookmark(storage, ayah(2, 30));

    expect(readBookmarks(storage)).toEqual([ayah(2, 30), ayah(2, 255), ayah(36, 1)]);
  });

  it("does nothing when the browser denies storage entirely", () => {
    toggleBookmark(null, ayah(1, 1));

    expect(readBookmarks(null)).toEqual([]);
  });
});

describe("readBookmarks", () => {
  it("returns nothing before the reader has bookmarked anything", () => {
    expect(readBookmarks(storage)).toEqual([]);
  });

  // One rotted entry shouldn't cost a reader the rest of the list they built up.
  it("keeps the bookmarks it can read and drops the ones it cannot", () => {
    storage.setItem(
      BOOKMARKS_KEY,
      JSON.stringify([ayah(2, 30), { surah: 999, ayah: 1 }, "2:255", null, ayah(36, 1)]),
    );

    expect(readBookmarks(storage)).toEqual([ayah(2, 30), ayah(36, 1)]);
  });

  it("returns nothing for a stored entry that is not a list of bookmarks", () => {
    for (const stored of ["not json at all", "null", JSON.stringify({ surah: 2, ayah: 30 })]) {
      storage.setItem(BOOKMARKS_KEY, stored);

      expect(readBookmarks(storage), stored).toEqual([]);
    }
  });

  it("returns nothing when the browser denies storage entirely", () => {
    expect(readBookmarks(null)).toEqual([]);
  });
});

describe("isBookmarked", () => {
  it("recognises an Ayah in the list", () => {
    expect(isBookmarked([ayah(2, 30), ayah(36, 1)], ayah(36, 1))).toBe(true);
  });

  it("does not confuse the same Ayah number in another Surah", () => {
    expect(isBookmarked([ayah(2, 1)], ayah(36, 1))).toBe(false);
  });
});
