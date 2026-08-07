import { createAiClient } from "./ai-client";

/**
 * The AI Client the app runs on. The reader's browser talks to their provider directly — there is
 * no server of ours in between (docs/adr/0001-no-backend-client-side-ai.md), so this binding to
 * the browser's own fetch is the entire deployment story.
 */
export const aiClient = createAiClient({
  fetch: (...args) => globalThis.fetch(...args),
});
