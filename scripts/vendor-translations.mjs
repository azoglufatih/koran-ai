// Regenerates the vendored translations under public/content/translations/ and the edition
// registry at src/content/data/translation-editions.json.
// The output is committed, so this only needs re-running when adding a language or picking a
// different edition. Usage: npm run vendor:translations
//
// Translations are served from public/ rather than bundled: a Translation Tab is opened at
// runtime, so its text has to be fetchable lazily rather than baked into the page.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const API = "https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1";

// The launch languages from the MVP spec. `label` is the endonym, so a reader recognises their
// own language in the Tab strip; `edition` is the fawazahmed0/quran-api edition it comes from.
// `translator` is spelled out here rather than taken from the upstream catalogue, which strips
// diacritics from names ("Diyanet Isleri") — attribution should carry the name as written.
const EDITIONS = [
  {
    language: "en",
    label: "English",
    edition: "eng-mohammedmarmadu",
    translator: "Marmaduke Pickthall",
  },
  { language: "tr", label: "Türkçe", edition: "tur-diyanetisleri", translator: "Diyanet İşleri" },
  {
    language: "de",
    label: "Deutsch",
    edition: "deu-aburidamuhammad",
    translator: "Abu Rida Muhammad ibn Ahmad ibn Rassoul",
  },
];

const TOTAL_AYAHS = 6236;

const dataDir = fileURLToPath(new URL("../src/content/data/", import.meta.url));
const outDir = fileURLToPath(new URL("../public/content/translations/", import.meta.url));

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return response.json();
}

const surahIndex = JSON.parse(await readFile(`${dataDir}surah-index.json`, "utf8"));
const ayahCounts = new Map(surahIndex.map((surah) => [surah.number, surah.ayahCount]));

// Group a flat edition (all 6236 Ayahs, in order) into one array of texts per Surah, checking as
// we go that it lines up with the vendored Arabic — Verse Context pairs the two by Ayah number.
// `chapter` and `verse` are upstream's field names for Surah and Ayah.
function groupBySurah(ayahs, edition) {
  if (ayahs.length !== TOTAL_AYAHS) {
    throw new Error(`${edition}: expected ${TOTAL_AYAHS} Ayahs, got ${ayahs.length}`);
  }

  const bySurah = new Map();
  for (const { chapter: surah, verse: ayah, text } of ayahs) {
    if (!bySurah.has(surah)) bySurah.set(surah, []);
    const texts = bySurah.get(surah);
    if (texts.length !== ayah - 1) {
      throw new Error(`${edition}: out-of-order Ayah ${surah}:${ayah}`);
    }
    if (typeof text !== "string" || text.trim() === "") {
      throw new Error(`${edition}: empty text at ${surah}:${ayah}`);
    }
    texts.push(text);
  }

  for (const [number, texts] of bySurah) {
    const expected = ayahCounts.get(number);
    if (texts.length !== expected) {
      throw new Error(`${edition}: Surah ${number} has ${texts.length} Ayahs, Arabic has ${expected}`);
    }
  }
  if (bySurah.size !== ayahCounts.size) {
    throw new Error(`${edition}: expected ${ayahCounts.size} Surahs, got ${bySurah.size}`);
  }
  return bySurah;
}

const catalogue = await fetchJson(`${API}/editions.json`);
const byName = new Map(Object.values(catalogue).map((entry) => [entry.name, entry]));

await rm(outDir, { recursive: true, force: true });

const registry = [];
for (const { language, label, edition, translator } of EDITIONS) {
  if (!byName.has(edition)) throw new Error(`Edition ${edition} is not in the upstream catalogue`);

  const { quran } = await fetchJson(`${API}/editions/${edition}.json`);
  const bySurah = groupBySurah(quran, edition);

  await mkdir(`${outDir}${language}/`, { recursive: true });
  for (const [number, texts] of bySurah) {
    await writeFile(`${outDir}${language}/${number}.json`, `${JSON.stringify(texts)}\n`);
  }

  registry.push({ language, label, translator });
  console.log(`${language}: ${edition} by ${translator} — ${bySurah.size} Surahs`);
}

await writeFile(
  `${dataDir}translation-editions.json`,
  `${JSON.stringify(registry, null, 2)}\n`,
);

console.log(`Wrote ${registry.length} translations to ${outDir}`);
