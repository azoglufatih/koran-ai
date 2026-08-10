import type { AyahRef, TafsirSource, TranslationLanguage } from "@/content/quran";
import type { VerseContext } from "@/ai/verse-context";
import type { Openable } from "./openables";
import type { StoredGrounding } from "./stored-arrangement";

/** One thing a reader has open inside a Column. */
export interface TranslationTab {
  id: string;
  kind: "translation";
  language: TranslationLanguage;
}

export interface TafsirTab {
  id: string;
  kind: "tafsir";
  source: TafsirSource;
  language: TranslationLanguage;
}

/**
 * Unlike the other Tabs, an AI Tab is not identified by what it shows — it is a conversation, and a
 * reader asking about a second Ayah wants a second one rather than the one they already have.
 * `conversation` numbers them so two AI Tabs are tellable apart in the Tab strip.
 */
export interface AiTab {
  id: string;
  kind: "ai";
  conversation: number;
  /**
   * The Ayah the reader selected words in to start this conversation, as they were reading it.
   * Absent for a Tab they opened from a menu, which is a question about the Surah at large.
   */
  verseContext?: VerseContext;
  /**
   * The same grounding for a Tab restored from the reader's browser, where the texts were not
   * stored and have to be read back out of the corpus. A Tab carries one or the other, never both.
   */
  grounding?: StoredGrounding;
}

export type Tab = TranslationTab | TafsirTab | AiTab;

// A Tab's identity is what it shows, so opening the same thing twice focuses the Tab already
// showing it.
const translationTabId = (language: TranslationLanguage) => `translation:${language}`;

const tafsirTabId = (source: TafsirSource, language: TranslationLanguage) =>
  `tafsir:${source}:${language}`;

const aiTabId = (conversation: number) => `ai:${conversation}`;

/**
 * The Tab an openable would open, or null for AI — which has no such Tab, because every choice of
 * it makes a new conversation rather than returning the reader to one they already have.
 */
export const openableTabId = (openable: Openable): string | null => {
  switch (openable.kind) {
    case "translation":
      return translationTabId(openable.language);
    case "tafsir":
      return tafsirTabId(openable.source, openable.language);
    case "ai":
      return null;
  }
};

export const translationTab = (language: TranslationLanguage): Tab => ({
  id: translationTabId(language),
  kind: "translation",
  language,
});

export const tafsirTab = (source: TafsirSource, language: TranslationLanguage): Tab => ({
  id: tafsirTabId(source, language),
  kind: "tafsir",
  source,
  language,
});

export const aiTab = (
  conversation: number,
  grounded: Pick<AiTab, "verseContext" | "grounding">,
): Tab => ({ id: aiTabId(conversation), kind: "ai", conversation, ...grounded });

/**
 * Numbered past whatever the reader currently has open, so a new conversation never lands on the id
 * of one already on screen. A number frees up again once no open AI Tab is above it.
 */
export const nextConversation = (visible: readonly Tab[]): number =>
  Math.max(0, ...visible.filter((tab) => tab.kind === "ai").map((tab) => tab.conversation)) + 1;

/**
 * The Ayah an AI Tab's conversation is about, whether it was opened from a selection or restored.
 * A Tab labelled "AI · 2:40" that no longer knows about 2:40 is a lie the label tells, so the label
 * reads this rather than the Verse Context — which a restored Tab has yet to read back.
 */
export const aiTabAyah = (tab: AiTab): AyahRef | null =>
  tab.verseContext?.ref ?? tab.grounding?.ref ?? null;
