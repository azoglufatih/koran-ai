import { quranContent } from "@/content/bundled-quran";
import type { TranslationLanguage } from "@/content/quran";

const editions = quranContent.listTranslationEditions();
const labels = new Map(editions.map((edition) => [edition.language, edition.label]));

/**
 * The languages the app can be read in — those it has a translation of. Tafsir is offered in the
 * same list, even where no edition exists, so a reader learns the gap rather than never seeing
 * their language on offer.
 */
export const readerLanguages = editions.map((edition) => edition.language);

/** A language's endonym, so a reader recognises their own language. */
export const languageLabel = (language: TranslationLanguage) => labels.get(language) ?? language;
