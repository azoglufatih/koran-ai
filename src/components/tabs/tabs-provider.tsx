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
import type { TranslationLanguage } from "@/content/quran";

/**
 * A Tab the reader has opened alongside the Reading Pane. Translation is the only kind so far;
 * Tafsir and AI Tabs join this union as they land.
 */
export interface TranslationTab {
  id: string;
  kind: "translation";
  language: TranslationLanguage;
}

export type Tab = TranslationTab;

interface TabsValue {
  tabs: Tab[];
  activeTabId: string | null;
  /** The reader's own language, or null before hydration — the prerender cannot know it. */
  readerLanguage: TranslationLanguage | null;
  /** Opens a Translation Tab for the language, or focuses it if one is already open. */
  openTranslationTab(language: TranslationLanguage): void;
  closeTab(id: string): void;
  activateTab(id: string): void;
}

const TabsContext = createContext<TabsValue | null>(null);

export function useTabs(): TabsValue {
  const value = useContext(TabsContext);
  if (!value) throw new Error("useTabs must be used inside a TabsProvider");
  return value;
}

const translationTabId = (language: TranslationLanguage) => `translation:${language}`;

const translationTab = (language: TranslationLanguage): Tab => ({
  id: translationTabId(language),
  kind: "translation",
  language,
});

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

  const openTranslationTab = useCallback(
    (language: TranslationLanguage) => {
      const id = translationTabId(language);
      rearrangeTabs((visible) =>
        visible.some((tab) => tab.id === id) ? visible : [...visible, translationTab(language)],
      );
      setRequestedTabId(id);
    },
    [rearrangeTabs],
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
      closeTab,
      activateTab: setRequestedTabId,
    }),
    [tabs, activeTabId, readerLanguage, openTranslationTab, closeTab],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}
