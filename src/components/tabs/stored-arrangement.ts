import {
  TAFSIR_SOURCES,
  isTranslationLanguage,
  isTransliterationScheme,
  parseAyahRef,
  type AyahRef,
  type TafsirSource,
  type TranslationLanguage,
  type TransliterationScheme,
} from "@/content/quran";
import { AYAH_TEXT_ROLES, type AyahSelection, type AyahTextRole, type VerseContext } from "@/ai/verse-context";
import type { Column } from "./column-arrangement";
import { aiTab, tafsirTab, translationTab, type Tab } from "./tabs";

/**
 * The reader's Column arrangement as it is kept in their own browser, so a refresh gives them back
 * the workspace they built rather than the one the app guesses for a first visit.
 *
 * What is stored stays inside the boundary ADR 0001 draws: language and source codes, an Ayah
 * reference and a couple of integers. No corpus text — the Arabic, the translation and the
 * Transliteration are read back out of the corpus on restore — and **no conversation**. A restored
 * AI Tab comes back grounded and empty, because restoring a chat transcript out of localStorage is
 * a materially different privacy claim from restoring which panels were open, and not one this app
 * makes (docs/adr/0006-columns-of-tabs.md).
 *
 * Storage is passed in rather than reached for, so the seam is exercisable and so a browser that
 * denies storage is a reader whose arrangement lasts the session rather than a throw.
 */
export const COLUMN_ARRANGEMENT_KEY = "koran-ai:columns";

/**
 * Bumped when the shape below changes in a way an older record cannot be read as. A record from
 * another version is dropped rather than guessed at: a workspace the reader never arranged is a
 * smaller loss than one restored wrong.
 */
const VERSION = 1;

/** Everything an AI Tab's grounding needs, once the corpus has been asked for the texts. */
export interface StoredGrounding {
  ref: AyahRef;
  selection: AyahSelection;
  /** The Translation Tab the reader had open when they asked, if any. */
  translationLanguage: TranslationLanguage | null;
  /** The scheme they were reading, when the Transliteration is where they selected. */
  transliterationScheme: TransliterationScheme | null;
}

type StoredTab =
  | { kind: "translation"; language: TranslationLanguage }
  | { kind: "tafsir"; source: TafsirSource; language: TranslationLanguage }
  | { kind: "ai"; grounding: StoredGrounding | null };

interface StoredColumn {
  tabs: StoredTab[];
  /** Which of `tabs` the Column was showing, by position — an index cannot dangle as an id can. */
  showing: number;
}

interface StoredArrangement {
  version: number;
  columns: StoredColumn[];
}

/** What an AI Tab needs written down, drawn off the Verse Context it was opened with. */
export const groundingOf = (context: VerseContext): StoredGrounding => ({
  ref: context.ref,
  selection: context.selection,
  translationLanguage: context.translation?.language ?? null,
  transliterationScheme: context.transliteration?.scheme ?? null,
});

const storedTab = (tab: Tab): StoredTab => {
  switch (tab.kind) {
    case "translation":
      return { kind: "translation", language: tab.language };
    case "tafsir":
      return { kind: "tafsir", source: tab.source, language: tab.language };
    case "ai":
      return {
        kind: "ai",
        grounding: tab.verseContext ? groundingOf(tab.verseContext) : (tab.grounding ?? null),
      };
  }
};

