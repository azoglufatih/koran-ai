import { describe, expect, it } from "vitest";
import type { VerseContext } from "@/ai/verse-context";
import { selectionLanguage, whatElseIsSent, whatIsBeingAskedAbout } from "./grounding-notice";

const ARABIC = "يَٰبَنِىٓ إِسْرَٰٓءِيلَ ٱذْكُرُوا۟";
const ENGLISH = "O Children of Israel! Remember";
const TURKISH = "Ey İsrailoğulları! Hatırlayın";
const COMMENTARY = "Allah reminds the Israelites of the favours He bestowed";

const asking = (context: Partial<VerseContext> = {}): VerseContext => ({
  ref: { surah: 2, ayah: 40 },
  arabic: ARABIC,
  translations: [{ language: "en", text: ENGLISH }],
  transliteration: null,
  commentary: null,
  selection: { in: "arabic", start: 0, end: 8 },
  ...context,
});

const askingInTheCommentary = () =>
  asking({
    commentary: { source: "al-mukhtasar", language: "en", text: COMMENTARY },
    selection: { in: "tafsir", start: 4, end: 11 },
  });

/**
 * Nothing else in this app tells a reader what leaves their browser for their own provider, so
 * everything that goes has to be nameable here — and nothing that stays behind may be named
 * (ADR 0001).
 */
describe("what the reader is told is sent", () => {
  it("names the Ayah and the translation they have open, not just 'context'", () => {
    const sent = whatElseIsSent(asking(), "en");

    expect(sent).toContain("English translation");
    expect(sent).toContain("commentary on this Ayah");
    expect(sent).toContain("passages from elsewhere");
  });

  it("names every translation open, so a reader sending three knows they are sending three", () => {
    const sent = whatElseIsSent(
      asking({
        translations: [
          { language: "en", text: ENGLISH },
          { language: "tr", text: TURKISH },
        ],
      }),
      "en",
    );

    expect(sent).toContain("English");
    expect(sent).toContain("Türkçe");
    expect(sent).toContain("translations");
  });

  // It is on screen above this line, so listing it as well would pad the notice rather than
  // disclose anything — and padding is what stops a disclosure being read.
  it("leaves out the text the reader can already see marked above", () => {
    expect(whatElseIsSent(asking(), "en")).not.toContain("Arabic");
    expect(
      whatElseIsSent(
        asking({ selection: { in: "translation", language: "en", start: 2, end: 20 } }),
        "en",
      ),
    ).not.toContain("English");
  });

  // Retrieval anchors on the Ayah's own commentary — except where that commentary is the very
  // thing the reader marked, which is shown above and not sent twice.
  it("does not promise the commentary on this Ayah when that is what the reader selected in", () => {
    expect(whatElseIsSent(askingInTheCommentary(), "en")).not.toContain("commentary on this Ayah");
  });

  it("promises the other language's commentary to a reader who marked one edition and reads in another", () => {
    expect(whatElseIsSent(askingInTheCommentary(), "tr")).toContain("commentary on this Ayah");
  });

  // Before the browser has said which language to search, nothing is retrieved — so a notice that
  // promised passages would be describing a request this one will not make.
  it("promises no retrieved passages before the reader's language is known", () => {
    const sent = whatElseIsSent(asking(), null);

    expect(sent).not.toContain("passages");
    expect(sent).not.toContain("commentary on this Ayah");
    expect(sent).toContain("English translation");
  });
});

describe("what the notice says the question is about", () => {
  it("is the Ayah, for a selection in any of the texts that are the Ayah", () => {
    expect(whatIsBeingAskedAbout(asking())).toBe("Asking about Ayah 2:40");
  });

  /**
   * The source stands where the Ayah reference stands, so a reader cannot come away thinking the
   * marked sentence was revelation (docs/adr/0007-commentary-selection-is-a-claim.md).
   */
  it("is the commentary and whose it is, for a Commentary Selection", () => {
    const said = whatIsBeingAskedAbout(askingInTheCommentary());

    expect(said).toMatch(/Al-Mukhtasar/);
    expect(said).toMatch(/not the Ayah itself/);
  });
});

describe("the language the marked text is announced in", () => {
  it("is the language of whichever text the reader selected in", () => {
    expect(selectionLanguage(asking())).toBe("ar");
    expect(selectionLanguage(askingInTheCommentary())).toBe("en");
    expect(
      selectionLanguage(
        asking({ selection: { in: "translation", language: "tr", start: 0, end: 2 } }),
      ),
    ).toBe("tr");
  });

  // Latin-script Arabic is neither English nor Turkish, and leaving it unnamed is not neutral: it
  // would inherit the page's own language and be read out as English prose.
  it("is Arabic-in-Latin-letters for the Transliteration, never the page's own language", () => {
    const context = asking({
      transliteration: { scheme: "ara-quranphoneticst", text: "Yā Banī 'Isrā'īla" },
      selection: { in: "transliteration", start: 0, end: 2 },
    });

    expect(selectionLanguage(context)).toBe("ar-Latn");
  });
});
