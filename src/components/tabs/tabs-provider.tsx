"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { detectTranslationLanguage } from "@/content/translation-language";
import type { TafsirSource, TranslationLanguage } from "@/content/quran";
import type { VerseContext } from "@/ai/verse-context";

/**
 * A Tab the reader has opened alongside the Reading Pane.
 */
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
   * The Ayah the reader selected words in to start this conversation. Absent for a Tab they opened
   * from the Tab strip, which is a question about the Surah at large rather than about one Ayah.
   */
  verseContext?: VerseContext;
}

export type Tab = TranslationTab | TafsirTab | AiTab;

interface TabsValue {
  tabs: Tab[];
  activeTabId: string | null;
  /** The reader's own language, or null before hydration — the prerender cannot know it. */
  readerLanguage: TranslationLanguage | null;
  /** Opens a Translation Tab for the language, or focuses it if one is already open. */
  openTranslationTab(language: TranslationLanguage): void;
  /** Opens a Tafsir Tab for the source and language, or focuses it if one is already open. */
  openTafsirTab(source: TafsirSource, language: TranslationLanguage): void;
  /**
   * Opens a new AI Tab — always a fresh conversation, never a focus of an existing one. Pass the
   * Verse Context to ground the conversation in one Ayah; omit it to start an open-ended one.
   */
  openAiTab(verseContext?: VerseContext): void;
  closeTab(id: string): void;
  activateTab(id: string): void;
}

const TabsContext = createContext<TabsValue | null>(null);

export function useTabs(): TabsValue {
  const value = useContext(TabsContext);
  if (!value) throw new Error("useTabs must be used inside a TabsProvider");
  return value;
}

// A Tab's identity is what it shows, so opening the same thing twice focuses the Tab already
// showing it. Exported so the menus can ask whether a Tab is open without re-deriving the id.
export const translationTabId = (language: TranslationLanguage) => `translation:${language}`;

export const tafsirTabId = (source: TafsirSource, language: TranslationLanguage) =>
  `tafsir:${source}:${language}`;

const aiTabId = (conversation: number) => `ai:${conversation}`;

const translationTab = (language: TranslationLanguage): Tab => ({
  id: translationTabId(language),
  kind: "translation",
  language,
});

const tafsirTab = (source: TafsirSource, language: TranslationLanguage): Tab => ({
  id: tafsirTabId(source, language),
  kind: "tafsir",
  source,
  language,
});

// Numbered past whatever the reader currently has open, so a new conversation never lands on the
// id of one already on screen. A number frees up again once no open AI Tab is above it.
const nextAiTab = (visible: readonly Tab[], verseContext?: VerseContext): Tab => {
  const conversations = visible.filter((tab) => tab.kind === "ai").map((tab) => tab.conversation);
  const conversation = Math.max(0, ...conversations) + 1;
  return { id: aiTabId(conversation), kind: "ai", conversation, verseContext };
};

// A reader's browser locales don't change mid-session, so there is nothing to subscribe to.
const noLocaleChanges = () => () => {};

/**
 * The reader's own language, or null while prerendering. The app is a static export with no server
 * to negotiate content, so the reader's locale is unknowable until the browser has it;
 * useSyncExternalStore lets the real locale take over at hydration without a markup mismatch.
 * Null also keeps the prerender from rendering a Translation Tab it cannot load text for.
 */
function useReaderLanguage(): TranslationLanguage | null {
  return useSyncExternalStore(
    noLocaleChanges,
    () => detectTranslationLanguage(navigator.languages),
    () => null,
  );
}

const defaultTabs = (readerLanguage: TranslationLanguage | null): Tab[] =>
  readerLanguage ? [translationTab(readerLanguage)] : [];

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const readerLanguage = useReaderLanguage();
  // Null until the reader opens or closes something themselves — see `tabs` below.
  const [chosenTabs, setChosenTabs] = useState<Tab[] | null>(null);
  const [requestedTabId, setRequestedTabId] = useState<string | null>(null);

  // A first visit shouldn't be Arabic-only text with no obvious way to get a translation, so
  // until the reader arranges their own Tabs they get one in their own language. Deriving that
  // rather than seeding state keeps "reader closed every Tab" distinct from "reader hasn't
  // touched anything yet", so a closed Tab stays closed.
  const tabs = useMemo(
    () => chosenTabs ?? defaultTabs(readerLanguage),
    [chosenTabs, readerLanguage],
  );

  // Derived rather than stored, so closing the active Tab falls back to the first remaining one
  // without closeTab having to reach into the Tab list to fix the selection up.
  const activeTabId = tabs.find((tab) => tab.id === requestedTabId)?.id ?? tabs[0]?.id ?? null;

  // Every rearrangement starts from what the reader can currently see, which is the derived
  // default until they've chosen for themselves.
  const rearrangeTabs = useCallback(
    (rearrange: (visible: Tab[]) => Tab[]) => {
      setChosenTabs((chosen) => rearrange(chosen ?? defaultTabs(readerLanguage)));
    },
    [readerLanguage],
  );

  // Opening a Tab the reader already has open focuses it instead of stacking a duplicate.
  const openTab = useCallback(
    (tab: Tab) => {
      rearrangeTabs((visible) =>
        visible.some((open) => open.id === tab.id) ? visible : [...visible, tab],
      );
      setRequestedTabId(tab.id);
    },
    [rearrangeTabs],
  );

  const openTranslationTab = useCallback(
    (language: TranslationLanguage) => openTab(translationTab(language)),
    [openTab],
  );

  const openTafsirTab = useCallback(
    (source: TafsirSource, language: TranslationLanguage) => openTab(tafsirTab(source, language)),
    [openTab],
  );

  // Every other Tab is identified by what it shows, so opening one twice focuses it. A conversation
  // has no such identity: its number comes from the Tabs the reader can see, which makes every
  // press a Tab openTab has never seen and so always a new conversation. Asking about a second
  // selection therefore leaves the first conversation intact, to come back to.
  const openAiTab = useCallback(
    (verseContext?: VerseContext) => openTab(nextAiTab(tabs, verseContext)),
    [openTab, tabs],
  );

  const closeTab = useCallback(
    (id: string) => {
      rearrangeTabs((visible) => visible.filter((tab) => tab.id !== id));
    },
    [rearrangeTabs],
  );

  const value = useMemo(
    () => ({
      tabs,
      activeTabId,
      readerLanguage,
      openTranslationTab,
      openTafsirTab,
      openAiTab,
      closeTab,
      activateTab: setRequestedTabId,
    }),
    [tabs, activeTabId, readerLanguage, openTranslationTab, openTafsirTab, openAiTab, closeTab],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}
