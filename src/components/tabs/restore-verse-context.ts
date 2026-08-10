import { quranContent } from "@/content/bundled-quran";
import type { VerseContext } from "@/ai/verse-context";
import type { StoredGrounding } from "./stored-arrangement";

const ayahText = (texts: readonly { text: string }[], ayah: number) => texts[ayah - 1]?.text ?? "";

/**
 * A restored AI Tab's grounding, read back out of the corpus.
 *
 * The reader's browser holds the reference, the offsets and the codes; the Arabic, the translation
 * and the Transliteration are fetched again here rather than stored, which is what keeps the
 * persisted record free of corpus text (ADR 0001, and docs/adr/0006-columns-of-tabs.md).
 *
 * The selection's offsets were counted in a particular edition, so each text is read back in the
 * one the reader had open — the translation in its own language, the Transliteration in its own
 * scheme — and not in whichever they have open now.
 */
export async function restoreVerseContext(grounding: StoredGrounding): Promise<VerseContext> {
  const { ref, selection, translationLanguage, transliterationScheme } = grounding;

  const [ayah, translation, transliteration] = await Promise.all([
    quranContent.getAyah(ref),
    translationLanguage ? quranContent.getTranslation(ref.surah, translationLanguage) : null,
    transliterationScheme ? quranContent.getTransliteration(ref.surah, transliterationScheme) : null,
  ]);

  return {
    ref,
    arabic: ayah.arabicText,
    translation: translation
      ? { language: translation.edition.language, text: ayahText(translation.ayahs, ref.ayah) }
      : null,
    // Carried only when that is where the reader selected, exactly as when they first asked.
    transliteration:
      transliteration && selection.in === "transliteration"
        ? { scheme: transliteration.scheme, text: ayahText(transliteration.ayahs, ref.ayah) }
        : null,
    selection,
  };
}
