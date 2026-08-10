import { quranContent } from "@/content/bundled-quran";
import {
  LANGUAGE_LABELS,
  TRANSLATION_LANGUAGES,
  type TranslationLanguage,
} from "@/content/quran";

/**
 * The languages the app can be read in — the whole vocabulary, not only those with a translation.
 * Translation and tafsir are both offered in every one of them, even where no edition exists, so a
 * reader learns the gap rather than never seeing their language on offer.
 */
export const readerLanguages: readonly TranslationLanguage[] = TRANSLATION_LANGUAGES;

/** A language's endonym, so a reader recognises their own language. */
export const languageLabel = (language: TranslationLanguage) =>
  LANGUAGE_LABELS[language] ?? language;

/**
 * The languages a translation has an edition in. Every other reader language is a known gap, which
 * the Translation Tab says so of — so the menu and the Tab explaining a gap agree on one list.
 */
export const translatedLanguages = (): TranslationLanguage[] =>
  quranContent.listTranslationEditions().map((edition) => edition.language);
