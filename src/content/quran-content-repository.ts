import type {
  Ayah,
  AyahRef,
  Surah,
  SurahSummary,
  SurahTafsir,
  SurahTranslation,
  SurahTransliteration,
  TafsirEdition,
  TafsirSource,
  TranslationEdition,
  TranslationLanguage,
  TransliterationScheme,
  TransliterationSchemeInfo,
} from "./quran";

export type SurahTextLoader = (surahNumber: number) => Promise<readonly string[]>;

export type TranslationTextLoader = (
  surahNumber: number,
  language: TranslationLanguage,
) => Promise<readonly string[]>;

export type TransliterationTextLoader = (
  surahNumber: number,
  scheme: TransliterationScheme,
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
  listTransliterationSchemes(): TransliterationSchemeInfo[];
  getTransliteration(
    surahNumber: number,
    scheme: TransliterationScheme,
  ): Promise<SurahTransliteration>;
  /**
   * The opening basmala in Latin script — for the 112 Surahs whose basmala sits above their
   * numbered Ayahs, and so outside the 6236 the corpus covers.
   */
  getTransliteratedBasmala(scheme: TransliterationScheme): Promise<string>;
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
  transliterationSchemes: readonly TransliterationSchemeInfo[];
  tafsirEditions: readonly TafsirEdition[];
  loadSurahText: SurahTextLoader;
  loadTranslationText: TranslationTextLoader;
  loadTransliterationText: TransliterationTextLoader;
  loadTafsirText: TafsirTextLoader;
}

/**
 * Where the basmala the 112 Surahs open with is read from. It sits outside their numbered Ayahs, so
 * the corpus — 6236 numbered Ayahs and nothing else — has no entry for it; Al-Faatiha's Ayah 1 is
 * that same text, which is what every rendering of it here comes from (ADR 0005).
 */
const BASMALA: AyahRef = { surah: 1, ayah: 1 };

const tafsirEditionKey = (source: TafsirSource, language: TranslationLanguage) =>
  `${source}:${language}`;

export function createQuranContentRepository({
  surahIndex,
  translationEditions,
  transliterationSchemes,
  tafsirEditions,
  loadSurahText,
  loadTranslationText,
  loadTransliterationText,
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

  async function getTransliteration(
    surahNumber: number,
    scheme: TransliterationScheme,
  ): Promise<SurahTransliteration> {
    const summary = requireSummary(surahNumber);
    const text = await loadTransliterationText(surahNumber, scheme);
    // A Transliteration is shown beneath the Ayah it spells, so an edition that skipped one would
    // put every line after it under the wrong Arabic — the same correctness bug a drifting
    // translation is, and refused the same way rather than rendered.
    if (text.length !== summary.ayahCount) {
      throw new RangeError(
        `Surah ${surahNumber}: expected ${summary.ayahCount} transliterated Ayahs, got ${text.length}`,
      );
    }

    return {
      scheme,
      ayahs: text.map((transliterated, index) => ({
        ref: { surah: surahNumber, ayah: index + 1 },
        text: transliterated,
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
    listTransliterationSchemes: () => [...transliterationSchemes],
    getTransliteration,
    async getTransliteratedBasmala(scheme) {
      const { ayahs } = await getTransliteration(BASMALA.surah, scheme);
      const basmala = ayahs[BASMALA.ayah - 1];
      if (!basmala) throw new RangeError(`No transliterated basmala in "${scheme}"`);
      return basmala.text;
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
