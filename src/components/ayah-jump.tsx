import { ayahAnchorId } from "./ayah-anchor";

export function AyahJump({ ayahCount }: { ayahCount: number }) {
  const ayahNumbers = Array.from({ length: ayahCount }, (_, index) => index + 1);

  return (
    <details className="group mt-6 rounded-lg border border-black/10 dark:border-white/10">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm text-black/60 marker:content-none hover:text-black dark:text-white/60 dark:hover:text-white">
        Jump to an Ayah
        <span className="float-right transition-transform group-open:rotate-180">&#9662;</span>
      </summary>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1 border-t border-black/10 p-2 dark:border-white/10">
        {ayahNumbers.map((ayah) => (
          <li key={ayah}>
            <a
              href={`#${ayahAnchorId(ayah)}`}
              className="block rounded px-1 py-1.5 text-center text-xs tabular-nums text-black/60 hover:bg-black/[0.06] dark:text-white/60 dark:hover:bg-white/[0.08]"
            >
              {ayah}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
