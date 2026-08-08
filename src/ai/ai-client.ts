import type { TranslationLanguage } from "@/content/quran";
import type { CorpusRetriever, RetrievedPassage } from "@/retrieval/corpus-retriever";
import type { AiProviderConfig } from "./ai-provider";
import { retrievalQuestion, retrievedPassagesPrompt } from "./retrieved-passages";
import { verseContextPrompt, type VerseContext } from "./verse-context";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiRequest {
  config: AiProviderConfig;
  /** The conversation so far, oldest first, ending with the reader's latest question. */
  messages: readonly ChatMessage[];
  /**
   * The Ayah the conversation is about, when the reader started it from a selection. Absent when
   * they opened an AI Tab and simply typed — a question about the Surah at large is still a
   * question worth asking.
   */
  verseContext?: VerseContext;
  /**
   * The language the reader reads in, which decides the shard of the corpus their question is
   * searched against. Absent while the app is prerendering, before the browser has told it the
   * reader's locale — a question asked then is answered without retrieval rather than against a
   * language the reader may not read.
   */
  language?: TranslationLanguage;
}

export interface AiClient {
  /** Answers the conversation's latest question, or throws with something the reader can act on. */
  ask(request: AiRequest): Promise<string>;
}

/**
 * A turn as the provider sees it. The reader only ever writes and reads `ChatMessage`s; the system
 * turns below are this client's own, and never appear in the conversation shown in an AI Tab.
 */
type ProviderMessage = ChatMessage | { role: "system"; content: string };

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

/**
 * Nothing stands between the reader's browser and their provider, so a refusal is theirs to fix —
 * a wrong key, a model they don't have pulled, a proxy that blocks the browser. Hand back what the
 * provider said whenever it said anything.
 */
async function refusal(response: Response): Promise<Error> {
  const said = await response
    .json()
    .then((body) => (body as ChatCompletionResponse).error?.message)
    .catch(() => undefined);

  return new Error(said ?? `The provider refused the request (HTTP ${response.status})`);
}

const chatCompletionsUrl = (baseUrl: string) =>
  `${baseUrl.trim().replace(/\/+$/, "")}/chat/completions`;

/**
 * What the model is answering as. Deliberately modest about its own authority: the reader is
 * reading scripture, and a confident-sounding model is worse than an honest one. Verse Context and
 * the retrieved passages are what it gets to answer *from*.
 */
const SYSTEM_PROMPT = [
  "You help a reader understand the Quran.",
  "Answer plainly and concisely, in the language the reader asks in.",
  "Explain the historical and cultural background a translation alone leaves out.",
  "Where scholars read a passage differently, say so rather than picking one reading.",
  "Prefer the passages you are given to your own recollection of the text, and say which Ayah an",
  "explanation rests on.",
  "Say when you do not know. You are a reading aid, not a substitute for scholarship.",
].join(" ");

const systemTurn = (content: string): ProviderMessage => ({ role: "system", content });

/**
 * The conversation as the provider receives it: what the model is answering as, then what the rest
 * of the corpus has to say, then the Ayah the reader actually selected in, then their turns.
 *
 * The grounding leads so that every question in the Tab — the first and each follow-up — is
 * answered against it, not just the one that opened the Tab. Verse Context sits nearest the
 * question because it is the more specific of the two: the passages are a question's surroundings,
 * the Ayah is its subject.
 */
const groundedConversation = (
  messages: readonly ChatMessage[],
  verseContext: VerseContext | undefined,
  passages: readonly RetrievedPassage[],
): ProviderMessage[] => [
  systemTurn(SYSTEM_PROMPT),
  ...(passages.length > 0 ? [systemTurn(retrievedPassagesPrompt(passages))] : []),
  ...(verseContext ? [systemTurn(verseContextPrompt(verseContext))] : []),
  ...messages,
];

/**
 * The one path every provider's answers come back through. Nothing above this knows which provider
 * the reader configured — only that a question goes in and an answer comes out.
 *
 * `fetch` is injected so the seam can be exercised without a network, and so the browser's fetch
 * stays the only thing that ever sees the reader's API key. `retriever` is injected for the same
 * reason: it too is a network read in a browser and none in a test.
 */
export function createAiClient({
  fetch,
  retriever,
}: {
  fetch: typeof globalThis.fetch;
  retriever: CorpusRetriever;
}): AiClient {
  /**
   * The corpus's contribution to an answer, or nothing at all. Retrieval is what makes an answer
   * better grounded, never what makes one possible, so a reader whose index will not load still
   * gets their question answered — from the Verse Context and the model's own reading.
   */
  async function retrieved({
    messages,
    verseContext,
    language,
  }: AiRequest): Promise<RetrievedPassage[]> {
    if (!language) return [];

    try {
      return await retriever.retrieve(retrievalQuestion(messages, verseContext), language);
    } catch {
      return [];
    }
  }

  return {
    async ask(request) {
      const { config, messages, verseContext } = request;
      const passages = await retrieved(request);
      const endpoint = chatCompletionsUrl(config.baseUrl);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // A local provider takes no key, and an empty bearer token reads as a malformed
          // credential rather than none at all.
          ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model,
          messages: groundedConversation(messages, verseContext, passages),
        }),
      }).catch(() => {
        // A browser reports "provider isn't running", "the URL is wrong" and "the provider blocks
        // browser requests" as the same opaque network failure, so name the endpoint and let the
        // reader tell those apart themselves.
        throw new Error(`Could not reach ${endpoint} — check the provider is running and reachable`);
      });

      if (!response.ok) throw await refusal(response);

      const body = (await response.json()) as ChatCompletionResponse;
      const answer = body.choices?.[0]?.message?.content;
      if (!answer) throw new Error("The provider replied without an answer");

      return answer;
    },
  };
}
