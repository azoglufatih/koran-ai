"use client";

import Link from "next/link";
import { quranContent } from "@/content/bundled-quran";
import { ayahAnchorId } from "@/components/ayah-anchor";
import { useReadingPosition } from "./use-reading-memory";

/**
 * The way back to where the reader left off. Rendered as nothing at all until their browser says
 * they have a place to go back to — on a first visit, and through the prerender, there is none.
 */
export function ContinueReading() {
  const { position } = useReadingPosition();
  const summary = position && quranContent.getSurahSummary(position.surah);
  if (!position || !summary) return null;

  return (
    <Link
      href={`/surah/${position.surah}#${ayahAnchorId(position.ayah)}`}
      className="mt-6 flex items-center gap-3 rounded-lg border border-amber-600/30 bg-amber-500/[0.07] px-3 py-2.5 hover:border-amber-600/60 dark:border-amber-400/30 dark:hover:border-amber-400/60"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs uppercase tracking-widest text-black/40 dark:text-white/40">
          Continue reading
        </span>
        <span className="block truncate text-sm font-medium">
          {summary.transliteratedName} &middot; Ayah {position.ayah}
        </span>
      </span>
      <span dir="rtl" lang="ar" className="font-arabic shrink-0 text-lg">
        {summary.arabicName}
      </span>
    </Link>
  );
}
