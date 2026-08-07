import type { VerseContext } from "@/ai/verse-context";
import { ayahTextAround, otherAyahText, type AyahText } from "./ayah-marks";

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

const asTranslation = (found: AyahText | null) =>
  found?.language ? { language: found.language, text: found.text } : null;

/**
 * The Ayah a reader has selected words in, as they are reading it — the Arabic from the Reading
 * Pane and the translation from the Tab they are on, both taken off the page so that what the AI
 * is given is exactly what is in front of them.
 *
 * Null when there is no single Ayah to ground in: a selection spanning two of them, one outside
 * the Quran text, or a caret left behind after a click.
 */
export function captureVerseContext(range: Range): VerseContext | null {
  if (range.collapsed || range.toString().trim() === "") return null;

  const selected = ayahTextAround(range.commonAncestorContainer);
  if (!selected) return null;

  const page = selected.element.ownerDocument;
  const arabic =
    selected.role === "arabic" ? selected : otherAyahText(page, "arabic", selected.ref);
  // The Reading Pane is always on the page, so this is a can't-happen; grounding a question in a
  // translation with no Ayah behind it would be worse than not offering to ask at all.
  if (!arabic) return null;

  return {
    ref: selected.ref,
    arabic: arabic.text,
    translation:
      selected.role === "translation"
        ? asTranslation(selected)
        : asTranslation(otherAyahText(page, "translation", selected.ref)),
    selection: { in: selected.role, ...offsetsWithin(selected.element, range) },
  };
}
