import { quranContent } from "@/content/bundled-quran";
import type { TafsirSource, TranslationLanguage } from "@/content/quran";

/**
 * The languages a tafsir has commentary in. Every other reader language is a known gap in that
 * tafsir, which the Tafsir Tab says so of — so both the menu offering Tabs and the Tab explaining
 * a gap have to agree on this one list.
 */
export const tafsirLanguages = (source: TafsirSource): TranslationLanguage[] =>
  quranContent
    .listTafsirEditions()
    .filter((edition) => edition.source === source)
    .map((edition) => edition.language);
