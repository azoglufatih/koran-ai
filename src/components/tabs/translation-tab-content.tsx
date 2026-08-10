"use client";

import { quranContent } from "@/content/bundled-quran";
import type { SurahTranslation, TranslationLanguage } from "@/content/quran";
import { translationAyahMarks } from "@/components/selection/ayah-marks";
import { AyahTextList } from "./ayah-text-list";
import { LoadedTabContent } from "./loaded-tab-content";
import { languageLabel, translatedLanguages } from "./reader-languages";

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
      {(translation: SurahTranslation) =>
        translation.available ? (
          <div lang={translation.edition.language}>
            <AyahTextList
              ayahs={translation.ayahs}
              ayahMarks={(ref) => translationAyahMarks(ref, translation.edition.language)}
            />

            <p className="mt-4 text-xs text-black/45 dark:text-white/45">
              Translated by {translation.edition.translator}.
            </p>
          </div>
        ) : (
          <UnavailableTranslation language={translation.language} />
        )
      }
    </LoadedTabContent>
  );
}

/**
 * A language with no translation is a known gap in the corpus, not a failure: no translation with
 * a licence that allows redistribution has been found in it. Say that plainly, and point at the
 * languages that do have one, rather than leaving the Tab looking broken or empty.
 */
function UnavailableTranslation({ language }: { language: TranslationLanguage }) {
  const available = translatedLanguages().map(languageLabel);

  return (
    <div className="px-1 py-6 text-sm text-black/55 dark:text-white/55">
      <p className="font-medium text-black/75 dark:text-white/75">
        A translation isn&rsquo;t available in {languageLabel(language)} yet.
      </p>
      <p className="mt-2 leading-relaxed">
        No translation that allows redistribution has been found in this language — the editions in
        print are still in copyright. It is a known gap; translation is available in{" "}
        {new Intl.ListFormat("en").format(available)}.
      </p>
    </div>
  );
}
