import type {
  Ayah,
  AyahRef,
  Surah,
  SurahSummary,
  SurahTafsir,
  SurahTranslation,
  TafsirEdition,
  TafsirSource,
  TranslationEdition,
  TranslationLanguage,
} from "./quran";

export type SurahTextLoader = (surahNumber: number) => Promise<readonly string[]>;

export type TranslationTextLoader = (
  surahNumber: number,
  language: TranslationLanguage,
) => Promise<readonly string[]>;

export type TafsirTextLoader = (
  surahNumber: number,
  source: TafsirSource,
  language: TranslationLanguage,
) => Promise<readonly string[]>;

export interface QuranContentRepository {
  listSurahs(): SurahSummary[];
  getSurahSummary(surahNumber: number): SurahSummary | undefined;
  getSurah(surahNumber: number): Promise<Surah>;
  getAyah(ref: AyahRef): Promise<Ayah>;
  listTranslationEditions(): TranslationEdition[];
  getTranslation(surahNumber: number, language: TranslationLanguage): Promise<SurahTranslation>;
  /** Only the editions that exist — a language absent here has no tafsir in this corpus. */
  listTafsirEditions(): TafsirEdition[];
  getTafsir(
    surahNumber: number,
    source: TafsirSource,
    language: TranslationLanguage,
  ): Promise<SurahTafsir>;
}

export interface QuranContentSources {
  surahIndex: readonly SurahSummary[];
  translationEditions: readonly TranslationEdition[];
  tafsirEditions: readonly TafsirEdition[];
  loadSurahText: SurahTextLoader;
  loadTranslationText: TranslationTextLoader;
  loadTafsirText: TafsirTextLoader;
}

const tafsirEditionKey = (source: TafsirSource, language: TranslationLanguage) =>
  `${source}:${language}`;

export function createQuranContentRepository({
  surahIndex,
  translationEditions,
  tafsirEditions,
  loadSurahText,
  loadTranslationText,
  loadTafsirText,
}: QuranContentSources): QuranContentRepository {
  const summaries = new Map(surahIndex.map((summary) => [summary.number, summary]));
  const editions = new Map(translationEditions.map((edition) => [edition.language, edition]));
  const commentaries = new Map(
    tafsirEditions.map((edition) => [tafsirEditionKey(edition.source, edition.language), edition]),
  );

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
    listTafsirEditions: () => [...tafsirEditions],
    async getTafsir(surahNumber, source, language) {
      const summary = requireSummary(surahNumber);
      const edition = commentaries.get(tafsirEditionKey(source, language));
      // A tafsir the corpus has no edition of in this language is a known gap, not a failure —
      // callers get something they can render as such rather than an exception to catch.
      if (!edition) return { available: false, source, language };

      const text = await loadTafsirText(surahNumber, source, language);
      // Commentary is addressed per Ayah, so a drifting edition would attach an Ayah's tafsir to
      // its neighbour — the same correctness bug a drifting translation is.
      if (text.length !== summary.ayahCount) {
        throw new RangeError(
          `Surah ${surahNumber}: expected ${summary.ayahCount} commented Ayahs, got ${text.length}`,
        );
      }

      return {
        available: true,
        edition,
        ayahs: text.map((commentary, index) => ({
          ref: { surah: surahNumber, ayah: index + 1 },
          text: commentary,
        })),
      };
    },
  };
}
