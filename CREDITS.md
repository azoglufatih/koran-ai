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
[fawazahmed0/quran-api](https://github.com/fawazahmed0/quran-api), which releases its compilation
into the public domain (Unlicense). Each translation is credited to its translator:

| Language | Translator | Upstream edition |
| --- | --- | --- |
| English | Marmaduke Pickthall | `eng-mohammedmarmadu` |
| Türkçe | Diyanet İşleri | `tur-diyanetisleri` |
| Deutsch | Abu Rida Muhammad ibn Ahmad ibn Rassoul | `deu-aburidamuhammad` |

Each translator is credited in the UI, at the foot of their Translation Tab. Regenerate the
vendored text with `npm run vendor:translations`.

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
resource. Regenerate the vendored commentary with `npm run vendor:tafsir`.

There is no German edition: no tafsir with a licence that allows redistribution has been found in
German. A German Tafsir Tab says so explicitly rather than appearing broken or empty.

## Surah metadata

Surah names, Ayah counts, and revelation places come from the
[AlQuran Cloud](https://alquran.cloud) metadata endpoint, itself derived from Tanzil.
