import type { Surah } from "@/content/quran";
import { ayahAnchorId } from "./ayah-anchor";
import { BookmarkToggle } from "./reading/bookmark-toggle";
import { arabicAyahMarks } from "./selection/ayah-marks";

export function ReadingPane({ surah }: { surah: Surah }) {
  return (
    <div className="mt-8">
      {surah.summary.openingBasmala && (
        <p dir="rtl" lang="ar" className="font-arabic mb-8 text-center text-2xl leading-loose">
          {surah.summary.openingBasmala}
        </p>
      )}

      <ol className="divide-y divide-black/[0.07] dark:divide-white/[0.07]">
        {surah.ayahs.map((ayah) => (
          <li
            key={ayah.ref.ayah}
            id={ayahAnchorId(ayah.ref.ayah)}
            className="flex gap-4 py-5 target:bg-amber-500/10"
          >
            <span className="mt-2 flex w-8 shrink-0 flex-col items-center gap-1">
              <span className="text-xs tabular-nums text-black/35 dark:text-white/35">
                {surah.summary.number}:{ayah.ref.ayah}
              </span>
              <BookmarkToggle ayah={ayah.ref} />
            </span>
            <p
              dir="rtl"
              lang="ar"
              className="font-arabic flex-1 text-2xl leading-[2.4]"
              {...arabicAyahMarks(ayah.ref)}
            >
              {ayah.arabicText}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
