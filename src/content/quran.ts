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

/** Two refs point at the same Ayah — the same Ayah number in another Surah is a different Ayah. */
export const sameAyah = (a: AyahRef, b: AyahRef) => a.surah === b.surah && a.ayah === b.ayah;

/** The Quran's fixed extent — the one bound worth checking without loading any Surah to check it. */
const SURAH_COUNT = 114;

/**
 * An Ayah reference read back out of something untrusted — the reader's own browser storage, or
 * their own edit of it. A ref that isn't somewhere in the Quran would send them to a Surah that
 * does not exist, so it is treated as no ref at all.
 *
 * Whether the Ayah exists *within* its Surah is deliberately not checked: that needs the corpus,
 * and the storage seams that call this stay independent of it. A ref past the end of a real Surah
 * survives to whatever resolves it against the content repository.
 */
export function parseAyahRef(value: unknown): AyahRef | null {
  if (typeof value !== "object" || value === null) return null;
  const { surah, ayah } = value as Record<string, unknown>;

  if (!Number.isInteger(surah) || !Number.isInteger(ayah)) return null;
  if ((surah as number) < 1 || (surah as number) > SURAH_COUNT || (ayah as number) < 1) return null;

  return { surah: surah as number, ayah: ayah as number };
}

export interface Ayah {
  ref: AyahRef;
  arabicText: string;
}

export interface Surah {
  summary: SurahSummary;
  ayahs: Ayah[];
}

/**
 * The languages the app can be read in. Not every one has a translation — German has no edition
 * this repo may redistribute — but a language earns its place here by being one a reader is
 * offered, so the gap is something they can be told about rather than never see.
 */
export const TRANSLATION_LANGUAGES = ["en", "tr", "de"] as const;

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];

/** Whether a value read back out of storage names a language this version still ships. */
export const isTranslationLanguage = (value: unknown): value is TranslationLanguage =>
  TRANSLATION_LANGUAGES.includes(value as TranslationLanguage);

/**
 * Each language's endonym, so a reader recognises their own language in the Tab strip. Keyed by
 * language rather than carried on the edition: a language with no edition still has a name, and
 * that is exactly the language whose name the reader most needs to see.
 */
export const LANGUAGE_LABELS: Record<TranslationLanguage, string> = {
  en: "English",
  tr: "Türkçe",
  de: "Deutsch",
};

export interface TranslationEdition {
  language: TranslationLanguage;
  translator: string;
}

export interface TranslatedAyah {
  ref: AyahRef;
  text: string;
}

/**
 * A Surah's translation, or an explicit statement that this version ships no edition in this
 * language — a known gap (no German translation has a licence that allows redistribution), not an
 * error the reader should see as a failure. Shaped like `SurahTafsir` because it is the same
 * situation: a reader language the corpus does not reach into.
 */
export type SurahTranslation =
  | { available: true; edition: TranslationEdition; ayahs: TranslatedAyah[] }
  | { available: false; language: TranslationLanguage };

/**
 * The Latin-script schemes an Ayah's Transliteration can be read in. The first is the default for
 * every reader: unlike a translation, this is not detected from their browser's languages — a
 * Turkish reader who wants Turkish orthography picks it themselves.
 */
export const TRANSLITERATION_SCHEMES = [
  "ara-quranphoneticst",
  "ara-quran-la1",
  "tur-latinalphabet",
] as const;

export type TransliterationScheme = (typeof TRANSLITERATION_SCHEMES)[number];

export const [DEFAULT_TRANSLITERATION_SCHEME] = TRANSLITERATION_SCHEMES;

/** Whether a value read back out of storage names a scheme this version still ships. */
export const isTransliterationScheme = (value: unknown): value is TransliterationScheme =>
  TRANSLITERATION_SCHEMES.includes(value as TransliterationScheme);

export interface TransliterationSchemeInfo {
  scheme: TransliterationScheme;
  /** How the picker names the scheme. */
  label: string;
  /**
   * Ayah 1:2 in this scheme. What separates the schemes is how they spell rather than what they
   * say, so showing a line of one is the only honest way to offer a reader the choice.
   */
  sample: string;
}

export interface TransliteratedAyah {
  ref: AyahRef;
  text: string;
}

export interface SurahTransliteration {
  scheme: TransliterationScheme;
  ayahs: TransliteratedAyah[];
}

/** The tafsirs a Tafsir Tab can be opened in. Al-Mukhtasar is the only one so far. */
export const TAFSIR_SOURCES = ["al-mukhtasar"] as const;

export type TafsirSource = (typeof TAFSIR_SOURCES)[number];

/** Whether a value read back out of storage or off the page names a source this version ships. */
export const isTafsirSource = (value: unknown): value is TafsirSource =>
  TAFSIR_SOURCES.includes(value as TafsirSource);

/**
 * Each tafsir's name in a form that does not depend on which language's edition is open — what a
 * Commentary Selection is attributed to, both to the model and in the Grounding Notice (ADR 0007).
 * The editions carry their own names too ("Muhtasar Tefsir"), which is what a Tafsir Tab credits;
 * this is the one name that identifies the commentary whichever edition of it a reader has open.
 */
export const TAFSIR_SOURCE_NAMES: Record<TafsirSource, string> = {
  "al-mukhtasar": "Al-Mukhtasar fi Tafsir al-Quran al-Karim",
};

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
