import { describe, expect, it, vi } from "vitest";
import { createAiClient } from "./ai-client";
import { aiProviderPreset, type AiProvider, type AiProviderConfig } from "./ai-provider";

const OLLAMA: AiProviderConfig = {
  provider: "ollama",
  baseUrl: "http://localhost:11434/v1",
  apiKey: "",
  model: "llama3.1",
};

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
    const client = createAiClient({ fetch: fetchImpl });

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
    const client = createAiClient({ fetch: fetchImpl });

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
    const client = createAiClient({ fetch: fetchImpl });

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
    createAiClient({ fetch: fetchImpl }).ask({
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
    const client = createAiClient({ fetch: fetchImpl });

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
    const client = createAiClient({ fetch: fetchImpl });

    await client.ask({ config: OLLAMA, messages: [{ role: "user", content: "Why?" }] });

    const [system] = requestSentBy(fetchImpl).body.messages;
    expect(system.role).toBe("system");
    expect(system.content).toMatch(/Quran/);
  });
});

describe("authentication", () => {
  it("presents the reader's API key as a bearer token", async () => {
    const fetchImpl = answering("An answer.");
    const client = createAiClient({ fetch: fetchImpl });

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
    const client = createAiClient({ fetch: fetchImpl });

    await client.ask({ config: OLLAMA, messages: [{ role: "user", content: "Why?" }] });

    expect(new Headers(requestSentBy(fetchImpl).init.headers).has("authorization")).toBe(false);
  });
});
