import { describe, expect, it } from "vitest";
import {
  selectedText,
  selectionInPlace,
  verseContextPrompt,
  type VerseContext,
} from "./verse-context";

// Al-Baqarah 2:40 — the "sons of Israel" case the spec is written around: a translation that is
// linguistically right and historically opaque.
const ARABIC = "يَٰبَنِىٓ إِسْرَٰٓءِيلَ ٱذْكُرُوا۟ نِعْمَتِىَ ٱلَّتِىٓ أَنْعَمْتُ عَلَيْكُمْ";
const ENGLISH = "O Children of Israel! Remember My favour wherewith I favoured you";
const TURKISH = "Ey İsrailoğulları! Size verdiğim nimeti hatırlayın";
const LATIN = "Yā Banī 'Isrā'īla Adhkurū Ni`matiya Allatī 'An`amtu `Alaykum";
const COMMENTARY = "Allah reminds the Israelites of the favours He bestowed on their forefathers";

/** Where a span sits in the text, the way the reader's own selection arrives — offsets, not words. */
function spanning(text: string, words: string) {
  const start = text.indexOf(words);
  if (start < 0) throw new Error(`"${words}" is not in the fixture text`);
  return { start, end: start + words.length };
}

const asking = (context: Partial<VerseContext> = {}): VerseContext => ({
  ref: { surah: 2, ayah: 40 },
  arabic: ARABIC,
  translations: [{ language: "en", text: ENGLISH }],
  transliteration: null,
  commentary: null,
  selection: { in: "arabic", ...spanning(ARABIC, "إِسْرَٰٓءِيلَ") },
  ...context,
});

/** A reader who selected in the Latin line, which is the only case that carries it. */
const askingInTheTransliteration = (words: string) =>
  asking({
    transliteration: { scheme: "ara-quranphoneticst", text: LATIN },
    selection: { in: "transliteration", ...spanning(LATIN, words) },
  });

/** A reader who selected in a Tafsir Tab — a claim about the Ayah rather than the Ayah itself. */
const askingInTheCommentary = (words: string) =>
  asking({
    commentary: { source: "al-mukhtasar", language: "en", text: COMMENTARY },
    selection: { in: "tafsir", ...spanning(COMMENTARY, words) },
  });

describe("selected text", () => {
  it("is the span the reader marked, read back out of the Ayah it came from", () => {
    expect(selectedText(asking())).toBe("إِسْرَٰٓءِيلَ");
  });

  it("comes from the translation when that is where the reader selected", () => {
    const context = asking({
      selection: { in: "translation", language: "en", ...spanning(ENGLISH, "Children of Israel") },
    });

    expect(selectedText(context)).toBe("Children of Israel");
  });

  it("comes from the translation the reader selected in, not the first one they have open", () => {
    const context = asking({
      translations: [
        { language: "en", text: ENGLISH },
        { language: "tr", text: TURKISH },
      ],
      selection: { in: "translation", language: "tr", ...spanning(TURKISH, "İsrailoğulları") },
    });

    expect(selectedText(context)).toBe("İsrailoğulları");
  });
});

/**
 * What the Grounding Notice puts in front of the reader. The whole text with their span marked in
 * it, rather than the span alone: the point of the notice is that they can see how much goes to
 * their provider, and the fragment they already know about is the one part that does not show that.
 */
describe("the selection in place", () => {
  it("splits the text the reader selected in around the words they marked", () => {
    const { before, selected, after } = selectionInPlace(asking());

    expect(selected).toBe("إِسْرَٰٓءِيلَ");
    expect(before + selected + after).toBe(ARABIC);
    expect(after).toMatch(/^ ٱذْكُرُوا۟/);
  });

  it("splits the commentary, not the Ayah, when the reader marked a claim about it", () => {
    const { before, selected } = selectionInPlace(askingInTheCommentary("favours"));

    expect(selected).toBe("favours");
    expect(before).toBe("Allah reminds the Israelites of the ");
  });

  it("leaves nothing either side for a reader who selected the whole text", () => {
    const context = asking({ selection: { in: "arabic", start: 0, end: ARABIC.length } });

    expect(selectionInPlace(context)).toEqual({ before: "", selected: ARABIC, after: "" });
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
      asking({
        selection: { in: "translation", language: "en", ...spanning(ENGLISH, "Children of Israel") },
      }),
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
      asking({ translations: [{ language: "de", text: "O ihr Kinder Israels" }] }),
    );

    expect(prompt).toMatch(/German/);
  });

  it("says which Ayah is being asked about", () => {
    expect(verseContextPrompt(asking())).toContain("2:40");
  });

  it("sends the Arabic alone when the reader has no Translation Tab open", () => {
    const prompt = verseContextPrompt(asking({ translations: [] }));

    expect(prompt.replaceAll(/[⟦⟧]/g, "")).toContain(ARABIC);
    expect(prompt).not.toMatch(/translation/i);
  });
});

