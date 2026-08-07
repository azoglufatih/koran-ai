export type RevelationPlace = "meccan" | "medinan";

export interface SurahSummary {
  number: number;
  arabicName: string;
  transliteratedName: string;
  translatedName: string;
  ayahCount: number;
  revelationPlace: RevelationPlace;
  /**
   * The Surah's opening basmala, which sits outside its numbered Ayahs. Null for Al-Faatiha,
   * where the basmala is Ayah 1, and At-Tawba, which has none.
   */
  openingBasmala: string | null;
}

export interface AyahRef {
  surah: number;
  ayah: number;
}

export interface Ayah {
  ref: AyahRef;
  arabicText: string;
}

export interface Surah {
  summary: SurahSummary;
  ayahs: Ayah[];
}

/** The languages a Translation Tab can be opened in. */
export const TRANSLATION_LANGUAGES = ["en", "tr", "de"] as const;

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];

export interface TranslationEdition {
  language: TranslationLanguage;
  /** The language's endonym, so a reader recognises their own language in the Tab strip. */
  label: string;
  translator: string;
}

export interface TranslatedAyah {
  ref: AyahRef;
  text: string;
}

export interface SurahTranslation {
  edition: TranslationEdition;
  ayahs: TranslatedAyah[];
}

/** The tafsirs a Tafsir Tab can be opened in. Al-Mukhtasar is the only one so far. */
export const TAFSIR_SOURCES = ["al-mukhtasar"] as const;

export type TafsirSource = (typeof TAFSIR_SOURCES)[number];

/**
 * One tafsir source in one language. Tafsir is keyed by the same reader languages as translations,
 * but is not available in all of them — see `SurahTafsir`.
 */
export interface TafsirEdition {
  source: TafsirSource;
  language: TranslationLanguage;
  /** The tafsir's name in this language, as it should be shown and credited. */
  name: string;
  /** Who the commentary is credited to, as required by its licence. */
  attribution: string;
  attributionUrl: string;
}

export interface TafsirAyah {
  ref: AyahRef;
  text: string;
}

/**
 * A Surah's commentary, or an explicit statement that this source has no edition in this language
 * — a known gap (German has no redistribution-safe tafsir), not an error the reader should see as
 * a failure.
 */
export type SurahTafsir =
  | { available: true; edition: TafsirEdition; ayahs: TafsirAyah[] }
  | { available: false; source: TafsirSource; language: TranslationLanguage };
