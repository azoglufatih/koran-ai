// Turns the vendored corpus into the index the browser searches. Kept apart from
// scripts/build-retrieval-index.mjs, which is only the reading and writing of files around it, so
// that what the index actually contains can be tested.
//
// Plain JavaScript for the same reason retrieval-terms.mjs is: a build script runs this in Node,
// and the tests import it from TypeScript.
//
// What that costs, since it is easy to miss: KINDS below has to agree with the PassageKind union
// in retrieval-index.ts, and nothing checks that it does. The guard in the loop is what stands in
// for the type error TypeScript would have raised, so a kind added on one side and not the other
// fails while building the index rather than silently mis-labelling 12,000 passages.

import { termsIn } from "./retrieval-terms.mjs";

/**
 * @typedef {import("./retrieval-index").IndexedPassage} IndexedPassage
 * @typedef {import("./retrieval-index").IndexedDocument} IndexedDocument
 * @typedef {import("./retrieval-index").PassageKind} PassageKind
 * @typedef {import("./retrieval-index").Postings} Postings
 * @typedef {import("./retrieval-index").RetrievalIndex} RetrievalIndex
 * @typedef {import("../content/quran").TranslationLanguage} TranslationLanguage
 */

/** @type {PassageKind[]} */
const KINDS = ["translation", "tafsir"];

/**
 * Where a term occurs while the index is still being built up, before it is packed down for
 * shipping.
 *
 * @typedef {{ passages: number[], frequencies: number[] }} TermOccurrences
 */

/**
 * Positions packed as the gaps between them, and frequencies dropped when every one of them is 1.
 * Both are lossless: `searchIndex` runs the gaps back up into positions and reads a missing
 * frequency as 1.
 *
 * @param {TermOccurrences} occurrences
 * @returns {Postings}
 */
function packPostings({ passages, frequencies }) {
  let previous = 0;
  const gaps = passages.map((passage) => {
    const gap = passage - previous;
    previous = passage;
    return gap;
  });

  return frequencies.every((frequency) => frequency === 1) ? [gaps] : [gaps, frequencies];
}

/**
 * The retrieval index for one language's passages.
 *
 * `maxDocumentFrequency` is the share of the corpus a term may occur in before it is left out
 * altogether. A term in most passages tells them apart hardly at all, and those are exactly the
 * terms with the longest posting lists — dropping them is most of what keeps a shard small enough
 * to be worth fetching. Left at 1 by default, which keeps everything.
 *
 * @param {TranslationLanguage} language
 * @param {readonly IndexedPassage[]} passages
 * @param {{ maxDocumentFrequency?: number }} [options]
 * @returns {RetrievalIndex}
 */
export function buildRetrievalIndex(language, passages, { maxDocumentFrequency = 1 } = {}) {
  /** @type {IndexedDocument[]} */
  const documents = [];
  /** @type {Map<string, TermOccurrences>} */
  const occurrences = new Map();

  passages.forEach((passage, document) => {
    const kind = KINDS.indexOf(passage.kind);
    if (kind === -1) throw new Error(`Passage at ${document} has unknown kind "${passage.kind}"`);

    const terms = termsIn(passage.text);
    documents.push([passage.ref.surah, passage.ref.ayah, kind, terms.length]);

    /** @type {Map<string, number>} */
    const counts = new Map();
    for (const term of terms) counts.set(term, (counts.get(term) ?? 0) + 1);

    for (const [term, count] of counts) {
      let found = occurrences.get(term);
      if (!found) occurrences.set(term, (found = { passages: [], frequencies: [] }));
      found.passages.push(document);
      found.frequencies.push(count);
    }
  });

  /** @type {Record<string, Postings>} */
  const postings = {};
  const tooCommon = maxDocumentFrequency * documents.length;
  for (const [term, found] of occurrences) {
    if (found.passages.length > tooCommon) continue;
    postings[term] = packPostings(found);
  }

  return { language, kinds: KINDS, documents, postings };
}
