import type { Ayah, AyahRef, Surah, SurahSummary } from "./quran";

export type SurahTextLoader = (surahNumber: number) => Promise<readonly string[]>;

export interface QuranContentRepository {
  listSurahs(): SurahSummary[];
  getSurahSummary(surahNumber: number): SurahSummary | undefined;
  getSurah(surahNumber: number): Promise<Surah>;
  getAyah(ref: AyahRef): Promise<Ayah>;
}

export function createQuranContentRepository(
  surahIndex: readonly SurahSummary[],
  loadSurahText: SurahTextLoader,
): QuranContentRepository {
  const summaries = new Map(surahIndex.map((summary) => [summary.number, summary]));

  const getSurahSummary = (surahNumber: number) => summaries.get(surahNumber);

  async function getSurah(surahNumber: number): Promise<Surah> {
    const summary = getSurahSummary(surahNumber);
    if (!summary) throw new RangeError(`Surah ${surahNumber} is not in the corpus`);
    const text = await loadSurahText(surahNumber);
    return {
      summary,
      ayahs: text.map((arabicText, index) => ({
        ref: { surah: surahNumber, ayah: index + 1 },
        arabicText,
      })),
    };
  }

  return {
    listSurahs: () => [...surahIndex],
    getSurahSummary,
    getSurah,
    async getAyah(ref) {
      const { ayahs } = await getSurah(ref.surah);
      const ayah = ayahs[ref.ayah - 1];
      if (!ayah) throw new RangeError(`Ayah ${ref.surah}:${ref.ayah} is not in the corpus`);
      return ayah;
    },
  };
}
