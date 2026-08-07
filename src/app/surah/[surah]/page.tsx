import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { quranContent } from "@/content/bundled-quran";
import { ReadingPane } from "@/components/reading-pane";
import { AyahJump } from "@/components/ayah-jump";

type PageProps = { params: Promise<{ surah: string }> };

export function generateStaticParams() {
  return quranContent.listSurahs().map((surah) => ({ surah: String(surah.number) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const summary = quranContent.getSurahSummary(Number((await params).surah));
  if (!summary) return {};
  return { title: `${summary.transliteratedName} — Koran AI` };
}

export default async function SurahPage({ params }: PageProps) {
  const summary = quranContent.getSurahSummary(Number((await params).surah));
  if (!summary) notFound();

  const surah = await quranContent.getSurah(summary.number);
  const previous = quranContent.getSurahSummary(summary.number - 1);
  const next = quranContent.getSurahSummary(summary.number + 1);

  return (
    <>
      <header className="border-b border-black/10 pb-6 text-center dark:border-white/10">
        <p className="text-xs uppercase tracking-widest text-black/40 dark:text-white/40">
          Surah {summary.number} &middot; {summary.revelationPlace === "meccan" ? "Meccan" : "Medinan"}
        </p>
        <h1 dir="rtl" lang="ar" className="font-arabic mt-2 text-3xl leading-relaxed">
          {summary.arabicName}
        </h1>
        <p className="mt-1 text-sm font-medium">{summary.transliteratedName}</p>
        <p className="text-sm text-black/55 dark:text-white/55">
          {summary.translatedName} &middot; {summary.ayahCount} Ayahs
        </p>
      </header>

      <AyahJump ayahCount={summary.ayahCount} />

      <ReadingPane surah={surah} />

      <nav className="mt-10 flex items-center justify-between gap-3 border-t border-black/10 pt-6 text-sm dark:border-white/10">
        {previous ? (
          <Link href={`/surah/${previous.number}`} className="hover:underline">
            &larr; {previous.transliteratedName}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/surah/${next.number}`} className="text-right hover:underline">
            {next.transliteratedName} &rarr;
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}
