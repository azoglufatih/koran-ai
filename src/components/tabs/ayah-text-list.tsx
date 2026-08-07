import type { AyahRef } from "@/content/quran";

/**
 * One piece of text per Ayah, numbered — how a Translation Tab and a Tafsir Tab both read, so the
 * Ayah a reader is looking at lines up across whichever Tabs they have open.
 */
export function AyahTextList({
  ayahs,
}: {
  ayahs: readonly { ref: AyahRef; text: string }[];
}) {
  return (
    <ol className="divide-y divide-black/[0.07] dark:divide-white/[0.07]">
      {ayahs.map((ayah) => (
        <li key={ayah.ref.ayah} className="flex gap-4 py-4">
          <span className="mt-0.5 w-8 shrink-0 text-xs tabular-nums text-black/35 dark:text-white/35">
            {ayah.ref.surah}:{ayah.ref.ayah}
          </span>
          <p className="flex-1 leading-relaxed">{ayah.text}</p>
        </li>
      ))}
    </ol>
  );
}
