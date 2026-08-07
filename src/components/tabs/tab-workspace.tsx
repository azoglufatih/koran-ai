"use client";

import { useEffect, useRef } from "react";
import { TAFSIR_SOURCES, type TranslationLanguage } from "@/content/quran";
import { activeTabMarks } from "@/components/selection/ayah-marks";
import { languageLabel, readerLanguages } from "./reader-languages";
import { tafsirLanguages } from "./tafsir-editions";
import { tafsirTabId, translationTabId, useTabs, type Tab } from "./tabs-provider";
import { AiTabContent } from "./ai-tab-content";
import { TafsirTabContent } from "./tafsir-tab-content";
import { TranslationTabContent } from "./translation-tab-content";

// v1 ships one tafsir; when a second lands, the Tafsir menu grows a source dimension.
const [TAFSIR_SOURCE] = TAFSIR_SOURCES;

const languagesWithTafsir = new Set(tafsirLanguages(TAFSIR_SOURCE));

function tabLabel(tab: Tab): string {
  switch (tab.kind) {
    case "translation":
      return languageLabel(tab.language);
    case "tafsir":
      return `Tafsir · ${languageLabel(tab.language)}`;
    case "ai":
      // A conversation about an Ayah is named after it: with several AI Tabs open, "AI · 2:40"
      // says which is which where a bare number cannot.
      return tab.verseContext
        ? `AI · ${tab.verseContext.ref.surah}:${tab.verseContext.ref.ayah}`
        : `AI ${tab.conversation}`;
  }
}

/**
 * The Tabs the reader has open alongside the Reading Pane. Desktop gets a horizontal strip with
 * one panel showing at a time; mobile gets the same Tabs as swipeable panels, since a strip of
 * them is unusable at that width. Both read the one Tab list from TabsProvider.
 *
 * Once ReadingWorkspace puts this beside the Reading Pane, the strip stays put and only the
 * panels scroll — the divider that separates the two when stacked is no longer needed.
 */
