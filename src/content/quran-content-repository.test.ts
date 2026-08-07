import { describe, expect, it, vi } from "vitest";
import { createQuranContentRepository } from "./quran-content-repository";
import type {
  SurahSummary,
  TafsirEdition,
  TafsirSource,
  TranslationEdition,
  TranslationLanguage,
} from "./quran";

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

const ENGLISH: TranslationEdition = {
  language: "en",
  label: "English",
  translator: "Marmaduke Pickthall",
};

const TURKISH: TranslationEdition = {
  language: "tr",
  label: "Türkçe",
  translator: "Diyanet İşleri",
};

const GERMAN: TranslationEdition = {
  language: "de",
  label: "Deutsch",
  translator: "Abu Rida Muhammad ibn Ahmad ibn Rassoul",
};

const FIXTURE_TRANSLATIONS: Record<string, Record<number, string[]>> = {
  en: {
    1: ["In the name of Allah", "Praise be to Allah", "The Beneficent, the Merciful"],
    2: ["Alif. Lam. Mim.", "This is the Scripture"],
  },
  tr: {
    1: ["Allah'ın adıyla", "Hamd Allah'a mahsustur", "O, Rahman'dır, Rahim'dir"],
    2: ["Elif Lam Mim", "İşte Kitap"],
  },
  de: {
    1: ["Im Namen Allahs", "Alles Lob gebührt Allah", "Dem Allerbarmer, dem Barmherzigen"],
    2: ["Alif Lam Mim", "Dies ist das Buch"],
  },
};

const ENGLISH_MUKHTASAR: TafsirEdition = {
  source: "al-mukhtasar",
  language: "en",
  name: "Al-Mukhtasar",
  attribution: "Tafsir Center for Qur'anic Studies",
  attributionUrl: "https://qul.tarteel.ai/resources/tafsir/266",
};

const TURKISH_MUKHTASAR: TafsirEdition = {
  source: "al-mukhtasar",
  language: "tr",
  name: "Muhtasar Tefsir",
  attribution: "Tafsir Center for Qur'anic Studies",
  attributionUrl: "https://qul.tarteel.ai/resources/tafsir/258",
};

const FIXTURE_TAFSIR: Record<string, Record<number, string[]>> = {
  en: {
    1: ["Calling on Allah", "All praise belongs to Allah", "Two names of Allah"],
    2: ["Disjointed letters", "This Quran is beyond doubt"],
  },
  tr: {
    1: ["Allah'ın adıyla okumaya başlıyorum", "Bütün övgüler Allah içindir", "Allah'ın iki ismi"],
    2: ["Hurûf-i mukattaa", "Bu Kur'an'da şüphe yoktur"],
  },
};

