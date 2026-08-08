import type { AyahRef } from "@/content/quran";

/** One Ayah on screen, and where its text starts relative to the top of the browser window. */
export interface AyahInView {
  ref: AyahRef;
  top: number;
}

/**
 * Which of the Ayahs on screen is the one the reader is at — the one they have brought up to the
 * top of the reading, since that is what a reader scrolls an Ayah to in order to read it. Several
 * Ayahs are usually visible at once, and the ones above it are already read past, so the answer is
 * the last Ayah to have crossed the edge rather than simply the highest one on screen.
 *
 * `edge` is where the reading actually starts: the header sits over the text, so an Ayah tucked
 * under it has been read past even though it is technically still on the page.
 *
 * Before the reader has scrolled at all, no Ayah has crossed anything, and the Surah's first
 * visible Ayah is where they are.
 */
export function ayahAtReadingEdge(inView: readonly AyahInView[], edge: number): AyahRef | null {
  if (inView.length === 0) return null;

  const readPast = inView.filter((candidate) => candidate.top <= edge);
  const at = readPast.length
    ? readPast.reduce((lowest, candidate) => (candidate.top > lowest.top ? candidate : lowest))
    : inView.reduce((highest, candidate) => (candidate.top < highest.top ? candidate : highest));

  return at.ref;
}
