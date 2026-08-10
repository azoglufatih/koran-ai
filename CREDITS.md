# Credits

Koran AI's own source code is MIT licensed (see `LICENSE`). The Quran content bundled with it
is not, and keeps the terms below.

## Arabic Quran text — Tanzil Project

The Arabic text in `src/content/data/` is the Uthmani text from the
[Tanzil Project](https://tanzil.net), used under Tanzil's terms of use:

> Copyright (C) 2007-2025 Tanzil Project — https://tanzil.net
>
> This copy of the Quran text is carefully produced, highly verified and continuously monitored
> by a group of specialists at Tanzil Project.
>
> TERMS OF USE:
>
> - Permission is granted to copy and distribute verbatim copies of this text, but CHANGING IT
>   IS NOT ALLOWED.
> - This Quran text can be used in any website or application, provided that its source
>   (Tanzil Project) is clearly indicated, and a link is made to tanzil.net to enable users to
>   keep track of changes.
> - This copyright notice shall be included in all verbatim copies of the text, and shall be
>   reproduced appropriately in all files derived from or containing substantial portion of this
>   text.

The text is vendored verbatim. Regenerate it with `npm run vendor:quran`.

## Translations

The translations in `public/content/translations/` are vendored from
[fawazahmed0/quran-api](https://github.com/fawazahmed0/quran-api), which releases **its compilation**
into the public domain (Unlicense). That covers the collection, not the translations inside it, so
each translation is cleared on its own terms — and only public-domain editions ship:

| Language | Translator | Upstream edition | Why it may be redistributed |
| --- | --- | --- | --- |
| English | Marmaduke Pickthall | `eng-mohammedmarmadu` | Died 1936 — public domain since 2007 |
| Türkçe | Elmalılı Hamdi Yazır | `tur-elmalilihamdiya` | Died 1942 — public domain since 2013 |

Each translator is credited in the UI, at the foot of their Translation Tab. Regenerate the
vendored text with `npm run vendor:translations`.

There is no German edition. Every German translation upstream carries is still in copyright — Abu
Rida Muhammad ibn Ahmad ibn Rassoul died in 2015, Adel Theodor Khoury in 2023, Amir Zaidan is
living, and Bubenheim & Elyas is all rights reserved — and the one German translation that is
public domain, Max Henning's of 1901, exists only as scans with no ayah-aligned text to vendor. A
German Translation Tab says so explicitly rather than appearing broken or empty, exactly as the
German Tafsir Tab does.

## Transliterations

The Latin-script transliterations in `public/content/transliteration/` are vendored from the same
public-domain compilation as the translations,
[fawazahmed0/quran-api](https://github.com/fawazahmed0/quran-api). Three schemes ship, because the
reader chooses which one they read:

| Scheme | 1:2 reads | Upstream edition |
| --- | --- | --- |
| Phonetic (default) | `Al-Ĥamdu Lillāhi Rabbi Al-`Ālamīna` | `ara-quranphoneticst` |
| Simple | `Alhamdu lillaahi Rabbil 'aalameen` | `ara-quran-la1` |
| Türkçe | `El hamdü lillahi rabbil alemin` | `tur-latinalphabet` |

A fourth upstream edition, `ara-quran-la`, is deliberately not offered: it encodes ayn as `AA`,
which a reader sounding the word out would read as "ay-ay". Regenerate the vendored text with
`npm run vendor:transliteration`.

These are unattributed in the upstream catalogue, and none names a translator. They are mechanical
romanisations — a spelling of the Arabic rather than a reading of it — so unlike the translations
above there is no separate authorship behind them to clear.

## Tafsir — Al-Mukhtasar

The commentary in `public/content/tafsir/` is
**Al-Mukhtasar fi Tafsir al-Quran al-Karim** (the Abridged Explanation of the Noble Quran),
published by the **Tafsir Center for Qur'anic Studies** and distributed through
[Tarteel's Quranic Universal Library](https://qul.tarteel.ai) under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/):

| Language | Edition | QUL resource |
| --- | --- | --- |
| English | Al-Mukhtasar | [266](https://qul.tarteel.ai/resources/tafsir/266) |
| Türkçe | Muhtasar Tefsir | [258](https://qul.tarteel.ai/resources/tafsir/258) |

QUL serves its exports from behind a sign-in, so the text is vendored from
[spa5k/tafsir_api](https://github.com/spa5k/tafsir_api), which mirrors those exports verbatim as
per-Surah JSON and names the QUL resource each edition came from.

The Tafsir Center is credited in the UI, at the foot of each Tafsir Tab, with a link to the QUL
resource. The text is vendored verbatim; only its shape changes, from upstream's per-Surah export
to the same per-Surah JSON this repo reads. Regenerate it with `npm run vendor:tafsir`.

> **Unconfirmed.** The CC BY 4.0 terms above have not been verified at the source. The QUL resource
> pages do not state a licence in their public HTML, and `spa5k/tafsir_api` — where the bytes
> actually come from — is MIT for its own code and says nothing about the licence of the data it
> mirrors. Confirm with QUL before relying on this, and treat the CC BY 4.0 line in the Tafsir Tab
> as unverified until then.

There is no German edition: no tafsir with a licence that allows redistribution has been found in
German. A German Tafsir Tab says so explicitly rather than appearing broken or empty.

## Surah metadata

Surah names, Ayah counts, and revelation places come from the
[AlQuran Cloud](https://alquran.cloud) metadata endpoint, itself derived from Tanzil.

## Agent skills

The skills under `.agents/skills/` are vendored from
[mattpocock/skills](https://github.com/mattpocock/skills), copyright © 2026 Matt Pocock, and are
redistributed under the MIT license — reproduced in full at `.agents/skills/LICENSE`, as that
license requires. `skills-lock.json` records the upstream path and content hash of each one.

They are development tooling for agents working on this repo, and are no part of the app that ships
to a reader.
