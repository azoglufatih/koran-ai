import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildRetrievalIndex } from "./build-index.mjs";
import type { CorpusRetriever } from "./corpus-retriever";
import type { IndexedPassage } from "./retrieval-index";

/**
 * The join between the index and the corpus it indexes — the one seam where an Ayah number can go
 * astray. Everything either side of it is tested against a stand-in for the other: the AI Client
 * against a retriever holding no index, the retriever against an index over no corpus. This is
 * what those two stand-ins are standing in for, tested against the files the build actually writes.
 */
const AL_IKHLAS = 112;

const TRANSLATION = [
  "Say: He is Allah, the One",
  "Allah, the eternally Besought of all",
  "He begetteth not nor was begotten",
  "And there is none comparable unto Him",
];

const TAFSIR = [
  "Say O Messenger: He is Allah, the only one deserving of worship",
  "Al-Samad, the One whom all creation turns to in its need",
  "He has no offspring, and no parent before Him",
  "Nothing whatsoever resembles Him among His creation",
];

const passagesOf = (texts: string[], kind: "translation" | "tafsir"): IndexedPassage[] =>
  texts.map((text, index) => ({ ref: { surah: AL_IKHLAS, ayah: index + 1 }, kind, text }));

const files = new Map<string, unknown>();

/** A fresh retriever each time, since the real one keeps every shard it has ever downloaded. */
async function freshRetriever(): Promise<CorpusRetriever> {
  vi.resetModules();
  return (await import("./browser-corpus-retriever")).corpusRetriever;
}

beforeEach(() => {
  files.clear();
  files.set(
    "/content/retrieval/en.json",
    buildRetrievalIndex("en", [
      ...passagesOf(TRANSLATION, "translation"),
      ...passagesOf(TAFSIR, "tafsir"),
    ]),
  );
  files.set(`/content/translations/en/${AL_IKHLAS}.json`, TRANSLATION);
  files.set(`/content/tafsir/al-mukhtasar/en/${AL_IKHLAS}.json`, TAFSIR);

  // Reading anything under public/ is a browser-only act, and says so by checking for a window.
  vi.stubGlobal("window", {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string) =>
      files.has(path)
        ? Response.json(files.get(path))
        : new Response("not found", { status: 404 }),
    ),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("retrieving from the shipped corpus", () => {
  it("reads the shard for the reader's language from where the build wrote it", async () => {
    await (await freshRetriever()).retrieve("Al-Samad", "en");

    expect(fetch).toHaveBeenCalledWith("/content/retrieval/en.json");
  });

  it("reads a translation back at the Ayah the index named it by", async () => {
    const found = await (await freshRetriever()).retrieve("begetteth", "en");

    expect(found[0]).toEqual({
      ref: { surah: AL_IKHLAS, ayah: 3 },
      kind: "translation",
      text: "He begetteth not nor was begotten",
    });
  });

  it("reads commentary back at the Ayah the index named it by", async () => {
    const found = await (await freshRetriever()).retrieve("Al-Samad", "en");

    expect(found[0]).toEqual({
      ref: { surah: AL_IKHLAS, ayah: 2 },
      kind: "tafsir",
      text: "Al-Samad, the One whom all creation turns to in its need",
    });
  });

  it("grounds in nothing at all when the shard was never built", async () => {
    files.delete("/content/retrieval/en.json");

    expect(await (await freshRetriever()).retrieve("Al-Samad", "en")).toEqual([]);
  });

  it("drops a passage the corpus no longer supplies, and keeps the rest", async () => {
    // An index built against commentary the app has since stopped shipping. One passage that will
    // not load is the others' worth of grounding, not none.
    files.delete(`/content/tafsir/al-mukhtasar/en/${AL_IKHLAS}.json`);

    const found = await (await freshRetriever()).retrieve("Allah", "en");

    expect(found.length).toBeGreaterThan(0);
    expect(found.map((passage) => passage.kind)).not.toContain("tafsir");
  });

  it("grounds in nothing when the reader's language has no translation to read back", async () => {
    // German is a reader language this repo ships no redistributable translation in, so even a
    // shard naming its passages has no text behind them.
    files.set(
      "/content/retrieval/de.json",
      buildRetrievalIndex("de", [
        {
          ref: { surah: AL_IKHLAS, ayah: 1 },
          kind: "translation",
          text: "Er ist Allah, ein Einziger",
        },
      ]),
    );

    expect(await (await freshRetriever()).retrieve("Einziger", "de")).toEqual([]);
  });
});
