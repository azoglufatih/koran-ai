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

**Commentary Selection**:
A span a reader marks in a Tafsir Tab to ask about. Unlike a selection in the Arabic, a Translation or the Transliteration — all three of which are the Ayah itself, rendered three ways — this is a commentator's claim *about* the Ayah, and is always carried and shown as one, attributed to the edition it came from. Never presented as the Ayah's own words (see `docs/adr/0007-commentary-selection-is-a-claim.md`).

**AI Tab**:
A Tab holding a chat conversation where the user asks about the meaning of text they've selected, grounded in Verse Context.

**Verse Context**:
The grounding data sent to the AI for a question: the full Ayah — the Arabic, every translation the reader has open, and the Transliteration when that is where they selected — with the selected span marked, rather than the selected fragment alone. Every translation they have *open*, not merely the one showing: which Tab is visible depends on the width of the screen, and grounding that changed between a reader's phone and their laptop would make an answer differ for a reason they cannot see. Taken once, when they ask, and unchanged for the rest of that conversation — rearranging Columns mid-conversation does not reach back into questions already answered.

**Grounding Notice**:
What an AI Tab shows the reader about what goes to their provider along with their question: the Ayah with their selection marked in place, named for its source when the selection is a Commentary Selection, and a plain statement of what else is sent. Its obligation runs the other way round from the rest of the UI — anything added to Verse Context or the Retrieved Passages has to appear here, because nothing about this app tells the reader what leaves their browser except this (ADR 0001).

**Retrieval Index**:
A search index over the translations and tafsir, built ahead of time and shipped with the app as static files. Holds the words of the corpus, not its text; the text itself is read back from the corpus when a passage is retrieved.
_Avoid_: Embeddings (the index is lexical, not vector — see `docs/adr/0003-static-lexical-retrieval-index.md`)

**Shard**:
The part of the Retrieval Index covering one reader language. A reader asks in one language, so only that shard is ever downloaded or searched.

**Corpus Retriever**:
The seam the AI Tab's questions reach the corpus through: a question, a language, and the Ayah the question is about go in, Retrieved Passages come out. The one place that knows retrieval is a search over an index rather than, say, a call to a server — and, since it is told which Ayah is being asked about, the one place that can guarantee an Anchor Passage rather than leave it to the search.

**Retrieved Passage**:
One Ayah's translation or tafsir put in front of the AI alongside the question. Distinct from Verse Context: Verse Context is the Ayah the question is _about_, a Retrieved Passage is somewhere else in the corpus that bears on it.

**Anchor Passage**:
The one Retrieved Passage that is not searched for: the commentary on the very Ayah the reader is asking about, which the Corpus Retriever includes because it is certain to bear on the question. The rest are found by shared wording, and "what does this mean?" shares wording with nothing — so without this, the tafsir sitting closest to the reader's question is the one the search is least likely to find.

**App Shell**:
The app's own code and assets — the HTML, JavaScript, CSS and icons a build produces — as against the corpus it fetches. The service worker keeps the App Shell in the reader's browser so opening the app again is fast; the translations, tafsir and Retrieval Index are read over the network every time. The Arabic is bundled rather than fetched, so it is part of the App Shell (see `docs/adr/0004-app-shell-cached-corpus-not.md`).

**Reading Position**:
The Ayah the reader last had in front of them, kept automatically as they read — one per reader, not per Surah. Observed rather than chosen, and kept in the reader's own browser, never on a server.
