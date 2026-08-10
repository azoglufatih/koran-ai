import { beforeEach, describe, expect, it } from "vitest";
import type { AyahRef } from "@/content/quran";
import {
  READING_POSITION_KEY,
  forgetBookmarks,
  readReadingPosition,
  writeReadingPosition,
} from "./reading-memory-store";

/** What the removed Bookmarks feature wrote, as a browser that used it still holds it. */
const REMOVED_BOOKMARKS_KEY = "koran-ai:bookmarks";

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

describe("forgetBookmarks", () => {
  it("deletes the list a reader of the shipped version still has in their browser", () => {
    storage.setItem(REMOVED_BOOKMARKS_KEY, JSON.stringify([ayah(2, 30), ayah(36, 1)]));

    forgetBookmarks(storage);

    expect(storage.getItem(REMOVED_BOOKMARKS_KEY)).toBeNull();
  });

  it("leaves the reading position, which is a separate thing and is staying", () => {
    writeReadingPosition(storage, ayah(18, 60));

    forgetBookmarks(storage);

    expect(readReadingPosition(storage)).toEqual(ayah(18, 60));
  });

  it("does nothing when the browser denies storage entirely", () => {
    expect(() => forgetBookmarks(null)).not.toThrow();
  });
});
