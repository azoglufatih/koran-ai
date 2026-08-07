import { AI_PROVIDERS, type AiProvider, type AiProviderConfig } from "./ai-provider";

/**
 * Where the reader's one active provider configuration lives — their own browser, and nowhere
 * else. There is no server to send it to (docs/adr/0001-no-backend-client-side-ai.md), so this
 * module is the whole of its storage: an API key put in here is read back by this reader's browser
 * or by nothing at all.
 *
 * Storage is passed in rather than reached for, so the seam is exercisable and so a browser that
 * denies storage (private mode, disabled cookies) is a `null` this handles rather than a throw.
 */
export const AI_PROVIDER_CONFIG_KEY = "koran-ai:ai-provider";

const isProvider = (value: unknown): value is AiProvider =>
  AI_PROVIDERS.includes(value as AiProvider);

/**
 * Anything under this key is untrusted: a reader's own edit, or configuration written by a version
 * of the app that named providers differently. A config that cannot be asked a question with is
 * the same as none, so the reader is sent back to Settings rather than into a doomed request.
 */
function parseConfig(stored: string): AiProviderConfig | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const { provider, baseUrl, apiKey, model } = parsed as Record<string, unknown>;

  if (!isProvider(provider)) return null;
  if (typeof baseUrl !== "string" || baseUrl.trim() === "") return null;
  if (typeof model !== "string" || model.trim() === "") return null;
  // A local provider takes no key, so empty is valid — anything but a string is not.
  if (typeof apiKey !== "string") return null;

  return { provider, baseUrl, apiKey, model };
}

export function readAiProviderConfig(storage: Storage | null): AiProviderConfig | null {
  const stored = storage?.getItem(AI_PROVIDER_CONFIG_KEY);
  return stored ? parseConfig(stored) : null;
}

export function writeAiProviderConfig(storage: Storage | null, config: AiProviderConfig): void {
  storage?.setItem(AI_PROVIDER_CONFIG_KEY, JSON.stringify(config));
}

export function clearAiProviderConfig(storage: Storage | null): void {
  storage?.removeItem(AI_PROVIDER_CONFIG_KEY);
}
