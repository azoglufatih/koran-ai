import { describe, expect, it, vi } from "vitest";
import type { CorpusRetriever, RetrievedPassage } from "@/retrieval/corpus-retriever";
import { createAiClient, type ChatMessage } from "./ai-client";
import { aiProviderPreset, type AiProvider, type AiProviderConfig } from "./ai-provider";
import type { VerseContext } from "./verse-context";

const OLLAMA: AiProviderConfig = {
  provider: "ollama",
  baseUrl: "http://localhost:11434/v1",
  apiKey: "",
  model: "llama3.1",
};

/** Most of what this client does has nothing to do with the corpus, and says so by retrieving none. */
const retrievedNothing: CorpusRetriever = { retrieve: async () => [] };

const retrieving = (...passages: RetrievedPassage[]) => ({
  retrieve: vi.fn(async () => passages),
});

function answering(content: string) {
  return vi.fn(async () =>
    Response.json({ choices: [{ message: { role: "assistant", content } }] }),
  );
}

function requestSentBy(fetchImpl: ReturnType<typeof answering>) {
  const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
  return { url, init, body: JSON.parse(String(init.body)) };
}

describe("ask", () => {
  it("posts an OpenAI-compatible chat request and returns the answer", async () => {
    const fetchImpl = answering("Israelites — the descendants of the prophet Jacob.");
    const client = createAiClient({ fetch: fetchImpl, retriever: retrievedNothing });

    const answer = await client.ask({
      config: OLLAMA,
      messages: [{ role: "user", content: "Who are the sons of Israel?" }],
    });

    expect(answer).toBe("Israelites — the descendants of the prophet Jacob.");

    const { url, init, body } = requestSentBy(fetchImpl);
    expect(url).toBe("http://localhost:11434/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(body.model).toBe("llama3.1");
    expect(body.messages.at(-1)).toEqual({
      role: "user",
      content: "Who are the sons of Israel?",
    });
  });
});

describe("provider presets", () => {
  // The endpoint each preset is expected to reach, written out rather than read back from the
  // preset itself — a preset pointing somewhere new should fail here, not agree with itself.
  const PRESET_ENDPOINTS: Record<Exclude<AiProvider, "custom">, string> = {
    ollama: "http://localhost:11434/v1/chat/completions",
    openai: "https://api.openai.com/v1/chat/completions",
    groq: "https://api.groq.com/openai/v1/chat/completions",
    openrouter: "https://openrouter.ai/api/v1/chat/completions",
    gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  };

  it.for(Object.entries(PRESET_ENDPOINTS))("sends %s questions to %s", async ([provider, endpoint]) => {
    const { baseUrl, suggestedModel } = aiProviderPreset(provider as AiProvider);
    const fetchImpl = answering("An answer.");
    const client = createAiClient({ fetch: fetchImpl, retriever: retrievedNothing });

    await client.ask({
      config: {
        provider: provider as AiProvider,
        baseUrl: baseUrl ?? "",
        apiKey: "sk-test",
        model: suggestedModel,
      },
      messages: [{ role: "user", content: "Why?" }],
    });

    expect(requestSentBy(fetchImpl).url).toBe(endpoint);
  });

  it("sends Custom questions to the Base URL the reader entered", async () => {
    const fetchImpl = answering("An answer.");
    const client = createAiClient({ fetch: fetchImpl, retriever: retrievedNothing });

    await client.ask({
      config: {
        provider: "custom",
        // Trailing slashes are what a reader pasting a Base URL actually produces.
        baseUrl: "https://llm.example.test/proxy/v1/",
        apiKey: "sk-test",
        model: "claude-via-proxy",
      },
      messages: [{ role: "user", content: "Why?" }],
    });

    expect(requestSentBy(fetchImpl).url).toBe(
      "https://llm.example.test/proxy/v1/chat/completions",
    );
  });

  it("offers Custom with no Base URL, since only the reader knows it", () => {
    expect(aiProviderPreset("custom").baseUrl).toBeNull();
  });

  it("lets Custom go without a key — a keyless local endpoint is exactly that case", () => {
    expect(aiProviderPreset("custom").apiKeyRequirement).toBe("optional");
  });

  it("asks for no key at all for a provider running on the reader's own machine", () => {
    expect(aiProviderPreset("ollama").apiKeyRequirement).toBe("none");
  });
});

describe("failures the reader has to act on", () => {
  const askOllama = (fetchImpl: typeof globalThis.fetch) =>
    createAiClient({ fetch: fetchImpl, retriever: retrievedNothing }).ask({
      config: OLLAMA,
      messages: [{ role: "user", content: "Why?" }],
    });

  it("passes on what the provider said was wrong", async () => {
    const rejecting = vi.fn(async () =>
      Response.json({ error: { message: "Incorrect API key provided" } }, { status: 401 }),
    );

    await expect(askOllama(rejecting)).rejects.toThrow("Incorrect API key provided");
  });

  it("falls back to the status when the provider explains nothing", async () => {
    const rejecting = vi.fn(async () => new Response("<html>bad gateway</html>", { status: 502 }));

    await expect(askOllama(rejecting)).rejects.toThrow("502");
  });

  it("names the endpoint it could not reach, since an unstarted Ollama looks like nothing", async () => {
    const unreachable = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(askOllama(unreachable)).rejects.toThrow("http://localhost:11434/v1");
  });

  it("refuses a reply that carries no answer, rather than showing an empty turn", async () => {
    const empty = vi.fn(async () => Response.json({ choices: [] }));

    await expect(askOllama(empty)).rejects.toThrow(/no answer|without an answer/i);
  });
});

describe("conversation", () => {
  it("carries the whole conversation, so a follow-up question keeps what came before", async () => {
    const fetchImpl = answering("Jacob, also called Israel.");
    const client = createAiClient({ fetch: fetchImpl, retriever: retrievedNothing });

    await client.ask({
      config: OLLAMA,
      messages: [
        { role: "user", content: "Who are the sons of Israel?" },
        { role: "assistant", content: "The descendants of the prophet Jacob." },
        { role: "user", content: "Which prophet is that?" },
      ],
    });

    expect(requestSentBy(fetchImpl).body.messages).toMatchObject([
      { role: "system" },
      { role: "user", content: "Who are the sons of Israel?" },
      { role: "assistant", content: "The descendants of the prophet Jacob." },
      { role: "user", content: "Which prophet is that?" },
    ]);
  });

  it("opens every conversation by telling the model what it is answering as", async () => {
    const fetchImpl = answering("An answer.");
    const client = createAiClient({ fetch: fetchImpl, retriever: retrievedNothing });

    await client.ask({ config: OLLAMA, messages: [{ role: "user", content: "Why?" }] });

    const [system] = requestSentBy(fetchImpl).body.messages;
    expect(system.role).toBe("system");
    expect(system.content).toMatch(/Quran/);
  });
});

describe("Verse Context", () => {
  const ARABIC = "يَٰبَنِىٓ إِسْرَٰٓءِيلَ ٱذْكُرُوا۟ نِعْمَتِىَ";
  const ENGLISH = "O Children of Israel! Remember My favour";

  // The reader has selected "Children of Israel" in their English Translation Tab.
  const ASKING_ABOUT_2_40: VerseContext = {
    ref: { surah: 2, ayah: 40 },
    arabic: ARABIC,
    translation: { language: "en", text: ENGLISH },
    transliteration: null,
    selection: { in: "translation", start: 2, end: 20 },
  };

  const askAbout = async (verseContext?: VerseContext) => {
    const fetchImpl = answering("The descendants of the prophet Jacob.");
    await createAiClient({ fetch: fetchImpl, retriever: retrievedNothing }).ask({
      config: OLLAMA,
      messages: [{ role: "user", content: "Who are they?" }],
      verseContext,
    });
    return requestSentBy(fetchImpl).body.messages as { role: string; content: string }[];
  };

  it("sends the whole Ayah, in both renderings, rather than the words the reader selected", async () => {
    const sent = (await askAbout(ASKING_ABOUT_2_40)).map((message) => message.content).join("\n");

    expect(sent).toContain(ARABIC);
    expect(sent).toContain("O ⟦Children of Israel⟧! Remember My favour");
  });

  it("says which Ayah the question is about", async () => {
    const sent = (await askAbout(ASKING_ABOUT_2_40)).map((message) => message.content).join("\n");

    expect(sent).toContain("2:40");
  });

  it("grounds the model before the reader's question, not after it", async () => {
    const sent = await askAbout(ASKING_ABOUT_2_40);

    const grounding = sent.findIndex((message) => message.content.includes("2:40"));
    const question = sent.findIndex((message) => message.content === "Who are they?");
    expect(grounding).toBeGreaterThan(-1);
    expect(grounding).toBeLessThan(question);
  });

  it("asks plainly when the reader typed a question without selecting anything", async () => {
    const sent = await askAbout();

    expect(sent).toHaveLength(2);
    expect(sent.at(-1)).toEqual({ role: "user", content: "Who are they?" });
  });
});

/**
 * The corpus the reader is reading, brought to bear on what they asked. Verse Context says which
 * Ayah the question is about; these say what the rest of the corpus has to say about it.
 */
describe("retrieved passages", () => {
  const SEEK_HELP: RetrievedPassage = {
    ref: { surah: 2, ayah: 45 },
    kind: "translation",
    text: "Seek help in steadfastness and prayer",
  };

  const ON_STEADFASTNESS: RetrievedPassage = {
    ref: { surah: 2, ayah: 45 },
    kind: "tafsir",
    text: "Steadfastness here is restraint of the self in obedience to Allah",
  };

  const askWith = async (
    retriever: CorpusRetriever,
    request: { messages?: ChatMessage[]; language?: "en" | "tr" | "de"; verseContext?: VerseContext },
  ) => {
    const fetchImpl = answering("An answer.");
    await createAiClient({ fetch: fetchImpl, retriever }).ask({
      config: OLLAMA,
      messages: request.messages ?? [{ role: "user", content: "What is steadfastness?" }],
      language: request.language,
      verseContext: request.verseContext,
    });
    return requestSentBy(fetchImpl).body.messages as { role: string; content: string }[];
  };

  const allSent = (messages: { content: string }[]) =>
    messages.map((message) => message.content).join("\n");

  it("sends what was retrieved to the provider, in the corpus's own words", async () => {
    const sent = allSent(
      await askWith(retrieving(SEEK_HELP, ON_STEADFASTNESS), { language: "en" }),
    );

    expect(sent).toContain("Seek help in steadfastness and prayer");
    expect(sent).toContain("Steadfastness here is restraint of the self in obedience to Allah");
  });

  it("says which Ayah each passage is, so the model can cite it rather than paraphrase it", async () => {
    const sent = allSent(await askWith(retrieving(SEEK_HELP), { language: "en" }));

    expect(sent).toContain("2:45");
  });

  it("searches on what the reader asked", async () => {
    const retriever = retrieving(SEEK_HELP);

    await askWith(retriever, {
      messages: [{ role: "user", content: "What is steadfastness?" }],
      language: "en",
    });

    expect(retriever.retrieve).toHaveBeenCalledWith(
      expect.stringContaining("What is steadfastness?"),
      "en",
    );
  });

  it("searches on the words the reader selected as well as what they asked", async () => {
    const retriever = retrieving(SEEK_HELP);

    await askWith(retriever, {
      messages: [{ role: "user", content: "What does this mean?" }],
      language: "en",
      verseContext: {
        ref: { surah: 2, ayah: 45 },
        arabic: "وَٱسْتَعِينُوا۟ بِٱلصَّبْرِ",
        translation: { language: "en", text: "Seek help in steadfastness and prayer" },
        transliteration: null,
        selection: { in: "translation", start: 13, end: 26 },
      },
    });

    // "What does this mean?" shares no word with the corpus; the selection is the whole question.
    expect(retriever.retrieve).toHaveBeenCalledWith(expect.stringContaining("steadfastness"), "en");
  });

  it("searches the last thing asked, not the whole conversation", async () => {
    const retriever = retrieving(SEEK_HELP);

    await askWith(retriever, {
      messages: [
        { role: "user", content: "Who was Thamud?" },
        { role: "assistant", content: "A people to whom Salih was sent." },
        { role: "user", content: "What is steadfastness?" },
      ],
      language: "en",
    });

    expect(retriever.retrieve).toHaveBeenCalledWith(expect.not.stringContaining("Thamud"), "en");
  });

  it("does not search before the reader's language is known", async () => {
    const retriever = retrieving(SEEK_HELP);

    const sent = await askWith(retriever, { language: undefined });

    // The shard to search is the reader's own language, and a prerendered page has yet to learn it.
    expect(retriever.retrieve).not.toHaveBeenCalled();
    expect(sent).toHaveLength(2);
  });

  it("grounds the model in the passages before the reader's question, not after it", async () => {
    const sent = await askWith(retrieving(SEEK_HELP), { language: "en" });

    const passages = sent.findIndex((message) => message.content.includes("Seek help"));
    const question = sent.findIndex((message) => message.content === "What is steadfastness?");
    expect(passages).toBeGreaterThan(-1);
    expect(passages).toBeLessThan(question);
  });

  it("keeps the Ayah the reader asked about nearer the question than passages from elsewhere", async () => {
    const sent = await askWith(retrieving(SEEK_HELP), {
      language: "en",
      verseContext: {
        ref: { surah: 94, ayah: 5 },
        arabic: "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا",
        translation: { language: "en", text: "But lo! with hardship goeth ease" },
        transliteration: null,
        selection: { in: "translation", start: 13, end: 21 },
      },
    });

    const passages = sent.findIndex((message) => message.content.includes("Seek help"));
    const verseContext = sent.findIndex((message) => message.content.includes("94:5"));
    expect(passages).toBeLessThan(verseContext);
  });

  it("says nothing about passages when the question found none", async () => {
    const sent = await askWith(retrievedNothing, { language: "en" });

    expect(sent).toHaveLength(2);
  });

  it("still answers when retrieval fails outright", async () => {
    const broken: CorpusRetriever = {
      retrieve: async () => {
        throw new Error("Failed to fetch");
      },
    };
    const fetchImpl = answering("An answer.");

    const answer = await createAiClient({ fetch: fetchImpl, retriever: broken }).ask({
      config: OLLAMA,
      messages: [{ role: "user", content: "What is steadfastness?" }],
      language: "en",
    });

    expect(answer).toBe("An answer.");
  });
});

describe("authentication", () => {
  it("presents the reader's API key as a bearer token", async () => {
    const fetchImpl = answering("An answer.");
    const client = createAiClient({ fetch: fetchImpl, retriever: retrievedNothing });

    await client.ask({
      config: { ...OLLAMA, provider: "openai", apiKey: "sk-reader-key" },
      messages: [{ role: "user", content: "Why?" }],
    });

    expect(new Headers(requestSentBy(fetchImpl).init.headers).get("authorization")).toBe(
      "Bearer sk-reader-key",
    );
  });

  it("sends no authorization at all to a provider the reader gave no key", async () => {
    const fetchImpl = answering("An answer.");
    const client = createAiClient({ fetch: fetchImpl, retriever: retrievedNothing });

    await client.ask({ config: OLLAMA, messages: [{ role: "user", content: "Why?" }] });

    expect(new Headers(requestSentBy(fetchImpl).init.headers).has("authorization")).toBe(false);
  });
});
