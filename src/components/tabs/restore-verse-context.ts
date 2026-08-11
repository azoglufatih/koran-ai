import { quranContent } from "@/content/bundled-quran";
import { selectedText, type TranslatedText, type VerseContext } from "@/ai/verse-context";
import type { StoredGrounding } from "./stored-arrangement";

const ayahText = (texts: readonly { text: string }[], ayah: number) => texts[ayah - 1]?.text ?? "";

/**
 * A restored AI Tab's grounding, read back out of the corpus.
 *
 * The reader's browser holds the reference, the offsets and the codes; the Arabic, the translations,
 * the Transliteration and the commentary are fetched again here rather than stored, which is what
 * keeps the persisted record free of corpus text (ADR 0001, and docs/adr/0006-columns-of-tabs.md).
 *
 * The selection's offsets were counted in a particular edition, so each text is read back in the
 * one the reader had open — each translation in its own language, the Transliteration in its own
 * scheme, the commentary in the tafsir it was marked in — and not in whichever they have open now.
 */
export async function restoreVerseContext(grounding: StoredGrounding): Promise<VerseContext | null> {
  const { ref, selection, translationLanguages, transliterationScheme, commentary } = grounding;

  const [ayah, translations, transliteration, tafsir] = await Promise.all([
    quranContent.getAyah(ref),
    Promise.all(
      translationLanguages.map((language) => quranContent.getTranslation(ref.surah, language)),
    ),
    transliterationScheme ? quranContent.getTransliteration(ref.surah, transliterationScheme) : null,
    commentary ? quranContent.getTafsir(ref.surah, commentary.source, commentary.language) : null,
  ]);

  return stillGrounded({
    ref,
    arabic: ayah.arabicText,
    // A language whose edition has gone from the corpus leaves one fewer translation, the way a
    // Tab in it would show the reader the gap — never a grounding that fails to restore at all.
    translations: translations.flatMap((translation): TranslatedText[] =>
      translation.available
        ? [
            {
              language: translation.edition.language,
              text: ayahText(translation.ayahs, ref.ayah),
            },
          ]
        : [],
    ),
    // Carried only when that is where the reader selected, exactly as when they first asked.
    transliteration:
      transliteration && selection.in === "transliteration"
        ? { scheme: transliteration.scheme, text: ayahText(transliteration.ayahs, ref.ayah) }
        : null,
    // Likewise — and attributed, since a span of tafsir reaching the model unattributed is the one
    // thing ADR 0007 exists to prevent.
    commentary:
      tafsir?.available && selection.in === "tafsir"
        ? {
            source: tafsir.edition.source,
            language: tafsir.edition.language,
            text: ayahText(tafsir.ayahs, ref.ayah),
          }
        : null,
    selection,
  });
}

/**
 * The restored grounding, or nothing at all when the text the reader's offsets were counted in did
 * not come back with it.
 *
 * The stored record names editions this version ships; whether the corpus still *has* them is only
 * known once it has answered — a language whose tafsir edition has gone, a translation withdrawn.
 * What is left then is a conversation labelled after an Ayah whose selection reads back as nothing:
 * the Grounding Notice marks an empty span, and the reader's next question goes to their provider
 * grounded in words nobody selected. Coming back as an open-ended conversation is the honest
 * failure, and the same one a grounding that could not be parsed already takes.
 */
const stillGrounded = (context: VerseContext): VerseContext | null =>
  selectedText(context) === "" ? null : context;
