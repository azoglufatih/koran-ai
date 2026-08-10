import { describe, expect, it } from "vitest";
import { selectedText, verseContextPrompt, type VerseContext } from "./verse-context";

// Al-Baqarah 2:40 — the "sons of Israel" case the spec is written around: a translation that is
// linguistically right and historically opaque.
const ARABIC = "يَٰبَنِىٓ إِسْرَٰٓءِيلَ ٱذْكُرُوا۟ نِعْمَتِىَ ٱلَّتِىٓ أَنْعَمْتُ عَلَيْكُمْ";
const ENGLISH = "O Children of Israel! Remember My favour wherewith I favoured you";
const LATIN = "Yā Banī 'Isrā'īla Adhkurū Ni`matiya Allatī 'An`amtu `Alaykum";

/** Where a span sits in the text, the way the reader's own selection arrives — offsets, not words. */
function spanning(text: string, words: string) {
  const start = text.indexOf(words);
  if (start < 0) throw new Error(`"${words}" is not in the fixture text`);
  return { start, end: start + words.length };
}

const asking = (context: Partial<VerseContext> = {}): VerseContext => ({
  ref: { surah: 2, ayah: 40 },
  arabic: ARABIC,
  translation: { language: "en", text: ENGLISH },
  transliteration: null,
  selection: { in: "arabic", ...spanning(ARABIC, "إِسْرَٰٓءِيلَ") },
  ...context,
});

/** A reader who selected in the Latin line, which is the only case that carries it. */
const askingInTheTransliteration = (words: string) =>
  asking({
    transliteration: { scheme: "ara-quranphoneticst", text: LATIN },
    selection: { in: "transliteration", ...spanning(LATIN, words) },
  });

describe("selected text", () => {
  it("is the span the reader marked, read back out of the Ayah it came from", () => {
    expect(selectedText(asking())).toBe("إِسْرَٰٓءِيلَ");
  });

  it("comes from the translation when that is where the reader selected", () => {
    const context = asking({
      selection: { in: "translation", ...spanning(ENGLISH, "Children of Israel") },
    });

    expect(selectedText(context)).toBe("Children of Israel");
  });
});

describe("the grounding sent with a question", () => {
  it("marks the reader's words inside the whole Ayah, rather than sending the fragment alone", () => {
    const prompt = verseContextPrompt(asking());

    expect(prompt).toContain("يَٰبَنِىٓ ⟦إِسْرَٰٓءِيلَ⟧ ٱذْكُرُوا۟");
    // The words on either side of the selection are what "full Ayah" means here.
    expect(prompt).toContain("عَلَيْكُمْ");
  });

  it("marks the translation, and leaves the Arabic reading as it does on the page", () => {
    const prompt = verseContextPrompt(
      asking({ selection: { in: "translation", ...spanning(ENGLISH, "Children of Israel") } }),
    );

    expect(prompt).toContain("O ⟦Children of Israel⟧! Remember");
    expect(prompt).toContain(ARABIC);
    expect(prompt).not.toContain("⟦إِسْرَٰٓءِيلَ⟧");
  });

  it("carries the translation the reader is reading alongside the Arabic", () => {
    const prompt = verseContextPrompt(asking());

    expect(prompt).toContain(ENGLISH);
    expect(prompt).toMatch(/English/);
  });

  it("names the language, so the model doesn't have to guess whose translation it is reading", () => {
    const prompt = verseContextPrompt(
      asking({ translation: { language: "de", text: "O ihr Kinder Israels" } }),
    );

    expect(prompt).toMatch(/German/);
  });

  it("says which Ayah is being asked about", () => {
    expect(verseContextPrompt(asking())).toContain("2:40");
  });

  it("sends the Arabic alone when the reader has no Translation Tab open", () => {
    const prompt = verseContextPrompt(asking({ translation: null }));

    expect(prompt.replaceAll(/[⟦⟧]/g, "")).toContain(ARABIC);
    expect(prompt).not.toMatch(/translation/i);
  });
});

describe("a question asked about the Transliteration", () => {
  it("marks the Latin words, and sends the Arabic beside them unmarked", () => {
    const prompt = verseContextPrompt(askingInTheTransliteration("'Isrā'īla"));

    expect(prompt).toContain("Yā Banī ⟦'Isrā'īla⟧ Adhkurū");
    expect(prompt).toContain(ARABIC);
    expect(prompt).not.toContain("⟦إِسْرَٰٓءِيلَ⟧");
  });

  // Nothing in the app can line the two scripts up, so the model is told to do it — the one
  // reliance ADR 0005 accepts, because refusing it leaves the reader no way to ask at all.
  it("asks the model to work out which Arabic words the marked Latin spells", () => {
    const prompt = verseContextPrompt(askingInTheTransliteration("'Isrā'īla"));

    expect(prompt).toMatch(/transliteration/i);
    expect(prompt).toMatch(/which Arabic words/i);
  });

  it("reads the selected words back out of the Latin line", () => {
    expect(selectedText(askingInTheTransliteration("Ni`matiya"))).toBe("Ni`matiya");
  });

  it("still carries the translation the reader has open", () => {
    expect(verseContextPrompt(askingInTheTransliteration("'Isrā'īla"))).toContain(ENGLISH);
  });
});

// It renders the Arabic's sound rather than its meaning, so it adds nothing the Arabic does not
// already carry — and every question that isn't about it is one it stays out of.
describe("a question asked about anything else", () => {
  it("carries no Transliteration at all", () => {
    for (const context of [
      asking(),
      asking({ selection: { in: "translation", ...spanning(ENGLISH, "Children of Israel") } }),
    ]) {
      expect(verseContextPrompt(context)).not.toMatch(/transliteration/i);
      expect(verseContextPrompt(context)).not.toContain(LATIN);
    }
  });
});
