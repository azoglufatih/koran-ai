import { anchorFor } from "@/ai/ai-client";
import { selectionInPlace, type VerseContext } from "@/ai/verse-context";
import { TAFSIR_SOURCE_NAMES, type TranslationLanguage } from "@/content/quran";
import { languageLabel } from "./reader-languages";

/**
 * The Grounding Notice: what goes to the reader's provider along with their question, said out
 * loud. The text they selected in shown whole with their span marked in place — the fragment alone
 * would tell them what they already know and hide how much travels with it — and then a plain list
 * of everything else.
 *
 * Its obligation runs the other way round from the rest of the UI: nothing else in this app tells
 * the reader what leaves their browser, so anything added to the Verse Context or the Retrieved
 * Passages has to turn up here too (ADR 0001).
 */
export function GroundingNotice({
  context,
  language,
}: {
  context: VerseContext;
  /** The reader's language, which decides what retrieval sends — absent until the browser says. */
  language: TranslationLanguage | null;
}) {
  const { before, selected, after } = selectionInPlace(context);
  const inArabic = context.selection.in === "arabic";

  return (
    <div className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10">
      {/* The source stands where the Ayah reference stands for every other selection, so the
          reader never meets a commentator's sentence before they meet whose it is — and the words
          below are set in the plain type this Tab uses for everything else, since the styling that
          marks Quran text would say they were the Ayah's own
          (docs/adr/0007-commentary-selection-is-a-claim.md). */}
      <p className="text-xs text-black/45 dark:text-white/45">{whatIsBeingAskedAbout(context)}</p>

      <p
        dir={inArabic ? "rtl" : undefined}
        lang={selectionLanguage(context)}
        className={`mt-1 text-sm ${
          inArabic ? "font-arabic text-lg leading-loose" : ""
        } text-black/45 dark:text-white/45`}
      >
        {before}
        <mark className="bg-transparent font-medium text-black dark:text-white">{selected}</mark>
        {after}
      </p>

      <p className="mt-2 text-xs text-black/45 dark:text-white/45">
        Sent with your question: {whatElseIsSent(context, language)}.
      </p>
    </div>
  );
}

/** What the conversation is about, named for the commentary when that is what was marked. */
export function whatIsBeingAskedAbout(context: VerseContext): string {
  const ayah = `Ayah ${context.ref.surah}:${context.ref.ayah}`;
  const { commentary } = context;

  return commentary
    ? `From ${TAFSIR_SOURCE_NAMES[commentary.source]} — commentary on ${ayah}, not the Ayah itself`
    : `Asking about ${ayah}`;
}

/**
 * What the reader's browser tags the marked text as, for a screen reader and for the hyphenation
 * and quotation rules of the language it is in.
 *
 * The Transliteration is the one text with no language of its own: it is Arabic written in Latin
 * letters, which is what `ar-Latn` says. Leaving it off would not be neutral — the text would
 * inherit the page's English and be read out as English prose, which is the bug this names away.
 */
export function selectionLanguage(context: VerseContext): string | undefined {
  switch (context.selection.in) {
    case "arabic":
      return "ar";
    case "translation":
      return context.selection.language;
    case "tafsir":
      return context.commentary?.language;
    case "transliteration":
      return "ar-Latn";
  }
}

/**
 * Everything that travels with the question besides the text shown above, which the reader can
 * already see. The translations are named rather than counted or summarised as "context": a reader
 * with three Translation Tabs open is sending three translations to their provider, and this is the
 * only place that tells them so.
 *
 * English throughout, as the rest of this app's own words are — the corpus is in the reader's
 * language, the interface around it is not.
 */
export function whatElseIsSent(
  context: VerseContext,
  language: TranslationLanguage | null,
): string {
  const { selection } = context;
  const shown = selection.in === "translation" ? selection.language : null;
  const translations = context.translations
    .filter((translation) => translation.language !== shown)
    .map((translation) => languageLabel(translation.language));

  const list = new Intl.ListFormat("en");

  return list.format([
    ...(selection.in === "arabic" ? [] : ["the Ayah in Arabic"]),
    ...(translations.length > 0
      ? [`your ${list.format(translations)} translation${translations.length > 1 ? "s" : ""}`]
      : []),
    // The Anchor Passage, asked of the same function that decides whether one is fetched — so the
    // notice cannot drift out of step with what the AI Client actually sends.
    ...(language && anchorFor(context, language) ? ["the commentary on this Ayah"] : []),
    // Retrieval only runs once the browser has told the app which language to search, and a
    // question asked before then reaches the provider with the Ayah alone.
    ...(language
      ? ["passages from elsewhere in your translation and tafsir that bear on what you asked"]
      : []),
  ]);
}
