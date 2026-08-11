import { describe, expect, it, vi } from "vitest";
import type { TranslationLanguage } from "@/content/quran";
import { buildRetrievalIndex } from "./build-index.mjs";
import { createCorpusRetriever } from "./corpus-retriever";
import type { IndexedPassage, PassageRef } from "./retrieval-index";

const CORPUS: IndexedPassage[] = [
  {
    ref: { surah: 1, ayah: 1 },
    kind: "translation",
    text: "In the name of Allah, the Beneficent, the Merciful",
  },
  {
    ref: { surah: 2, ayah: 40 },
    kind: "translation",
    text: "O Children of Israel! Remember My favour",
  },
  {
    ref: { surah: 2, ayah: 40 },
    kind: "tafsir",
    text: "Allah reminds the Children of Israel of the favour He bestowed on their forefathers",
  },
];

const textOf = (passage: PassageRef) =>
  CORPUS.find(
    (indexed) =>
      indexed.kind === passage.kind &&
      indexed.ref.surah === passage.ref.surah &&
      indexed.ref.ayah === passage.ref.ayah,
  )?.text;

const retrieverOver = (
  overrides: Partial<Parameters<typeof createCorpusRetriever>[0]> = {},
) =>
  createCorpusRetriever({
    loadIndex: async (language: TranslationLanguage) => buildRetrievalIndex(language, CORPUS),
    readPassage: async (passage: PassageRef) => {
      const text = textOf(passage);
      if (!text) throw new Error("No such passage");
      return text;
    },
    ...overrides,
  });

describe("retrieve", () => {
  it("brings back the passages the question is written in the words of, with their text", async () => {
    const found = await retrieverOver({ limit: 2 }).retrieve("Children of Israel", "en");

    expect(found).toEqual([
      {
        ref: { surah: 2, ayah: 40 },
        kind: "translation",
        text: "O Children of Israel! Remember My favour",
      },
      {
        ref: { surah: 2, ayah: 40 },
        kind: "tafsir",
        text: CORPUS[2].text,
      },
    ]);
  });

  it("searches the shard for the language the reader asked in", async () => {
    const loadIndex = vi.fn(async (language: TranslationLanguage) =>
      buildRetrievalIndex(language, CORPUS),
    );

    await retrieverOver({ loadIndex }).retrieve("Israel", "tr");

    expect(loadIndex).toHaveBeenCalledWith("tr");
  });

  it("brings back no more passages than it was built to", async () => {
    const found = await retrieverOver({ limit: 1 }).retrieve("Children of Israel Allah", "en");

    expect(found).toHaveLength(1);
  });

  it("finds nothing for a question the corpus shares no words with", async () => {
    expect(await retrieverOver().retrieve("photosynthesis", "en")).toEqual([]);
  });
});

/**
 * "What does this mean?" shares wording with nothing, so the commentary on the very Ayah the reader
 * is asking about — the passage sitting closest to their question — is the one lexical search is
 * least likely to find. It is included because of what it is, not because it was searched for.
 */
