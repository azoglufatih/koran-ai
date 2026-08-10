"use client";

import { quranContent } from "@/content/bundled-quran";
import type { TransliterationScheme } from "@/content/quran";
import { MenuOption, WorkspaceMenu } from "@/components/tabs/workspace-menu";
import { useTransliteration } from "./transliteration-provider";

const schemes = quranContent.listTransliterationSchemes();

const schemeLabel = (scheme: TransliterationScheme) =>
  schemes.find((info) => info.scheme === scheme)?.label ?? scheme;

/**
 * How the reader turns the Transliteration off, and picks which of the three schemes they read it
 * in. Both stay with them: they are kept in their own browser and survive a reload.
 *
 * These sit at the top of the Reading Pane rather than in provider settings, because this is a
 * reading preference about the Arabic in front of them and not configuration. The picker is a menu,
 * so it joins the same one-open-menu-at-a-time rule the `+` menus follow (ADR 0006).
 */
export function TransliterationControls() {
  const { scheme, isShown, chooseScheme, showTransliteration } = useTransliteration();

  return (
    <div className="mt-6 flex items-center justify-end gap-2">
      <button
        type="button"
        aria-pressed={isShown}
        onClick={() => showTransliteration(!isShown)}
        className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm ${
          isShown
            ? "border-black/25 text-black/80 dark:border-white/25 dark:text-white/80"
            : "border-black/15 text-black/50 hover:text-black dark:border-white/15 dark:text-white/50 dark:hover:text-white"
        }`}
      >
        Transliteration{isShown ? "" : " off"}
      </button>

      <WorkspaceMenu
        label={schemeLabel(scheme)}
        title="Choose the transliteration scheme"
      >
        {schemes.map((info) => (
          <MenuOption
            key={info.scheme}
            label={info.label}
            // The schemes differ in how they spell rather than in what they say, so a line of each
            // is the only thing that tells a reader which one they want.
            detail={info.sample}
            hint={isShown && info.scheme === scheme ? "reading" : undefined}
            onChoose={() => chooseScheme(info.scheme)}
          />
        ))}
      </WorkspaceMenu>
    </div>
  );
}
