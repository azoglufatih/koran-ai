/**
 * Reads one of the generated files under public/ — the vendored translations and tafsir (from the
 * scripts in scripts/), and the Retrieval Index built over them. None of it is bundled: a Tab is
 * opened and a question is asked at runtime, so all of it is fetched on demand.
 *
 * `description` names what is being read, in a form that reads as the subject of a sentence.
 */
export async function fetchContent<T>(path: string, description: string): Promise<T> {
  // The path is browser-relative, so this only resolves in a browser. Say so loudly: prerendering
  // a Tab would otherwise stall the static export on a request that cannot complete.
  if (typeof window === "undefined") {
    throw new Error(`${description} loads in the browser; it cannot be read while prerendering`);
  }

  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${description}`);

  return (await response.json()) as T;
}

/** One vendored per-Surah file: an Ayah's worth of text per entry, in Ayah order. */
export const fetchAyahTexts = (path: string, description: string) =>
  fetchContent<readonly string[]>(path, description);
