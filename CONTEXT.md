# Koran AI

An open-source, mobile-first PWA for reading the Quran in Arabic alongside translations and tafsir, with an AI panel to ask about the meaning of selected text. No user accounts or personal data are stored — the app is a fully static frontend; any AI provider configuration lives only in the user's own browser.

## Language

**Ayah**:
A single verse of the Quran — the smallest addressable unit of Quranic text.
_Avoid_: Verse (used loosely in casual writing, but prefer Ayah as the canonical term when referring to the addressable unit)

**Surah**:
A chapter of the Quran, composed of an ordered sequence of Ayahs.
_Avoid_: Chapter

**Reading Pane**:
The primary, always-present view showing the Quran text in Arabic. The anchor the rest of the UI is arranged around, and the one Column the reader cannot close.

**Transliteration**:
The Arabic of an Ayah written in Latin script, shown beneath it so a reader who cannot read the script can still sound the Ayah out. A rendering of the Arabic itself, not of its meaning — which is what separates it from a Translation.
_Avoid_: Romanization, Latin text, phonetics

**Column**:
A vertical slot in the reading workspace holding one or more Tabs, of which one shows at a time. Columns are what a reader sees at once; a narrow screen cannot place anything side by side, so it shows every Tab in one swipeable strip and the grouping into Columns is hidden rather than lost.

**Tab**:
One thing a reader has open inside a Column — a translation, a tafsir, or an AI conversation. Several Tabs in one Column are alternatives the reader flicks between; things they want to see together go in separate Columns.
_Avoid_: Panel (use Tab as the canonical UI term; "panel" is fine only when describing narrow-screen behavior)

**Translation Tab**:
A Tab showing the Quran text rendered into a chosen language.

**Tafsir Tab**:
A Tab showing scholarly commentary/exegesis for the Ayahs currently in view, in a chosen tafsir source.

**AI Tab**:
A Tab holding a chat conversation where the user asks about the meaning of text they've selected, grounded in Verse Context.

**Verse Context**:
The grounding data sent to the AI for a question: the full Ayah — the Arabic, the active translation, and the Transliteration when that is where the reader selected — with the selected span marked, rather than the selected fragment alone.

**Retrieval Index**:
A search index over the translations and tafsir, built ahead of time and shipped with the app as static files. Holds the words of the corpus, not its text; the text itself is read back from the corpus when a passage is retrieved.
_Avoid_: Embeddings (the index is lexical, not vector — see `docs/adr/0003-static-lexical-retrieval-index.md`)

**Shard**:
The part of the Retrieval Index covering one reader language. A reader asks in one language, so only that shard is ever downloaded or searched.

**Corpus Retriever**:
The seam the AI Tab's questions reach the corpus through: a question and a language go in, Retrieved Passages come out. The one place that knows retrieval is a search over an index rather than, say, a call to a server.

**Retrieved Passage**:
One Ayah's translation or tafsir that a reader's question found in the Retrieval Index, sent to the AI alongside the question. Distinct from Verse Context: Verse Context is the Ayah the question is _about_, a Retrieved Passage is somewhere else in the corpus that bears on it.

**App Shell**:
The app's own code and assets — the HTML, JavaScript, CSS and icons a build produces — as against the corpus it fetches. The service worker keeps the App Shell in the reader's browser so opening the app again is fast; the translations, tafsir and Retrieval Index are read over the network every time. The Arabic is bundled rather than fetched, so it is part of the App Shell (see `docs/adr/0004-app-shell-cached-corpus-not.md`).

**Reading Position**:
The Ayah the reader last had in front of them, kept automatically as they read — one per reader, not per Surah. Observed rather than chosen, and kept in the reader's own browser, never on a server.
