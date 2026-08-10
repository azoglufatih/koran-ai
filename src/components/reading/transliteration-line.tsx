"use client";

import { transliterationAyahMarks } from "@/components/selection/ayah-marks";
import type { AyahRef } from "@/content/quran";
import { useTransliteration } from "./transliteration-provider";

/**
 * `ar-Latn` — the Arabic of the Ayah, written in Latin script. Not the reader's own language, and
 * not Arabic as a browser would try to render it: a screen reader saying these words as English
 * would be no more use than the Arabic it stands in for.
 */
const TRANSLITERATED_ARABIC = "ar-Latn";

const LINE_STYLE = "mt-2 text-sm leading-relaxed text-black/55 dark:text-white/55";

/**
 * The Latin line under one Ayah, for a reader who cannot read the script but wants to sound it out.
 *
 * A client island inside the prerendered Reading Pane, and nothing at all until the line arrives —
 * the Arabic above it never waits (ADR 0005).
 *
 * Marked as Ayah text, so a reader who can now see `Ar-Raĥmāni` and pronounce it can select it and
 * ask what it means — which nothing else on the page lets them do.
 */
export function TransliterationLine({ ayah }: { ayah: AyahRef }) {
  const { lineFor, scheme } = useTransliteration();
  const text = lineFor(ayah.ayah);

  if (!text) return null;

  return (
    <p
      dir="ltr"
      lang={TRANSLITERATED_ARABIC}
      className={LINE_STYLE}
      {...transliterationAyahMarks(ayah, scheme)}
    >
      {text}
    </p>
  );
}

/**
 * The same line for the basmala the Surah opens with. Unmarked, unlike the lines above: it sits
 * outside the numbered Ayahs, so there is no one Ayah to ground a question about it in.
 */
export function TransliteratedBasmala() {
  const { basmala } = useTransliteration();

  if (!basmala) return null;

  return (
    <p dir="ltr" lang={TRANSLITERATED_ARABIC} className={`${LINE_STYLE} text-center`}>
      {basmala}
    </p>
  );
}
