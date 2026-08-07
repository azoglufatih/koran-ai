"use client";

import { useState } from "react";
import {
  AI_PROVIDER_PRESETS,
  aiProviderPreset,
  type AiProvider,
  type AiProviderConfig,
} from "@/ai/ai-provider";
import { useAiProviderConfig } from "./use-ai-provider-config";

const DEFAULT_PROVIDER: AiProvider = "ollama";

/** What the reader has typed so far, which is not yet a configuration — fields can still be blank. */
interface Draft {
  provider: AiProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
}

const draftFor = (provider: AiProvider): Draft => {
  const preset = aiProviderPreset(provider);
  return {
    provider,
    // Picking a provider is the whole point of the preset: the reader shouldn't need to know any
    // provider's API URL. Custom has none to pre-fill, which is what makes it Custom.
    baseUrl: preset.baseUrl ?? "",
    apiKey: "",
    model: preset.suggestedModel,
  };
};

const draftFrom = (config: AiProviderConfig | null): Draft =>
  config ? { ...config } : draftFor(DEFAULT_PROVIDER);

/**
 * Where the reader points the app at an AI provider: a preset that fills in the connection
 * details, their own key, and a model. Saved to their browser and nowhere else — every provider
 * is reached through the same OpenAI-compatible surface, so this form is the whole integration.
 */
export function ProviderSettings() {
  const { config, save, forget } = useAiProviderConfig();
  // Seeded once from the saved configuration: re-seeding on every change would overwrite what the
  // reader is typing. `key` on this component restarts it when the saved configuration changes.
  const [draft, setDraft] = useState(() => draftFrom(config));
  const [problem, setProblem] = useState<string | null>(null);

  const preset = aiProviderPreset(draft.provider);
  const update = (fields: Partial<Draft>) => setDraft({ ...draft, ...fields });

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const baseUrl = draft.baseUrl.trim();
    const model = draft.model.trim();
    if (!baseUrl) return setProblem("Enter the provider's Base URL.");
    if (!model) return setProblem("Enter the name of the model to ask.");
    if (preset.apiKeyRequirement === "required" && !draft.apiKey.trim()) {
      return setProblem(`${preset.label} needs an API key.`);
    }

    setProblem(null);
    save({ provider: draft.provider, baseUrl, apiKey: draft.apiKey.trim(), model });
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-sm">
      <Field label="Provider">
        <select
          value={draft.provider}
          onChange={(event) => setDraft(draftFor(event.target.value as AiProvider))}
          className="w-full rounded-lg border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/15"
        >
          {AI_PROVIDER_PRESETS.map(({ provider, label }) => (
            <option key={provider} value={provider} className="text-black">
              {label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Base URL">
        <TextInput
          value={draft.baseUrl}
          onChange={(baseUrl) => update({ baseUrl })}
          placeholder="https://…/v1"
          spellCheck={false}
        />
      </Field>

      {preset.apiKeyRequirement !== "none" && (
        <Field
          label={preset.apiKeyRequirement === "optional" ? "API key (if it needs one)" : "API key"}
        >
          <TextInput
            type="password"
            value={draft.apiKey}
            onChange={(apiKey) => update({ apiKey })}
            placeholder="sk-…"
            autoComplete="off"
          />
        </Field>
      )}

      <Field label="Model">
        <TextInput
          value={draft.model}
          onChange={(model) => update({ model })}
          placeholder={preset.suggestedModel || "model name"}
          spellCheck={false}
        />
      </Field>

      {problem && <p className="text-red-700 dark:text-red-400">{problem}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded-lg border border-black/15 px-3 py-1.5 hover:bg-black/[0.06] dark:border-white/15 dark:hover:bg-white/[0.08]"
        >
          Save
        </button>
        {config && (
          <button
            type="button"
            onClick={() => {
              forget();
              setDraft(draftFor(DEFAULT_PROVIDER));
            }}
            className="rounded-lg px-3 py-1.5 text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white"
          >
            Forget
          </button>
        )}
      </div>

      <p className="text-xs leading-relaxed text-black/45 dark:text-white/45">
        Stored in this browser only. Questions go straight from here to the provider you choose —
        this app has no server to send them to.
      </p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-black/55 dark:text-white/55">{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
} & Omit<React.ComponentProps<"input">, "value" | "onChange">) {
  return (
    <input
      {...props}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/15"
    />
  );
}
