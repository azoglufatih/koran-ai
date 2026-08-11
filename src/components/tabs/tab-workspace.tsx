"use client";

import { useEffect, useRef } from "react";
import { languageLabel } from "./reader-languages";
import { useTabs } from "./tabs-provider";
import { aiTabAyah, type Tab } from "./tabs";
import { inColumn, newColumn, type Column } from "./column-arrangement";
import { AddTabMenu } from "./add-tab-menu";
import { AiTabContent } from "./ai-tab-content";
import { TafsirTabContent } from "./tafsir-tab-content";
import { TranslationTabContent } from "./translation-tab-content";

function tabLabel(tab: Tab): string {
  switch (tab.kind) {
    case "translation":
      return languageLabel(tab.language);
    case "tafsir":
      return `Tafsir · ${languageLabel(tab.language)}`;
    case "ai": {
      // A conversation about an Ayah is named after it: with several AI Tabs open, "AI · 2:40"
      // says which is which where a bare number cannot. Read off the reference rather than the
      // Verse Context, so a restored Tab is named right while it is still reading the texts back.
      const ayah = aiTabAyah(tab);
      return ayah ? `AI · ${ayah.surah}:${ayah.ayah}` : `AI ${tab.conversation}`;
    }
  }
}

/**
 * The `+` that belongs to the workspace rather than to any one Column: what it opens becomes the
 * first Tab of a new Column beside the ones already there.
 *
 * At the cap it is disabled with the reason showing rather than hidden, and the `+` in each
 * Column's own strip keeps working — so a full workspace pushes the reader into stacking Tabs
 * rather than merely refusing them (docs/adr/0006-columns-of-tabs.md).
 */
const REASON_ID = "workspace-full";

/**
 * The Tab the reader is looking at, marked so a switch can scroll it into view. That is the whole
 * of what it is for: a selection asked about here is grounded in every Tab the reader has open
 * rather than in the one on screen, so nothing outside this file reads it.
 */
const SHOWING_MARK = "data-tab-active";

const showingMarks = (isShowing: boolean) => (isShowing ? { [SHOWING_MARK]: "" } : {});

export function AddColumn() {
  const { columns, sideBySideCap, openTab } = useTabs();

  const isFull = sideBySideCap > 0 && columns.length >= sideBySideCap;
  const reason = isFull ? "No room for another Column — add a Tab to one instead" : undefined;
  const last = columns.at(-1);

  return (
    <div className="flex items-center justify-end gap-3">
      {/* Read out with the button rather than hidden from it: a disabled button cannot be focused,
          so this line is the only way the reason reaches a reader who is not looking at it. */}
      {reason && (
        <p id={REASON_ID} className="truncate text-xs text-black/45 dark:text-white/45">
          {reason}
        </p>
      )}

      <AddTabMenu
        label="+"
        title="Open a translation, a tafsir, or AI"
        disabledReason={reason}
        describedBy={reason && REASON_ID}
        // Below `xl` nothing sits beside anything, so this appends to the strip the reader can see
        // — which is the last Column — rather than making one they have no way to tell apart.
        onChoose={(openable) =>
          openTab(openable, sideBySideCap === 0 && last ? inColumn(last.id) : newColumn)
        }
      />
    </div>
  );
}

/**
 * The reader's Columns, beside the Reading Pane.
 *
 * One arrangement, rendered two ways by CSS rather than by two trees of components. At `xl` and
 * wider each Column is a flex item of the workspace with its own strip, showing one Tab at a time.
 * Below that nothing can sit beside anything, so every Column turns to `display: contents` and its
 * Tabs become panels of the one swipeable strip the reader had before Columns existed — the
 * grouping hidden at that width, not discarded (docs/adr/0006-columns-of-tabs.md).
 */
