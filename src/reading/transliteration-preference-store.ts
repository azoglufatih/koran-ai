import {
  DEFAULT_TRANSLITERATION_SCHEME,
  isTransliterationScheme,
  type TransliterationScheme,
} from "@/content/quran";

/**
 * How the reader wants the Transliteration — which scheme, and whether at all. A reading preference
 * about the Arabic rather than configuration, and kept in their own browser like everything else
 * this app remembers (docs/adr/0001-no-backend-client-side-ai.md).
 *
 * Storage is passed in rather than reached for, so the seam is exercisable and so a browser that
 * denies storage is a reader who gets the defaults every visit rather than a throw.
 */
export const TRANSLITERATION_PREFERENCE_KEY = "koran-ai:transliteration";

export interface TransliterationPreference {
  scheme: TransliterationScheme;
  isShown: boolean;
}

/**
 * What a reader who has never touched the controls gets: the line, in the phonetic scheme. Fixed
 * for everyone — unlike the first Translation Tab, this is not detected from the reader's browser,
 * so a Turkish reader who wants Turkish orthography picks it themselves.
 */
export const DEFAULT_TRANSLITERATION_PREFERENCE: TransliterationPreference = {
  scheme: DEFAULT_TRANSLITERATION_SCHEME,
  isShown: true,
};

/**
 * Anything under this key is untrusted: a reader's own edit, or a preference written by a version
 * of the app that shipped different schemes. Each half falls back on its own, so a scheme that has
 * since been dropped costs the reader the scheme and not the fact they turned the line off.
 */
export function readTransliterationPreference(storage: Storage | null): TransliterationPreference {
  const stored = storage?.getItem(TRANSLITERATION_PREFERENCE_KEY);
  if (!stored) return DEFAULT_TRANSLITERATION_PREFERENCE;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return DEFAULT_TRANSLITERATION_PREFERENCE;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return DEFAULT_TRANSLITERATION_PREFERENCE;
  }

  const { scheme, isShown } = parsed as Record<string, unknown>;

  return {
    scheme: isTransliterationScheme(scheme) ? scheme : DEFAULT_TRANSLITERATION_PREFERENCE.scheme,
    // Only an explicit false hides the line. Anything else is a value this cannot read, and a
    // reader left with no line and no idea why is worse off than one shown it again.
    isShown: isShown !== false,
  };
}

export function writeTransliterationPreference(
  storage: Storage | null,
  preference: TransliterationPreference,
): void {
  storage?.setItem(TRANSLITERATION_PREFERENCE_KEY, JSON.stringify(preference));
}
