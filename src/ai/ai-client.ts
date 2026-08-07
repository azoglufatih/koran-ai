import type { AiProviderConfig } from "./ai-provider";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiRequest {
  config: AiProviderConfig;
  /** The conversation so far, oldest first, ending with the reader's latest question. */
  messages: readonly ChatMessage[];
}

export interface AiClient {
  /** Answers the conversation's latest question, or throws with something the reader can act on. */
  ask(request: AiRequest): Promise<string>;
}

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
 * reading scripture, and a confident-sounding model is worse than an honest one. Verse Context
 * grounding and retrieval are what it gets to answer *from*, and land in later tickets.
 */
const SYSTEM_PROMPT = [
  "You help a reader understand the Quran.",
  "Answer plainly and concisely, in the language the reader asks in.",
  "Explain the historical and cultural background a translation alone leaves out.",
  "Where scholars read a passage differently, say so rather than picking one reading.",
  "Say when you do not know. You are a reading aid, not a substitute for scholarship.",
].join(" ");

/**
 * The one path every provider's answers come back through. Nothing above this knows which provider
 * the reader configured — only that a question goes in and an answer comes out.
 *
 * `fetch` is injected so the seam can be exercised without a network, and so the browser's fetch
 * stays the only thing that ever sees the reader's API key.
 */
export function createAiClient({ fetch }: { fetch: typeof globalThis.fetch }): AiClient {
  return {
    async ask({ config, messages }) {
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
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
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
