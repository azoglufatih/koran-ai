"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { quranContent } from "@/content/bundled-quran";
import type { TransliterationScheme } from "@/content/quran";
import {
  useTransliterationPreference,
  type TransliterationPreferenceValue,
} from "./use-transliteration-preference";

/** One Surah's Latin lines, as the Reading Pane needs them: by Ayah number, plus its basmala. */
interface SurahLines {
  ayahs: readonly string[];
  /** Null for Al-Faatiha, whose basmala is Ayah 1, and At-Tawba, which has none. */
  basmala: string | null;
}

interface TransliterationValue extends TransliterationPreferenceValue {
  /**
   * One Ayah's Latin line, or null when there is none to show — the reader has it turned off, it
   * has not arrived yet, or it could not be fetched. Every one of those renders as no line, which
   * is what keeps a slow or failed fetch from costing the reader the Arabic.
   */
  lineFor(ayah: number): string | null;
  /** The opening basmala's Latin line, on the same terms. */
  basmala: string | null;
}

const TransliterationContext = createContext<TransliterationValue | null>(null);

export function useTransliteration(): TransliterationValue {
  const value = useContext(TransliterationContext);
  if (!value) throw new Error("useTransliteration must be used inside a TransliterationProvider");
  return value;
}

const cacheKey = (surahNumber: number, scheme: TransliterationScheme) => `${scheme}/${surahNumber}`;

/**
 * One fetch per Surah and scheme, held for as long as the app is open, so a reader turning the line
 * off and on again — or trying each scheme in turn and settling on the first — pays for each once.
 * A failed load is dropped rather than kept, so coming back to a Surah retries it.
 */
const loads = new Map<string, Promise<SurahLines | null>>();

function loadLines(surahNumber: number, scheme: TransliterationScheme): Promise<SurahLines | null> {
  const key = cacheKey(surahNumber, scheme);

  let loaded = loads.get(key);
  if (!loaded) {
    loaded = fetchLines(surahNumber, scheme).catch(() => {
      loads.delete(key);
      return null;
    });
    loads.set(key, loaded);
  }
  return loaded;
}

async function fetchLines(
  surahNumber: number,
  scheme: TransliterationScheme,
): Promise<SurahLines> {
  // The basmala of the 112 Surahs that open with one sits outside their numbered Ayahs, so it is
  // read separately — out of Al-Faatiha, which is a few hundred bytes and shared by all of them.
  const opensWithBasmala = quranContent.getSurahSummary(surahNumber)?.openingBasmala != null;

  const [{ ayahs }, basmala] = await Promise.all([
    quranContent.getTransliteration(surahNumber, scheme),
    opensWithBasmala ? quranContent.getTransliteratedBasmala(scheme) : null,
  ]);

  return { ayahs: ayahs.map((ayah) => ayah.text), basmala };
}

/**
 * The Latin-script Transliteration for the Surah on screen, in the scheme the reader has chosen —
 * the controls that make that choice read the same value they change.
 *
 * It is fetched rather than bundled (ADR 0005), which is what this provider exists to arrange: the
 * Arabic is prerendered and goes up immediately, and the lines are filled in underneath as they
 * arrive. A Surah reflowing as that happens is the accepted cost of never holding the Arabic back.
 */
export function TransliterationProvider({
  surahNumber,
  children,
}: {
  surahNumber: number;
  children: React.ReactNode;
}) {
  const { scheme, isShown, chooseScheme, showTransliteration } = useTransliterationPreference();
  const [loaded, setLoaded] = useState<{ key: string; lines: SurahLines } | null>(null);
  const key = cacheKey(surahNumber, scheme);

  useEffect(() => {
    if (!isShown) return;

    // A reader who changes their mind mid-fetch — another Surah, another scheme — should not have
    // the lines they asked for first land on the page they are looking at now.
    let wanted = true;
    void loadLines(surahNumber, scheme).then((lines) => {
      if (wanted && lines) setLoaded({ key: cacheKey(surahNumber, scheme), lines });
    });

    return () => {
      wanted = false;
    };
  }, [surahNumber, scheme, isShown]);

  // Held lines are only this Surah's, in this scheme. Anything else is what the reader was reading
  // a moment ago, and showing one scheme's spelling under a heading that says another is worse than
  // showing none while the right one arrives.
  const lines = isShown && loaded?.key === key ? loaded.lines : null;

  // Memoised on the parts rather than the preference object, which is rebuilt every render: a
  // Surah the length of Al-Baqara has a few hundred lines reading this.
  const value = useMemo(
    () => ({
      scheme,
      isShown,
      chooseScheme,
      showTransliteration,
      lineFor: (ayah: number) => lines?.ayahs[ayah - 1] ?? null,
      basmala: lines?.basmala ?? null,
    }),
    [scheme, isShown, chooseScheme, showTransliteration, lines],
  );

  return (
    <TransliterationContext.Provider value={value}>{children}</TransliterationContext.Provider>
  );
}
