import type { AyahSelection, TranslatedText, VerseContext } from "@/ai/verse-context";
import { ayahTextAround, ayahTextsFor, type AyahText } from "./ayah-marks";

/**
 * Where the selection falls in its Ayah, counted in characters of the Ayah's own text rather than
 * of whichever text node the reader happened to start dragging in. Measuring a range that runs
 * from the start of the Ayah to the start of the selection is what makes the two the same number,
 * however the Tab has marked its text up in between.
 */
function offsetsWithin(element: Element, range: Range) {
  const untilSelection = range.cloneRange();
  untilSelection.selectNodeContents(element);
  untilSelection.setEnd(range.startContainer, range.startOffset);

  const start = untilSelection.toString().length;
  return { start, end: start + range.toString().length };
}

/**
 * The selection, naming the edition its offsets are counted in where more than one of that text can
 * be on the page. Only a translation can be: a reader has one Arabic, and the Transliteration and
 * the commentary are carried on the Verse Context itself, which names their editions there.
 */
function selectionIn(selected: AyahText, range: Range): AyahSelection | null {
  const span = offsetsWithin(selected.element, range);

  if (selected.role !== "translation") return { in: selected.role, ...span };
  return selected.language ? { in: "translation", language: selected.language, ...span } : null;
}

const asTranslation = ({ language, text }: AyahText): TranslatedText | null =>
  language ? { language, text } : null;

const asTransliteration = ({ scheme, text }: AyahText) => (scheme ? { scheme, text } : null);

const asCommentary = ({ source, language, text }: AyahText) =>
  source && language ? { source, language, text } : null;

/**
 * The Ayah a reader has selected words in, as they are reading it — the Arabic from the Reading
 * Pane and every translation they have open, all taken off the page so that what the AI is given is
 * exactly what is in front of them. A reader who selected in the Transliteration beneath the
 * Arabic, or in a Tafsir Tab beside it, gets that carried too, since nothing else on the page would
 * let them ask about those words.
 *
 * Null when there is no single Ayah to ground in: a selection spanning two of them, one outside
 * the Quran text, or a caret left behind after a click.
 */
export function captureVerseContext(range: Range): VerseContext | null {
  if (range.collapsed || range.toString().trim() === "") return null;

  const selected = ayahTextAround(range.commonAncestorContainer);
  if (!selected) return null;

  const page = selected.element.ownerDocument;
  const [arabic] =
    selected.role === "arabic" ? [selected] : ayahTextsFor(page, "arabic", selected.ref);
  // The Reading Pane is always on the page, so this is a can't-happen; grounding a question in a
  // translation with no Ayah behind it would be worse than not offering to ask at all.
  if (!arabic) return null;

  const selection = selectionIn(selected, range);
  if (!selection) return null;

  return {
    ref: selected.ref,
    arabic: arabic.text,
    // Every Translation Tab open, whether or not it is the one showing — see `ayahTextsFor`.
    translations: ayahTextsFor(page, "translation", selected.ref)
      .map(asTranslation)
      .filter((translation): translation is TranslatedText => translation !== null),
    // Carried only when the reader selected in it. Elsewhere on the page it is the same Arabic in
    // another script, which the model already has — see ADR 0005.
    transliteration: selected.role === "transliteration" ? asTransliteration(selected) : null,
    // Likewise: commentary is one edition's reading of the Ayah, and a question that is not about
    // that reading is not one to put it in front of the model for (ADR 0007).
    commentary: selected.role === "tafsir" ? asCommentary(selected) : null,
    selection,
  };
}
