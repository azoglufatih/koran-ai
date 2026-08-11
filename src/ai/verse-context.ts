import {
  TAFSIR_SOURCE_NAMES,
  type AyahRef,
  type TafsirSource,
  type TranslationLanguage,
  type TransliterationScheme,
} from "@/content/quran";

/**
 * The texts a reader can select in: the Reading Pane's Arabic, the Transliteration beneath it, a
 * Translation Tab, or a Tafsir Tab.
 *
 * A fourth role, but not a fourth text of the same kind — the first three are the same Ayah
 * rendered three ways, and tafsir is somebody's explanation *of* it. Everything downstream of a
 * `tafsir` selection has to keep telling the two apart
 * (docs/adr/0007-commentary-selection-is-a-claim.md).
 */
export const AYAH_TEXT_ROLES = ["arabic", "translation", "transliteration", "tafsir"] as const;

export type AyahTextRole = (typeof AYAH_TEXT_ROLES)[number];

interface Span {
  start: number;
  end: number;
}

/**
 * Where in one of those texts the reader's selection starts and ends.
 *
 * A selection in a translation names its language, because a reader can have several Translation
 * Tabs open and offsets counted in one edition mean nothing in another. The other three roles carry
 * at most one text each — there is one Arabic, and the Transliteration and the commentary are
 * carried only when the selection is in them — so each names its edition on the text itself.
 */
export type AyahSelection =
  | ({ in: "arabic" | "transliteration" | "tafsir" } & Span)
  | ({ in: "translation"; language: TranslationLanguage } & Span);

/** One Translation Tab's rendering of the Ayah. */
export interface TranslatedText {
  language: TranslationLanguage;
  text: string;
}

/**
 * One tafsir's commentary on the Ayah, inseparable from whose it is. The source and the language
 * travel with the words everywhere the words go, because a claim about the Ayah with nobody making
 * it is the one thing that must never reach the model
 * (docs/adr/0007-commentary-selection-is-a-claim.md).
 */
export interface CommentaryText {
  source: TafsirSource;
  language: TranslationLanguage;
  text: string;
}

/**
 * What the AI is given to answer from: the whole Ayah — the Arabic, and every translation the
 * reader has open — with the span they selected marked inside it. A reader stuck on "sons of
 * Israel" gets an answer about that phrase *in this Ayah*; the fragment alone would leave the model
 * guessing which verse, which speaker, and which of several readings is meant.
 */
