import { describe, expect, it } from "vitest";
import type { Tab } from "./tabs";
import {
  inColumn,
  newColumn,
  tabsIn,
  withTabActivated,
  withTabClosed,
  withTabOpened,
  type Column,
} from "./column-arrangement";

const translation = (language: string): Tab =>
  ({ id: `translation:${language}`, kind: "translation", language }) as Tab;

const tafsir = (language: string): Tab =>
  ({
    id: `tafsir:al-mukhtasar:${language}`,
    kind: "tafsir",
    source: "al-mukhtasar",
    language,
  }) as Tab;

const ai = (conversation: number): Tab => ({ id: `ai:${conversation}`, kind: "ai", conversation });

/** A Column holding these Tabs, showing the first, as one arrived at by opening them in order. */
const column = (id: string, ...tabs: Tab[]): Column => ({ id, tabs, activeTabId: tabs[0].id });

const ids = (columns: readonly Column[]) => columns.map((c) => c.tabs.map((tab) => tab.id));

describe("opening into a new Column", () => {
  it("puts the chosen Tab in a Column of its own, at the end", () => {
    const columns = withTabOpened([column("column:1", translation("en"))], tafsir("en"), newColumn);

    expect(ids(columns)).toEqual([["translation:en"], ["tafsir:al-mukhtasar:en"]]);
  });

  it("shows the Tab it just opened", () => {
    const [, added] = withTabOpened([column("column:1", translation("en"))], tafsir("en"), newColumn);

    expect(added.activeTabId).toBe("tafsir:al-mukhtasar:en");
  });

  it("numbers past the Columns the reader has open, so no two share an id", () => {
    const columns = withTabOpened(
      [column("column:1", translation("en")), column("column:7", tafsir("en"))],
      translation("tr"),
      newColumn,
    );

    expect(columns.map((c) => c.id)).toEqual(["column:1", "column:7", "column:8"]);
  });

  it("is the first Column when the reader has closed them all", () => {
    expect(ids(withTabOpened([], translation("en"), newColumn))).toEqual([["translation:en"]]);
  });
});

describe("opening into a Column the reader already has", () => {
  it("adds the Tab to that Column and shows it", () => {
    const columns = withTabOpened(
      [column("column:1", translation("en")), column("column:2", tafsir("en"))],
      translation("tr"),
      inColumn("column:1"),
    );

    expect(ids(columns)).toEqual([
      ["translation:en", "translation:tr"],
      ["tafsir:al-mukhtasar:en"],
    ]);
    expect(columns[0].activeTabId).toBe("translation:tr");
  });

  it("leaves the other Columns showing what they were showing", () => {
    const columns = withTabOpened(
      [column("column:1", translation("en")), column("column:2", tafsir("en"))],
      translation("tr"),
      inColumn("column:1"),
    );

    expect(columns[1].activeTabId).toBe("tafsir:al-mukhtasar:en");
  });

  // Nothing should vanish because the Column it was aimed at is gone by the time it arrives.
  it("opens a Column of its own when the one named is no longer there", () => {
    const columns = withTabOpened([column("column:1", translation("en"))], tafsir("en"), inColumn("column:9"));

    expect(ids(columns)).toEqual([["translation:en"], ["tafsir:al-mukhtasar:en"]]);
  });
});

describe("opening something the reader already has open", () => {
  // A Tab's identity is what it shows, so the same translation cannot sit in two Columns at once.
  it("brings it to the front of the Column holding it rather than stacking a copy", () => {
    const start = [column("column:1", translation("en"), translation("tr")), column("column:2", tafsir("en"))];

    const columns = withTabOpened(start, translation("tr"), newColumn);

    expect(ids(columns)).toEqual([
      ["translation:en", "translation:tr"],
      ["tafsir:al-mukhtasar:en"],
    ]);
    expect(columns[0].activeTabId).toBe("translation:tr");
  });

  // Every AI Tab is a new conversation, and arrives with an id no open Tab has.
  it("does not apply to an AI Tab, which is always a new conversation", () => {
    const columns = withTabOpened([column("column:1", ai(1))], ai(2), newColumn);

    expect(ids(columns)).toEqual([["ai:1"], ["ai:2"]]);
  });
});

describe("closing a Tab", () => {
  it("leaves the Column standing while it still has Tabs", () => {
    const columns = withTabClosed(
      [column("column:1", translation("en"), translation("tr"))],
      "translation:tr",
    );

    expect(ids(columns)).toEqual([["translation:en"]]);
  });

  // An empty Column costs width and buys nothing.
  it("closes the Column along with its last Tab", () => {
    const columns = withTabClosed(
      [column("column:1", translation("en")), column("column:2", tafsir("en"))],
      "translation:en",
    );

    expect(ids(columns)).toEqual([["tafsir:al-mukhtasar:en"]]);
  });

  it("leaves an empty workspace once the last Column goes", () => {
    expect(withTabClosed([column("column:1", translation("en"))], "translation:en")).toEqual([]);
  });

  it("falls back to the Tab beside the one closed, which is what it was being flicked between", () => {
    const start: Column = {
      id: "column:1",
      tabs: [translation("en"), translation("tr"), translation("de")],
      activeTabId: "translation:tr",
    };

    const [column1] = withTabClosed([start], "translation:tr");

    expect(column1.activeTabId).toBe("translation:en");
  });

  it("keeps showing what it was showing when some other Tab closes", () => {
    const start: Column = {
      id: "column:1",
      tabs: [translation("en"), translation("tr")],
      activeTabId: "translation:tr",
    };

    const [column1] = withTabClosed([start], "translation:en");

    expect(column1.activeTabId).toBe("translation:tr");
  });

  it("ignores a Tab the reader does not have open", () => {
    const start = [column("column:1", translation("en"))];

    expect(withTabClosed(start, "translation:de")).toEqual(start);
  });
});

describe("activating a Tab", () => {
  it("shows it in the Column holding it", () => {
    const [, column2] = withTabActivated(
      [column("column:1", translation("en")), column("column:2", tafsir("en"), tafsir("tr"))],
      "tafsir:al-mukhtasar:tr",
    );

    expect(column2.activeTabId).toBe("tafsir:al-mukhtasar:tr");
  });

  it("leaves every other Column showing what it was", () => {
    const [column1] = withTabActivated(
      [column("column:1", translation("en"), translation("tr")), column("column:2", tafsir("en"))],
      "tafsir:al-mukhtasar:en",
    );

    expect(column1.activeTabId).toBe("translation:en");
  });
});

describe("reading the workspace flat", () => {
  it("is every Tab of every Column, in the order they sit on screen", () => {
    const columns = [
      column("column:1", translation("en"), translation("tr")),
      column("column:2", tafsir("en")),
    ];

    expect(tabsIn(columns).map((tab) => tab.id)).toEqual([
      "translation:en",
      "translation:tr",
      "tafsir:al-mukhtasar:en",
    ]);
  });

  it("is empty for a workspace with no Columns", () => {
    expect(tabsIn([])).toEqual([]);
  });
});
