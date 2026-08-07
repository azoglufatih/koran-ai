import { TRANSLATION_LANGUAGES, type TranslationLanguage } from "./quran";

export const DEFAULT_TRANSLATION_LANGUAGE: TranslationLanguage = "en";

/**
 * Picks the language for the Translation Tab a first-time reader gets, from their browser's
 * preferred locales (`navigator.languages`).
 */
export function detectTranslationLanguage(
  preferredLocales: readonly string[],
): TranslationLanguage {
  for (const locale of preferredLocales) {
    // Browsers report locales like "de-AT" or "en-GB"; only the primary subtag picks the edition.
    const primarySubtag = locale.split("-")[0].toLowerCase();
    const match = TRANSLATION_LANGUAGES.find((language) => language === primarySubtag);
    if (match) return match;
  }
  return DEFAULT_TRANSLATION_LANGUAGE;
}