export function writeColumnArrangement(storage: Storage | null, columns: readonly Column[]): void {
  const arrangement: StoredArrangement = {
    version: VERSION,
    columns: columns.map((column) => ({
      tabs: column.tabs.map(storedTab),
      showing: Math.max(
        0,
        column.tabs.findIndex((tab) => tab.id === column.activeTabId),
      ),
    })),
  };

  storage?.setItem(COLUMN_ARRANGEMENT_KEY, JSON.stringify(arrangement));
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function parseSelection(value: unknown): AyahSelection | null {
  if (!isRecord(value)) return null;
  const { in: role, start, end } = value;

  if (!AYAH_TEXT_ROLES.includes(role as AyahTextRole)) return null;
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  // A backwards or negative span would mark nothing, or mark the whole Ayah by accident.
  if ((start as number) < 0 || (end as number) < (start as number)) return null;

  return { in: role as AyahTextRole, start: start as number, end: end as number };
}

/**
 * A grounding that cannot be read whole is dropped rather than half-restored: an AI Tab labelled
 * after an Ayah it no longer knows the selection in would ground the reader's next question in the
 * wrong words. It comes back as an open-ended conversation instead, which is honest.
 */
function parseGrounding(value: unknown): StoredGrounding | null {
  if (!isRecord(value)) return null;

  const ref = parseAyahRef(value.ref);
  const selection = parseSelection(value.selection);
  if (!ref || !selection) return null;

  // Every text the selection could have been made in has to be nameable, or the offsets point into
  // something this version cannot read back out of the corpus.
  const translationLanguage = isTranslationLanguage(value.translationLanguage)
    ? value.translationLanguage
    : null;
  const transliterationScheme = isTransliterationScheme(value.transliterationScheme)
    ? value.transliterationScheme
    : null;

  if (selection.in === "translation" && !translationLanguage) return null;
  if (selection.in === "transliteration" && !transliterationScheme) return null;

  return { ref, selection, translationLanguage, transliterationScheme };
}

const isTafsirSource = (value: unknown): value is TafsirSource =>
  TAFSIR_SOURCES.includes(value as TafsirSource);

function parseTab(value: unknown): StoredTab | null {
  if (!isRecord(value)) return null;

  switch (value.kind) {
    case "translation":
      return isTranslationLanguage(value.language)
        ? { kind: "translation", language: value.language }
        : null;
    case "tafsir":
      // A source this version no longer ships is a Tab with nothing behind it.
      return isTranslationLanguage(value.language) && isTafsirSource(value.source)
        ? { kind: "tafsir", source: value.source, language: value.language }
        : null;
    case "ai":
      return { kind: "ai", grounding: parseGrounding(value.grounding) };
    default:
      return null;
  }
}

/**
 * What the reader's browser holds, as far as it can be read.
 *
 * Anything under this key is untrusted: their own edit, or a record written by a version of the app
 * that arranged things differently. One unreadable Tab costs the reader that Tab rather than the
 * workspace they built, and a record that is not an arrangement at all reads as `null` — "nothing
 * stored", which is distinct from `[]`, "the reader closed everything".
 */
export function readColumnArrangement(storage: Storage | null): StoredColumn[] | null {
  const stored = storage?.getItem(COLUMN_ARRANGEMENT_KEY);
  if (!stored) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || parsed.version !== VERSION || !Array.isArray(parsed.columns)) {
    return null;
  }

  return parsed.columns.flatMap((column: unknown) => {
    if (!isRecord(column) || !Array.isArray(column.tabs)) return [];

    const tabs = column.tabs
      .map((tab: unknown) => parseTab(tab))
      .filter((tab): tab is StoredTab => tab !== null);
    // A Column closes with its last Tab, so one whose Tabs were all unreadable is no Column.
    if (tabs.length === 0) return [];

    const showing = Number.isInteger(column.showing) ? (column.showing as number) : 0;
    return [{ tabs, showing: showing >= 0 && showing < tabs.length ? showing : 0 }];
  });
}

const restoredTab = (stored: StoredTab, conversation: number): Tab => {
  switch (stored.kind) {
    case "translation":
      return translationTab(stored.language);
    case "tafsir":
      return tafsirTab(stored.source, stored.language);
    case "ai":
      // Grounding only, and no messages: a restored conversation comes back knowing which Ayah it
      // is about and nothing of what was said in it.
      return aiTab(conversation, { grounding: stored.grounding ?? undefined });
  }
};

/**
 * The reader's arrangement, back as Columns.
 *
 * A Tab's identity is what it shows, so the same translation cannot sit in two Columns at once —
 * a record naming one twice keeps the first and drops the rest, which is the state the app itself
 * would only ever have written.
 */
export function restoredColumns(stored: readonly StoredColumn[]): Column[] {
  const taken = new Set<string>();
  let conversations = 0;

  return stored.flatMap((column, index) => {
    const showing = column.tabs[column.showing];
    const tabs = column.tabs.flatMap((stored) => {
      const tab = restoredTab(stored, conversations + 1);
      if (taken.has(tab.id)) return [];
      taken.add(tab.id);
      if (tab.kind === "ai") conversations += 1;
      return [{ tab, wasShowing: stored === showing }];
    });

    if (tabs.length === 0) return [];
    const active = tabs.find((entry) => entry.wasShowing) ?? tabs[0];

    return [
      {
        id: `column:${index + 1}`,
        tabs: tabs.map((entry) => entry.tab),
        activeTabId: active.tab.id,
      },
    ];
  });
}

export type { StoredColumn, StoredTab };
