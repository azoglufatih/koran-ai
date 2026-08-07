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
