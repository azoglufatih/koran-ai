// Regenerates the vendored Quran corpus under src/content/data/.
// The output is committed, so this only needs re-running when Tanzil publishes a correction.
// Usage: npm run vendor:quran

import { mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const TANZIL_TEXT_URL =
  "https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true";
const SURAH_META_URL = "https://api.alquran.cloud/v1/meta";

const TOTAL_SURAHS = 114;
const TOTAL_AYAHS = 6236;

// Tanzil ships the opening basmala prepended to Ayah 1 of every Surah except 1 (where it is
// Ayah 1 in its own right) and 9 (which has none). We lift it onto the Surah so Ayah 1 stays
// alignable with translations, which never carry it. Basmala + Ayah 1 still reproduces Tanzil
// verbatim — nothing is rewritten.
const SURAHS_WITHOUT_LIFTED_BASMALA = new Set([1, 9]);

const outDir = fileURLToPath(new URL("../src/content/data/", import.meta.url));

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return response.text();
}

function parseTanzil(raw) {
  const bySurah = new Map();
  let count = 0;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const [surah, ayah, ...rest] = trimmed.split("|");
    const text = rest.join("|");
    if (!text) throw new Error(`Malformed Tanzil line: ${line}`);

    const surahNumber = Number(surah);
    const ayahNumber = Number(ayah);
    if (!bySurah.has(surahNumber)) bySurah.set(surahNumber, []);

    const ayahs = bySurah.get(surahNumber);
    if (ayahs.length !== ayahNumber - 1) {
      throw new Error(`Out-of-order Ayah ${surahNumber}:${ayahNumber}`);
    }
    ayahs.push(text);
    count += 1;
  }

  if (count !== TOTAL_AYAHS) throw new Error(`Expected ${TOTAL_AYAHS} Ayahs, got ${count}`);
  if (bySurah.size !== TOTAL_SURAHS) throw new Error(`Expected ${TOTAL_SURAHS} Surahs, got ${bySurah.size}`);
  return bySurah;
}

// Tanzil's basmala is not byte-identical across Surahs — Surah 95 carries an extra shadda, for
// one — so match on the consonant skeleton and keep each Surah's own vocalised form.
const DIACRITIC_CLASS = "[\\u0640\\u064B-\\u065F\\u0670\\u06D6-\\u06ED]";
const DIACRITICS = new RegExp(DIACRITIC_CLASS, "g");
const DIACRITIC = new RegExp(DIACRITIC_CLASS);

function basmalaPrefixLength(text, basmalaSkeleton) {
  let skeleton = "";
  for (let i = 0; i < text.length; i += 1) {
    skeleton += text[i].replace(DIACRITICS, "");
    if (!basmalaSkeleton.startsWith(skeleton)) return -1;
    if (skeleton !== basmalaSkeleton) continue;

    // The skeleton completes on the final letter; its trailing diacritics still belong to it.
    let end = i + 1;
    while (end < text.length && DIACRITIC.test(text[end])) end += 1;
    return end;
  }
  return -1;
}

function liftBasmala(bySurah) {
  const basmalaSkeleton = bySurah.get(1)[0].replace(DIACRITICS, "");
  const lifted = new Map();

  for (const [number, ayahs] of bySurah) {
    if (SURAHS_WITHOUT_LIFTED_BASMALA.has(number)) continue;

    const length = basmalaPrefixLength(ayahs[0], basmalaSkeleton);
    if (length === -1 || ayahs[0][length] !== " ") {
      throw new Error(`Surah ${number} does not open with a recognisable basmala`);
    }

    lifted.set(number, ayahs[0].slice(0, length));
    ayahs[0] = ayahs[0].slice(length + 1);
  }

  const expected = TOTAL_SURAHS - SURAHS_WITHOUT_LIFTED_BASMALA.size;
  if (lifted.size !== expected) {
    throw new Error(`Expected ${expected} Surahs with a lifted basmala, got ${lifted.size}`);
  }
  return lifted;
}

function buildIndex(meta, bySurah, liftedBasmala) {
  return meta.data.surahs.references.map((surah) => {
    const ayahs = bySurah.get(surah.number);
    if (ayahs.length !== surah.numberOfAyahs) {
      throw new Error(
        `Surah ${surah.number}: metadata says ${surah.numberOfAyahs} Ayahs, text has ${ayahs.length}`,
      );
    }
    return {
      number: surah.number,
      arabicName: surah.name,
      transliteratedName: surah.englishName,
      translatedName: surah.englishNameTranslation,
      ayahCount: surah.numberOfAyahs,
      revelationPlace: surah.revelationType === "Meccan" ? "meccan" : "medinan",
      openingBasmala: liftedBasmala.get(surah.number) ?? null,
    };
  });
}

const [rawText, rawMeta] = await Promise.all([
  fetchText(TANZIL_TEXT_URL),
  fetchText(SURAH_META_URL),
]);

const bySurah = parseTanzil(rawText);
const liftedBasmala = liftBasmala(bySurah);
const index = buildIndex(JSON.parse(rawMeta), bySurah, liftedBasmala);

await rm(outDir, { recursive: true, force: true });
await mkdir(new URL("text/", `file://${outDir}`), { recursive: true });

await writeFile(`${outDir}surah-index.json`, `${JSON.stringify(index, null, 2)}\n`);
for (const [number, ayahs] of bySurah) {
  await writeFile(`${outDir}text/${number}.json`, `${JSON.stringify(ayahs, null, 2)}\n`);
}

console.log(`Wrote ${index.length} Surahs / ${TOTAL_AYAHS} Ayahs to ${outDir}`);
