import type { Surah } from "@/content/quran";
import { ayahAnchorId } from "./ayah-anchor";
import { TransliteratedBasmala, TransliterationLine } from "./reading/transliteration-line";
import { arabicAyahMarks } from "./selection/ayah-marks";

export function ReadingPane({ surah }: { surah: Surah }) {
  return (
    <div className="mt-8">
      {surah.summary.openingBasmala && (
        <div className="mb-8">
          <p dir="rtl" lang="ar" className="font-arabic text-center text-2xl leading-loose">
            {surah.summary.openingBasmala}
          </p>
          <TransliteratedBasmala />
        </div>
      )}

      <ol className="divide-y divide-black/[0.07] dark:divide-white/[0.07]">
        {surah.ayahs.map((ayah) => (
          <li
            key={ayah.ref.ayah}
            id={ayahAnchorId(ayah.ref.ayah)}
            className="flex gap-4 py-5 target:bg-amber-500/10"
          >
            <span className="mt-2 w-8 shrink-0 text-center text-xs tabular-nums text-black/35 dark:text-white/35">
              {surah.summary.number}:{ayah.ref.ayah}
            </span>
            <div className="min-w-0 flex-1">
              <p
                dir="rtl"
                lang="ar"
                className="font-arabic text-2xl leading-[2.4]"
                {...arabicAyahMarks(ayah.ref)}
              >
                {ayah.arabicText}
              </p>
              <TransliterationLine ayah={ayah.ref} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
