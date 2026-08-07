import Link from "next/link";
import { quranContent } from "@/content/bundled-quran";

export default function SurahIndexPage() {
  const surahs = quranContent.listSurahs();

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">The Quran</h1>
      <p className="mt-1 text-sm text-black/55 dark:text-white/55">
        114 Surahs in Arabic. Pick one to start reading.
      </p>

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {surahs.map((surah) => (
          <li key={surah.number}>
            <Link
              href={`/surah/${surah.number}`}
              className="flex items-center gap-3 rounded-lg border border-black/10 px-3 py-2.5 hover:border-black/25 hover:bg-black/[0.03] dark:border-white/10 dark:hover:border-white/25 dark:hover:bg-white/[0.04]"
            >
              <span className="w-7 shrink-0 text-sm tabular-nums text-black/40 dark:text-white/40">
                {surah.number}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{surah.transliteratedName}</span>
                <span className="block truncate text-xs text-black/50 dark:text-white/50">
                  {surah.translatedName} &middot; {surah.ayahCount} Ayahs
                </span>
              </span>
              <span dir="rtl" lang="ar" className="font-arabic shrink-0 text-lg">
                {surah.arabicName}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