export function TabWorkspace({ surahNumber }: { surahNumber: number }) {
  const { tabs, activeTabId, readerLanguage, closeTab, activateTab } = useTabs();
  const sideBySide = tabs.length > 0;
  const panels = useShowingActiveTab(activeTabId);

  return (
    <section
      className={`mt-10 border-t border-black/10 pt-6 dark:border-white/10 ${
        sideBySide
          ? "xl:mt-0 xl:flex xl:h-[calc(100dvh-9rem)] xl:flex-col xl:border-t-0 xl:pt-0"
          : ""
      }`}
    >
      <div className="flex items-end gap-3 xl:shrink-0">
        <div className="hidden min-w-0 flex-1 flex-wrap gap-1 md:flex" role="tablist">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center rounded-t-lg border-b-2 ${
                tab.id === activeTabId
                  ? "border-b-black/70 dark:border-b-white/70"
                  : "border-b-transparent"
              }`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab.id === activeTabId}
                onClick={() => activateTab(tab.id)}
                className="px-3 py-1.5 text-sm hover:text-black dark:hover:text-white"
              >
                {tabLabel(tab)}
              </button>
              <CloseTabButton label={tabLabel(tab)} onClose={() => closeTab(tab.id)} />
            </div>
          ))}
        </div>

        <p className="flex-1 truncate text-sm text-black/55 md:hidden dark:text-white/55">
          {tabs.length > 1
            ? `${tabs.length} Tabs — swipe to compare`
            : tabs[0] && tabLabel(tabs[0])}
        </p>

        <OpenTranslationTab />
        <OpenTafsirTab />
        <OpenAiTab />
      </div>

      {tabs.length === 0 ? (
        <p className="py-6 text-sm text-black/45 dark:text-white/45">
          {readerLanguage === null
            ? "Opening a translation…"
            : "No Tabs open — the Reading Pane is showing Arabic only. Add a translation above."}
        </p>
      ) : (
        <div
          ref={panels}
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 md:mx-0 md:block md:snap-none md:overflow-x-visible md:px-0 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-3"
        >
          {tabs.map((tab) => (
            <article
              key={tab.id}
              {...activeTabMarks(tab.id === activeTabId)}
              className={`shrink-0 snap-start md:w-full ${tabs.length > 1 ? "w-[88%]" : "w-full"} ${
                tab.id === activeTabId ? "" : "md:hidden"
              }`}
            >
              <header className="flex items-center justify-between gap-2 py-2 md:hidden">
                <h2 className="text-sm font-medium">{tabLabel(tab)}</h2>
                <CloseTabButton label={tabLabel(tab)} onClose={() => closeTab(tab.id)} />
              </header>

              <TabContent tab={tab} surahNumber={surahNumber} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Brings a Tab the reader has just switched to into view. On mobile the Tabs are a swipeable strip
 * below the Reading Pane, so asking about a selection would otherwise open an AI Tab off-screen
 * and look like nothing happened. Only movement the reader caused scrolls: the Tab showing on
 * arrival is left where it is, at the bottom of a page they haven't read yet.
 */
function useShowingActiveTab(activeTabId: string | null) {
  const panels = useRef<HTMLDivElement>(null);
  const showing = useRef<string | null>(null);

  useEffect(() => {
    const switched = showing.current !== null && showing.current !== activeTabId;
    showing.current = activeTabId;
    if (!switched) return;

    // "nearest" leaves a Tab already on screen alone — on a wide screen, every switch is one.
    panels.current
      ?.querySelector("[data-tab-active]")
      ?.scrollIntoView({ block: "nearest", inline: "start" });
  }, [activeTabId]);

  return panels;
}

function TabContent({ tab, surahNumber }: { tab: Tab; surahNumber: number }) {
  switch (tab.kind) {
    case "translation":
      return <TranslationTabContent surahNumber={surahNumber} language={tab.language} />;
    case "tafsir":
      return (
        <TafsirTabContent surahNumber={surahNumber} source={tab.source} language={tab.language} />
      );
    case "ai":
      return <AiTabContent verseContext={tab.verseContext} />;
  }
}

function CloseTabButton({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={`Close the ${label} Tab`}
      className="rounded px-1.5 py-1 text-black/35 hover:bg-black/[0.06] hover:text-black dark:text-white/35 dark:hover:bg-white/[0.08] dark:hover:text-white"
    >
      &times;
    </button>
  );
}

function OpenTranslationTab() {
  const { tabs, openTranslationTab } = useTabs();
  const isOpen = (language: TranslationLanguage) =>
    tabs.some((tab) => tab.id === translationTabId(language));

  return (
    <AddTabMenu label="+ Translation">
      {readerLanguages.map((language) => (
        <AddTabOption
          key={language}
          label={languageLabel(language)}
          hint={isOpen(language) ? "open" : undefined}
          onOpen={() => openTranslationTab(language)}
        />
      ))}
    </AddTabMenu>
  );
}

function OpenTafsirTab() {
  const { tabs, openTafsirTab } = useTabs();
  const isOpen = (language: TranslationLanguage) =>
    tabs.some((tab) => tab.id === tafsirTabId(TAFSIR_SOURCE, language));

  // A language without an edition still gets offered: the Tab it opens explains the gap, which is
  // more use to a reader than their language quietly missing from the menu.
  const hint = (language: TranslationLanguage) => {
    if (isOpen(language)) return "open";
    return languagesWithTafsir.has(language) ? undefined : "not yet";
  };

  return (
    <AddTabMenu label="+ Tafsir">
      {readerLanguages.map((language) => (
        <AddTabOption
          key={language}
          label={languageLabel(language)}
          hint={hint(language)}
          onOpen={() => openTafsirTab(TAFSIR_SOURCE, language)}
        />
      ))}
    </AddTabMenu>
  );
}

// No menu to choose from: every AI Tab is a new conversation, so the button is the whole choice.
function OpenAiTab() {
  const { openAiTab } = useTabs();

  return (
    <button
      type="button"
      // Called with no argument: a Tab opened from here is an open-ended conversation, and the
      // click event is not a Verse Context.
      onClick={() => openAiTab()}
      className="shrink-0 rounded-lg border border-black/15 px-3 py-1.5 text-sm text-black/65 hover:text-black dark:border-white/15 dark:text-white/65 dark:hover:text-white"
    >
      + AI
    </button>
  );
}

function AddTabMenu({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="relative shrink-0">
      <summary className="cursor-pointer list-none rounded-lg border border-black/15 px-3 py-1.5 text-sm text-black/65 marker:content-none hover:text-black dark:border-white/15 dark:text-white/65 dark:hover:text-white">
        {label}
      </summary>
      <ul className="bg-parchment dark:bg-night absolute right-0 z-20 mt-1 w-48 rounded-lg border border-black/10 p-1 shadow-lg dark:border-white/10">
        {children}
      </ul>
    </details>
  );
}

function AddTabOption({
  label,
  hint,
  onOpen,
}: {
  label: string;
  hint?: string;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-baseline justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
      >
        {label}
        {hint && <span className="text-xs text-black/40 dark:text-white/40">{hint}</span>}
      </button>
    </li>
  );
}
