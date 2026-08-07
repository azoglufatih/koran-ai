"use client";

import { quranContent } from "@/content/bundled-quran";
import type { TranslationEdition } from "@/content/quran";
import { useTabs, type Tab } from "./tabs-provider";
import { TranslationTabContent } from "./translation-tab-content";

const editions = quranContent.listTranslationEditions();
const editionsByLanguage = new Map(editions.map((edition) => [edition.language, edition]));

function tabLabel(tab: Tab): string {
  return editionsByLanguage.get(tab.language)?.label ?? tab.language;
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

        <p className="flex-1 text-sm text-black/55 md:hidden dark:text-white/55">
          {tabs.length > 1 ? `${tabs.length} Tabs — swipe to compare` : "Translation"}
        </p>

        <OpenTranslationTab />
      </div>

      {tabs.length === 0 ? (
        <p className="py-6 text-sm text-black/45 dark:text-white/45">
          {readerLanguage === null
            ? "Opening a translation…"
            : "No Tabs open — the Reading Pane is showing Arabic only. Add a translation above."}
        </p>
      ) : (
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 md:mx-0 md:block md:snap-none md:overflow-x-visible md:px-0 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-3">
          {tabs.map((tab) => (
            <article
              key={tab.id}
              className={`shrink-0 snap-start md:w-full ${tabs.length > 1 ? "w-[88%]" : "w-full"} ${
                tab.id === activeTabId ? "" : "md:hidden"
              }`}
            >
              <header className="flex items-center justify-between gap-2 py-2 md:hidden">
                <h2 className="text-sm font-medium">{tabLabel(tab)}</h2>
                <CloseTabButton label={tabLabel(tab)} onClose={() => closeTab(tab.id)} />
              </header>

              <TranslationTabContent surahNumber={surahNumber} language={tab.language} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
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
  const isOpen = (edition: TranslationEdition) =>
    tabs.some((tab) => tab.language === edition.language);

  return (
    <details className="relative shrink-0">
      <summary className="cursor-pointer list-none rounded-lg border border-black/15 px-3 py-1.5 text-sm text-black/65 marker:content-none hover:text-black dark:border-white/15 dark:text-white/65 dark:hover:text-white">
        + Translation
      </summary>
      <ul className="bg-parchment dark:bg-night absolute right-0 z-20 mt-1 w-48 rounded-lg border border-black/10 p-1 shadow-lg dark:border-white/10">
        {editions.map((edition) => (
          <li key={edition.language}>
            <button
              type="button"
              onClick={() => openTranslationTab(edition.language)}
              className="flex w-full items-baseline justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
            >
              {edition.label}
              {isOpen(edition) && (
                <span className="text-xs text-black/40 dark:text-white/40">open</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
