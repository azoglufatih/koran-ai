"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { detectTranslationLanguage } from "@/content/translation-language";
import type { TranslationLanguage } from "@/content/quran";
import type { VerseContext } from "@/ai/verse-context";
import { browserStorage, rememberedInBrowser } from "@/components/reading/remembered-in-browser";
import type { Openable } from "./openables";
import {
  inColumn,
  newColumn,
  tabsIn,
  withTabActivated,
  withTabClosed,
  withTabOpened,
  type Column,
  type ColumnTarget,
} from "./column-arrangement";
import { aiTab, nextConversation, tafsirTab, translationTab, type Tab } from "./tabs";
import {
  readColumnArrangement,
  restoredColumns,
  writeColumnArrangement,
} from "./stored-arrangement";
import { useSideBySideCap } from "./side-by-side-cap";

interface TabsValue {
  /** The reader's Columns, left to right. The Reading Pane is not among them — it is not theirs
   * to arrange, and cannot be closed. */
  columns: Column[];
  /** Every Tab of every Column, in the order they sit on screen. */
  tabs: Tab[];
  /**
   * The Tab the reader is on where Columns cannot show — the narrow-screen strip, which is every
   * Tab of every Column in one swipeable row. Each Column names its own showing Tab besides.
   */
  focusedTabId: string | null;
  /** The reader's own language, or null before hydration — the prerender cannot know it. */
  readerLanguage: TranslationLanguage | null;
  /** How many reader Columns fit beside the Reading Pane at this width; 0 below `xl`. */
  sideBySideCap: number;
  /**
   * Opens the chosen thing where it was asked for, or focuses the Tab already showing it. AI is
   * the exception twice over: every choice of it is a new conversation rather than a focus of one
   * open, and it picks its own Column rather than taking the target.
   */
  openTab(openable: Openable, target: ColumnTarget): void;
  /**
   * Opens a new AI Tab grounded in one Ayah — the way in from a selection, as against picking AI
   * out of the menu, which starts an open-ended conversation about the Surah at large.
   */
  openAiTab(verseContext?: VerseContext): void;
  /** Closes the Tab, and the Column with it if that was its last. */
  closeTab(id: string): void;
  /** Brings the Tab to the front of the Column holding it, and focuses it in the strip. */
  activateTab(id: string): void;

  /**
   * The one menu open anywhere in the workspace, named by whatever opened it, or null when none is.
   * There are several `+` buttons on screen and a scheme picker beside them, and a reader opening
   * one menu means they are done with the last — which only holds if they all share this.
   */
  openMenuId: string | null;
  /** Opens this menu, closing whichever was open; opening the one already open closes it. */
  toggleMenu(id: string): void;
  closeMenu(): void;
}

const TabsContext = createContext<TabsValue | null>(null);

export function useTabs(): TabsValue {
  const value = useContext(TabsContext);
  if (!value) throw new Error("useTabs must be used inside a TabsProvider");
  return value;
}

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

/**
 * What the reader arranged last time, or null if they have not arranged anything — including while
 * prerendering, since a static export has no reader's browser to read from until hydration. The
 * two are deliberately different answers: null falls through to the first-visit default below,
 * while an empty list is a reader who closed every Column and should get an empty workspace back.
 */
const arrangementInBrowser = rememberedInBrowser<Column[] | null>((storage) => {
  const stored = readColumnArrangement(storage);
  return stored && restoredColumns(stored);
}, null);

