"use client";

import { useEffect } from "react";
import { forgetRemovedBookmarks } from "./use-reading-memory";

/**
 * Deletes the bookmark list a reader of the shipped version still has in their browser. Bookmarks
 * are gone (#10), and reader data left behind after the feature that created it is the small
 * version of what ADR 0001 refuses — so removing the feature includes removing what it wrote.
 *
 * Rendered as nothing, in the layout, so every route clears it on the reader's first load rather
 * than only the pages that used to show bookmarks. Delete this along with the key it names, a
 * release or two on.
 */
export function ForgetBookmarks() {
  useEffect(forgetRemovedBookmarks, []);

  return null;
}
