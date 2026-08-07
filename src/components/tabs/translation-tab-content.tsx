"use client";

import { Suspense, use, useState } from "react";
import { quranContent } from "@/content/bundled-quran";
import type { SurahTranslation, TranslationLanguage } from "@/content/quran";

type TranslationResult =
  | { ok: true; translation: SurahTranslation }
  | { ok: false; message: string };

// `use` re-reads this on every render, so the promise per Surah/language has to be the same object
// each time. Failures are cached alongside successes — evicting one as it settles would suspend,
// resolve and render again in a loop — so retrying is the reader's call, via `forgetTranslation`.
const results = new Map<string, Promise<TranslationResult>>();

const translationKey = (surahNumber: number, language: TranslationLanguage) =>
  `${language}/${surahNumber}`;

function loadTranslation(surahNumber: number, language: TranslationLanguage) {
  const key = translationKey(surahNumber, language);

  let result = results.get(key);
  if (!result) {
    result = quranContent.getTranslation(surahNumber, language).then(
      (translation): TranslationResult => ({ ok: true, translation }),
      (error: unknown): TranslationResult => ({
        ok: false,
        message: error instanceof Error ? error.message : "The translation could not be loaded",
      }),
    );
    results.set(key, result);
  }

  return result;
}

function forgetTranslation(surahNumber: number, language: TranslationLanguage) {
  results.delete(translationKey(surahNumber, language));
}

export function TranslationTabContent({
  surahNumber,
  language,
}: {
  surahNumber: number;
  language: TranslationLanguage;
}) {
  return (
    <Suspense
      fallback={
        <p className="px-1 py-6 text-sm text-black/45 dark:text-white/45">Loading translation…</p>
      }
    >
      <TranslatedSurah surahNumber={surahNumber} language={language} />
    </Suspense>
  );
}

function TranslatedSurah({
  surahNumber,
  language,
}: {
  surahNumber: number;
  language: TranslationLanguage;
}) {
  // Bumping this re-renders past the forgotten cache entry, so the load is attempted afresh.
  const [attempt, setAttempt] = useState(0);
  const result = use(loadTranslation(surahNumber, language));

  if (!result.ok) {
    return (
      <div className="px-1 py-6 text-sm">
        <p className="text-red-700 dark:text-red-400">{result.message}</p>
        <button
          type="button"
          onClick={() => {
            forgetTranslation(surahNumber, language);
            setAttempt(attempt + 1);
          }}
          className="mt-2 rounded-lg border border-black/15 px-3 py-1.5 hover:bg-black/[0.06] dark:border-white/15 dark:hover:bg-white/[0.08]"
        >
          Try again
        </button>
      </div>
    );
  }

  const { edition, ayahs } = result.translation;

  return (
    <div lang={edition.language}>
      <ol className="divide-y divide-black/[0.07] dark:divide-white/[0.07]">
        {ayahs.map((ayah) => (
          <li key={ayah.ref.ayah} className="flex gap-4 py-4">
            <span className="mt-0.5 w-8 shrink-0 text-xs tabular-nums text-black/35 dark:text-white/35">
              {ayah.ref.surah}:{ayah.ref.ayah}
            </span>
            <p className="flex-1 leading-relaxed">{ayah.text}</p>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-xs text-black/45 dark:text-white/45">
        Translated by {edition.translator}.
      </p>
    </div>
  );
}
