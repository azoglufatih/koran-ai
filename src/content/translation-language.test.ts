import { describe, expect, it } from "vitest";
import { detectTranslationLanguage } from "./translation-language";

describe("detectTranslationLanguage", () => {
  it("picks the reader's own language when a Translation Tab covers it", () => {
    expect(detectTranslationLanguage(["tr"])).toBe("tr");
    expect(detectTranslationLanguage(["de"])).toBe("de");
    expect(detectTranslationLanguage(["en"])).toBe("en");
  });

  it("falls back to English for a language no Translation Tab covers", () => {
    expect(detectTranslationLanguage(["fr"])).toBe("en");
    expect(detectTranslationLanguage([])).toBe("en");
  });

  it("ignores the region subtag and casing a browser tags its locales with", () => {
    expect(detectTranslationLanguage(["de-AT"])).toBe("de");
    expect(detectTranslationLanguage(["TR-tr"])).toBe("tr");
    expect(detectTranslationLanguage(["en-GB"])).toBe("en");
  });

  it("honours the reader's order of preference", () => {
    expect(detectTranslationLanguage(["fr-FR", "tr-TR", "de"])).toBe("tr");
  });
});
