"use client";

import { quranContent } from "@/content/bundled-quran";
import type { TranslationLanguage } from "@/content/quran";
import { AyahTextList } from "./ayah-text-list";
import { LoadedTabContent } from "./loaded-tab-content";

export function TranslationTabContent({
  surahNumber,
  language,
}: {
  surahNumber: number;
  language: TranslationLanguage;
}) {
  return (
    <LoadedTabContent
      cacheKey={`translation:${language}/${surahNumber}`}
      load={() => quranContent.getTranslation(surahNumber, language)}
      loadingLabel="Loading translation…"
    >
      {({ edition, ayahs }) => (
        <div lang={edition.language}>
          <AyahTextList ayahs={ayahs} />

          <p className="mt-4 text-xs text-black/45 dark:text-white/45">
            Translated by {edition.translator}.
          </p>
        </div>
      )}
    </LoadedTabContent>
  );
}
