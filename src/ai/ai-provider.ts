/**
 * The providers a reader can point the AI Tab at. Every one of them speaks the same
 * OpenAI-compatible chat surface (see docs/adr/0002-unified-openai-compatible-ai-client.md), so
 * a preset is connection details and nothing more — never its own integration path.
 */
export const AI_PROVIDERS = ["ollama", "openai", "groq", "openrouter", "gemini", "custom"] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

/**
 * Whether a provider wants an API key at all. Not a boolean, because Custom is genuinely neither:
 * it reaches a cloud provider behind a proxy as readily as a keyless model on the reader's own
 * machine, and Settings must not refuse either one.
 */
export type ApiKeyRequirement = "none" | "optional" | "required";

export interface AiProviderPreset {
  provider: AiProvider;
  label: string;
  /** Null for Custom, the one preset whose endpoint only the reader knows. */
  baseUrl: string | null;
  apiKeyRequirement: ApiKeyRequirement;
  /** A model the provider is known to serve, offered as a starting point the reader can replace. */
  suggestedModel: string;
}

/**
 * The reader's one active provider configuration. `baseUrl` is resolved rather than looked up from
 * the preset, so a Custom endpoint and a preset one are the same thing to everything downstream.
 */
export interface AiProviderConfig {
  provider: AiProvider;
  baseUrl: string;
  /** Empty for a provider that needs no key, e.g. a local Ollama. */
  apiKey: string;
  model: string;
}

export const AI_PROVIDER_PRESETS: readonly AiProviderPreset[] = [
  {
    provider: "ollama",
    label: "Ollama (local)",
    baseUrl: "http://localhost:11434/v1",
    apiKeyRequirement: "none",
    suggestedModel: "llama3.1",
  },
  {
    provider: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKeyRequirement: "required",
    suggestedModel: "gpt-4o-mini",
  },
  {
    provider: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyRequirement: "required",
    suggestedModel: "llama-3.3-70b-versatile",
  },
  {
    provider: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyRequirement: "required",
    suggestedModel: "meta-llama/llama-3.3-70b-instruct",
  },
  {
    provider: "gemini",
    label: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKeyRequirement: "required",
    suggestedModel: "gemini-2.0-flash",
  },
  {
    provider: "custom",
    label: "Custom (OpenAI-compatible)",
    baseUrl: null,
    apiKeyRequirement: "optional",
    suggestedModel: "",
  },
];

const presets = new Map(AI_PROVIDER_PRESETS.map((preset) => [preset.provider, preset]));

export function aiProviderPreset(provider: AiProvider): AiProviderPreset {
  const preset = presets.get(provider);
  if (!preset) throw new RangeError(`Unknown AI provider "${provider}"`);
  return preset;
}
