"use client";

import { useEffect, useId, useRef } from "react";
import { useTabs } from "./tabs-provider";

/**
 * A menu in the reading workspace. There are several — a `+` on the workspace, a `+` in each
 * Column, the Transliteration scheme picker — and only ever one of them open: opening this one
 * closes whichever was, because the open menu is the Tabs provider's rather than each menu's own.
 *
 * Picking an option closes it, so every option below should be a `MenuOption`; pressing Escape or
 * pointing anywhere outside closes it too.
 */
export function WorkspaceMenu({
  label,
  title,
  disabledReason,
  describedBy,
  children,
}: {
  label: string;
  /** What the menu opens, spelled out for a reader who hears the button rather than sees it. */
  title: string;
  /** Why the menu cannot be opened. Absent when it can — which is the usual case. */
  disabledReason?: string;
  /** An element saying the same thing on screen, so the reason is read out as well as shown. */
  describedBy?: string;
  children: React.ReactNode;
}) {
  // Each menu names itself, so nothing has to invent ids that stay unique across however many
  // Columns the reader has open.
  const id = useId();
  const { openMenuId, toggleMenu, closeMenu } = useTabs();
  const isOpen = openMenuId === id && !disabledReason;
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Pointing outside is the reader saying they are done with the menu — including pointing at
    // another menu's button, which then opens on the click that follows.
    const dismissOnPointerOutside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) closeMenu();
    };

    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeMenu();
      // Back to the button they opened it from, rather than dropping focus to the top of the page.
      menu.current?.querySelector("button")?.focus();
    };

    document.addEventListener("pointerdown", dismissOnPointerOutside);
    document.addEventListener("keydown", dismissOnEscape);

    return () => {
      document.removeEventListener("pointerdown", dismissOnPointerOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [isOpen, closeMenu]);

  return (
    <div ref={menu} className="relative shrink-0">
      <button
        type="button"
        aria-label={title}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-describedby={describedBy}
        // Disabled rather than hidden: a reader who has filled the workspace should be told why the
        // button will not open, not left looking for a button that has gone.
        disabled={disabledReason !== undefined}
        title={disabledReason}
        onClick={() => toggleMenu(id)}
        className="rounded-lg border border-black/15 px-3 py-1.5 text-sm text-black/65 hover:text-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-black/65 dark:border-white/15 dark:text-white/65 dark:hover:text-white dark:disabled:hover:text-white/65"
      >
        {label}
      </button>

      {isOpen && (
        <ul
          role="menu"
          className="bg-parchment dark:bg-night absolute right-0 z-20 mt-1 w-52 rounded-lg border border-black/10 p-1 shadow-lg dark:border-white/10"
        >
          {children}
        </ul>
      )}
    </div>
  );
}

/**
 * One row of a `WorkspaceMenu`. Choosing it closes the menu — a menu left standing over the thing
 * it just opened is in the way of the reader looking at it.
 */
export function MenuOption({
  label,
  hint,
  detail,
  onChoose,
}: {
  label: string;
  /** A word about this row's state — "open", "not yet", "reading" — shown against the label. */
  hint?: string;
  /** A line beneath the label, where the label alone cannot say what the row is. */
  detail?: string;
  onChoose: () => void;
}) {
  const { closeMenu } = useTabs();

  return (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onChoose();
          closeMenu();
        }}
        className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
      >
        <span className="flex items-baseline justify-between gap-2">
          {label}
          {hint && <span className="text-xs text-black/40 dark:text-white/40">{hint}</span>}
        </span>
        {detail && (
          <span className="mt-0.5 block truncate text-xs text-black/45 dark:text-white/45">
            {detail}
          </span>
        )}
      </button>
    </li>
  );
}
