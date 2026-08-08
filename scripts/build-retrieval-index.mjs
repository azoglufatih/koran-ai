// Regenerates the retrieval index under public/content/retrieval/ from the vendored translations
// and tafsir. One shard per translation language, holding that language's translation and — where
// an edition exists — its tafsir.
// The output is committed, so this only needs re-running when the corpus underneath it changes:
// after npm run vendor:translations or npm run vendor:tafsir. Usage: npm run build:retrieval-index
//
// Served from public/ rather than bundled, like the corpus it indexes: a shard is fetched the
// first time a reader asks a question, and a reader who never opens an AI Tab never pays for it.

import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildRetrievalIndex } from "../src/retrieval/build-index.mjs";

/**
 * The share of a language's passages a term may occur in before it is left out of the index.
 *
 * Terms above this — "the", "of", "and", and their equivalents in the other languages — are both
 * the longest posting lists in the index and the least able to tell one passage from another, so
 * dropping them costs a fifth of the file size and almost none of the retrieval quality.
 *
 * It buys quality outright, in fact: a reader's question is mostly the words they wrapped it in
 * ("what does the Quran say about…"), and while those score for little each, enough of them
 * together outweigh the one word the question is really about. Measured over the built corpus,
 * dropping at a twentieth is what turns "patience in hardship" from commentary that merely says
 * "hardship" into 2:45 and 94:5-6.
 */
const MAX_DOCUMENT_FREQUENCY = 0.05;

const dataDir = fileURLToPath(new URL("../src/content/data/", import.meta.url));
const contentDir = fileURLToPath(new URL("../public/content/", import.meta.url));
const outDir = `${contentDir}retrieval/`;

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const surahIndex = await readJson(`${dataDir}surah-index.json`);
const translationEditions = await readJson(`${dataDir}translation-editions.json`);
const tafsirEditions = await readJson(`${dataDir}tafsir-editions.json`);

/**
 * One rendering of the whole corpus, as passages. `texts` is checked against the vendored Arabic
 * the same way the vendor scripts check it: retrieval names the Ayah a passage belongs to, and an
 * edition that skipped one would send the reader to the wrong Ayah.
 */
async function passagesFrom(kind, pathFor) {
  const passages = [];
  for (const { number, ayahCount } of surahIndex) {
    const texts = await readJson(pathFor(number));
    if (texts.length !== ayahCount) {
      throw new Error(`${kind} of Surah ${number}: expected ${ayahCount} Ayahs, got ${texts.length}`);
    }
    texts.forEach((text, index) => {
      passages.push({ ref: { surah: number, ayah: index + 1 }, kind, text });
    });
  }
  return passages;
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const { language } of translationEditions) {
  const passages = await passagesFrom(
    "translation",
    (surah) => `${contentDir}translations/${language}/${surah}.json`,
  );

  // Tafsir is not published in every reader language — German has no redistribution-safe edition —
  // so a shard indexes whatever commentary that language actually has, which may be none.
  for (const { source } of tafsirEditions.filter((edition) => edition.language === language)) {
    passages.push(
      ...(await passagesFrom(
        "tafsir",
        (surah) => `${contentDir}tafsir/${source}/${language}/${surah}.json`,
      )),
    );
  }

  const index = buildRetrievalIndex(language, passages, {
    maxDocumentFrequency: MAX_DOCUMENT_FREQUENCY,
  });

  const path = `${outDir}${language}.json`;
  await writeFile(path, `${JSON.stringify(index)}\n`);

  const { size } = await stat(path);
  console.log(
    `${language}: ${passages.length} passages, ${Object.keys(index.postings).length} terms — ` +
      `${(size / 1024 / 1024).toFixed(1)} MB`,
  );
}

console.log(`Wrote ${translationEditions.length} shards to ${outDir}`);