/**
 * Which Tab is showing depends on the width of the screen, so grounding in the one on screen would
 * make the same question answered differently on a phone and on a laptop, for a reason the reader
 * cannot see. Every Tab they have open goes.
 */
describe("a reader comparing two translations", () => {
  const comparing = (selection?: VerseContext["selection"]) =>
    verseContextPrompt(
      asking({
        translations: [
          { language: "en", text: ENGLISH },
          { language: "tr", text: TURKISH },
        ],
        ...(selection ? { selection } : {}),
      }),
    );

  it("sends both translations, each named for its own language", () => {
    const prompt = comparing();

    expect(prompt).toContain(ENGLISH);
    expect(prompt).toContain(TURKISH);
    expect(prompt).toMatch(/English/);
    expect(prompt).toMatch(/Turkish/);
  });

  it("marks only the translation the reader selected in", () => {
    const prompt = comparing({
      in: "translation",
      language: "tr",
      ...spanning(TURKISH, "İsrailoğulları"),
    });

    expect(prompt).toContain("Ey ⟦İsrailoğulları⟧!");
    expect(prompt).toContain(ENGLISH);
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

/**
 * The other three texts are the same Ayah rendered three ways; this is somebody's explanation *of*
 * it. A model handed the two indistinguishably answers about the gloss as though it were the text,
 * and for a reader who cannot read the Arabic nothing downstream reveals the substitution — which
 * is the whole of docs/adr/0007-commentary-selection-is-a-claim.md.
 */
describe("a Commentary Selection", () => {
  it("reads the selected words back out of the commentary, not out of the Ayah", () => {
    expect(selectedText(askingInTheCommentary("favours"))).toBe("favours");
  });

  it("marks the commentator's words, and leaves the Ayah's own reading unmarked", () => {
    const prompt = verseContextPrompt(askingInTheCommentary("favours"));

    expect(prompt).toContain("the ⟦favours⟧ He bestowed");
    expect(prompt).toContain(ARABIC);
    expect(prompt).not.toContain("⟦إِسْرَٰٓءِيلَ⟧");
  });

  it("names the tafsir the words came from", () => {
    expect(verseContextPrompt(askingInTheCommentary("favours"))).toMatch(/Al-Mukhtasar/);
  });

  it("says the marked words are a commentator's claim about the Ayah, not the Ayah itself", () => {
    const prompt = verseContextPrompt(askingInTheCommentary("favours"));

    expect(prompt).toMatch(/commentary|commentator/i);
    expect(prompt).toMatch(/not the Ayah/i);
  });

  /**
   * Before the model meets the sentence, not alongside it. A model that has already read "the
   * reader selected these words of the Ayah" has accepted the substitution by the time any
   * correction arrives — which is the whole failure ADR 0007 exists to prevent.
   */
  it("says so in the first thing the model is told, not only where the commentary is given", () => {
    const [opening] = verseContextPrompt(askingInTheCommentary("favours")).split("\n\n");

    expect(opening).toMatch(/Al-Mukhtasar/);
    expect(opening).toMatch(/not the Ayah/i);
  });

  it("never tells the model the reader selected words of the Ayah itself", () => {
    const prompt = verseContextPrompt(askingInTheCommentary("favours"));

    expect(prompt).not.toMatch(/They selected the words marked ⟦like this⟧ —/);
  });

  it("still carries the Ayah itself, in every rendering the reader has open", () => {
    const prompt = verseContextPrompt(askingInTheCommentary("favours"));

    expect(prompt).toContain(ARABIC);
    expect(prompt).toContain(ENGLISH);
  });
});

// It renders the Arabic's sound rather than its meaning, so it adds nothing the Arabic does not
// already carry — and every question that isn't about it is one it stays out of.
describe("a question asked about anything else", () => {
  it("carries no Transliteration at all", () => {
    for (const context of [
      asking(),
      asking({
        selection: { in: "translation", language: "en", ...spanning(ENGLISH, "Children of Israel") },
      }),
    ]) {
      expect(verseContextPrompt(context)).not.toMatch(/transliteration/i);
      expect(verseContextPrompt(context)).not.toContain(LATIN);
    }
  });

  // Commentary is one edition's reading of the Ayah among several. A question about the Ayah is not
  // a question about that reading, and putting it in front of the model unasked answers with it.
  it("carries no commentary at all", () => {
    const prompt = verseContextPrompt(asking());

    expect(prompt).not.toContain(COMMENTARY);
    expect(prompt).not.toMatch(/Al-Mukhtasar/);
  });
});
