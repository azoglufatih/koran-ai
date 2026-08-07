import surahIndex from "./data/surah-index.json";
import { createQuranContentRepository } from "./quran-content-repository";
import type { SurahSummary } from "./quran";

// The vendored corpus is generated and validated by scripts/vendor-quran-data.mjs.
export const quranContent = createQuranContentRepository(
  surahIndex as SurahSummary[],
  async (surahNumber) => (await import(`./data/text/${surahNumber}.json`)).default,
);
