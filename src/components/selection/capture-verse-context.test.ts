// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { selectedText } from "@/ai/verse-context";
import { captureVerseContext } from "./capture-verse-context";

const ARABIC = "يَٰبَنِىٓ إِسْرَٰٓءِيلَ ٱذْكُرُوا۟ نِعْمَتِىَ";
const ENGLISH = "O Children of Israel! Remember My favour";
const TURKISH = "Ey İsrailoğulları! Size verdiğim nimeti hatırlayın";
const LATIN = "Yā Banī 'Isrā'īla Adhkurū Ni`matiya";
const COMMENTARY = "Allah reminds the Israelites of the favours He bestowed on their forefathers";
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

const tafsirTab = (source: string, language: string, text = COMMENTARY) => `
  <article>
    <p data-ayah-role="tafsir" data-ayah-source="${source}" data-ayah-language="${language}" data-ayah="2:40">${text}</p>
  </article>`;

const inTranslationTab = "[data-ayah-role='translation']";
const inTafsirTab = "[data-ayah-role='tafsir']";

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

    expect(context?.translations).toEqual([{ language: "en", text: ENGLISH }]);
  });

  it("carries no translation when the reader is reading Arabic only", () => {
    page("");

    expect(captureVerseContext(selecting("إِسْرَٰٓءِيلَ"))?.translations).toEqual([]);
  });
});

/**
 * Which Tab is showing depends on the width of the screen — a Column shows one Tab at a time on a
 * laptop, and below that the whole workspace is one swipeable strip. Grounding in what is visible
 * would answer the same question differently on the reader's phone and their laptop.
 */
describe("a reader with two Translation Tabs open", () => {
  it("carries both, whichever of them is the one on screen", () => {
    page(translationTab("en", ENGLISH, false) + translationTab("tr", TURKISH, true));

    expect(captureVerseContext(selecting("إِسْرَٰٓءِيلَ"))?.translations).toEqual([
      { language: "en", text: ENGLISH },
      { language: "tr", text: TURKISH },
    ]);
  });

  it("names the one the selection was made in, since offsets mean nothing in the other", () => {
    page(translationTab("en", ENGLISH, false) + translationTab("tr", TURKISH, true));

    const context = captureVerseContext(
      selecting("İsrailoğulları", `${inTranslationTab}[data-ayah-language='tr']`),
    );

    expect(context?.selection).toMatchObject({ in: "translation", language: "tr" });
    expect(selectedText(context!)).toBe("İsrailoğulları");
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

    expect(context?.translations).toEqual([{ language: "en", text: ENGLISH }]);
  });
});

/**
 * A span of tafsir is a commentator's claim *about* the Ayah rather than another rendering of it,
 * so it is carried attributed to the edition it came from and never as the Ayah's own words
 * (docs/adr/0007-commentary-selection-is-a-claim.md).
 */
describe("a Commentary Selection", () => {
  beforeEach(() => {
    page(translationTab("en", ENGLISH, false) + tafsirTab("al-mukhtasar", "en"));
  });

  it("is grounded in the Ayah the commentary is about, which the reader has beside it", () => {
    const context = captureVerseContext(selecting("favours", inTafsirTab));

    expect(context).toMatchObject({ ref: { surah: 2, ayah: 40 }, arabic: ARABIC });
    expect(selectedText(context!)).toBe("favours");
  });

  it("carries the commentary named for the edition it came from", () => {
    const context = captureVerseContext(selecting("favours", inTafsirTab));

    expect(context?.commentary).toEqual({
      source: "al-mukhtasar",
      language: "en",
      text: COMMENTARY,
    });
    expect(context?.selection.in).toBe("tafsir");
  });

  it("carries the Ayah's own renderings too, so the claim can be read against the text", () => {
    const context = captureVerseContext(selecting("favours", inTafsirTab));

    expect(context?.arabic).toBe(ARABIC);
    expect(context?.translations).toEqual([{ language: "en", text: ENGLISH }]);
  });

  // Unattributed, it is a claim about the Ayah with nobody making it — which is the one thing the
  // model must never be handed.
  it("is ignored when the commentary names no source this version knows", () => {
    page(tafsirTab("made-up-tafsir", "en"));

    expect(captureVerseContext(selecting("favours", inTafsirTab))).toBeNull();
  });

  it("is ignored when the commentary names no language it can read", () => {
    page(tafsirTab("al-mukhtasar", "kl"));

    expect(captureVerseContext(selecting("favours", inTafsirTab))).toBeNull();
  });
});

// The Transliteration says nothing the Arabic does not, and the commentary is somebody else's
// reading of it — so each goes only with a question about itself.
describe("a selection anywhere else", () => {
  it("carries no Transliteration, even with the line on the page", () => {
    expect(captureVerseContext(selecting("إِسْرَٰٓءِيلَ"))?.transliteration).toBeNull();
    expect(
      captureVerseContext(selecting("Children of Israel", inTranslationTab))?.transliteration,
    ).toBeNull();
  });

  it("carries no commentary, even with a Tafsir Tab open", () => {
    page(translationTab("en", ENGLISH, true) + tafsirTab("al-mukhtasar", "en"), false);

    expect(captureVerseContext(selecting("إِسْرَٰٓءِيلَ"))?.commentary).toBeNull();
    expect(
      captureVerseContext(selecting("Children of Israel", inTranslationTab))?.commentary,
    ).toBeNull();
  });

  it("is unchanged for a reader who has the line turned off", () => {
    page(translationTab("en", ENGLISH, true), false);

    expect(captureVerseContext(selecting("إِسْرَٰٓءِيلَ"))).toMatchObject({
      arabic: ARABIC,
      transliteration: null,
      commentary: null,
      translations: [{ language: "en", text: ENGLISH }],
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

    expect(context?.selection).toMatchObject({ in: "translation", language: "en" });
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
    expect(context?.translations).toEqual([{ language: "en", text: ENGLISH }]);
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
    expect(captureVerseContext(selecting("إِسْرَٰٓءِيلَ"))?.translations).toEqual([]);
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
