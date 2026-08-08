import type { RetrievedPassage } from "@/retrieval/corpus-retriever";
import { selectedText, type VerseContext } from "./verse-context";
import type { ChatMessage } from "./ai-client";

/**
 * What the corpus is searched for. The reader's latest question and, when they started from a
 * selection, the words they selected — which are often the whole of what they are asking, since
 * "what does this mean?" shares no word with anything.
 *
 * Only the latest question: an earlier turn about Thamud should not still be pulling passages
 * about Thamud into an answer about steadfastness.
 */
export function retrievalQuestion(
  messages: readonly ChatMessage[],
  verseContext: VerseContext | undefined,
): string {
  const asked = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const selected = verseContext ? selectedText(verseContext) : "";

  return [asked, selected].filter((part) => part.trim() !== "").join(" ");
}

/**
 * The passages as the model reads them. Each is named by its Ayah so the model can cite where an
 * explanation comes from rather than blend the passages into one voice.
 *
 * The honesty about how they were found is not decoration. Retrieval here is word overlap, so a
 * passage that merely shares vocabulary with the question will sometimes come back alongside the
 * ones that answer it, and a model told these are "the relevant passages" will dutifully explain
 * why an irrelevant one is relevant.
 */
export function retrievedPassagesPrompt(passages: readonly RetrievedPassage[]): string {
  const sections = passages.map(
    ({ ref, kind, text }) => `Ayah ${ref.surah}:${ref.ayah} — ${kind}:\n${text}`,
  );

  return [
    "Passages from the reader's translation and tafsir that may bear on their question. They were " +
      "found by shared wording, not by meaning, so some may be beside the point — draw on the ones " +
      "that help and pass over the rest. They are not the whole of what the Quran says on the " +
      "matter, so do not present them as such.",
    ...sections,
  ].join("\n\n");
}
