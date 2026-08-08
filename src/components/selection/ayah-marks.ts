import type { AyahTextRole } from "@/ai/verse-context";
import { TRANSLATION_LANGUAGES, type AyahRef, type TranslationLanguage } from "@/content/quran";

/**
 * What a reader selects is a range of text nodes; what they mean is "these words, in this Ayah".
 * These attributes are what carries one to the other: the Reading Pane and every Translation Tab
 * stamp them onto the text they render, and a selection is traced back through them.
 *
 * They are attributes rather than React state because the Reading Pane is a Server Component —
 * the whole Surah's Arabic is prerendered, and reaching it from the client any other way would
 * mean shipping and re-rendering it.
 */
const ROLE_MARK = "data-ayah-role";
const AYAH_MARK = "data-ayah";
const LANGUAGE_MARK = "data-ayah-language";

/** The Tab the reader is looking at, of the several that can be on screen at once. */
const ACTIVE_TAB_MARK = "data-tab-active";

const ayahMark = (ref: AyahRef) => `${ref.surah}:${ref.ayah}`;

function parseAyahMark(mark: string | null): AyahRef | null {
  const [surah, ayah] = (mark ?? "").split(":").map(Number);
  return surah > 0 && ayah > 0 ? { surah, ayah } : null;
}

/** Marks for the Reading Pane's Arabic — the one text that is always on the page. */
export const arabicAyahMarks = (ref: AyahRef) => ({
  [ROLE_MARK]: "arabic",
  [AYAH_MARK]: ayahMark(ref),
});

export const translationAyahMarks = (ref: AyahRef, language: TranslationLanguage) => ({
  [ROLE_MARK]: "translation",
  [AYAH_MARK]: ayahMark(ref),
  [LANGUAGE_MARK]: language,
});

/** Marks the Tab the reader is on, so a selection knows which translation they can see. */
export const activeTabMarks = (isActive: boolean) => (isActive ? { [ACTIVE_TAB_MARK]: "" } : {});

/** One Ayah's text as it stands on the page, found through the marks above. */
export interface AyahText {
  element: Element;
  role: AyahTextRole;
  ref: AyahRef;
  /** The translation's language; null for the Arabic, which has no edition to name. */
  language: TranslationLanguage | null;
  text: string;
}

function readLanguage(element: Element): TranslationLanguage | null {
  const mark = element.getAttribute(LANGUAGE_MARK);
  return TRANSLATION_LANGUAGES.find((language) => language === mark) ?? null;
}

function readMarks(element: Element | null): AyahText | null {
  const role = element?.getAttribute(ROLE_MARK);
  const ref = element && parseAyahMark(element.getAttribute(AYAH_MARK));
  if (!element || !ref || (role !== "arabic" && role !== "translation")) return null;

  // A translation whose language cannot be read is no translation as far as grounding goes: it
  // could neither be named to the model nor honestly marked, so it is not Ayah text to ask about.
  const language = readLanguage(element);
  if (role === "translation" && !language) return null;

  return { element, role, ref, language, text: element.textContent ?? "" };
}

/** The Ayah text a node sits inside, or null for a node outside any — a heading, a Tab strip. */
export function ayahTextAround(node: Node | null): AyahText | null {
  const element = node?.nodeType === 1 ? (node as Element) : (node?.parentElement ?? null);
  return readMarks(element?.closest(`[${ROLE_MARK}][${AYAH_MARK}]`) ?? null);
}

/**
 * Every Ayah of the Reading Pane's Arabic on the page, in the order it renders them — the one text
 * that is always there, which is what makes it the text to measure the reader's place against.
 */
export function arabicAyahTexts(root: ParentNode): AyahText[] {
  return [...root.querySelectorAll(`[${ROLE_MARK}="arabic"][${AYAH_MARK}]`)]
    .map(readMarks)
    .filter((found): found is AyahText => found !== null);
}

const ayahTextSelector = (role: AyahTextRole, ref: AyahRef) =>
  `[${ROLE_MARK}="${role}"][${AYAH_MARK}="${ayahMark(ref)}"]`;

/**
 * The same Ayah rendered as the other text — the Arabic behind a translation a reader selected in,
 * or the translation beside the Arabic. Several Translation Tabs can be open on the same Ayah, so
 * the one in the Tab the reader is looking at wins; failing that, the first the page renders.
 */
export function otherAyahText(
  root: ParentNode,
  role: AyahTextRole,
  ref: AyahRef,
): AyahText | null {
  const selector = ayahTextSelector(role, ref);
  const inTabOnScreen = root.querySelector(`[${ACTIVE_TAB_MARK}] ${selector}`);
  return readMarks(inTabOnScreen ?? root.querySelector(selector));
}
