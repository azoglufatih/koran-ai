import { beforeEach, describe, expect, it } from "vitest";
import type { VerseContext } from "@/ai/verse-context";
import type { Column } from "./column-arrangement";
import { aiTab, tafsirTab, translationTab, type Tab } from "./tabs";
import {
  COLUMN_ARRANGEMENT_KEY,
  readColumnArrangement,
  restoredColumns,
  writeColumnArrangement,
} from "./stored-arrangement";

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

const ARABIC = "يَٰبَنِىٓ إِسْرَٰٓءِيلَ ٱذْكُرُوا۟";
const ENGLISH = "O Children of Israel! Remember";

const askingAbout2_40: VerseContext = {
  ref: { surah: 2, ayah: 40 },
  arabic: ARABIC,
  translation: { language: "en", text: ENGLISH },
  transliteration: null,
  selection: { in: "translation", start: 2, end: 20 },
};

const column = (id: string, ...tabs: Tab[]): Column => ({ id, tabs, activeTabId: tabs[0].id });

/** What the reader gets back after a reload: written out, read in, and turned back into Columns. */
function afterReload(columns: readonly Column[]): Column[] {
  writeColumnArrangement(storage, columns);
  const stored = readColumnArrangement(storage);
  return stored ? restoredColumns(stored) : [];
}

const stored = () => JSON.parse(storage.getItem(COLUMN_ARRANGEMENT_KEY)!);

const putStored = (arrangement: unknown) =>
  storage.setItem(COLUMN_ARRANGEMENT_KEY, JSON.stringify(arrangement));

describe("an arrangement the reader built", () => {
  it("comes back with the same Columns holding the same Tabs, in the same order", () => {
    const columns = afterReload([
      column("column:1", translationTab("en"), translationTab("tr")),
      column("column:2", tafsirTab("al-mukhtasar", "en")),
    ]);

    expect(columns.map((c) => c.tabs.map((tab) => tab.id))).toEqual([
      ["translation:en", "translation:tr"],
      ["tafsir:al-mukhtasar:en"],
    ]);
  });

  it("comes back showing the Tab each Column was showing", () => {
    const columns = afterReload([
      { ...column("column:1", translationTab("en"), translationTab("tr")), activeTabId: "translation:tr" },
      column("column:2", tafsirTab("al-mukhtasar", "en")),
    ]);

    expect(columns.map((c) => c.activeTabId)).toEqual(["translation:tr", "tafsir:al-mukhtasar:en"]);
  });

  it("is an empty workspace for a reader who closed every Column, not a first visit", () => {
    writeColumnArrangement(storage, []);

    expect(readColumnArrangement(storage)).toEqual([]);
  });

  // Nothing stored at all is the case the first-visit default is for, and it has to be tellable
  // apart from the reader having closed everything.
  it("is nothing at all before the reader has arranged anything", () => {
    expect(readColumnArrangement(storage)).toBeNull();
  });
});

describe("a restored AI Tab", () => {
  it("keeps the Ayah its conversation is about", () => {
    const [restored] = afterReload([column("column:1", aiTab(1, { verseContext: askingAbout2_40 }))]);

    expect(restored.tabs[0]).toMatchObject({
      kind: "ai",
      grounding: { ref: { surah: 2, ayah: 40 }, selection: { in: "translation", start: 2, end: 20 } },
    });
  });

  it("keeps the edition the selection was made in, so the offsets still mean something", () => {
    const inTheTransliteration: VerseContext = {
      ...askingAbout2_40,
      transliteration: { scheme: "tur-latinalphabet", text: "Ey İsrailoğulları" },
      selection: { in: "transliteration", start: 3, end: 18 },
    };

    const [restored] = afterReload([column("column:1", aiTab(1, { verseContext: inTheTransliteration }))]);

    expect(restored.tabs[0]).toMatchObject({
      grounding: { translationLanguage: "en", transliterationScheme: "tur-latinalphabet" },
    });
  });

  // Restoring a chat transcript out of localStorage is a materially different privacy claim from
  // restoring which panels were open, and not one this app makes.
  it("comes back with no conversation, because none was ever written down", () => {
    writeColumnArrangement(storage, [column("column:1", aiTab(1, { verseContext: askingAbout2_40 }))]);

    expect(JSON.stringify(stored())).not.toMatch(/message|content|role/i);
  });

  it("survives a second reload, having been restored from a grounding rather than a context", () => {
    const once = afterReload([column("column:1", aiTab(1, { verseContext: askingAbout2_40 }))]);
    const twice = afterReload(once);

    expect(twice[0].tabs[0]).toMatchObject({ grounding: { ref: { surah: 2, ayah: 40 } } });
  });

  it("numbers conversations afresh, so two restored Tabs are still tellable apart", () => {
    const [restored] = afterReload([
      column("column:1", aiTab(3, { verseContext: askingAbout2_40 }), aiTab(7, {})),
    ]);

    expect(restored.tabs.map((tab) => tab.id)).toEqual(["ai:1", "ai:2"]);
  });
});

