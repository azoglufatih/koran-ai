import { describe, expect, it, vi } from "vitest";
import { createQuranContentRepository } from "./quran-content-repository";
import type { SurahSummary } from "./quran";

const AL_FAATIHA: SurahSummary = {
  number: 1,
  arabicName: "سُورَةُ ٱلْفَاتِحَةِ",
  transliteratedName: "Al-Faatiha",
  translatedName: "The Opening",
  ayahCount: 3,
  revelationPlace: "meccan",
  openingBasmala: null,
};

const AL_BAQARA: SurahSummary = {
  number: 2,
  arabicName: "سُورَةُ البَقَرَةِ",
  transliteratedName: "Al-Baqara",
  translatedName: "The Cow",
  ayahCount: 2,
  revelationPlace: "medinan",
  openingBasmala: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
};

const FIXTURE_TEXT: Record<number, string[]> = {
  1: ["بِسْمِ ٱللَّهِ", "ٱلْحَمْدُ لِلَّهِ", "ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"],
  2: ["الٓمٓ", "ذَٰلِكَ ٱلْكِتَٰبُ"],
};

function createRepository() {
  const loadSurahText = vi.fn(async (surahNumber: number) => FIXTURE_TEXT[surahNumber]);
  const repository = createQuranContentRepository([AL_FAATIHA, AL_BAQARA], loadSurahText);
  return { repository, loadSurahText };
}

describe("listSurahs", () => {
  it("returns every Surah in revelation-order of the index", () => {
    const { repository } = createRepository();

    expect(repository.listSurahs()).toEqual([AL_FAATIHA, AL_BAQARA]);
  });
});

describe("getSurahSummary", () => {
  it("looks a Surah up by number without loading its text", () => {
    const { repository, loadSurahText } = createRepository();

    expect(repository.getSurahSummary(2)).toEqual(AL_BAQARA);
    expect(loadSurahText).not.toHaveBeenCalled();
  });

  it("returns undefined for a Surah outside the corpus", () => {
    const { repository } = createRepository();

    expect(repository.getSurahSummary(115)).toBeUndefined();
    expect(repository.getSurahSummary(Number.NaN)).toBeUndefined();
  });
});

describe("getSurah", () => {
  it("returns the summary alongside every Ayah in order", async () => {
    const { repository } = createRepository();

    const surah = await repository.getSurah(1);

    expect(surah.summary).toEqual(AL_FAATIHA);
    expect(surah.ayahs).toEqual([
      { ref: { surah: 1, ayah: 1 }, arabicText: "بِسْمِ ٱللَّهِ" },
      { ref: { surah: 1, ayah: 2 }, arabicText: "ٱلْحَمْدُ لِلَّهِ" },
      { ref: { surah: 1, ayah: 3 }, arabicText: "ٱلرَّحْمَٰنِ ٱلرَّحِيمِ" },
    ]);
  });

  it("loads text only for the requested Surah", async () => {
    const { repository, loadSurahText } = createRepository();

    await repository.getSurah(2);

    expect(loadSurahText).toHaveBeenCalledExactlyOnceWith(2);
  });

  it("rejects a Surah number outside the corpus", async () => {
    const { repository } = createRepository();

    await expect(repository.getSurah(115)).rejects.toThrow("Surah 115");
  });
});

describe("getAyah", () => {
  it("returns the single addressed Ayah", async () => {
    const { repository } = createRepository();

    await expect(repository.getAyah({ surah: 2, ayah: 2 })).resolves.toEqual({
      ref: { surah: 2, ayah: 2 },
      arabicText: "ذَٰلِكَ ٱلْكِتَٰبُ",
    });
  });

  it("rejects an Ayah number beyond the end of the Surah", async () => {
    const { repository } = createRepository();

    await expect(repository.getAyah({ surah: 2, ayah: 3 })).rejects.toThrow("Ayah 2:3");
  });

  it("rejects an Ayah in a Surah outside the corpus", async () => {
    const { repository } = createRepository();

    await expect(repository.getAyah({ surah: 0, ayah: 1 })).rejects.toThrow("Surah 0");
  });
});
