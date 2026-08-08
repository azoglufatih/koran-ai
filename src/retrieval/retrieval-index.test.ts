import { describe, expect, it } from "vitest";
import { buildRetrievalIndex } from "./build-index.mjs";
import { searchIndex, type IndexedPassage, type RetrievalIndex } from "./retrieval-index";

const passage = (
  surah: number,
  ayah: number,
  kind: "translation" | "tafsir",
  text: string,
): IndexedPassage => ({ ref: { surah, ayah }, kind, text });

const CORPUS: IndexedPassage[] = [
  passage(1, 1, "translation", "In the name of Allah, the Beneficent, the Merciful"),
  passage(2, 40, "translation", "O Children of Israel! Remember My favour"),
  passage(
    2,
    40,
    "tafsir",
    "Allah reminds the Children of Israel of the favour He bestowed upon their forefathers",
  ),
  passage(55, 1, "translation", "The Beneficent"),
];

const index = buildRetrievalIndex("en", CORPUS);

/** What the reader is shown of a result — the Ayah and which rendering of it answered. */
const found = (results: ReturnType<typeof searchIndex>) =>
  results.map(({ ref, kind }) => `${ref.surah}:${ref.ayah} ${kind}`);

describe("searchIndex", () => {
  it("finds the passages written in the question's words", () => {
    expect(found(searchIndex(index, "Children of Israel", 2))).toEqual([
      "2:40 translation",
      "2:40 tafsir",
    ]);
  });

  it("ranks by the words that tell passages apart, not the ones every passage has", () => {
    // "the" is in three of the four passages and "favour" in only the two the question is about.
    expect(found(searchIndex(index, "the favour", 2)).sort()).toEqual([
      "2:40 tafsir",
      "2:40 translation",
    ]);
  });

  it("prefers the passage that answers to more of the question", () => {
    const [best] = searchIndex(index, "Beneficent Merciful", 4);

    expect(`${best.ref.surah}:${best.ref.ayah}`).toBe("1:1");
  });

  it("prefers the shorter of two passages that use a word equally often", () => {
    const brief = passage(1, 1, "translation", "mercy");
    const rambling = passage(2, 2, "translation", `mercy ${"and so on ".repeat(20)}`);
    const both = buildRetrievalIndex("en", [rambling, brief]);

    expect(found(searchIndex(both, "mercy", 2))).toEqual(["1:1 translation", "2:2 translation"]);
  });

  it("finds nothing for a question sharing no words with the corpus", () => {
    expect(searchIndex(index, "photosynthesis", 4)).toEqual([]);
  });

  it("finds nothing for a question with no words in it at all", () => {
    expect(searchIndex(index, " ?! ", 4)).toEqual([]);
  });

  it("returns no more passages than the caller asked for", () => {
    expect(searchIndex(index, "the of Allah", 2)).toHaveLength(2);
  });

  it("matches a question typed without the marks the corpus is printed with", () => {
    const turkish = buildRetrievalIndex("tr", [passage(2, 40, "translation", "İyilik ve ışık")]);

    expect(found(searchIndex(turkish, "iyilik isik", 2))).toEqual(["2:40 translation"]);
  });
});

describe("the index as it is shipped", () => {
  // The index reaches the browser as a static JSON file, so what survives JSON is the whole of it.
  const shipped = (built: RetrievalIndex) => JSON.parse(JSON.stringify(built)) as RetrievalIndex;

  it("searches the same after a round trip through JSON", () => {
    expect(found(searchIndex(shipped(index), "Children of Israel", 2))).toEqual(
      found(searchIndex(index, "Children of Israel", 2)),
    );
  });

  it("records how often a word occurs, not merely that it does", () => {
    const twice = passage(1, 1, "translation", "mercy upon mercy");
    const once = passage(2, 2, "translation", "mercy upon them");
    const both = shipped(buildRetrievalIndex("en", [once, twice]));

    expect(found(searchIndex(both, "mercy", 2))).toEqual(["1:1 translation", "2:2 translation"]);
  });

  it("leaves out words too common to tell any passage from another", () => {
    const everywhere = buildRetrievalIndex(
      "en",
      [1, 2, 3, 4].map((ayah) => passage(1, ayah, "translation", `the ${ayah}`)),
      { maxDocumentFrequency: 0.5 },
    );

    expect(Object.keys(everywhere.postings)).toEqual(["1", "2", "3", "4"]);
  });

  it("says which language it indexes, so a shard is never searched for another's question", () => {
    expect(index.language).toBe("en");
  });
});
