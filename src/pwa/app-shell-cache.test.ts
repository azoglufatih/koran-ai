import { describe, expect, it } from "vitest";
import {
  CACHE_FIRST,
  NETWORK_ONLY,
  REVALIDATE_WHILE_SERVING,
  cachingFor,
} from "../../public/pwa/app-shell-cache.js";

/** Where the app is served from, as the service worker knows it: an origin and a scope path. */
const SCOPE = "https://koran.example/";

const get = (url: string) => ({ method: "GET", url });

describe("cachingFor", () => {
  it("serves the hashed build output from the cache — its URL names its contents", () => {
    expect(cachingFor(get(`${SCOPE}_next/static/chunks/main-7f3a9c.js`), SCOPE)).toBe(CACHE_FIRST);
    expect(cachingFor(get(`${SCOPE}_next/static/css/a1b2c3.css`), SCOPE)).toBe(CACHE_FIRST);
  });

  it("serves a page from the cache while fetching the version that replaced it", () => {
    expect(cachingFor(get(`${SCOPE}`), SCOPE)).toBe(REVALIDATE_WHILE_SERVING);
    expect(cachingFor(get(`${SCOPE}surah/18`), SCOPE)).toBe(REVALIDATE_WHILE_SERVING);
    expect(cachingFor(get(`${SCOPE}bookmarks`), SCOPE)).toBe(REVALIDATE_WHILE_SERVING);
  });

  it("does the same for the manifest and icons, which no hash renames", () => {
    expect(cachingFor(get(`${SCOPE}manifest.webmanifest`), SCOPE)).toBe(REVALIDATE_WHILE_SERVING);
    expect(cachingFor(get(`${SCOPE}icons/icon-512.png`), SCOPE)).toBe(REVALIDATE_WHILE_SERVING);
  });

  // The Arabic is not among these: it is bundled into the shell rather than fetched, and so is
  // cached with it — docs/adr/0004-app-shell-cached-corpus-not.md says why that is left alone.
  it("leaves alone every part of the corpus that is fetched as the reader asks for it", () => {
    for (const path of [
      "content/translations/en/2.json",
      "content/tafsir/al-mukhtasar/en/18.json",
      "content/retrieval/tr.json",
    ]) {
      expect(cachingFor(get(SCOPE + path), SCOPE)).toBe(NETWORK_ONLY);
    }
  });

  it("caches a path that merely starts like the corpus does", () => {
    expect(cachingFor(get(`${SCOPE}contents`), SCOPE)).toBe(REVALIDATE_WHILE_SERVING);
  });

  it("stays out of the way of the reader's AI provider, wherever they run it", () => {
    expect(cachingFor(get("https://api.openai.com/v1/models"), SCOPE)).toBe(NETWORK_ONLY);
    expect(cachingFor(get("http://localhost:11434/v1/models"), SCOPE)).toBe(NETWORK_ONLY);
  });

  it("stays out of the way of anything that is not a plain read", () => {
    const asked = { method: "POST", url: "https://api.groq.com/openai/v1/chat/completions" };

    expect(cachingFor(asked, SCOPE)).toBe(NETWORK_ONLY);
    expect(cachingFor({ method: "POST", url: `${SCOPE}surah/18` }, SCOPE)).toBe(NETWORK_ONLY);
  });

  it("leaves alone what is on this origin but outside what the worker controls", () => {
    expect(cachingFor(get("https://koran.example/elsewhere/index.html"), "https://koran.example/app/")).toBe(
      NETWORK_ONLY,
    );
  });
});
