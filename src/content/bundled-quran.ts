import surahIndex from "./data/surah-index.json";
import translationEditions from "./data/translation-editions.json";
import { createQuranContentRepository } from "./quran-content-repository";
import { fetchTranslationText } from "./translation-fetch";
import type { SurahSummary, TranslationEdition } from "./quran";

// The vendored corpus is generated and validated by scripts/vendor-quran-data.mjs and
// scripts/vendor-translations.mjs.
export const quranContent = createQuranContentRepository({
  surahIndex: surahIndex as SurahSummary[],
  translationEditions: translationEditions as TranslationEdition[],
  loadSurahText: async (surahNumber) => (await import(`./data/text/${surahNumber}.json`)).default,
  loadTranslationText: fetchTranslationText,
});
