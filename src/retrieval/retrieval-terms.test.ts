import { describe, expect, it } from "vitest";
import { termsIn } from "./retrieval-terms.mjs";

describe("termsIn", () => {
  it("breaks a passage into its lowercased words", () => {
    expect(termsIn("Remember My favour")).toEqual(["remember", "my", "favour"]);
  });

  it("drops the punctuation a translation is printed with", () => {
    expect(termsIn("O Children of Israel! Remember — truly — My favour.")).toEqual([
      "o",
      "children",
      "of",
      "israel",
      "remember",
      "truly",
      "my",
      "favour",
    ]);
  });

  it("keeps the numbers commentary cites Ayahs by", () => {
    expect(termsIn("see 2:40")).toEqual(["see", "2", "40"]);
  });

  it("finds no terms in text that is only punctuation", () => {
    expect(termsIn(" — «» ... ")).toEqual([]);
  });
});

/**
 * A reader types their question on whatever keyboard they have, and a translation is printed with
 * every mark its language uses. Folding both to the same terms is what lets an unaccented question
 * find an accented passage.
 */
describe("folding", () => {
  const foldsTogether = (...spellings: string[]) => {
    const [first, ...rest] = spellings.map((spelling) => termsIn(spelling));
    for (const other of rest) expect(other).toEqual(first);
    return first;
  };

  it("folds German umlauts, so a question typed without them still matches", () => {
    expect(foldsTogether("Grüße", "Grusse", "GRÜSSE")).toEqual(["grusse"]);
  });

  it("folds Turkish dotted and dotless i, which casing alone would split apart", () => {
    expect(foldsTogether("Işık", "IŞIK", "ışık", "isik")).toEqual(["isik"]);
  });

  it("folds a capital İ the way Turkish writes it", () => {
    expect(foldsTogether("İyilik", "iyilik", "IYILIK")).toEqual(["iyilik"]);
  });

  it("folds Arabic harakat, which are written in the corpus and typed by almost no one", () => {
    expect(foldsTogether("نِعْمَتِيَ", "نعمتي")).toEqual(["نعمتي"]);
  });
});