export interface VerseContext {
  ref: AyahRef;
  arabic: string;
  /**
   * Every translation the reader has open, not merely the one showing: which Tab is visible depends
   * on the width of the screen, and grounding that changed between a reader's phone and their
   * laptop would make an answer differ for a reason they cannot see.
   *
   * Empty when they have closed every Translation Tab and are reading Arabic only — in which case
   * they cannot have selected in a translation, since one they cannot see is not one they can
   * select words in.
   */
  translations: readonly TranslatedText[];
  /**
   * The Ayah's Latin-script Transliteration — carried only when that is where the reader selected,
   * and null otherwise. It renders the Arabic's sound rather than its meaning, so it adds nothing
   * to a question asked about any of the other texts (ADR 0005).
   *
   * The scheme is named for the same reason a translation's language is: the reader can switch
   * between three of them, and the selection's offsets only mean anything in the one they were
   * taken in.
   */
  transliteration: { scheme: TransliterationScheme; text: string } | null;
  /**
   * The tafsir the reader marked a Commentary Selection in — carried only when that is where they
   * selected, and named for the edition it came from, which is what keeps a commentator's claim
   * from reaching the model in the same voice as the Ayah (ADR 0007). Commentary is one edition's
   * reading among several, so a question that is not about it is one it stays out of.
   */
  commentary: CommentaryText | null;
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

const translationIn = (context: VerseContext, language: TranslationLanguage) =>
  context.translations.find((translation) => translation.language === language)?.text ?? "";

/** The text the selection's offsets are counted in — the one rendering it was taken from. */
function selectedIn(context: VerseContext): string {
  const { selection } = context;
  switch (selection.in) {
    case "arabic":
      return context.arabic;
    case "translation":
      return translationIn(context, selection.language);
    case "transliteration":
      return context.transliteration?.text ?? "";
    case "tafsir":
      return context.commentary?.text ?? "";
  }
}

/**
 * The text the reader selected in, split at their selection — what the Grounding Notice shows them
 * their question is anchored to. The whole text and not the fragment: a reader shown only the words
 * they marked cannot see how much else goes to their provider along with them.
 */
export function selectionInPlace(context: VerseContext): {
  before: string;
  selected: string;
  after: string;
} {
  const text = selectedIn(context);
  const { start, end } = context.selection;

  return { before: text.slice(0, start), selected: text.slice(start, end), after: text.slice(end) };
}

/** The words the reader actually selected — for showing them back what they asked about. */
export const selectedText = (context: VerseContext): string => selectionInPlace(context).selected;

const withSelectionMarked = (text: string, { start, end }: Span) =>
  `${text.slice(0, start)}${MARK_OPEN}${text.slice(start, end)}${MARK_CLOSE}${text.slice(end)}`;

/** The text as the model reads it: marked where the reader selected, and whole everywhere else. */
const marked = (context: VerseContext, text: string, role: AyahTextRole) =>
  context.selection.in === role ? withSelectionMarked(text, context.selection) : text;

const markedTranslation = (context: VerseContext, { language, text }: TranslatedText) =>
  context.selection.in === "translation" && context.selection.language === language
    ? withSelectionMarked(text, context.selection)
    : text;

/**
 * The first thing the model is told, and the one line that decides whose words it thinks it is
 * reading. For a Commentary Selection it has to say "a commentator's sentence" before the model
 * meets the sentence: framing that arrived only alongside the commentary further down would leave
 * the opening claim — "the reader selected these words of the Ayah" — standing, and a model that
 * has already accepted it answers about the gloss as though it were revelation
 * (docs/adr/0007-commentary-selection-is-a-claim.md).
 */
function whatIsBeingAskedAbout(context: VerseContext): string {
  const { surah, ayah } = context.ref;
  const marks = `${MARK_OPEN}like this${MARK_CLOSE}`;

  if (context.commentary) {
    return (
      `The reader is asking about a sentence of ${TAFSIR_SOURCE_NAMES[context.commentary.source]}'s ` +
      `commentary on Ayah ${surah}:${ayah}. They selected the words marked ${marks} in that ` +
      `commentary, below — those words are the commentator's and not the Ayah's. Answer about what ` +
      `they are saying, attributing it to them rather than to the Quran, and read the Ayah itself ` +
      `as the context they were written about.`
    );
  }

  return (
    `The reader is asking about Ayah ${surah}:${ayah}. They selected the words marked ${marks} — ` +
    `answer about those, reading the whole Ayah below as their context.`
  );
}

/**
 * The Verse Context as the model reads it. Every text is given whole and only the one the reader
 * selected in carries marks, so the model can see the selected words in place and still read the
 * other renderings of the same Ayah unaltered.
 */
export function verseContextPrompt(context: VerseContext): string {
  const { surah, ayah } = context.ref;
  const sections = [whatIsBeingAskedAbout(context), `Arabic:\n${marked(context, context.arabic, "arabic")}`];

  // Only ever present when the reader selected in it, and then it is the only text with marks in
  // it. Nothing here can line the two scripts up — the vendored Transliteration carries no
  // word-level alignment — so the model is asked to do it, which is the trade-off ADR 0005 accepts
  // for the one case where refusing would leave the reader unable to ask at all.
  if (context.transliteration) {
    sections.push(
      `Latin-script transliteration of that Arabic, which is where the reader selected:\n` +
        `${marked(context, context.transliteration.text, "transliteration")}\n\n` +
        `The marks are on the transliteration, so work out for yourself which Arabic words they ` +
        `spell, and answer about those.`,
    );
  }

  for (const translation of context.translations) {
    const language = LANGUAGE_NAMES[translation.language];
    sections.push(`${language} translation:\n${markedTranslation(context, translation)}`);
  }

  // Last, and named again where it stands: the opening said whose words these are, and a heading
  // that merely said "commentary" would let them be read back as the Ayah's by the time the model
  // reaches them (ADR 0007).
  if (context.commentary) {
    const { source, language, text } = context.commentary;
    sections.push(
      `${TAFSIR_SOURCE_NAMES[source]} — a scholarly commentary *about* Ayah ${surah}:${ayah}, in ` +
        `${LANGUAGE_NAMES[language]}, which is where the reader selected. These are the ` +
        `commentator's words, not the Ayah's:\n${marked(context, text, "tafsir")}`,
    );
  }

  return sections.join("\n\n");
}
