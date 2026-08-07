import type { AyahRef } from "@/content/quran";

/**
 * One piece of text per Ayah, numbered — how a Translation Tab and a Tafsir Tab both read, so the
 * Ayah a reader is looking at lines up across whichever Tabs they have open.
 *
 * `ayahMarks` is how a Tab whose text a reader can ask about says so: a Translation Tab stamps
 * each Ayah so a selection in it can be traced back, and a Tafsir Tab — which is commentary about
 * an Ayah rather than the Ayah itself — passes nothing.
 */
export function AyahTextList({
  ayahs,
  ayahMarks,
}: {
  ayahs: readonly { ref: AyahRef; text: string }[];
  ayahMarks?: (ref: AyahRef) => Record<string, string>;
}) {
  return (
    <ol className="divide-y divide-black/[0.07] dark:divide-white/[0.07]">
      {ayahs.map((ayah) => (
        <li key={ayah.ref.ayah} className="flex gap-4 py-4">
          <span className="mt-0.5 w-8 shrink-0 text-xs tabular-nums text-black/35 dark:text-white/35">
            {ayah.ref.surah}:{ayah.ref.ayah}
          </span>
          <p className="flex-1 leading-relaxed" {...ayahMarks?.(ayah.ref)}>
            {ayah.text}
          </p>
        </li>
      ))}
    </ol>
  );
}
