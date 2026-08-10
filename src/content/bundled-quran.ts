import surahIndex from "./data/surah-index.json";
import tafsirEditions from "./data/tafsir-editions.json";
import translationEditions from "./data/translation-editions.json";
import transliterationSchemes from "./data/transliteration-schemes.json";
import { createQuranContentRepository } from "./quran-content-repository";
import { fetchTafsirText } from "./tafsir-fetch";
import { fetchTranslationText } from "./translation-fetch";
import { fetchTransliterationText } from "./transliteration-fetch";
import type {
  SurahSummary,
  TafsirEdition,
  TranslationEdition,
  TransliterationSchemeInfo,
} from "./quran";

// The vendored corpus is generated and validated by scripts/vendor-quran-data.mjs,
// scripts/vendor-translations.mjs, scripts/vendor-transliteration.mjs and scripts/vendor-tafsir.mjs.
export const quranContent = createQuranContentRepository({
  surahIndex: surahIndex as SurahSummary[],
  translationEditions: translationEditions as TranslationEdition[],
  transliterationSchemes: transliterationSchemes as TransliterationSchemeInfo[],
  tafsirEditions: tafsirEditions as TafsirEdition[],
  loadSurahText: async (surahNumber) => (await import(`./data/text/${surahNumber}.json`)).default,
  loadTranslationText: fetchTranslationText,
  loadTransliterationText: fetchTransliterationText,
  loadTafsirText: fetchTafsirText,
});
