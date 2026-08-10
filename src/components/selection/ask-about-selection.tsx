"use client";

import { useEffect, useRef, useState } from "react";
import { selectedText, type VerseContext } from "@/ai/verse-context";
import { useTabs } from "@/components/tabs/tabs-provider";
import { captureVerseContext } from "./capture-verse-context";

interface Asking {
  context: VerseContext;
  /** Where the selection sits on screen, so the action appears over the words themselves. */
  at: { left: number; top: number };
}

function askingAboutSelection(): Asking | null {
  const selection = document.getSelection();
  if (!selection?.rangeCount) return null;

  const range = selection.getRangeAt(0);
  const context = captureVerseContext(range);
  if (!context) return null;

  const { left, top, width } = range.getBoundingClientRect();
  return { context, at: { left: left + width / 2, top } };
}

/**
 * The way into a grounded conversation: select words in the Reading Pane or a Translation Tab, and
 * the question you can ask about them comes to you.
 *
 * Mounted once for the page rather than per Ayah — the Reading Pane is prerendered on the server,
 * and a selection can start in it and finish in a Tab, so one listener over the whole document is
 * what can see either.
 */
export function AskAboutSelection() {
  const { openAiTab } = useTabs();
  const [asking, setAsking] = useState<Asking | null>(null);
  const action = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Hidden while the selection is still moving, and offered once the reader settles on it —
    // otherwise the action chases a dragging finger across the words being selected. Which of
    // `selectionchange` and `pointerup` lands first is not something to rely on: the browser fires
    // selectionchange on its own schedule, so the press itself is what says "still choosing".
    let choosing = false;

    const hide = () => setAsking(null);
    const refresh = () => setAsking(choosing ? null : askingAboutSelection());
    const press = (event: PointerEvent) => {
      // A press on the action itself is the reader taking it, not starting a new selection —
      // hiding here would unmount the button before the click it was pressed for ever landed.
      // Checked here rather than stopped at the button, because this listener and React's own sit
      // on the same node, where stopping propagation cannot get between them.
      if (action.current?.contains(event.target as Node)) return;
      choosing = true;
      hide();
    };
    const release = () => {
      choosing = false;
      refresh();
    };

    document.addEventListener("selectionchange", refresh);
    document.addEventListener("pointerdown", press);
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);
    // Selecting with the keyboard, where there is no press to wait for.
    document.addEventListener("keyup", refresh);
    // A selection's place on screen is only true where it was made.
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);

    return () => {
      document.removeEventListener("selectionchange", refresh);
      document.removeEventListener("pointerdown", press);
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", release);
      document.removeEventListener("keyup", refresh);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);

  if (!asking) return null;

  return (
    <button
      ref={action}
      type="button"
      // Stops the browser collapsing the selection under the press — and it has to be the mouse
      // event rather than the pointer one. Cancelling `pointerdown` suppresses the whole
      // compatibility sequence behind it, `click` included, so the button would swallow its own
      // press and open nothing.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        openAiTab(asking.context);
        document.getSelection()?.removeAllRanges();
        setAsking(null);
      }}
      style={{ left: asking.at.left, top: asking.at.top }}
      className="bg-parchment dark:bg-night fixed z-30 -translate-x-1/2 -translate-y-[calc(100%+0.5rem)] rounded-full border border-black/15 px-3 py-1.5 text-sm shadow-lg hover:bg-black/[0.06] dark:border-white/15 dark:hover:bg-white/[0.08]"
    >
      Ask AI about{" "}
      <span className="inline-block max-w-[10rem] truncate align-bottom font-medium">
        &ldquo;{selectedText(asking.context)}&rdquo;
      </span>
    </button>
  );
}