describe("the Anchor Passage", () => {
  const anchoredOn2_40 = (question: string, overrides = {}) =>
    retrieverOver(overrides).retrieve(question, "en", { surah: 2, ayah: 40 });

  it("is the tafsir on the Ayah the question is about, whatever the question shares no words with", async () => {
    const found = await anchoredOn2_40("What does this mean?");

    expect(found).toEqual([{ ref: { surah: 2, ayah: 40 }, kind: "tafsir", text: CORPUS[2].text }]);
  });

  it("leads the passages the search found, being the one certain to bear on the question", async () => {
    const found = await anchoredOn2_40("In the name of Allah");

    expect(found[0]).toMatchObject({ ref: { surah: 2, ayah: 40 }, kind: "tafsir" });
    expect(found).toContainEqual({
      ref: { surah: 1, ayah: 1 },
      kind: "translation",
      text: CORPUS[0].text,
    });
  });

  it("is not brought back twice when the search finds it too", async () => {
    const found = await anchoredOn2_40("Children of Israel");

    expect(found.filter(({ kind }) => kind === "tafsir")).toHaveLength(1);
  });

  it("still counts against how many passages a question is grounded in", async () => {
    const found = await anchoredOn2_40("Children of Israel Allah", { limit: 2 });

    expect(found).toHaveLength(2);
  });

  // It is read straight out of the corpus, so a reader whose shard will not load is left with the
  // one passage most likely to answer them rather than with none.
  it("comes back even when the index will not load", async () => {
    const found = await anchoredOn2_40("What does this mean?", {
      loadIndex: async () => {
        throw new Error("Failed to fetch");
      },
    });

    expect(found.map(({ kind }) => kind)).toEqual(["tafsir"]);
  });

  // German has no tafsir edition, and a reader asking in a language the corpus has none in is a
  // question grounded in what search finds rather than a question that fails.
  it("is left out when the corpus has no commentary to read for it", async () => {
    const found = await anchoredOn2_40("Children of Israel", {
      readPassage: async (passage: PassageRef) => {
        if (passage.kind === "tafsir") throw new Error("No tafsir in this language");
        return textOf(passage) ?? "";
      },
    });

    expect(found).not.toHaveLength(0);
    expect(found.map(({ kind }) => kind)).not.toContain("tafsir");
  });
});

/**
 * Retrieval makes an answer better grounded; it is not what makes an answer possible. A reader
 * whose index will not load should still get their question answered from the Verse Context alone,
 * so every failure here ends in fewer passages rather than in no answer.
 */
describe("when the corpus cannot be read", () => {
  it("grounds in nothing rather than failing when the index will not load", async () => {
    const retriever = retrieverOver({
      loadIndex: async () => {
        throw new Error("Failed to fetch");
      },
    });

    expect(await retriever.retrieve("Children of Israel", "en")).toEqual([]);
  });

  it("leaves out a passage whose text will not load, and keeps the rest", async () => {
    const retriever = retrieverOver({
      limit: 2,
      readPassage: async (passage: PassageRef) => {
        if (passage.kind === "tafsir") throw new Error("Failed to fetch");
        return textOf(passage) ?? "";
      },
    });

    const found = await retriever.retrieve("Children of Israel", "en");

    expect(found.map((passage) => passage.kind)).toEqual(["translation"]);
  });
});

describe("the index a reader has already downloaded", () => {
  it("is loaded once, however many questions are asked in that language", async () => {
    const loadIndex = vi.fn(async (language: TranslationLanguage) =>
      buildRetrievalIndex(language, CORPUS),
    );
    const retriever = retrieverOver({ loadIndex });

    await retriever.retrieve("Israel", "en");
    await retriever.retrieve("Allah", "en");

    expect(loadIndex).toHaveBeenCalledTimes(1);
  });

  it("is not reused for a question asked in another language", async () => {
    const loadIndex = vi.fn(async (language: TranslationLanguage) =>
      buildRetrievalIndex(language, CORPUS),
    );
    const retriever = retrieverOver({ loadIndex });

    await retriever.retrieve("Israel", "en");
    await retriever.retrieve("Israel", "tr");

    expect(loadIndex.mock.calls.map(([language]) => language)).toEqual(["en", "tr"]);
  });

  it("is refused when it turns out to index another language", async () => {
    const retriever = retrieverOver({
      // What a stale cache or a mis-served file looks like: a shard, but not this reader's.
      loadIndex: async () => buildRetrievalIndex("de", CORPUS),
    });

    expect(await retriever.retrieve("Children of Israel", "en")).toEqual([]);
  });

  it("is asked for again after a load that failed, so a reader who was offline can retry", async () => {
    const loadIndex = vi
      .fn<(language: TranslationLanguage) => Promise<ReturnType<typeof buildRetrievalIndex>>>()
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockImplementation(async (language) => buildRetrievalIndex(language, CORPUS));
    const retriever = retrieverOver({ loadIndex });

    expect(await retriever.retrieve("Israel", "en")).toEqual([]);
    expect(await retriever.retrieve("Israel", "en")).not.toEqual([]);
  });
});
