import { describe, expect, it, vi } from "vitest";
import { createQuranContentRepository } from "./quran-content-repository";
import type {
  SurahSummary,
  TafsirEdition,
  TafsirSource,
  TranslationEdition,
  TranslationLanguage,
  TransliterationScheme,
  TransliterationSchemeInfo,
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
  translator: "Marmaduke Pickthall",
};

const TURKISH: TranslationEdition = {
  language: "tr",
  translator: "Elmalılı Hamdi Yazır",
};

// German is a reader language with no edition, here as in the shipped corpus — it is the case the
// repository has to report as a gap rather than raise on.
const FIXTURE_TRANSLATIONS: Record<string, Record<number, string[]>> = {
  en: {
    1: ["In the name of Allah", "Praise be to Allah", "The Beneficent, the Merciful"],
    2: ["Alif. Lam. Mim.", "This is the Scripture"],
  },
  tr: {
    1: ["Allah'ın adıyla", "Hamd Allah'a mahsustur", "O, Rahman'dır, Rahim'dir"],
    2: ["Elif Lam Mim", "İşte Kitap"],
  },
};

const PHONETIC: TransliterationSchemeInfo = {
  scheme: "ara-quranphoneticst",
  label: "Phonetic",
  sample: "Al-Ĥamdu Lillāhi Rabbi Al-`Ālamīna",
};

const TURKISH_LATIN: TransliterationSchemeInfo = {
  scheme: "tur-latinalphabet",
  label: "Türkçe",
  sample: "El hamdü lillahi rabbil alemin",
};

const FIXTURE_TRANSLITERATION: Record<string, Record<number, string[]>> = {
  "ara-quranphoneticst": {
    1: ["Bismi Allāhi Ar-Raĥmāni Ar-Raĥīmi", "Al-Ĥamdu Lillāhi", "Ar-Raĥmāni Ar-Raĥīmi"],
    2: ["Alif-Lām-Mīm", "Dhālika Al-Kitābu"],
  },
  "tur-latinalphabet": {
    1: ["Bismillahirrahmanirrahim", "El hamdü lillahi", "Errahmanirrahim"],
    2: ["Elif lam mim", "İşte o kitap"],
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
  const loadTransliterationText = vi.fn(
    async (surahNumber: number, scheme: TransliterationScheme) =>
      FIXTURE_TRANSLITERATION[scheme][surahNumber],
  );
  const loadTafsirText = vi.fn(
    async (surahNumber: number, _source: TafsirSource, language: TranslationLanguage) =>
      FIXTURE_TAFSIR[language][surahNumber],
  );
  const repository = createQuranContentRepository({
    surahIndex: [AL_FAATIHA, AL_BAQARA],
    translationEditions: [ENGLISH, TURKISH],
    transliterationSchemes: [PHONETIC, TURKISH_LATIN],
    tafsirEditions: [ENGLISH_MUKHTASAR, TURKISH_MUKHTASAR],
    loadSurahText,
    loadTranslationText,
    loadTransliterationText,
    loadTafsirText,
  });
  return {
    repository,
    loadSurahText,
    loadTranslationText,
    loadTransliterationText,
    loadTafsirText,
  };
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

    expect(translation).toEqual({
      available: true,
      edition: ENGLISH,
      ayahs: [
        { ref: { surah: 1, ayah: 1 }, text: "In the name of Allah" },
        { ref: { surah: 1, ayah: 2 }, text: "Praise be to Allah" },
        { ref: { surah: 1, ayah: 3 }, text: "The Beneficent, the Merciful" },
      ],
    });
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

  it("serves each translated language from its own edition", async () => {
    const { repository } = createRepository();

    const [english, turkish] = await Promise.all([
      repository.getTranslation(2, "en"),
      repository.getTranslation(2, "tr"),
    ]);

    expect(english).toMatchObject({ edition: ENGLISH });
    expect(english).toMatchObject({ ayahs: [{}, { text: "This is the Scripture" }] });
    expect(turkish).toMatchObject({ edition: TURKISH });
    expect(turkish).toMatchObject({ ayahs: [{}, { text: "İşte Kitap" }] });
  });

  it("reports a reader language no edition covers as a gap, without loading any text", async () => {
    const { repository, loadTranslationText } = createRepository();

    expect(await repository.getTranslation(1, "de")).toEqual({
      available: false,
      language: "de",
    });
    expect(loadTranslationText).not.toHaveBeenCalled();
  });

  it("reports a language outside the vocabulary as a gap rather than raising", async () => {
    const { repository } = createRepository();

    expect(await repository.getTranslation(1, "fr" as TranslationLanguage)).toEqual({
      available: false,
      language: "fr",
    });
  });
});