export function TabWorkspace({ surahNumber }: { surahNumber: number }) {
  const { columns, tabs, focusedTabId, readerLanguage, sideBySideCap } = useTabs();
  const strip = useShowingFocusedTab(focusedTabId);

  if (columns.length === 0) {
    return (
      <p className="mt-10 border-t border-black/10 py-6 text-sm text-black/45 xl:hidden dark:border-white/10 dark:text-white/45">
        {readerLanguage === null
          ? "Opening a translation…"
          : "No Tabs open — the Reading Pane is showing Arabic only. Add a translation with the + above."}
      </p>
    );
  }

  return (
    <div
      ref={strip}
      className="-mx-4 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto border-t border-black/10 px-4 pt-6 xl:contents dark:border-white/10"
    >
      {columns.map((column) => (
        <ReaderColumn
          key={column.id}
          column={column}
          surahNumber={surahNumber}
          // Which Tab the reader is looking at differs by width: every Column shows one when they
          // sit side by side, and the strip shows one in total when they cannot — and only then is
          // there anywhere to scroll to.
          focusedTabId={sideBySideCap === 0 ? focusedTabId : null}
          // A single Tab fills the strip; several make it worth swiping between.
          panelWidth={tabs.length > 1 ? "w-[88%]" : "w-full"}
        />
      ))}
    </div>
  );
}

function ReaderColumn({
  column,
  surahNumber,
  focusedTabId,
  panelWidth,
}: {
  column: Column;
  surahNumber: number;
  focusedTabId: string | null;
  panelWidth: string;
}) {
  const { openTab, closeTab, activateTab } = useTabs();
  const isShowing = (tab: Tab) =>
    focusedTabId === null ? tab.id === column.activeTabId : tab.id === focusedTabId;

  return (
    <div className="contents xl:flex xl:h-[calc(100dvh-9rem)] xl:min-w-0 xl:flex-1 xl:basis-0 xl:flex-col">
      <div className="hidden items-end gap-2 xl:flex xl:shrink-0">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1" role="tablist">
          {column.tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center rounded-t-lg border-b-2 ${
                tab.id === column.activeTabId
                  ? "border-b-black/70 dark:border-b-white/70"
                  : "border-b-transparent"
              }`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab.id === column.activeTabId}
                onClick={() => activateTab(tab.id)}
                className="px-3 py-1.5 text-sm hover:text-black dark:hover:text-white"
              >
                {tabLabel(tab)}
              </button>
              <CloseTabButton label={tabLabel(tab)} onClose={() => closeTab(tab.id)} />
            </div>
          ))}
        </div>

        {/* Never disabled, whatever the workspace `+` is doing: the ceiling on Columns is what
            pushes the reader into this one, so it has to keep working at the cap. */}
        <AddTabMenu
          label="+"
          title="Add a Tab to this Column"
          onChoose={(openable) => openTab(openable, inColumn(column.id))}
        />
      </div>

      <div className="contents xl:block xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-3">
        {column.tabs.map((tab) => (
          <article
            key={tab.id}
            {...showingMarks(isShowing(tab))}
            className={`shrink-0 snap-start xl:w-full ${panelWidth} ${
              tab.id === column.activeTabId ? "" : "xl:hidden"
            }`}
          >
            <header className="flex items-center justify-between gap-2 py-2 xl:hidden">
              <h2 className="text-sm font-medium">{tabLabel(tab)}</h2>
              <CloseTabButton label={tabLabel(tab)} onClose={() => closeTab(tab.id)} />
            </header>

            <TabContent tab={tab} surahNumber={surahNumber} />
          </article>
        ))}
      </div>
    </div>
  );
}

/**
 * Brings a Tab the reader has just switched to into view. Below `xl` the Tabs are a swipeable strip
 * under the Reading Pane, so asking about a selection would otherwise open an AI Tab off-screen and
 * look like nothing happened. Only movement the reader caused scrolls: the Tab showing on arrival
 * is left where it is, at the bottom of a page they haven't read yet.
 */
function useShowingFocusedTab(focusedTabId: string | null) {
  const strip = useRef<HTMLDivElement>(null);
  const showing = useRef<string | null>(null);

  useEffect(() => {
    const switched = showing.current !== null && showing.current !== focusedTabId;
    showing.current = focusedTabId;
    if (!switched) return;

    // "nearest" leaves a Tab already on screen alone — where the Columns sit side by side, every
    // switch is one.
    strip.current
      ?.querySelector(`[${SHOWING_MARK}]`)
      ?.scrollIntoView({ block: "nearest", inline: "start" });
  }, [focusedTabId]);

  return strip;
}

function TabContent({ tab, surahNumber }: { tab: Tab; surahNumber: number }) {
  switch (tab.kind) {
    case "translation":
      return <TranslationTabContent surahNumber={surahNumber} language={tab.language} />;
    case "tafsir":
      return <TafsirTabContent surahNumber={surahNumber} source={tab.source} language={tab.language} />;
    case "ai":
      return <AiTabContent tab={tab} />;
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
