// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { arabicAyahMarks, arabicAyahTexts, translationAyahMarks } from "./ayah-marks";

const attributes = (marks: Record<string, string>) =>
  Object.entries(marks)
    .map(([mark, value]) => `${mark}="${value}"`)
    .join(" ");

/** A Surah page, marked the way the Reading Pane and a Translation Tab mark their own text. */
function page(surah: number, ayahs: number[]) {
  const arabic = ayahs
    .map((ayah) => `<li><p ${attributes(arabicAyahMarks({ surah, ayah }))}>Ayah ${ayah}</p></li>`)
    .join("");

  const translated = ayahs
    .map(
      (ayah) =>
        `<p ${attributes(translationAyahMarks({ surah, ayah }, "en"))}>Translated ${ayah}</p>`,
    )
    .join("");

  document.body.innerHTML = `<h1>Al-Kahf</h1><ol>${arabic}</ol><article>${translated}</article>`;
}

beforeEach(() => {
  page(18, [1, 2, 3]);
});

describe("arabicAyahTexts", () => {
  it("finds the Ayahs the Reading Pane marked, in the order it rendered them", () => {
    expect(arabicAyahTexts(document).map(({ ref }) => ref)).toEqual([
      { surah: 18, ayah: 1 },
      { surah: 18, ayah: 2 },
      { surah: 18, ayah: 3 },
    ]);
  });

  it("hands back the element holding each Ayah, so its place on screen can be read", () => {
    const [first] = arabicAyahTexts(document);

    expect(first.element.textContent).toBe("Ayah 1");
  });

  it("leaves the translations beside the Arabic out of it", () => {
    expect(arabicAyahTexts(document)).toHaveLength(3);
  });

  it("finds nothing on a page with no Reading Pane at all", () => {
    document.body.innerHTML = "<h1>The Quran</h1>";

    expect(arabicAyahTexts(document)).toEqual([]);
  });
});