function createRepository() {
  const loadSurahText = vi.fn(async (surahNumber: number) => FIXTURE_TEXT[surahNumber]);
  const loadTranslationText = vi.fn(
    async (surahNumber: number, language: TranslationLanguage) =>
      FIXTURE_TRANSLATIONS[language][surahNumber],
  );
  const loadTafsirText = vi.fn(
    async (surahNumber: number, _source: TafsirSource, language: TranslationLanguage) =>
      FIXTURE_TAFSIR[language][surahNumber],
  );
  const repository = createQuranContentRepository({
    surahIndex: [AL_FAATIHA, AL_BAQARA],
    translationEditions: [ENGLISH, TURKISH, GERMAN],
    tafsirEditions: [ENGLISH_MUKHTASAR, TURKISH_MUKHTASAR],
    loadSurahText,
    loadTranslationText,
    loadTafsirText,
  });
  return { repository, loadSurahText, loadTranslationText, loadTafsirText };
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

describe("getTranslation", () => {
  it("returns the edition alongside every Ayah's translated text, in order", async () => {
    const { repository } = createRepository();

    const translation = await repository.getTranslation(1, "en");

    expect(translation.edition).toEqual(ENGLISH);
    expect(translation.ayahs).toEqual([
      { ref: { surah: 1, ayah: 1 }, text: "In the name of Allah" },
      { ref: { surah: 1, ayah: 2 }, text: "Praise be to Allah" },
      { ref: { surah: 1, ayah: 3 }, text: "The Beneficent, the Merciful" },
    ]);
  });

  it("rejects a translation that does not align Ayah-for-Ayah with the Arabic", async () => {
    const { repository, loadTranslationText } = createRepository();
    loadTranslationText.mockResolvedValueOnce(["Alif. Lam. Mim."]);

    await expect(repository.getTranslation(2, "en")).rejects.toThrow(
      "Surah 2: expected 2 translated Ayahs, got 1",
    );
  });

  it("rejects a Surah outside the corpus without loading any translation", async () => {
    const { repository, loadTranslationText } = createRepository();

    await expect(repository.getTranslation(115, "en")).rejects.toThrow("Surah 115");
    expect(loadTranslationText).not.toHaveBeenCalled();
  });

  it("serves each of the launch languages from its own edition", async () => {
    const { repository } = createRepository();

    const [english, turkish, german] = await Promise.all([
      repository.getTranslation(2, "en"),
      repository.getTranslation(2, "tr"),
      repository.getTranslation(2, "de"),
    ]);

    expect(english.edition).toEqual(ENGLISH);
    expect(english.ayahs[1].text).toBe("This is the Scripture");
    expect(turkish.edition).toEqual(TURKISH);
    expect(turkish.ayahs[1].text).toBe("İşte Kitap");
    expect(german.edition).toEqual(GERMAN);
    expect(german.ayahs[1].text).toBe("Dies ist das Buch");
  });

  it("rejects a language no edition covers", async () => {
    const { repository } = createRepository();

    await expect(
      repository.getTranslation(1, "fr" as TranslationLanguage),
    ).rejects.toThrow('language "fr"');
  });
});

describe("getTafsir", () => {
  it("returns the edition alongside every Ayah's commentary, in order", async () => {
    const { repository } = createRepository();

    const tafsir = await repository.getTafsir(1, "al-mukhtasar", "en");

    expect(tafsir).toEqual({
      available: true,
      edition: ENGLISH_MUKHTASAR,
      ayahs: [
        { ref: { surah: 1, ayah: 1 }, text: "Calling on Allah" },
        { ref: { surah: 1, ayah: 2 }, text: "All praise belongs to Allah" },
        { ref: { surah: 1, ayah: 3 }, text: "Two names of Allah" },
      ],
    });
  });

  it("reports a language the source has no edition in as unavailable, without loading text", async () => {
    const { repository, loadTafsirText } = createRepository();

    await expect(repository.getTafsir(1, "al-mukhtasar", "de")).resolves.toEqual({
      available: false,
      source: "al-mukhtasar",
      language: "de",
    });
    expect(loadTafsirText).not.toHaveBeenCalled();
  });

  it("serves each language the source covers from its own edition", async () => {
    const { repository } = createRepository();

    const [english, turkish] = await Promise.all([
      repository.getTafsir(2, "al-mukhtasar", "en"),
      repository.getTafsir(2, "al-mukhtasar", "tr"),
    ]);

    expect(english).toMatchObject({
      edition: ENGLISH_MUKHTASAR,
      ayahs: [{ text: "Disjointed letters" }, { text: "This Quran is beyond doubt" }],
    });
    expect(turkish).toMatchObject({
      edition: TURKISH_MUKHTASAR,
      ayahs: [{ text: "Hurûf-i mukattaa" }, { text: "Bu Kur'an'da şüphe yoktur" }],
    });
  });

  it("rejects a tafsir that does not align Ayah-for-Ayah with the Arabic", async () => {
    const { repository, loadTafsirText } = createRepository();
    loadTafsirText.mockResolvedValueOnce(["Disjointed letters"]);

    await expect(repository.getTafsir(2, "al-mukhtasar", "en")).rejects.toThrow(
      "Surah 2: expected 2 commented Ayahs, got 1",
    );
  });

  it("rejects a Surah outside the corpus without loading any tafsir", async () => {
    const { repository, loadTafsirText } = createRepository();

    await expect(repository.getTafsir(115, "al-mukhtasar", "en")).rejects.toThrow("Surah 115");
    expect(loadTafsirText).not.toHaveBeenCalled();
  });
});

describe("listTranslationEditions", () => {
  it("returns every edition a Translation Tab can be opened in", () => {
    const { repository } = createRepository();

    expect(repository.listTranslationEditions()).toEqual([ENGLISH, TURKISH, GERMAN]);
  });
});

describe("listTafsirEditions", () => {
  it("returns only the editions a Tafsir Tab has commentary for", () => {
    const { repository } = createRepository();

    expect(repository.listTafsirEditions()).toEqual([ENGLISH_MUKHTASAR, TURKISH_MUKHTASAR]);
  });
});
