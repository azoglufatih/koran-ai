import { describe, expect, it } from "vitest";
import type { AyahRef } from "@/content/quran";
import { ayahAtReadingEdge } from "./ayah-at-reading-edge";

const inSurah18 = (ayah: number, top: number) => ({ ref: { surah: 18, ayah }, top });

const ayah = (n: number): AyahRef => ({ surah: 18, ayah: n });

/** No header over the text — the top of the screen is the top of the reading. */
const NO_HEADER = 0;

describe("ayahAtReadingEdge", () => {
  it("is the Ayah the reader has scrolled to the top of the screen", () => {
    const inView = [inSurah18(4, -30), inSurah18(5, 120), inSurah18(6, 400)];

    expect(ayahAtReadingEdge(inView, NO_HEADER)).toEqual(ayah(4));
  });

  it("is the last Ayah past the top edge when several have gone by", () => {
    const inView = [inSurah18(4, -300), inSurah18(5, -40), inSurah18(6, 200)];

    expect(ayahAtReadingEdge(inView, NO_HEADER)).toEqual(ayah(5));
  });

  it("is the first Ayah on screen when the reader is still at the top of the Surah", () => {
    const inView = [inSurah18(1, 220), inSurah18(2, 480)];

    expect(ayahAtReadingEdge(inView, NO_HEADER)).toEqual(ayah(1));
  });

  it("reads the same order however the browser reports what is on screen", () => {
    const inView = [inSurah18(6, 200), inSurah18(4, -300), inSurah18(5, -40)];

    expect(ayahAtReadingEdge(inView, NO_HEADER)).toEqual(ayah(5));
  });

  // An Ayah beginning under the header still runs down the screen below it, so it — not the one
  // before it — is what the reader has in front of them.
  it("counts an Ayah as reached once it has passed under the header, not the top of the window", () => {
    const inView = [inSurah18(4, -200), inSurah18(5, 30), inSurah18(6, 300)];

    expect(ayahAtReadingEdge(inView, 60)).toEqual(ayah(5));
    expect(ayahAtReadingEdge(inView, NO_HEADER)).toEqual(ayah(4));
  });

  it("is nothing when the reader has no Ayah on screen at all", () => {
    expect(ayahAtReadingEdge([], NO_HEADER)).toBeNull();
  });
});
