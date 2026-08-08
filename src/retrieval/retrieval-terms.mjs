// The one place a stretch of text becomes the terms it is indexed and searched by.
//
// Plain JavaScript, and imported as such by TypeScript, because both ends of retrieval need it:
// scripts/build-retrieval-index.mjs folds the corpus at build time and the browser folds the
// reader's question at ask time. A term folded one way at build and another at ask is a term that
// can never be found again, so the two must run the same code, not merely agree.

/**
 * Letters written as their own character rather than as a letter plus a mark, so stripping marks
 * leaves them untouched. Folded by hand instead:
 *
 * - `ß` is a letter in its own right; German readers type it as "ss" as often as not.
 * - `ı` is Turkish's dotless i. Case-folding is what makes it need naming here: JavaScript's
 *   locale-independent `toLowerCase` turns "IŞIK" into "işık" and "İyilik" into "iyilik", so the
 *   same Turkish word arrives spelled with i or with ı depending only on how it was capitalised.
 *   Folding ı onto i settles it one way.
 */
const SEPARATE_LETTERS = { ß: "ss", ı: "i" };

const SEPARATE_LETTER = /[ßı]/g;

/** Anything that is not a letter or a digit divides one term from the next. */
const NOT_A_TERM = /[^\p{L}\p{N}]+/u;

/** Accents, harakat, and every other mark that hangs off a letter rather than being one. */
const MARKS = /\p{M}+/gu;

/**
 * Text reduced to the form both the corpus and the reader's question are held in: lowercase, and
 * with the marks their languages write and their keyboards often omit taken off. Deliberately
 * lossy — "Grüße", "grusse" and "GRUSSE" are one term here, and a reader who types any of them
 * finds a passage printed with any other. Retrieval only has to bring the right passage back; the
 * text the reader is shown is always the corpus's own, never this.
 */
const fold = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(MARKS, "")
    .replace(SEPARATE_LETTER, (letter) => SEPARATE_LETTERS[letter]);

/**
 * The terms in a passage or a question, in the order they were written, repeats included — how
 * often a term occurs is part of how strongly a passage answers to it.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function termsIn(text) {
  return fold(text)
    .split(NOT_A_TERM)
    .filter((term) => term !== "");
}
