export type RevelationPlace = "meccan" | "medinan";

export interface SurahSummary {
  number: number;
  arabicName: string;
  transliteratedName: string;
  translatedName: string;
  ayahCount: number;
  revelationPlace: RevelationPlace;
  /**
   * The Surah's opening basmala, which sits outside its numbered Ayahs. Null for Al-Faatiha,
   * where the basmala is Ayah 1, and At-Tawba, which has none.
   */
  openingBasmala: string | null;
}

export interface AyahRef {
  surah: number;
  ayah: number;
}

export interface Ayah {
  ref: AyahRef;
  arabicText: string;
}

export interface Surah {
  summary: SurahSummary;
  ayahs: Ayah[];
}
