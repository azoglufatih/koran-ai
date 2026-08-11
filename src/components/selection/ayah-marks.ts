import { AYAH_TEXT_ROLES, type AyahTextRole } from "@/ai/verse-context";
import {
  isTafsirSource,
  isTranslationLanguage,
  isTransliterationScheme,
  type AyahRef,
  type TafsirSource,
  type TranslationLanguage,
  type TransliterationScheme,
} from "@/content/quran";

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
const SCHEME_MARK = "data-ayah-scheme";
const SOURCE_MARK = "data-ayah-source";

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

/**
 * Marks for the Latin line beneath an Ayah. A Transliteration names its scheme where a translation
 * names its language: the reader can switch between three of them, and offsets counted in one
 * scheme's spelling mean nothing in another's — which is what a restored conversation needs to
 * read the same words back out of the corpus.
 */
export const transliterationAyahMarks = (ref: AyahRef, scheme: TransliterationScheme) => ({
  [ROLE_MARK]: "transliteration",
  [AYAH_MARK]: ayahMark(ref),
  [SCHEME_MARK]: scheme,
});

/**
 * Marks for a Tafsir Tab's commentary. It names both its source and its language: a span of tafsir
 * is a claim the edition it came from is making, so nothing downstream may carry it without being
 * able to say whose claim it is (ADR 0007).
 */
export const tafsirAyahMarks = (
  ref: AyahRef,
  source: TafsirSource,
  language: TranslationLanguage,
) => ({
  [ROLE_MARK]: "tafsir",
  [AYAH_MARK]: ayahMark(ref),
  [SOURCE_MARK]: source,
  [LANGUAGE_MARK]: language,
});

/** One Ayah's text as it stands on the page, found through the marks above. */
export interface AyahText {
  element: Element;
  role: AyahTextRole;
  ref: AyahRef;
  /** The translation's or the commentary's language; null for the texts that name none. */
  language: TranslationLanguage | null;
  /** The Transliteration's scheme; null for the texts that name none. */
  scheme: TransliterationScheme | null;
  /** The commentary's tafsir; null for the texts that are the Ayah itself rather than about it. */
  source: TafsirSource | null;
  text: string;
}

const isRole = (value: string | null): value is AyahTextRole =>
  AYAH_TEXT_ROLES.includes(value as AyahTextRole);

function readLanguage(element: Element): TranslationLanguage | null {
  const mark = element.getAttribute(LANGUAGE_MARK);
  return isTranslationLanguage(mark) ? mark : null;
}

function readScheme(element: Element): TransliterationScheme | null {
  const mark = element.getAttribute(SCHEME_MARK);
  return isTransliterationScheme(mark) ? mark : null;
}

function readSource(element: Element): TafsirSource | null {
  const mark = element.getAttribute(SOURCE_MARK);
  return isTafsirSource(mark) ? mark : null;
}

function readMarks(element: Element | null): AyahText | null {
  const role = element?.getAttribute(ROLE_MARK) ?? null;
  const ref = element && parseAyahMark(element.getAttribute(AYAH_MARK));
  if (!element || !ref || !isRole(role)) return null;

  // A text whose edition cannot be read is no text as far as grounding goes: it could neither be
  // named to the model nor read back out of the corpus, so it is not Ayah text to ask about. The
  // Arabic names no edition and needs none — there is one of it.
  const language = readLanguage(element);
  const scheme = readScheme(element);
  const source = readSource(element);
  if (role === "translation" && !language) return null;
  if (role === "transliteration" && !scheme) return null;
  // Commentary needs both: unattributed, it is a claim about the Ayah with nobody making it.
  if (role === "tafsir" && !(source && language)) return null;

  return { element, role, ref, language, scheme, source, text: element.textContent ?? "" };
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

/**
 * Every rendering of one Ayah in one role that is on the page, in the order it renders them — the
 * Arabic behind a translation the reader selected in, or all the translations beside the Arabic.
 *
 * All of them, and not the one the reader is looking at: whether a Tab is showing depends on the
 * width of the screen, so grounding in what is visible would answer the same question differently
 * on a phone and on a laptop.
 */
export function ayahTextsFor(root: ParentNode, role: AyahTextRole, ref: AyahRef): AyahText[] {
  const rendered = root.querySelectorAll(
    `[${ROLE_MARK}="${role}"][${AYAH_MARK}="${ayahMark(ref)}"]`,
  );

  return [...rendered].map(readMarks).filter((found): found is AyahText => found !== null);
}
