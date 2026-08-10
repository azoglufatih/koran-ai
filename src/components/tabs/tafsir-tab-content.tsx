"use client";

import { quranContent } from "@/content/bundled-quran";
import type { SurahTafsir, TafsirSource, TranslationLanguage } from "@/content/quran";
import { AyahTextList } from "./ayah-text-list";
import { LoadedTabContent } from "./loaded-tab-content";
import { languageLabel } from "./reader-languages";
import { tafsirLanguages } from "./tafsir-editions";

export function TafsirTabContent({
  surahNumber,
  source,
  language,
}: {
  surahNumber: number;
  source: TafsirSource;
  language: TranslationLanguage;
}) {
  return (
    <LoadedTabContent
      cacheKey={`tafsir:${source}/${language}/${surahNumber}`}
      load={() => quranContent.getTafsir(surahNumber, source, language)}
      loadingLabel="Loading tafsir…"
    >
      {(tafsir: SurahTafsir) =>
        tafsir.available ? (
          <div lang={tafsir.edition.language}>
            <AyahTextList ayahs={tafsir.ayahs} />

            <p className="mt-4 text-xs text-black/45 dark:text-white/45">
              {tafsir.edition.name} —{" "}
              <a
                href={tafsir.edition.attributionUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-dotted underline-offset-2"
              >
                {tafsir.edition.attribution}
              </a>
              , licensed{" "}
              {/* CC BY 4.0 obliges a licensor's credit to carry the licence itself, not only its
                  name — so this links, and the text is shown verbatim. */}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="license noreferrer"
                className="underline decoration-dotted underline-offset-2"
              >
                CC BY 4.0
              </a>
              .
            </p>
          </div>
        ) : (
          <UnavailableTafsir source={tafsir.source} language={tafsir.language} />
        )
      }
    </LoadedTabContent>
  );
}

/**
 * A language with no tafsir is a known gap in the corpus, not a failure: no tafsir with a licence
 * that allows redistribution has been found in it. Say that plainly, and point at the languages
 * that do have one, rather than leaving the Tab looking broken or empty.
 */
function UnavailableTafsir({
  source,
  language,
}: {
  source: TafsirSource;
  language: TranslationLanguage;
}) {
  const available = tafsirLanguages(source).map(languageLabel);

  return (
    <div className="px-1 py-6 text-sm text-black/55 dark:text-white/55">
      <p className="font-medium text-black/75 dark:text-white/75">
        Tafsir isn&rsquo;t available in {languageLabel(language)} yet.
      </p>
      <p className="mt-2 leading-relaxed">
        No tafsir that allows redistribution has been found in this language. It is a known gap —
        tafsir is available in {new Intl.ListFormat("en").format(available)}.
      </p>
    </div>
  );
}
