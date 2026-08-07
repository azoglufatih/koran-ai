import surahIndex from "./data/surah-index.json";
import tafsirEditions from "./data/tafsir-editions.json";
import translationEditions from "./data/translation-editions.json";
import { createQuranContentRepository } from "./quran-content-repository";
import { fetchTafsirText } from "./tafsir-fetch";
import { fetchTranslationText } from "./translation-fetch";
import type { SurahSummary, TafsirEdition, TranslationEdition } from "./quran";

// The vendored corpus is generated and validated by scripts/vendor-quran-data.mjs,
// scripts/vendor-translations.mjs and scripts/vendor-tafsir.mjs.
export const quranContent = createQuranContentRepository({
  surahIndex: surahIndex as SurahSummary[],
  translationEditions: translationEditions as TranslationEdition[],
  tafsirEditions: tafsirEditions as TafsirEdition[],
  loadSurahText: async (surahNumber) => (await import(`./data/text/${surahNumber}.json`)).default,
  loadTranslationText: fetchTranslationText,
  loadTafsirText: fetchTafsirText,
});
