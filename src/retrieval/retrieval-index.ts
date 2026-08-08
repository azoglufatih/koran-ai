import type { AyahRef, TranslationLanguage } from "@/content/quran";
import { termsIn } from "./retrieval-terms.mjs";

/** Which rendering of an Ayah a passage is. The Arabic is not indexed — see `IndexedPassage`. */
export type PassageKind = "translation" | "tafsir";

/** One passage of the corpus, named by the Ayah it belongs to and which rendering of it it is. */
export interface PassageRef {
  ref: AyahRef;
  kind: PassageKind;
}

/**
 * A passage as the index is built from it. Only translations and tafsir are indexed: a reader's
 * question is written in their own language, and Arabic shares no words with it to be found by.
 */
export interface IndexedPassage extends PassageRef {
  text: string;
}

/** A passage a question found, and how strongly it answers to it. */
export interface RankedPassage extends PassageRef {
  score: number;
}

/**
 * A passage as the shipped index holds it: which Ayah, which rendering (an offset into `kinds`),
 * and how many terms long it is. A tuple rather than an object because there is one of these per
 * passage in the corpus, and field names repeated 12,000 times are most of the file.
 */
export type IndexedDocument = readonly [
  surah: number,
  ayah: number,
  kind: number,
  termCount: number,
];

/**
 * Which passages a term occurs in and how often. Passages are held as gaps between consecutive
 * positions rather than positions themselves, which keeps the numbers small; `frequencies` is left
 * off entirely for the many terms that occur once wherever they occur at all.
 */
export type Postings =
  | readonly [passages: readonly number[]]
  | readonly [passages: readonly number[], frequencies: readonly number[]];

/**
 * The retrieval index for one language, as built by scripts/build-retrieval-index.mjs and fetched
 * by the browser. One shard per language: a reader asks in one language, and searching the others
 * would only cost them the download.
 */
export interface RetrievalIndex {
  language: TranslationLanguage;
  kinds: readonly PassageKind[];
  documents: readonly IndexedDocument[];
  /** Keyed by folded term — see retrieval-terms.mjs. Terms too common to be worth it are absent. */
  postings: Record<string, Postings>;
}

/**
 * BM25's two dials, at the values it is conventionally used with. `SATURATION` is the point past
 * which repeating a word stops making a passage more about it; `LENGTH_BIAS` is how much a long
 * passage is discounted for having more room to mention the word by chance.
 */
const SATURATION = 1.2;
const LENGTH_BIAS = 0.75;

const averageTermCount = (documents: readonly IndexedDocument[]) =>
  documents.reduce((total, [, , , termCount]) => total + termCount, 0) / documents.length;

/**
 * How much a term's presence says about a passage. A word in nearly every passage separates none
 * of them and counts for almost nothing; a word in one passage all but names it.
 */
const rarity = (passageCount: number, total: number) =>
  Math.log(1 + (total - passageCount + 0.5) / (passageCount + 0.5));

/**
 * The passages that best answer to a question, best first.
 *
 * Term overlap is the whole of the judgement — this finds passages written in the reader's words,
 * not passages about their meaning (docs/adr/0003-static-lexical-retrieval-index.md). Repeats in
 * the question count once: asking about "mercy, mercy, mercy" is asking about mercy.
 */
export function searchIndex(
  index: RetrievalIndex,
  question: string,
  limit: number,
): RankedPassage[] {
  const asked = new Set(termsIn(question));
  if (asked.size === 0 || index.documents.length === 0) return [];

  const total = index.documents.length;
  const averageLength = averageTermCount(index.documents);
  const scores = new Map<number, number>();

  for (const term of asked) {
    const postings = index.postings[term];
    if (!postings) continue;

    const [passages, frequencies] = postings;
    const weight = rarity(passages.length, total);

    let document = 0;
    for (let position = 0; position < passages.length; position += 1) {
      document += passages[position];
      const occurrences = frequencies?.[position] ?? 1;
      const [, , , termCount] = index.documents[document];
      const length = 1 - LENGTH_BIAS + (LENGTH_BIAS * termCount) / averageLength;
      const saturated =
        (occurrences * (SATURATION + 1)) / (occurrences + SATURATION * length);

      scores.set(document, (scores.get(document) ?? 0) + weight * saturated);
    }
  }

  return [...scores]
    // Ties broken by position, so the same question asked twice ranks its answers the same way.
    .sort(([leftDocument, left], [rightDocument, right]) =>
      right === left ? leftDocument - rightDocument : right - left,
    )
    .slice(0, limit)
    .map(([document, score]) => {
      const [surah, ayah, kind] = index.documents[document];
      return { ref: { surah, ayah }, kind: index.kinds[kind], score };
    });
}
