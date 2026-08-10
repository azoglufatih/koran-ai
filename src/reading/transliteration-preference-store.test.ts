import { beforeEach, describe, expect, it } from "vitest";
import {
  TRANSLITERATION_PREFERENCE_KEY,
  readTransliterationPreference,
  writeTransliterationPreference,
} from "./transliteration-preference-store";

/** Stands in for the reader's own browser storage — the only place this ever goes. */
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

describe("a reader who has never touched the controls", () => {
  // Fixed for everyone, unlike the first Translation Tab: a Turkish reader who wants Turkish
  // orthography picks it themselves rather than having it guessed from their browser.
  it("reads the phonetic scheme, shown", () => {
    expect(readTransliterationPreference(storage)).toEqual({
      scheme: "ara-quranphoneticst",
      isShown: true,
    });
  });

  it("gets the same in a browser that denies storage entirely", () => {
    expect(readTransliterationPreference(null)).toEqual({
      scheme: "ara-quranphoneticst",
      isShown: true,
    });
  });
});

describe("a reader who has chosen", () => {
  it("has their scheme read back", () => {
    writeTransliterationPreference(storage, { scheme: "tur-latinalphabet", isShown: true });

    expect(readTransliterationPreference(storage).scheme).toBe("tur-latinalphabet");
  });

  it("has the line stay off once they turn it off", () => {
    writeTransliterationPreference(storage, { scheme: "ara-quran-la1", isShown: false });

    expect(readTransliterationPreference(storage)).toEqual({
      scheme: "ara-quran-la1",
      isShown: false,
    });
  });

  it("is not written to by a browser that denies storage, and is not thrown at either", () => {
    expect(() =>
      writeTransliterationPreference(null, { scheme: "ara-quran-la1", isShown: false }),
    ).not.toThrow();
  });
});

describe("what is stored is untrusted", () => {
  it("falls back to the default for anything that is not a preference at all", () => {
    for (const stored of ["not json at all", "null", '"ara-quran-la1"', "[]", "42"]) {
      storage.setItem(TRANSLITERATION_PREFERENCE_KEY, stored);

      expect(readTransliterationPreference(storage), stored).toEqual({
        scheme: "ara-quranphoneticst",
        isShown: true,
      });
    }
  });

  // A scheme this version does not ship is one there is no text to fetch for, so it would leave the
  // reader with no line and no way to tell why. The default is a line they can read.
  it("falls back to the default scheme for one it does not ship, keeping the choice beside it", () => {
    storage.setItem(
      TRANSLITERATION_PREFERENCE_KEY,
      JSON.stringify({ scheme: "ara-quran-la", isShown: false }),
    );

    expect(readTransliterationPreference(storage)).toEqual({
      scheme: "ara-quranphoneticst",
      isShown: false,
    });
  });

  it("shows the line for anything but an explicit false", () => {
    storage.setItem(
      TRANSLITERATION_PREFERENCE_KEY,
      JSON.stringify({ scheme: "ara-quran-la1", isShown: "no" }),
    );

    expect(readTransliterationPreference(storage)).toEqual({
      scheme: "ara-quran-la1",
      isShown: true,
    });
  });
});
