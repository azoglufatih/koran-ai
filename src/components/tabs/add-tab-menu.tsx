"use client";

import { useTabs } from "./tabs-provider";
import { openableTabId } from "./tabs";
import {
  hasTafsirEdition,
  hasTranslationEdition,
  OPENABLES,
  openableKey,
  openableLabel,
  type Openable,
} from "./openables";
import { MenuOption, WorkspaceMenu } from "./workspace-menu";

/**
 * The one menu of everything openable, behind every `+` in the workspace. What differs between the
 * `+` that makes a Column and the `+` that adds to one is where the chosen thing lands, which is
 * `onChoose` — the seven rows are the same list either way.
 */
export function AddTabMenu({
  label,
  title,
  disabledReason,
  describedBy,
  onChoose,
}: {
  label: string;
  title: string;
  disabledReason?: string;
  describedBy?: string;
  onChoose: (openable: Openable) => void;
}) {
  const { tabs } = useTabs();

  const isOpen = (openable: Openable) => {
    const id = openableTabId(openable);
    return id !== null && tabs.some((tab) => tab.id === id);
  };

  // Two things a row can say about itself: the reader already has it open, or this repo ships no
  // edition of it in that language yet. AI is neither — every choice of it is a new conversation,
  // so it is never "open".
  const hint = (openable: Openable) => {
    if (isOpen(openable)) return "open";
    if (openable.kind === "tafsir" && !hasTafsirEdition(openable.language)) return "not yet";
    if (openable.kind === "translation" && !hasTranslationEdition(openable.language)) {
      return "not yet";
    }
    return undefined;
  };

  return (
    <WorkspaceMenu
      label={label}
      title={title}
      disabledReason={disabledReason}
      describedBy={describedBy}
    >
      {OPENABLES.map((openable) => (
        <MenuOption
          key={openableKey(openable)}
          label={openableLabel(openable)}
          hint={hint(openable)}
          onChoose={() => onChoose(openable)}
        />
      ))}
    </WorkspaceMenu>
  );
}
