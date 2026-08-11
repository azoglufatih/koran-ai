import type { AyahRef, TranslationLanguage } from "@/content/quran";
import { searchIndex, type PassageRef, type RetrievalIndex } from "./retrieval-index";

/** A passage retrieval found, with the corpus's own words — never the folded terms it matched on. */
export interface RetrievedPassage extends PassageRef {
  text: string;
}

export interface CorpusRetriever {
  /**
   * The passages worth putting in front of the model for this question, best first.
   *
   * `about` is the Ayah the reader is asking about, when they asked from a selection. It is what
   * lets retrieval guarantee an Anchor Passage rather than leave the commentary on that very Ayah
   * to a search that is least likely to find it.
   */
  retrieve(
    question: string,
    language: TranslationLanguage,
    about?: AyahRef,
  ): Promise<RetrievedPassage[]>;
}

export interface CorpusRetrieverSources {
  /** The shipped index for a language, fetched the first time a question is asked in it. */
  loadIndex(language: TranslationLanguage): Promise<RetrievalIndex>;
  /** The corpus's text for one retrieved passage — the index holds terms, not readable text. */
  readPassage(passage: PassageRef, language: TranslationLanguage): Promise<string>;
  limit?: number;
}

/**
 * How many passages a question is grounded in. Enough to bring in a second reading of a word or
 * the commentary that explains it; few enough that the Verse Context — the Ayah the reader is
 * actually asking about — is not buried under passages from elsewhere in the corpus.
 */
const PASSAGES_PER_QUESTION = 4;

/**
 * Retrieval over the shipped index: the step between a reader's question and the passages of the
 * corpus that answer to it.
 *
 * Both loaders are injected because both are network reads in the browser and neither is one in a
 * test — and because the index is a build artefact, which a test should be able to do without.
 */
export function createCorpusRetriever({
  loadIndex,
  readPassage,
  limit = PASSAGES_PER_QUESTION,
}: CorpusRetrieverSources): CorpusRetriever {
  // A shard is a download of some size and the reader's language does not change between
  // questions, so the second question in a conversation searches the copy the first fetched.
  const shards = new Map<TranslationLanguage, Promise<RetrievalIndex>>();

  function shardFor(language: TranslationLanguage): Promise<RetrievalIndex> {
    const loaded = shards.get(language);
    if (loaded) return loaded;

    // A shard names the language it indexes, and that name is checked rather than trusted: a
    // mis-served or stale shard would otherwise answer a reader's question out of a corpus they
    // cannot read, which reads as a bad answer rather than as the wrong file.
    const loading = loadIndex(language).then((index) => {
      if (index.language !== language) {
        throw new Error(`The ${language} shard indexes ${index.language}`);
      }
      return index;
    });
    shards.set(language, loading);
    // A shard that failed is not a shard — forget it, so a reader who was offline when they first
    // asked is not left ungrounded for the rest of their session.
    loading.catch(() => shards.delete(language));
    return loading;
  }

  /** What the question's own words find in the shard, or nothing when there is no shard to search. */
  async function searchedFor(question: string, language: TranslationLanguage) {
    try {
      return searchIndex(await shardFor(language), question, limit);
    } catch {
      // Grounding is what makes an answer better, not what makes one possible.
      return [];
    }
  }

  const isSamePassage = (one: PassageRef, other: PassageRef) =>
    one.kind === other.kind &&
    one.ref.surah === other.ref.surah &&
    one.ref.ayah === other.ref.ayah;

  return {
    async retrieve(question, language, about) {
      // The Anchor Passage: the commentary on the Ayah the reader is asking about, which is certain
      // enough to bear on their question that it is included rather than searched for — and so it
      // leads, and so it is read out of the corpus even when the shard behind the search is not.
      const anchor: PassageRef | null = about ? { ref: about, kind: "tafsir" } : null;
      const searched = await searchedFor(question, language);

      const wanted = [
        ...(anchor ? [anchor] : []),
        ...searched.filter((found) => !anchor || !isSamePassage(found, anchor)),
      ].slice(0, limit);

      const found = await Promise.all(
        wanted.map(async ({ ref, kind }) => {
          try {
            return { ref, kind, text: await readPassage({ ref, kind }, language) };
          } catch {
            // One passage of four that will not load is three passages of grounding, not none —
            // and a language with no tafsir edition at all is where the Anchor Passage lands here.
            return null;
          }
        }),
      );

      return found.filter((passage) => passage !== null);
    },
  };
}
