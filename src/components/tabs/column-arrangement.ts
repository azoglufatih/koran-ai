import type { Tab } from "./tabs";

/**
 * A vertical slot in the reading workspace, holding one or more Tabs of which one shows at a time.
 *
 * Columns are what a reader sees at once; the Tabs inside one are alternatives they flick between.
 * A reader comparing three translations wants them stacked in one Column with a tafsir permanently
 * visible beside it — which is why this is Columns of Tabs rather than one thing per Column
 * (docs/adr/0006-columns-of-tabs.md).
 *
 * The Reading Pane is not one of these. It is the first Column on screen and the one the reader
 * cannot close, so it is the prerendered children of the workspace rather than an entry in a list
 * that can be rearranged.
 */
export interface Column {
  id: string;
  /** Never empty: a Column closes with its last Tab, because an empty one costs width and buys
   * nothing. */
  tabs: Tab[];
  /** The Tab showing in this Column. Always one of `tabs`. */
  activeTabId: string;
}

/** Where a newly opened Tab should land. */
export type ColumnTarget = { in: "new-column" } | { in: "column"; id: string };

export const newColumn: ColumnTarget = { in: "new-column" };

export const inColumn = (id: string): ColumnTarget => ({ in: "column", id });

/** Every Tab the reader has open, left to right and top to bottom — the workspace read flat. */
export const tabsIn = (columns: readonly Column[]): Tab[] =>
  columns.flatMap((column) => column.tabs);

/**
 * Numbered past whatever the reader currently has open, so a new Column never lands on the id of
 * one on screen. A number frees up again once no open Column is above it.
 */
function nextColumnId(columns: readonly Column[]): string {
  const numbers = columns.map((column) => Number(column.id.split(":")[1]));
  return `column:${Math.max(0, ...numbers) + 1}`;
}

const columnHolding = (columns: readonly Column[], tabId: string) =>
  columns.find((column) => column.tabs.some((tab) => tab.id === tabId));

/**
 * Opens the Tab where the reader asked for it, or brings it to the front where they already have
 * it. A Tab's identity is what it shows, so the same translation cannot be in two Columns at once
 * — asking for one already open moves the reader to it rather than stacking a second copy.
 *
 * An AI Tab never takes that path: every one is a new conversation, and arrives here with an id no
 * open Tab has, so it always lands where it was asked for.
 */
export function withTabOpened(
  columns: readonly Column[],
  tab: Tab,
  target: ColumnTarget,
): Column[] {
  const alreadyOpen = columnHolding(columns, tab.id);
  if (alreadyOpen) return withTabActivated(columns, tab.id);

  if (target.in === "new-column") {
    return [...columns, { id: nextColumnId(columns), tabs: [tab], activeTabId: tab.id }];
  }

  // A Column the reader has since closed is nowhere to put anything, so the Tab opens in one of
  // its own rather than vanishing.
  if (!columns.some((column) => column.id === target.id)) {
    return withTabOpened(columns, tab, newColumn);
  }

  return columns.map((column) =>
    column.id === target.id
      ? { ...column, tabs: [...column.tabs, tab], activeTabId: tab.id }
      : column,
  );
}

/**
 * Closes one Tab, and the Column with it if that was its last. The Column falls back to the Tab
 * before the one closed — the neighbour the reader was flicking between it and — rather than to
 * whichever happens to be first.
 */
export function withTabClosed(columns: readonly Column[], tabId: string): Column[] {
  return columns.flatMap((column) => {
    const closing = column.tabs.findIndex((tab) => tab.id === tabId);
    if (closing === -1) return [column];

    const tabs = column.tabs.filter((tab) => tab.id !== tabId);
    if (tabs.length === 0) return [];

    const stillShowing = column.activeTabId !== tabId;
    return [
      {
        ...column,
        tabs,
        activeTabId: stillShowing ? column.activeTabId : tabs[Math.max(0, closing - 1)].id,
      },
    ];
  });
}

/** Brings a Tab to the front of whichever Column holds it, leaving every other Column alone. */
export function withTabActivated(columns: readonly Column[], tabId: string): Column[] {
  return columns.map((column) =>
    column.tabs.some((tab) => tab.id === tabId) ? { ...column, activeTabId: tabId } : column,
  );
}
