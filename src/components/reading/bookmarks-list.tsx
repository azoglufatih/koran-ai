"use client";

import { useEffect } from "react";
import Link from "next/link";
import { quranContent } from "@/content/bundled-quran";
import { ayahAnchorId } from "@/components/ayah-anchor";
import type { AyahRef, SurahSummary } from "@/content/quran";
import { useBookmarks } from "./use-reading-memory";

interface ListedBookmark {
  ref: AyahRef;
  surah: SurahSummary;
}

const ayahExists = (ref: AyahRef, surah: SurahSummary) => ref.ayah <= surah.ayahCount;

/**
 * A bookmark is only as good as the Ayah it leads to, and what a reader's browser holds is not
 * guaranteed to be one — an older version of the app, or their own edit, could name an Ayah past
 * the end of its Surah. Those are left out rather than offered as links into nothing.
 */
function listedBookmarks(refs: readonly AyahRef[]): ListedBookmark[] {
  return refs.flatMap((ref) => {
    const surah = quranContent.getSurahSummary(ref.surah);
    return surah && ayahExists(ref, surah) ? [{ ref, surah }] : [];
  });
}

const leadsNowhere = (ref: AyahRef) => {
  const surah = quranContent.getSurahSummary(ref.surah);
  return !surah || !ayahExists(ref, surah);
};

export function BookmarksList() {
  const { bookmarks, toggle } = useBookmarks();
  const listed = listedBookmarks(bookmarks);

  // A bookmark that leads nowhere is one the reader can neither see nor press Remove on, so it
  // would sit in their browser forever. Nothing is lost by clearing it: it named no Ayah.
  useEffect(() => {
    for (const ref of bookmarks.filter(leadsNowhere)) toggle(ref);
  }, [bookmarks, toggle]);

  if (listed.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-dashed border-black/15 px-4 py-6 text-center text-sm text-black/55 dark:border-white/15 dark:text-white/55">
        No bookmarks yet. Press the &#9734; beside any Ayah while reading, and it will be here.
      </p>
    );
  }

  return (
    <ul className="mt-6 space-y-2">
      {listed.map(({ ref, surah }) => (
        <li
          key={`${ref.surah}:${ref.ayah}`}
          className="flex items-center gap-3 rounded-lg border border-black/10 px-3 py-2.5 dark:border-white/10"
        >
          <Link
            href={`/surah/${ref.surah}#${ayahAnchorId(ref.ayah)}`}
            className="flex min-w-0 flex-1 items-center gap-3 hover:underline"
          >
            <span className="w-12 shrink-0 text-sm tabular-nums text-black/40 dark:text-white/40">
              {ref.surah}:{ref.ayah}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{surah.transliteratedName}</span>
              <span className="block truncate text-xs text-black/50 dark:text-white/50">
                Ayah {ref.ayah} of {surah.ayahCount}
              </span>
            </span>
            <span dir="rtl" lang="ar" className="font-arabic shrink-0 text-lg">
              {surah.arabicName}
            </span>
          </Link>

          <button
            type="button"
            onClick={() => toggle(ref)}
            aria-label={`Remove bookmark on Ayah ${ref.surah}:${ref.ayah}`}
            className="shrink-0 rounded px-2 py-1 text-xs text-black/45 hover:bg-black/[0.06] hover:text-black dark:text-white/45 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
