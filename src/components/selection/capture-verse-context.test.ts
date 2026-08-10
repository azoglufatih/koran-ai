// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { selectedText } from "@/ai/verse-context";
import { captureVerseContext } from "./capture-verse-context";

const ARABIC = "يَٰبَنِىٓ إِسْرَٰٓءِيلَ ٱذْكُرُوا۟ نِعْمَتِىَ";
const ENGLISH = "O Children of Israel! Remember My favour";
const TURKISH = "Ey İsrailoğulları! Size verdiğim nimeti hatırlayın";
const LATIN = "Yā Banī 'Isrā'īla Adhkurū Ni`matiya";
const SCHEME = "ara-quranphoneticst";

const inTransliteration = "[data-ayah-role='transliteration']";

/**
 * A Surah page as the reader has arranged it: the Reading Pane with its Latin lines, and the Tabs
 * beside it.
 */
function page(tabs: string, transliterated = true) {
  const latin = transliterated
    ? `<p data-ayah-role="transliteration" data-ayah-scheme="${SCHEME}" data-ayah="2:40">${LATIN}</p>`
    : "";

  document.body.innerHTML = `
    <ol>
      <li><p data-ayah-role="arabic" data-ayah="2:40">${ARABIC}</p>${latin}</li>
      <li><p data-ayah-role="arabic" data-ayah="2:41">وَءَامِنُوا۟ بِمَآ أَنزَلْتُ</p></li>
    </ol>
    <h1>Al-Baqara</h1>
    ${tabs}`;
}

const translationTab = (language: string, text: string, isActive: boolean) => `
  <article ${isActive ? "data-tab-active" : ""}>
    <p data-ayah-role="translation" data-ayah-language="${language}" data-ayah="2:40">${text}</p>
  </article>`;

const inTranslationTab = "[data-ayah-role='translation']";

/** The reader dragging across a phrase, as a Range — what a Selection hands back. */
function selecting(words: string, within = "[data-ayah-role='arabic']") {
  const element = document.querySelector(within)!;
  const [node] = [...element.childNodes].filter((child) => child.textContent?.includes(words));
  const start = node.textContent!.indexOf(words);
  const range = document.createRange();
  range.setStart(node.firstChild ?? node, start);
  range.setEnd(node.firstChild ?? node, start + words.length);
  return range;
}

beforeEach(() => {
  page(translationTab("en", ENGLISH, true));
});

describe("a selection in the Reading Pane", () => {
  it("is grounded in the whole Ayah it was made in", () => {
    const context = captureVerseContext(selecting("إِسْرَٰٓءِيلَ"));

    expect(context).toMatchObject({ ref: { surah: 2, ayah: 40 }, arabic: ARABIC });
    expect(selectedText(context!)).toBe("إِسْرَٰٓءِيلَ");
  });

  it("carries the translation the reader has open beside it", () => {
    const context = captureVerseContext(selecting("إِسْرَٰٓءِيلَ"));

    expect(context?.translation).toEqual({ language: "en", text: ENGLISH });
  });

  it("carries no translation when the reader is reading Arabic only", () => {
    page("");

    expect(captureVerseContext(selecting("إِسْرَٰٓءِيلَ"))?.translation).toBeNull();
  });

  it("takes the translation from the Tab the reader is looking at", () => {
    page(translationTab("en", ENGLISH, false) + translationTab("tr", TURKISH, true));

    expect(captureVerseContext(selecting("إِسْرَٰٓءِيلَ"))?.translation).toEqual({
      language: "tr",
      text: TURKISH,
    });
  });
});

describe("a selection in the Transliteration", () => {
  it("is grounded in the same Ayah's Arabic, which sits above it on the page", () => {
    const context = captureVerseContext(selecting("'Isrā'īla", inTransliteration));

    expect(context).toMatchObject({ ref: { surah: 2, ayah: 40 }, arabic: ARABIC });
    expect(selectedText(context!)).toBe("'Isrā'īla");
  });

  it("carries the Latin line, with the selection marked in it rather than in the Arabic", () => {
    const context = captureVerseContext(selecting("'Isrā'īla", inTransliteration));

    expect(context?.transliteration).toEqual({ scheme: SCHEME, text: LATIN });
    expect(context?.selection.in).toBe("transliteration");
  });

  // The reader can switch between three schemes, and offsets counted in one mean nothing in
  // another — so a line that cannot name its own is not one to ground a question in.
  it("is ignored when the line names no scheme it can read", () => {
    page(
      `<p data-ayah-role="transliteration" data-ayah-scheme="made-up" data-ayah="2:40">${LATIN}</p>
       ${translationTab("en", ENGLISH, true)}`,
      false,
    );

    expect(captureVerseContext(selecting("'Isrā'īla", inTransliteration))).toBeNull();
  });

  it("carries the translation the reader has open beside it", () => {
    const context = captureVerseContext(selecting("'Isrā'īla", inTransliteration));

    expect(context?.translation).toEqual({ language: "en", text: ENGLISH });
  });
});

