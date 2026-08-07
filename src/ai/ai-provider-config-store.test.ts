import { beforeEach, describe, expect, it } from "vitest";
import {
  AI_PROVIDER_CONFIG_KEY,
  clearAiProviderConfig,
  readAiProviderConfig,
  writeAiProviderConfig,
} from "./ai-provider-config-store";
import type { AiProviderConfig } from "./ai-provider";

const OLLAMA: AiProviderConfig = {
  provider: "ollama",
  baseUrl: "http://localhost:11434/v1",
  apiKey: "",
  model: "llama3.1",
};

/** Stands in for the reader's own browser storage — the only place this config ever goes. */
function createStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
    clear: () => entries.clear(),
  };
}

let storage: Storage;

beforeEach(() => {
  storage = createStorage();
});

describe("readAiProviderConfig", () => {
  it("returns the configuration the reader saved", () => {
    writeAiProviderConfig(storage, OLLAMA);

    expect(readAiProviderConfig(storage)).toEqual(OLLAMA);
  });

  it("returns null before the reader has configured anything", () => {
    expect(readAiProviderConfig(storage)).toBeNull();
  });

  it("keeps a cloud provider's key, endpoint and model together", () => {
    const openai: AiProviderConfig = {
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-reader-key",
      model: "gpt-4o-mini",
    };
    writeAiProviderConfig(storage, openai);

    expect(readAiProviderConfig(storage)).toEqual(openai);
  });

  it("holds one configuration at a time, the reader's most recent", () => {
    writeAiProviderConfig(storage, OLLAMA);
    writeAiProviderConfig(storage, { ...OLLAMA, model: "mistral" });

    expect(readAiProviderConfig(storage)?.model).toBe("mistral");
  });

  it("ignores a stored entry that is not readable configuration", () => {
    for (const stored of [
      "not json at all",
      '"a string"',
      "null",
      JSON.stringify({ provider: "openai" }),
      JSON.stringify({ ...OLLAMA, provider: "anthropic-native" }),
      JSON.stringify({ ...OLLAMA, baseUrl: "" }),
      JSON.stringify({ ...OLLAMA, model: "" }),
      JSON.stringify({ ...OLLAMA, apiKey: 42 }),
    ]) {
      storage.setItem(AI_PROVIDER_CONFIG_KEY, stored);

      expect(readAiProviderConfig(storage), stored).toBeNull();
    }
  });

  it("returns null when the browser denies storage entirely", () => {
    expect(readAiProviderConfig(null)).toBeNull();
  });
});

describe("clearAiProviderConfig", () => {
  it("forgets the reader's configuration, key included", () => {
    writeAiProviderConfig(storage, { ...OLLAMA, provider: "openai", apiKey: "sk-reader-key" });

    clearAiProviderConfig(storage);

    expect(readAiProviderConfig(storage)).toBeNull();
    expect(storage.getItem(AI_PROVIDER_CONFIG_KEY)).toBeNull();
  });
});
