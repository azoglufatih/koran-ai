import { corpusRetriever } from "@/retrieval/browser-corpus-retriever";
import { createAiClient } from "./ai-client";

/**
 * The AI Client the app runs on. The reader's browser talks to their provider directly — there is
 * no server of ours in between (docs/adr/0001-no-backend-client-side-ai.md), so this binding to
 * the browser's own fetch is the entire deployment story. Retrieval is served the same way: a
 * static index fetched from public/ and searched in the browser
 * (docs/adr/0003-static-lexical-retrieval-index.md).
 */
export const aiClient = createAiClient({
  fetch: (...args) => globalThis.fetch(...args),
  retriever: corpusRetriever,
});
