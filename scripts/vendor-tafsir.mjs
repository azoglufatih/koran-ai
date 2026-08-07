// Regenerates the vendored tafsir under public/content/tafsir/ and the edition registry at
// src/content/data/tafsir-editions.json.
// The output is committed, so this only needs re-running when adding a language or picking a
// different tafsir. Usage: npm run vendor:tafsir
//
// Tafsir is served from public/ rather than bundled, for the same reason translations are: a
// Tafsir Tab is opened at runtime, so its commentary is fetched on demand.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Al-Mukhtasar is published by Tarteel's Quranic Universal Library, which serves its exports from
// behind a sign-in; spa5k/tafsir_api mirrors those exports verbatim as per-Surah JSON on a CDN,
// and names the QUL resource each edition came from. `qulResource` below is that resource, and is
// what the UI links to when crediting the commentary.
const API = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir";

// English and Turkish only — no redistribution-safe German tafsir is known, so a German Tafsir Tab
// is an explicit gap rather than a missing edition here (see getTafsir in the content repository).
const EDITIONS = [
  {
    source: "al-mukhtasar",
    language: "en",
    name: "Al-Mukhtasar",
    edition: "en-tafsir-al-mukhtasar",
    qulResource: 266,
  },
  {
    source: "al-mukhtasar",
    language: "tr",
    name: "Muhtasar Tefsir",
    edition: "turkish-mokhtasar",
    qulResource: 258,
  },
];

// Required by the tafsir's CC BY 4.0 licence, and spelled out here rather than taken from the
// upstream catalogue, which writes it without the apostrophe in "Qur'anic".
const ATTRIBUTION = "Tafsir Center for Qur'anic Studies";

// Fetching all 114 Surahs of an edition at once would hammer the CDN; a small window is plenty.
const CONCURRENT_REQUESTS = 8;

const MARKUP = /<[^>]+>/;

const dataDir = fileURLToPath(new URL("../src/content/data/", import.meta.url));
const outDir = fileURLToPath(new URL("../public/content/tafsir/", import.meta.url));

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return response.json();
}

const surahIndex = JSON.parse(await readFile(`${dataDir}surah-index.json`, "utf8"));

// One commentary per Ayah, in Ayah order, checked against the vendored Arabic — the Tafsir Tab
// addresses commentary by Ayah number, so an edition that skips or reorders one would attach an
// Ayah's tafsir to its neighbour.
function ayahTexts(entries, { number, ayahCount }, edition) {
  if (entries.length !== ayahCount) {
    throw new Error(`${edition}: Surah ${number} has ${entries.length} Ayahs, Arabic has ${ayahCount}`);
  }

  return entries.map(({ ayah, text }, index) => {
    if (ayah !== index + 1) throw new Error(`${edition}: out-of-order Ayah ${number}:${ayah}`);
    if (typeof text !== "string" || text.trim() === "") {
      throw new Error(`${edition}: empty commentary at ${number}:${ayah}`);
    }
    // The Tab renders commentary as text, so markup would reach the reader as literal tags.
    if (MARKUP.test(text)) throw new Error(`${edition}: markup in commentary at ${number}:${ayah}`);
    return text;
  });
}

async function vendorSurahs({ source, language, edition }) {
  const queue = [...surahIndex];
  const writers = Array.from({ length: CONCURRENT_REQUESTS }, async () => {
    for (let summary = queue.shift(); summary; summary = queue.shift()) {
      const entries = await fetchJson(`${API}/${edition}/${summary.number}.json`);
      const texts = ayahTexts(entries, summary, edition);
      await writeFile(
        `${outDir}${source}/${language}/${summary.number}.json`,
        `${JSON.stringify(texts)}\n`,
      );
    }
  });
  await Promise.all(writers);
}

await rm(outDir, { recursive: true, force: true });

const registry = [];
for (const { source, language, name, edition, qulResource } of EDITIONS) {
  await mkdir(`${outDir}${source}/${language}/`, { recursive: true });
  await vendorSurahs({ source, language, edition });

  registry.push({
    source,
    language,
    name,
    attribution: ATTRIBUTION,
    attributionUrl: `https://qul.tarteel.ai/resources/tafsir/${qulResource}`,
  });
  console.log(`${language}: ${edition} — ${surahIndex.length} Surahs`);
}

await writeFile(`${dataDir}tafsir-editions.json`, `${JSON.stringify(registry, null, 2)}\n`);

console.log(`Wrote ${registry.length} tafsir editions to ${outDir}`);