const defaultColumns = (readerLanguage: TranslationLanguage | null): Column[] => {
  if (!readerLanguage) return [];
  const tab = translationTab(readerLanguage);
  return [{ id: "column:1", tabs: [tab], activeTabId: tab.id }];
};

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const readerLanguage = useReaderLanguage();
  const sideBySideCap = useSideBySideCap();
  // Null until the reader arranges something in this session — see `columns` below.
  const [chosenColumns, setChosenColumns] = useState<Column[] | null>(null);
  const restored = useSyncExternalStore(
    arrangementInBrowser.subscribe,
    arrangementInBrowser.getSnapshot,
    arrangementInBrowser.getServerSnapshot,
  );
  const [requestedTabId, setRequestedTabId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // What the reader arranged in this session, else what they arranged in the last one, else the
  // first visit — which shouldn't be Arabic-only text with no obvious way to get a translation, so
  // it is one Tab in their own language. Deriving that rather than seeding state keeps "reader
  // closed everything" distinct from "reader hasn't touched anything yet", so a closed Column
  // stays closed and an empty workspace comes back empty.
  const columns = useMemo(
    () => chosenColumns ?? restored ?? defaultColumns(readerLanguage),
    [chosenColumns, restored, readerLanguage],
  );

  // Only ever what the reader arranged in this session. Writing the restored or derived value back
  // would turn "hasn't touched anything yet" into "chose this", and a first Translation Tab that
  // was auto-detected once would go on being their choice in a language they may since have
  // stopped reading in.
  useEffect(() => {
    if (chosenColumns) writeColumnArrangement(browserStorage(), chosenColumns);
  }, [chosenColumns]);

  const tabs = useMemo(() => tabsIn(columns), [columns]);

  // The one Tab the reader is on where Columns cannot show — the narrow-screen strip, where every
  // Tab of every Column is one swipeable panel. Derived rather than stored, so closing the Tab it
  // named falls back to one still open without closeTab having to fix it up.
  const focusedTabId = tabs.find((tab) => tab.id === requestedTabId)?.id ?? tabs[0]?.id ?? null;

  // Every rearrangement starts from what the reader can currently see, which is the derived
  // default until they've arranged things for themselves.
  const rearrange = useCallback(
    (arrange: (visible: Column[]) => Column[]) => {
      setChosenColumns((chosen) => arrange(chosen ?? restored ?? defaultColumns(readerLanguage)));
    },
    [restored, readerLanguage],
  );

  const showTab = useCallback(
    (tab: Tab, target: ColumnTarget) => {
      rearrange((visible) => withTabOpened(visible, tab, target));
      setRequestedTabId(tab.id);
    },
    [rearrange],
  );

  // Every other Tab is identified by what it shows, so opening one twice focuses it. A conversation
  // has no such identity: its number comes from the Tabs the reader can see, which makes every one
  // a Tab the arrangement has never seen and so always a new conversation. Asking about a second
  // selection therefore leaves the first conversation intact, to come back to.
  //
  // It lands in a Column of its own while there is width for one, and joins the last Column when
  // there is not — which is also what happens on a narrow screen, where the cap is zero because
  // nothing can sit beside anything anyway.
  // Where a conversation the reader did not ask for a place for should go: a Column of its own
  // while there is width for one, and the last Column when there is not — which is also what
  // happens on a narrow screen, where the cap is zero because nothing sits beside anything anyway.
  const columnForNewConversation = useCallback((): ColumnTarget => {
    const last = columns.at(-1);
    return !last || columns.length < sideBySideCap ? newColumn : inColumn(last.id);
  }, [columns, sideBySideCap]);

  const openAiTab = useCallback(
    (verseContext?: VerseContext) =>
      showTab(aiTab(nextConversation(tabs), { verseContext }), columnForNewConversation()),
    [showTab, tabs, columnForNewConversation],
  );

  const openTab = useCallback(
    (openable: Openable, target: ColumnTarget) => {
      switch (openable.kind) {
        case "translation":
          return showTab(translationTab(openable.language), target);
        case "tafsir":
          return showTab(tafsirTab(openable.source, openable.language), target);
        case "ai":
          // No Verse Context: chosen from a menu rather than from a selection, this is a question
          // about the Surah at large. It still lands where the menu that opened it says — a `+` in
          // a Column's own strip adds to that Column, AI included, which is what keeps that `+`
          // useful once the workspace is too full for another Column.
          return showTab(aiTab(nextConversation(tabs), {}), target);
      }
    },
    [showTab, tabs],
  );

  const closeTab = useCallback(
    (id: string) => rearrange((visible) => withTabClosed(visible, id)),
    [rearrange],
  );

  const activateTab = useCallback(
    (id: string) => {
      rearrange((visible) => withTabActivated(visible, id));
      setRequestedTabId(id);
    },
    [rearrange],
  );

  const toggleMenu = useCallback(
    (id: string) => setOpenMenuId((open) => (open === id ? null : id)),
    [],
  );

  const closeMenu = useCallback(() => setOpenMenuId(null), []);

  const value = useMemo(
    () => ({
      columns,
      tabs,
      focusedTabId,
      readerLanguage,
      sideBySideCap,
      openTab,
      openAiTab,
      closeTab,
      activateTab,
      openMenuId,
      toggleMenu,
      closeMenu,
    }),
    [
      columns,
      tabs,
      focusedTabId,
      readerLanguage,
      sideBySideCap,
      openTab,
      openAiTab,
      closeTab,
      activateTab,
      openMenuId,
      toggleMenu,
      closeMenu,
    ],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}