// It says nothing the Arabic does not already say, so it goes only with a question about itself.
describe("a selection anywhere else", () => {
  it("carries no Transliteration, even with the line on the page", () => {
    expect(captureVerseContext(selecting("إِسْرَٰٓءِيلَ"))?.transliteration).toBeNull();
    expect(
      captureVerseContext(selecting("Children of Israel", inTranslationTab))?.transliteration,
    ).toBeNull();
  });

  it("is unchanged for a reader who has the line turned off", () => {
    page(translationTab("en", ENGLISH, true), false);

    expect(captureVerseContext(selecting("إِسْرَٰٓءِيلَ"))).toMatchObject({
      arabic: ARABIC,
      transliteration: null,
      translation: { language: "en", text: ENGLISH },
    });
  });
});

describe("a selection in a Translation Tab", () => {
  it("is grounded in the same Ayah's Arabic, which the reader can see beside it", () => {
    const context = captureVerseContext(selecting("Children of Israel", inTranslationTab));

    expect(context).toMatchObject({ ref: { surah: 2, ayah: 40 }, arabic: ARABIC });
    expect(selectedText(context!)).toBe("Children of Israel");
  });

  it("marks the selection in the translation rather than in the Arabic", () => {
    const context = captureVerseContext(selecting("Children of Israel", inTranslationTab));

    expect(context?.selection.in).toBe("translation");
  });

  it("measures across the whole Ayah, however the Tab happens to mark its text up", () => {
    page(`
      <article data-tab-active>
        <p data-ayah-role="translation" data-ayah-language="en" data-ayah="2:40">O <em>Children of Israel!</em> Remember My favour</p>
      </article>`);

    const element = document.querySelector(inTranslationTab)!;
    const emphasised = element.querySelector("em")!.firstChild!;
    const range = document.createRange();
    range.setStart(emphasised, 0);
    range.setEnd(emphasised, "Children of Israel".length);

    const context = captureVerseContext(range);
    expect(context?.translation?.text).toBe(ENGLISH);
    expect(selectedText(context!)).toBe("Children of Israel");
  });
});

describe("selections there is nothing to ask about", () => {
  it("ignores a selection that spans two Ayahs, which is no single Ayah to ground in", () => {
    const first = document.querySelector("[data-ayah='2:40']")!.firstChild!;
    const second = document.querySelector("[data-ayah='2:41']")!.firstChild!;
    const range = document.createRange();
    range.setStart(first, 0);
    range.setEnd(second, 5);

    expect(captureVerseContext(range)).toBeNull();
  });

  it("ignores a selection outside the Quran text altogether", () => {
    expect(captureVerseContext(selecting("Al-Baqara", "h1"))).toBeNull();
  });

  it("ignores a caret the reader left behind without selecting anything", () => {
    const range = document.createRange();
    range.setStart(document.querySelector("[data-ayah='2:40']")!.firstChild!, 3);
    range.collapse(true);

    expect(captureVerseContext(range)).toBeNull();
  });

  it("ignores a translation whose language it cannot read, having none to name or mark", () => {
    page(translationTab("kl", "O Children of Israel!", true));

    expect(captureVerseContext(selecting("Children of Israel", inTranslationTab))).toBeNull();
    // Nor is it quietly attached to a selection made in the Arabic beside it.
    expect(captureVerseContext(selecting("إِسْرَٰٓءِيلَ"))?.translation).toBeNull();
  });

  it("ignores a selection of nothing but whitespace", () => {
    const arabic = document.querySelector("[data-ayah='2:40']")!.firstChild!;
    const range = document.createRange();
    const space = arabic.textContent!.indexOf(" ");
    range.setStart(arabic, space);
    range.setEnd(arabic, space + 1);

    expect(captureVerseContext(range)).toBeNull();
  });
});
