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

**Bookmark**:
An Ayah the reader has marked to come back to, deliberately. Kept in the reader's own browser, never on a server.

**Reading Position**:
The Ayah the reader last had in front of them, kept automatically as they read — one per reader, not per Surah. Distinct from a Bookmark: a Bookmark is chosen, a Reading Position is merely observed.
