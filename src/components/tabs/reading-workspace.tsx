"use client";

import { AskAboutSelection } from "@/components/selection/ask-about-selection";
import { TransliterationControls } from "@/components/reading/transliteration-controls";
import { TransliterationProvider } from "@/components/reading/transliteration-provider";
import { useTabs } from "./tabs-provider";
import { AddColumn, TabWorkspace } from "./tab-workspace";

/**
 * The reading workspace: a row of Columns, of which the Reading Pane is the first and the one the
 * reader cannot close. Each Column beside it holds one or more Tabs with one showing at a time,
 * and they share the width equally — order fixed, no resizing (docs/adr/0006-columns-of-tabs.md).
 *
 * Below `xl` nothing can sit beside anything, so the Reading Pane takes the full width and every
 * Tab of every Column becomes a panel of one swipeable strip beneath it.
 *
 * The Reading Pane is passed in as children so it stays a Server Component — the whole Surah's
 * Arabic is prerendered, and only the arrangement around it is client-side.
 */
export function ReadingWorkspace({
  surahNumber,
  children,
}: {
  surahNumber: number;
  children: React.ReactNode;
}) {
  const { columns } = useTabs();
  const sideBySide = columns.length > 0;

  return (
    // The Transliteration is fetched, so it is filled in under an Arabic that is already on screen
    // — which means the provider has to sit above the prerendered Reading Pane passed in as
    // children, rather than inside it (ADR 0005).
    <TransliterationProvider surahNumber={surahNumber}>
      {/* Bounded even at the cap: past about this, a row of Columns is further apart than it is
          readable, whatever the display can fit. */}
      <div className={`mx-auto max-w-3xl ${sideBySide ? "xl:max-w-[120rem]" : ""}`}>
        <AddColumn />

        <div className={sideBySide ? "xl:flex xl:items-start xl:gap-8" : ""}>
          <div
            className={
              sideBySide
                ? "min-w-0 xl:h-[calc(100dvh-9rem)] xl:flex-1 xl:basis-0 xl:overflow-y-auto xl:pr-3"
                : ""
            }
          >
            <TransliterationControls />
            {children}
          </div>

          <TabWorkspace surahNumber={surahNumber} />
        </div>

        <AskAboutSelection />
      </div>
    </TransliterationProvider>
  );
}
