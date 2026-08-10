"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { TransliterationScheme } from "@/content/quran";
import {
  DEFAULT_TRANSLITERATION_PREFERENCE,
  readTransliterationPreference,
  writeTransliterationPreference,
  type TransliterationPreference,
} from "@/reading/transliteration-preference-store";
import { rememberedInBrowser } from "./remembered-in-browser";

// The defaults stand in while prerendering: a static export has no reader's browser to read from
// until hydration, and the defaults are what a reader who has chosen nothing gets anyway.
const preferenceInBrowser = rememberedInBrowser(
  readTransliterationPreference,
  DEFAULT_TRANSLITERATION_PREFERENCE,
);

export interface TransliterationPreferenceValue extends TransliterationPreference {
  chooseScheme(scheme: TransliterationScheme): void;
  showTransliteration(isShown: boolean): void;
}

/** How the reader wants the Transliteration, and the two ways they say so. */
export function useTransliterationPreference(): TransliterationPreferenceValue {
  const preference = useSyncExternalStore(
    preferenceInBrowser.subscribe,
    preferenceInBrowser.getSnapshot,
    preferenceInBrowser.getServerSnapshot,
  );

  // Both halves are written together, so turning the line off cannot lose the scheme the reader
  // had picked — they get it back the moment they turn it on again.
  const remember = useCallback((change: Partial<TransliterationPreference>) => {
    preferenceInBrowser.change((storage) =>
      writeTransliterationPreference(storage, {
        ...readTransliterationPreference(storage),
        ...change,
      }),
    );
  }, []);

  return {
    ...preference,
    // Two controls, each minding its own business: picking a scheme does not quietly turn a line
    // back on that the reader turned off.
    chooseScheme: useCallback(
      (scheme: TransliterationScheme) => remember({ scheme }),
      [remember],
    ),
    showTransliteration: useCallback(
      (isShown: boolean) => remember({ isShown }),
      [remember],
    ),
  };
}