describe("what is written down", () => {
  it("holds no corpus text — references, offsets and codes only", () => {
    writeColumnArrangement(storage, [
      column("column:1", translationTab("en"), aiTab(1, { verseContext: askingAbout2_40 })),
    ]);

    const written = JSON.stringify(stored());
    expect(written).not.toContain(ARABIC);
    expect(written).not.toContain(ENGLISH);
    expect(written).toContain("2");
    expect(written).toContain("en");
  });

  it("is not written by a browser that denies storage, and is not thrown at either", () => {
    expect(() => writeColumnArrangement(null, [column("column:1", translationTab("en"))])).not.toThrow();
    expect(readColumnArrangement(null)).toBeNull();
  });
});

describe("stored state this version cannot read", () => {
  it("is dropped whole when it is not an arrangement at all", () => {
    for (const junk of ["not json at all", "null", "[]", "42", '"columns"']) {
      storage.setItem(COLUMN_ARRANGEMENT_KEY, junk);

      expect(readColumnArrangement(storage), junk).toBeNull();
    }
  });

  // A record from another version is dropped rather than guessed at: a workspace the reader never
  // arranged is a smaller loss than one restored wrong.
  it("is dropped whole when it was written by another version", () => {
    putStored({ version: 99, columns: [{ tabs: [{ kind: "translation", language: "en" }], showing: 0 }] });

    expect(readColumnArrangement(storage)).toBeNull();
  });

  it("costs the reader one Tab rather than the workspace they built", () => {
    putStored({
      version: 1,
      columns: [
        {
          tabs: [
            { kind: "translation", language: "en" },
            { kind: "translation", language: "kl" },
            { kind: "somethingelse" },
            null,
            { kind: "tafsir", source: "not-a-tafsir", language: "en" },
          ],
          showing: 0,
        },
      ],
    });

    expect(readColumnArrangement(storage)).toEqual([
      { tabs: [{ kind: "translation", language: "en" }], showing: 0 },
    ]);
  });

  it("drops a Column whose every Tab was unreadable, since a Column closes with its last Tab", () => {
    putStored({
      version: 1,
      columns: [
        { tabs: [{ kind: "translation", language: "kl" }], showing: 0 },
        { tabs: [{ kind: "translation", language: "tr" }], showing: 0 },
      ],
    });

    expect(readColumnArrangement(storage)).toEqual([
      { tabs: [{ kind: "translation", language: "tr" }], showing: 0 },
    ]);
  });

  it("falls back to the first Tab when the one it says was showing is not there", () => {
    putStored({
      version: 1,
      columns: [{ tabs: [{ kind: "translation", language: "en" }], showing: 4 }],
    });

    expect(readColumnArrangement(storage)?.[0].showing).toBe(0);
  });

  // Half a grounding would label a Tab after an Ayah while grounding the next question elsewhere.
  it("keeps an AI Tab but drops a grounding it cannot read whole", () => {
    putStored({
      version: 1,
      columns: [
        {
          tabs: [
            { kind: "ai", grounding: { ref: { surah: 999, ayah: 1 }, selection: { in: "arabic", start: 0, end: 3 } } },
            { kind: "ai", grounding: { ref: { surah: 2, ayah: 40 }, selection: { in: "translation", start: 0, end: 3 } } },
            { kind: "ai", grounding: { ref: { surah: 2, ayah: 40 }, selection: { in: "arabic", start: 9, end: 2 } } },
          ],
          showing: 0,
        },
      ],
    });

    expect(readColumnArrangement(storage)).toEqual([
      {
        tabs: [{ kind: "ai", grounding: null }, { kind: "ai", grounding: null }, { kind: "ai", grounding: null }],
        showing: 0,
      },
    ]);
  });

  it("keeps a grounding whose every edition it can name", () => {
    putStored({
      version: 1,
      columns: [
        {
          tabs: [
            {
              kind: "ai",
              grounding: {
                ref: { surah: 2, ayah: 40 },
                selection: { in: "translation", start: 2, end: 20 },
                translationLanguage: "en",
                transliterationScheme: null,
              },
            },
          ],
          showing: 0,
        },
      ],
    });

    expect(readColumnArrangement(storage)?.[0].tabs[0]).toMatchObject({
      grounding: { translationLanguage: "en" },
    });
  });

  it("keeps only the first of a Tab named twice, which cannot be in two Columns at once", () => {
    const columns = restoredColumns([
      { tabs: [{ kind: "translation", language: "en" }], showing: 0 },
      {
        tabs: [
          { kind: "translation", language: "en" },
          { kind: "translation", language: "tr" },
        ],
        showing: 0,
      },
    ]);

    expect(columns.map((c) => c.tabs.map((tab) => tab.id))).toEqual([
      ["translation:en"],
      ["translation:tr"],
    ]);
    expect(columns[1].activeTabId).toBe("translation:tr");
  });
});
