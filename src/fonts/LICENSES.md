# Font licenses

All fonts in this folder are licensed under the SIL Open Font License, Version 1.1
(https://openfontlicense.org), which allows them to be bundled and served with this website.

- Amiri and Amiri Quran: Copyright 2010-2022 The Amiri Project Authors (https://github.com/aliftype/amiri)
- Crimson Pro: Copyright 2018 The Crimson Pro Project Authors (https://github.com/Fonthausen/CrimsonPro)
- IBM Plex Sans, IBM Plex Sans Arabic, and IBM Plex Mono: Copyright 2017 IBM Corp.
  (https://github.com/IBM/plex)

The Amiri and Crimson Pro files are subsets of the originals, made with fontTools (`pyftsubset`),
covering Arabic and Latin. The IBM Plex files are the Latin and Arabic subsets Google Fonts serves,
downloaded once so that building the site needs no network. `plex-sans-var.woff2` is a variable
font covering the whole weight range; the others are one file per weight.