describe("listTransliterationSchemes", () => {
  it("returns every scheme a reader can pick between", () => {
    const { repository } = createRepository();

    expect(repository.listTransliterationSchemes()).toEqual([PHONETIC, TURKISH_LATIN]);
  });
});

describe("getTransliteration", () => {
  it("returns every Ayah's Latin line, numbered as the Arabic beside it is", async () => {
    const { repository } = createRepository();

    const transliteration = await repository.getTransliteration(2, "ara-quranphoneticst");

    expect(transliteration.scheme).toBe("ara-quranphoneticst");
    expect(transliteration.ayahs).toEqual([
      { ref: { surah: 2, ayah: 1 }, text: "Alif-Lām-Mīm" },
      { ref: { surah: 2, ayah: 2 }, text: "Dhālika Al-Kitābu" },
    ]);
  });

  it("reads the scheme it was asked for, not the default", async () => {
    const { repository } = createRepository();

    const transliteration = await repository.getTransliteration(2, "tur-latinalphabet");

    expect(transliteration.ayahs[0].text).toBe("Elif lam mim");
  });

  it("loads text only for the requested Surah", async () => {
    const { repository, loadTransliterationText } = createRepository();

    await repository.getTransliteration(2, "ara-quranphoneticst");

    expect(loadTransliterationText).toHaveBeenCalledExactlyOnceWith(2, "ara-quranphoneticst");
  });

  it("rejects a Surah outside the corpus without reading any text", async () => {
    const { repository, loadTransliterationText } = createRepository();

    await expect(repository.getTransliteration(115, "ara-quranphoneticst")).rejects.toThrow(
      RangeError,
    );
    expect(loadTransliterationText).not.toHaveBeenCalled();
  });

  // A line that has drifted by one sits under the wrong Ayah, which is worse than no line at all:
  // the reader sounds out an Ayah they are not looking at.
  it("refuses a scheme whose Ayah count does not match the Arabic", async () => {
    const { repository } = createRepository();
    FIXTURE_TRANSLITERATION["ara-quranphoneticst"][2] = ["Alif-Lām-Mīm"];

    await expect(repository.getTransliteration(2, "ara-quranphoneticst")).rejects.toThrow(
      "expected 2 transliterated Ayahs, got 1",
    );

    FIXTURE_TRANSLITERATION["ara-quranphoneticst"][2] = ["Alif-Lām-Mīm", "Dhālika Al-Kitābu"];
  });
});

describe("getTransliteratedBasmala", () => {
  // The 112 Surahs that open with one have it above their numbered Ayahs, where the corpus has no
  // entry for it — so it comes from Al-Faatiha's 1:1, which is that same text (ADR 0005).
  it("reads the basmala out of the scheme's own 1:1", async () => {
    const { repository } = createRepository();

    expect(await repository.getTransliteratedBasmala("ara-quranphoneticst")).toBe(
      "Bismi Allāhi Ar-Raĥmāni Ar-Raĥīmi",
    );
  });

  it("reads it in whichever scheme the reader is on", async () => {
    const { repository } = createRepository();

    expect(await repository.getTransliteratedBasmala("tur-latinalphabet")).toBe(
      "Bismillahirrahmanirrahim",
    );
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

    expect(repository.listTranslationEditions()).toEqual([ENGLISH, TURKISH]);
  });
});

describe("listTafsirEditions", () => {
  it("returns only the editions a Tafsir Tab has commentary for", () => {
    const { repository } = createRepository();

    expect(repository.listTafsirEditions()).toEqual([ENGLISH_MUKHTASAR, TURKISH_MUKHTASAR]);
  });
});
