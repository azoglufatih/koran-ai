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
The primary, always-present view showing the Quran text in Arabic. The anchor the rest of the UI is arranged around.

**Tab**:
An appendable secondary panel the user opens alongside the Reading Pane to view a translation, a tafsir, or an AI conversation. Multiple Tabs of different kinds can be open at once. Rendered as horizontal tabs on wide screens and as swipeable/stacked panels on mobile — same concept, responsive presentation.
_Avoid_: Panel (use Tab as the canonical UI term; "panel" is fine only when describing responsive/mobile behavior)

**Translation Tab**:
A Tab showing the Quran text rendered into a chosen language.

**Tafsir Tab**:
A Tab showing scholarly commentary/exegesis for the Ayahs currently in view, in a chosen tafsir source.

**AI Tab**:
A Tab holding a chat conversation where the user asks about the meaning of text they've selected, grounded in Verse Context.

**Verse Context**:
The grounding data sent to the AI for a question: the full Ayah (Arabic plus the active translation), with the user's selected span marked, rather than the selected fragment alone.

**Retrieval Index**:
A search index over the translations and tafsir, built ahead of time and shipped with the app as static files. Holds the words of the corpus, not its text; the text itself is read back from the corpus when a passage is retrieved.
_Avoid_: Embeddings (the index is lexical, not vector — see `docs/adr/0003-static-lexical-retrieval-index.md`)

**Shard**:
The part of the Retrieval Index covering one reader language. A reader asks in one language, so only that shard is ever downloaded or searched.

**Corpus Retriever**:
The seam the AI Tab's questions reach the corpus through: a question and a language go in, Retrieved Passages come out. The one place that knows retrieval is a search over an index rather than, say, a call to a server.

**Retrieved Passage**:
One Ayah's translation or tafsir that a reader's question found in the Retrieval Index, sent to the AI alongside the question. Distinct from Verse Context: Verse Context is the Ayah the question is _about_, a Retrieved Passage is somewhere else in the corpus that bears on it.

**Bookmark**:
An Ayah the reader has marked to come back to, deliberately. Kept in the reader's own browser, never on a server.

**Reading Position**:
The Ayah the reader last had in front of them, kept automatically as they read — one per reader, not per Surah. Distinct from a Bookmark: a Bookmark is chosen, a Reading Position is merely observed.
