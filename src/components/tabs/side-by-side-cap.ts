"use client";

import { useSyncExternalStore } from "react";

// Tailwind's own `xl` and `2xl`, so the cap changes at the width the layout changes at.
const XL = "(min-width: 80rem)";
const XXL = "(min-width: 96rem)";

/**
 * How many reader Columns can sit beside the Reading Pane at this width.
 *
 * Three Columns at `xl` and four at `2xl`, of which the Reading Pane is always the first — past
 * that the Arabic at its reading size stops being readable (docs/adr/0006-columns-of-tabs.md).
 *
 * Zero below `xl`, where nothing can sit beside anything: a narrow screen shows every Tab in one
 * swipeable strip, so there is no cap to reach and nothing for `+` to refuse.
 */
const SIDE_BY_SIDE_CAP = { narrow: 0, xl: 2, "2xl": 3 } as const;

function measure(): number {
  if (window.matchMedia(XXL).matches) return SIDE_BY_SIDE_CAP["2xl"];
  return window.matchMedia(XL).matches ? SIDE_BY_SIDE_CAP.xl : SIDE_BY_SIDE_CAP.narrow;
}

function subscribe(onResize: () => void) {
  const queries = [window.matchMedia(XL), window.matchMedia(XXL)];
  for (const query of queries) query.addEventListener("change", onResize);

  return () => {
    for (const query of queries) query.removeEventListener("change", onResize);
  };
}

/**
 * The cap, kept up to date as the reader resizes — which is what returns the grouping into Columns
 * to a reader who arranged one on a laptop and opened the same session on a phone.
 *
 * Zero while prerendering: a static export has no window to measure, and the narrow layout is what
 * the CSS renders until it does. Only what `+` does depends on this; the layout itself is CSS.
 */
export const useSideBySideCap = (): number =>
  useSyncExternalStore(subscribe, measure, () => SIDE_BY_SIDE_CAP.narrow);
