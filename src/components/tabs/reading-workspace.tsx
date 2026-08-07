"use client";

import { AskAboutSelection } from "@/components/selection/ask-about-selection";
import { useTabs } from "./tabs-provider";
import { TabWorkspace } from "./tab-workspace";

/**
 * The Reading Pane and the reader's open Tabs. Wide screens set them side by side in their own
 * scrollers, so an Ayah and its translation stay on screen together instead of the Tab sitting a
 * whole Surah below the Arabic. Narrower screens stack them, and Tabs swipe.
 *
 * The Reading Pane is passed in as children so it stays a Server Component — the whole Surah's
 * Arabic is prerendered, and only the Tab arrangement around it is client-side.
 */
export function ReadingWorkspace({
  surahNumber,
  children,
}: {
  surahNumber: number;
  children: React.ReactNode;
}) {
  const { tabs } = useTabs();
  const sideBySide = tabs.length > 0;

  return (
    <div className={`mx-auto max-w-3xl ${sideBySide ? "xl:max-w-7xl" : ""}`}>
      <div className={sideBySide ? "xl:grid xl:grid-cols-2 xl:items-start xl:gap-10" : ""}>
        <div
          className={
            sideBySide ? "min-w-0 xl:h-[calc(100dvh-9rem)] xl:overflow-y-auto xl:pr-3" : ""
          }
        >
          {children}
        </div>

        <TabWorkspace surahNumber={surahNumber} />
      </div>

      <AskAboutSelection />
    </div>
  );
}
