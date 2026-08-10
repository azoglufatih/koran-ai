import { TAFSIR_SOURCES, type TafsirSource, type TranslationLanguage } from "@/content/quran";
import { languageLabel, readerLanguages } from "./reader-languages";
import { tafsirLanguages } from "./tafsir-editions";
import { openableTabId } from "./tabs";

// v1 ships one tafsir; when a second lands, the flat list below grows a row per source.
const [TAFSIR_SOURCE] = TAFSIR_SOURCES;

/**
 * One thing a reader can open — a row in the menu, and what a Tab is made from once they pick it.
 * Distinct from a Tab: an AI Tab is a conversation, of which a reader can have several, so one
 * openable can stand behind any number of them.
 */
export type Openable =
  | { kind: "translation"; language: TranslationLanguage }
  | { kind: "tafsir"; source: TafsirSource; language: TranslationLanguage }
  | { kind: "ai" };

/**
 * Everything openable, as one flat list: the three translations, the three tafsirs, and AI. Flat is
 * the point — a menu that leads to another menu is what the single `+` replaced, so this is seven
 * items at one click each rather than three buttons over two levels.
 */
export const OPENABLES: readonly Openable[] = [
  ...readerLanguages.map((language): Openable => ({ kind: "translation", language })),
  ...readerLanguages.map((language): Openable => ({
    kind: "tafsir",
    source: TAFSIR_SOURCE,
    language,
  })),
  { kind: "ai" },
];

/** Distinguishes the rows of the menu from each other — a React key. AI names no Tab, so it says
 * so itself rather than borrowing an id it does not have. */
export const openableKey = (openable: Openable): string => openableTabId(openable) ?? "ai";

export function openableLabel(openable: Openable): string {
  switch (openable.kind) {
    case "translation":
      return languageLabel(openable.language);
    case "tafsir":
      return `Tafsir · ${languageLabel(openable.language)}`;
    case "ai":
      return "AI";
  }
}

const languagesWithTafsir = new Set(tafsirLanguages(TAFSIR_SOURCE));

/**
 * Whether this tafsir has an edition in this language. A language without one is still offered:
 * the Tab it opens explains the gap, which is more use to a reader than their language quietly
 * missing from the menu — so the flat list carries the "not yet" rather than dropping the row.
 */
export const hasTafsirEdition = (language: TranslationLanguage): boolean =>
  languagesWithTafsir.has(language);
