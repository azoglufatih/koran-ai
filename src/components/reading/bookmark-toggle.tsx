"use client";

import type { AyahRef } from "@/content/quran";
import { useBookmark } from "./use-reading-memory";

/**
 * The reader's own mark on an Ayah, next to the Ayah number it belongs to.
 *
 * A client island inside the prerendered Reading Pane: the Arabic stays server-rendered, and only
 * the marks the reader made are filled in once their browser is there to say what they are.
 */
export function BookmarkToggle({ ayah }: { ayah: AyahRef }) {
  const { bookmarked, toggle } = useBookmark(ayah);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={bookmarked}
      aria-label={`Bookmark Ayah ${ayah.surah}:${ayah.ayah}`}
      title={bookmarked ? "Remove bookmark" : "Bookmark this Ayah"}
      className={`rounded px-1 py-0.5 text-sm leading-none hover:bg-black/[0.06] dark:hover:bg-white/[0.08] ${
        bookmarked
          ? "text-amber-600 dark:text-amber-400"
          : "text-black/20 hover:text-black/45 dark:text-white/20 dark:hover:text-white/45"
      }`}
    >
      {/* Filled once the reader has marked it, hollow until then. */}
      <span aria-hidden>{bookmarked ? "★" : "☆"}</span>
    </button>
  );
}
