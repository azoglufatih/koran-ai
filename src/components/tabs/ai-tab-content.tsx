"use client";

import { useState } from "react";
import { aiClient } from "@/ai/browser-ai-client";
import type { ChatMessage } from "@/ai/ai-client";
import { selectedText, type VerseContext } from "@/ai/verse-context";
import { ProviderSettings } from "@/components/ai/provider-settings";
import { useAiProviderConfig } from "@/components/ai/use-ai-provider-config";
import { RetryNotice } from "./retry-notice";

/**
 * One AI Tab: a conversation of its own. The turns live in this component's state, so opening a
 * second AI Tab starts a second conversation and neither loses what came before — closing a Tab is
 * what ends one, since nothing about a reader's questions is written down anywhere.
 *
 * A Tab opened from a selection carries the Verse Context that selection made, and every question
 * asked in it — the first and each follow-up — goes to the provider grounded in that Ayah.
 */
export function AiTabContent({ verseContext }: { verseContext?: VerseContext }) {
  const { config } = useAiProviderConfig();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function ask(conversation: ChatMessage[]) {
    if (!config) return;

    setIsAsking(true);
    setFailure(null);
    try {
      const answer = await aiClient.ask({ config, messages: conversation, verseContext });
      setMessages([...conversation, { role: "assistant", content: answer }]);
    } catch (error) {
      // The reader's own provider is the only thing that can have failed, and only they can fix
      // it, so what it said is shown rather than a house error message.
      setFailure(error instanceof Error ? error.message : "The provider could not be reached");
    } finally {
      setIsAsking(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const asked = question.trim();
    if (!asked || isAsking) return;

    // The question joins the conversation before the answer arrives, so the reader sees what they
    // asked while they wait — and it stays there to retry from if the provider refuses.
    const conversation: ChatMessage[] = [...messages, { role: "user", content: asked }];
    setMessages(conversation);
    setQuestion("");
    void ask(conversation);
  }

  // The Verse Context leads either way: a reader who hasn't configured a provider yet should still
  // see which words they are about to ask about while they do it.
  if (!config) {
    return (
      <AiTabLayout verseContext={verseContext}>
        <UnconfiguredTab />
      </AiTabLayout>
    );
  }

  return (
    <AiTabLayout verseContext={verseContext}>
      <ActiveProvider />

      {messages.length === 0 ? (
        <p className="px-1 py-4 text-sm text-black/45 dark:text-white/45">
          {verseContext
            ? "Ask what these words mean, or anything else about this Ayah."
            : "Ask about anything in this Surah — a word, a phrase, or what a translation is getting at."}
        </p>
      ) : (
        <ol className="space-y-3">
          {messages.map((message, turn) => (
            <li key={turn}>
              <ChatTurn message={message} />
            </li>
          ))}
        </ol>
      )}

      {isAsking && <p className="px-1 text-sm text-black/45 dark:text-white/45">Thinking…</p>}

      {/* The question is still the last turn in the conversation, so retrying re-asks it. */}
      {failure && <RetryNotice message={failure} onRetry={() => void ask(messages)} />}

      <form onSubmit={submit} className="flex items-end gap-2">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter is how a reader writes a longer, multi-line question.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          rows={2}
          placeholder="Ask a question…"
          aria-label="Ask the AI a question"
          className="min-w-0 flex-1 resize-y rounded-lg border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/15"
        />
        <button
          type="submit"
          disabled={isAsking || question.trim() === ""}
          className="rounded-lg border border-black/15 px-3 py-1.5 text-sm hover:bg-black/[0.06] disabled:opacity-40 disabled:hover:bg-transparent dark:border-white/15 dark:hover:bg-white/[0.08]"
        >
          Ask
        </button>
      </form>
    </AiTabLayout>
  );
}

/** An AI Tab, whatever state it is in, under the Ayah it is grounded in. */
function AiTabLayout({
  verseContext,
  children,
}: {
  verseContext?: VerseContext;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-2">
      {verseContext && <GroundedIn context={verseContext} />}
      {children}
    </div>
  );
}

/**
 * What the conversation is anchored to, kept in front of the reader: the words they selected, and
 * a plain statement that the whole Ayah goes with them. Nothing is sent anywhere the reader hasn't
 * configured themselves, so what *is* sent is worth saying out loud.
 */
function GroundedIn({ context }: { context: VerseContext }) {
  const inArabic = context.selection.in === "arabic";

  return (
    <div className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10">
      <p className="text-xs text-black/45 dark:text-white/45">
        Asking about Ayah {context.ref.surah}:{context.ref.ayah}
      </p>
      <p
        dir={inArabic ? "rtl" : undefined}
        lang={inArabic ? "ar" : context.translation?.language}
        className={`mt-1 text-sm ${inArabic ? "font-arabic text-lg leading-loose" : ""}`}
      >
        &ldquo;{selectedText(context)}&rdquo;
      </p>
      <p className="mt-1 text-xs text-black/45 dark:text-white/45">
        The whole Ayah goes with your question, so the answer has its context.
      </p>
    </div>
  );
}

function ChatTurn({ message }: { message: ChatMessage }) {
  const fromReader = message.role === "user";

  return (
    <div
      className={`rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
        fromReader
          ? "bg-black/[0.05] dark:bg-white/[0.07]"
          : "border border-black/10 dark:border-white/10"
      }`}
    >
      <p className="mb-1 text-xs text-black/45 dark:text-white/45">{fromReader ? "You" : "AI"}</p>
      {message.content}
    </div>
  );
}

/** The Settings the reader saved, and a way back into them without leaving the conversation. */
function ActiveProvider() {
  const { config } = useAiProviderConfig();

  return (
    <details className="rounded-lg border border-black/10 dark:border-white/10">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs text-black/55 marker:content-none dark:text-white/55">
        {config ? `${config.provider} · ${config.model}` : "No provider"} — change
      </summary>
      <div className="border-t border-black/10 p-3 dark:border-white/10">
        {/* Re-seeded when the saved configuration changes, so a second AI Tab's form shows what
            the reader saved in the first rather than the draft it opened with. The key leaves the
            API key out — a saved provider, endpoint and model already identify a configuration. */}
        <ProviderSettings
          key={config ? `${config.provider}|${config.baseUrl}|${config.model}` : "none"}
        />
      </div>
    </details>
  );
}

/**
 * The first thing a reader sees in an AI Tab before they've configured anything. The Settings form
 * is put in front of them rather than linked to: there is nothing else this Tab can do yet.
 */
function UnconfiguredTab() {
  return (
    <div className="space-y-3 py-4">
      <div className="text-sm">
        <p className="font-medium">Choose where the AI runs</p>
        <p className="mt-1 text-black/55 dark:text-white/55">
          Run a model locally with Ollama, or use an API key from a provider you already have.
        </p>
      </div>

      <ProviderSettings />
    </div>
  );
}
