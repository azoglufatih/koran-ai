import type { AyahRef, TranslationLanguage } from "@/content/quran";

/** The two texts a reader can select in: the Reading Pane's Arabic, or a Translation Tab. */
export type AyahTextRole = "arabic" | "translation";

/** Where in one of those texts the reader's selection starts and ends. */
export interface AyahSelection {
  in: AyahTextRole;
  start: number;
  end: number;
}

/**
 * What the AI is given to answer from: the whole Ayah — Arabic, and the translation the reader has
 * open — with the span they selected marked inside it. A reader stuck on "sons of Israel" gets an
 * answer about that phrase *in this Ayah*; the fragment alone would leave the model guessing which
 * verse, which speaker, and which of several readings is meant.
 */
export interface VerseContext {
  ref: AyahRef;
  arabic: string;
  /**
   * Null when the reader has closed every Translation Tab and is reading Arabic only — in which
   * case they can only have selected in the Arabic, since a translation they cannot see is not one
   * they can select words in.
   */
  translation: { language: TranslationLanguage; text: string } | null;
  selection: AyahSelection;
}

/**
 * How the selection is marked out for the model. Brackets no Quran text, translation or tafsir
 * uses, so nothing in the corpus can be mistaken for the reader's own selection.
 */
const [MARK_OPEN, MARK_CLOSE] = ["⟦", "⟧"];

/**
 * The language named as the model will best recognise it, which is not the endonym the Tab strip
 * shows a reader ("Türkçe" identifies the Tab; "Turkish" identifies the language to a model).
 * Exhaustive by type, so a fourth translation language cannot be shipped unnamed.
 */
const LANGUAGE_NAMES: Record<TranslationLanguage, string> = {
  en: "English",
  tr: "Turkish",
  de: "German",
};

const ayahText = (context: VerseContext, role: AyahTextRole) =>
  role === "arabic" ? context.arabic : (context.translation?.text ?? "");

/** The words the reader actually selected — for showing them back what they asked about. */
export function selectedText(context: VerseContext): string {
  const { in: role, start, end } = context.selection;
  return ayahText(context, role).slice(start, end);
}

const withSelectionMarked = (text: string, { start, end }: AyahSelection) =>
  `${text.slice(0, start)}${MARK_OPEN}${text.slice(start, end)}${MARK_CLOSE}${text.slice(end)}`;

const marked = (context: VerseContext, role: AyahTextRole) =>
  context.selection.in === role
    ? withSelectionMarked(ayahText(context, role), context.selection)
    : ayahText(context, role);

/**
 * The Verse Context as the model reads it. Both texts are given whole and only the one the reader
 * selected in carries marks, so the model can see the selected words in place and still read the
 * other rendering of the same Ayah unaltered.
 */
export function verseContextPrompt(context: VerseContext): string {
  const { surah, ayah } = context.ref;
  const sections = [
    `The reader is asking about Ayah ${surah}:${ayah}. They selected the words marked ` +
      `${MARK_OPEN}like this${MARK_CLOSE} — answer about those, reading the whole Ayah below as their context.`,
    `Arabic:\n${marked(context, "arabic")}`,
  ];

  if (context.translation) {
    const language = LANGUAGE_NAMES[context.translation.language];
    sections.push(`${language} translation:\n${marked(context, "translation")}`);
  }

  return sections.join("\n\n");
}
