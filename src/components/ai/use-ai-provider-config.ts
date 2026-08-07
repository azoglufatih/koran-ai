"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  clearAiProviderConfig,
  readAiProviderConfig,
  writeAiProviderConfig,
} from "@/ai/ai-provider-config-store";
import type { AiProviderConfig } from "@/ai/ai-provider";

/** A browser that denies storage is a reader who cannot save a configuration, not a crash. */
function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// useSyncExternalStore compares snapshots by identity, and reading storage builds a fresh object
// every time, so the parsed configuration is held until something actually changes it.
let cached: AiProviderConfig | null = null;
let isCached = false;

const listeners = new Set<() => void>();

function getSnapshot(): AiProviderConfig | null {
  if (!isCached) {
    cached = readAiProviderConfig(browserStorage());
    isCached = true;
  }
  return cached;
}

function announceChange() {
  isCached = false;
  for (const listener of listeners) listener();
}

// Storage events fire only in the browser's *other* tabs, which is exactly the case this handles:
// a reader who changes providers in one tab shouldn't have a second tab asking the old one.
function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", announceChange);
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", announceChange);
  };
}

export interface AiProviderConfigValue {
  /** The reader's active configuration, or null if they have none — including while prerendering. */
  config: AiProviderConfig | null;
  save(config: AiProviderConfig): void;
  forget(): void;
}

/**
 * The reader's one active AI provider configuration, shared by every AI Tab and the Settings form.
 * Null during the prerender: a static export has no reader's browser to read localStorage from
 * until hydration, the same reason the Translation Tab's language is unknowable until then.
 */
export function useAiProviderConfig(): AiProviderConfigValue {
  const config = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const save = useCallback((next: AiProviderConfig) => {
    writeAiProviderConfig(browserStorage(), next);
    announceChange();
  }, []);

  const forget = useCallback(() => {
    clearAiProviderConfig(browserStorage());
    announceChange();
  }, []);

  return { config, save, forget };
}
