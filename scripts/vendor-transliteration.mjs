// Regenerates the vendored Transliterations under public/content/transliteration/ and the scheme
// registry at src/content/data/transliteration-schemes.json.
// The output is committed, so this only needs re-running when adding a scheme or picking a
// different edition. Usage: npm run vendor:transliteration
//
// Transliterations are served from public/ rather than bundled with the Arabic, which is the one
// decision here worth reading about first: docs/adr/0005-transliteration-as-fetched-corpus.md,
// including the offline consequence it knowingly accepts.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const API = "https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1";

/**
 * The three schemes a reader can pick between. `label` names the scheme to a reader and `sample` is
 * its 1:2 — which is the only honest way to tell them apart, since what separates them is how they
 * spell rather than what they say.
 *
 * A fourth upstream edition, `ara-quran-la`, is deliberately left out: it encodes ayn as `AA`, a
 * machine artifact that a reader sounding the word out would read as "ay-ay" (ADR 0005).
 */
const SCHEMES = [
  {
    scheme: "ara-quranphoneticst",
    label: "Phonetic",
    sample: "Al-Ĥamdu Lillāhi Rabbi Al-`Ālamīna",
  },
  { scheme: "ara-quran-la1", label: "Simple", sample: "Alhamdu lillaahi Rabbil 'aalameen" },
  { scheme: "tur-latinalphabet", label: "Türkçe", sample: "El hamdü lillahi rabbil alemin" },
];

const TOTAL_AYAHS = 6236;

const dataDir = fileURLToPath(new URL("../src/content/data/", import.meta.url));
const outDir = fileURLToPath(new URL("../public/content/transliteration/", import.meta.url));

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return response.json();
}

const surahIndex = JSON.parse(await readFile(`${dataDir}surah-index.json`, "utf8"));
const ayahCounts = new Map(surahIndex.map((surah) => [surah.number, surah.ayahCount]));

// Group a flat edition (all 6236 Ayahs, in order) into one array of texts per Surah, checking as we
// go that it lines up with the vendored Arabic — a Transliteration sits under the Ayah it spells,
// so an edition that skipped one would put every line after it under the wrong Ayah.
// `chapter` and `verse` are upstream's field names for Surah and Ayah.
function groupBySurah(ayahs, scheme) {
  if (ayahs.length !== TOTAL_AYAHS) {
    throw new Error(`${scheme}: expected ${TOTAL_AYAHS} Ayahs, got ${ayahs.length}`);
  }

  const bySurah = new Map();
  for (const { chapter: surah, verse: ayah, text } of ayahs) {
    if (!bySurah.has(surah)) bySurah.set(surah, []);
    const texts = bySurah.get(surah);
    if (texts.length !== ayah - 1) {
      throw new Error(`${scheme}: out-of-order Ayah ${surah}:${ayah}`);
    }
    if (typeof text !== "string" || text.trim() === "") {
      throw new Error(`${scheme}: empty text at ${surah}:${ayah}`);
    }
    texts.push(text);
  }

  for (const [number, texts] of bySurah) {
    const expected = ayahCounts.get(number);
    if (texts.length !== expected) {
      throw new Error(`${scheme}: Surah ${number} has ${texts.length} Ayahs, Arabic has ${expected}`);
    }
  }
  if (bySurah.size !== ayahCounts.size) {
    throw new Error(`${scheme}: expected ${ayahCounts.size} Surahs, got ${bySurah.size}`);
  }
  return bySurah;
}

const catalogue = await fetchJson(`${API}/editions.json`);
const byName = new Map(Object.values(catalogue).map((entry) => [entry.name, entry]));

await rm(outDir, { recursive: true, force: true });

const registry = [];
for (const { scheme, label, sample } of SCHEMES) {
  if (!byName.has(scheme)) throw new Error(`Edition ${scheme} is not in the upstream catalogue`);

  const { quran } = await fetchJson(`${API}/editions/${scheme}.json`);
  const bySurah = groupBySurah(quran, scheme);

  // The sample is what the picker shows to say how a scheme reads, and it is written by hand here
  // rather than read off the edition — so check it still is that edition's 1:2. The 112 Surahs
  // whose basmala sits outside their numbered Ayahs take theirs from 1:1 the same way, which is why
  // both are named in the line logged below.
  const [basmala, opening] = bySurah.get(1);
  if (opening !== sample) {
    throw new Error(`${scheme}: 1:2 reads "${opening}", but the sample here says "${sample}"`);
  }

  await mkdir(`${outDir}${scheme}/`, { recursive: true });
  for (const [number, texts] of bySurah) {
    await writeFile(`${outDir}${scheme}/${number}.json`, `${JSON.stringify(texts)}\n`);
  }

  registry.push({ scheme, label, sample });
  console.log(`${scheme} (${label}) — ${bySurah.size} Surahs, basmala "${basmala}"`);
}

await writeFile(
  `${dataDir}transliteration-schemes.json`,
  `${JSON.stringify(registry, null, 2)}\n`,
);

console.log(`Wrote ${registry.length} transliteration schemes to ${outDir}`);
