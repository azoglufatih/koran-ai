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

## Surah metadata

Surah names, Ayah counts, and revelation places come from the
[AlQuran Cloud](https://alquran.cloud) metadata endpoint, itself derived from Tanzil.
