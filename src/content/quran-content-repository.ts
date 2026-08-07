import type {
  Ayah,
  AyahRef,
  Surah,
  SurahSummary,
  SurahTranslation,
  TranslationEdition,
  TranslationLanguage,
} from "./quran";

export type SurahTextLoader = (surahNumber: number) => Promise<readonly string[]>;

export type TranslationTextLoader = (
  surahNumber: number,
  language: TranslationLanguage,
) => Promise<readonly string[]>;

export interface QuranContentRepository {
  listSurahs(): SurahSummary[];
  getSurahSummary(surahNumber: number): SurahSummary | undefined;
  getSurah(surahNumber: number): Promise<Surah>;
  getAyah(ref: AyahRef): Promise<Ayah>;
  listTranslationEditions(): TranslationEdition[];
  getTranslation(surahNumber: number, language: TranslationLanguage): Promise<SurahTranslation>;
}

export interface QuranContentSources {
  surahIndex: readonly SurahSummary[];
  translationEditions: readonly TranslationEdition[];
  loadSurahText: SurahTextLoader;
  loadTranslationText: TranslationTextLoader;
}

export function createQuranContentRepository({
  surahIndex,
  translationEditions,
  loadSurahText,
  loadTranslationText,
}: QuranContentSources): QuranContentRepository {
  const summaries = new Map(surahIndex.map((summary) => [summary.number, summary]));
  const editions = new Map(translationEditions.map((edition) => [edition.language, edition]));

  const getSurahSummary = (surahNumber: number) => summaries.get(surahNumber);

  function requireSummary(surahNumber: number): SurahSummary {
    const summary = getSurahSummary(surahNumber);
    if (!summary) throw new RangeError(`Surah ${surahNumber} is not in the corpus`);
    return summary;
  }

  async function getSurah(surahNumber: number): Promise<Surah> {
    const summary = requireSummary(surahNumber);
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
    listTranslationEditions: () => [...translationEditions],
    async getTranslation(surahNumber, language) {
      const summary = requireSummary(surahNumber);
      const edition = editions.get(language);
      if (!edition) throw new RangeError(`No translation edition for language "${language}"`);

      const text = await loadTranslationText(surahNumber, language);
      // Verse Context pairs Arabic and translation by Ayah number, so a drifting edition is a
      // correctness bug, not a display glitch — refuse it rather than render a misaligned Tab.
      if (text.length !== summary.ayahCount) {
        throw new RangeError(
          `Surah ${surahNumber}: expected ${summary.ayahCount} translated Ayahs, got ${text.length}`,
        );
      }

      return {
        edition,
        ayahs: text.map((translatedText, index) => ({
          ref: { surah: surahNumber, ayah: index + 1 },
          text: translatedText,
        })),
      };
    },
  };
}
