"use client";

import { useEffect } from "react";
import { arabicAyahTexts } from "@/components/selection/ayah-marks";
import { sameAyah, type AyahRef } from "@/content/quran";
import { ayahAtReadingEdge } from "./ayah-at-reading-edge";
import { rememberReadingPosition, storedReadingPosition } from "./use-reading-memory";

/**
 * Where the reading starts on screen. The header is stuck over the top of the text, so the window's
 * own top edge is not what the reader can see from.
 */
function readingEdge(page: Document): number {
  return page.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
}

/**
 * Keeps the reader's place for them. Nothing is asked of the reader — they read, and the Ayah in
 * front of them is what they come back to, which is the whole point of not making them keep the
 * place themselves.
 *
 * Watching which Ayahs are on screen rather than listening for scrolls means the browser reports
 * only when the answer can have changed, and means the Ayahs clipped away by the Reading Pane's own
 * scroller on a wide screen count as off screen without this having to know about that layout.
 */
export function ReadingPositionTracker({ surahNumber }: { surahNumber: number }) {
  useEffect(() => {
    const leftOff = storedReadingPosition();
    const ayahs = arabicAyahTexts(document);
    const refs = new Map(ayahs.map(({ element, ref }) => [element, ref]));

    const onScreen = new Map<Element, AyahRef>();
    let at: AyahRef | null = null;

    const report = () => {
      // Read every position at one moment: tops taken at different times measure different scrolls.
      const inView = [...onScreen].map(([element, ref]) => ({
        ref,
        top: element.getBoundingClientRect().top,
      }));

      const reached = ayahAtReadingEdge(inView, readingEdge(document));
      // Writing only on a change keeps a scroll through a Surah from being a write per Ayah edge
      // crossed, and keeps the other tabs it announces to quiet while the reader sits still.
      if (!reached || (at && sameAyah(reached, at))) return;

      const arriving = at === null;
      at = reached;

      // Opening a Surah is not reading it. Landing at the top of the one the reader left off in
      // would otherwise overwrite the Ayah they stopped at before they had read a word of it —
      // and that Ayah is exactly what they came back for. Arriving anywhere else is worth
      // remembering: it is how a Surah read without scrolling is remembered at all.
      if (arriving && leftOff?.surah === surahNumber) return;

      rememberReadingPosition(reached);
    };

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const ref = refs.get(entry.target);
        if (!ref) continue;

        if (entry.isIntersecting) onScreen.set(entry.target, ref);
        else onScreen.delete(entry.target);
      }
      report();
    });

    for (const { element } of ayahs) observer.observe(element);

    return () => observer.disconnect();
  }, [surahNumber]);

  return null;
}
