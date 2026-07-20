# Uputstvo za izradu maski (Illustrator) — Balloon Land kreator

Maske služe da engine u kreatoru zna **koji je balon koji** na bijeloj fotografiji,
pa da ga oboji pravilno za SVA slaganja (ravno / dijagonalno / mix) i SVE brojeve boja (2 / 3 / 4)
— sa jednom jedinom maskom po slici.

## Fajlovi

Bijele baze (dobijaš ih od mene, transparentna pozadina):

| Baza                    | Maska koju crtaš             |
|-------------------------|------------------------------|
| `img/kreator/luk-isti.png`   | `img/kreator/luk-isti-mask.png`   |
| `img/kreator/luk-kombo.png`  | `img/kreator/luk-kombo-mask.png`  |
| `img/kreator/stub-isti.png`  | `img/kreator/stub-isti-mask.png`  |
| `img/kreator/stub-kombo.png` | `img/kreator/stub-kombo-mask.png` |

## Kako se crta

1. Otvori bijelu bazu u Illustratoru (ne mijenjaj dimenzije artboarda — maska mora biti
   **piksel-identičnih dimenzija** kao baza).
2. Novi layer preko fotografije. Za svaki balon nacrtaj plohu (elipsa ili pen tool) koja
   prati oblik tog balona. Male preklope između balona rasporedi po osjećaju — bitno je da
   svaki piksel balona pripadne tačno jednoj plohi.
3. Svaka ploha dobija **flat fill** (bez stroke, bez gradijenta, bez efekata) — boju uzimaš
   iz legende ispod.
4. Pozadina ostaje **prazna / transparentna**.

## Legenda boja (kod = pozicija balona u girlandi)

Logika: **R kanal = redni broj segmenta** (klaster balona, brojano od početka),
**G kanal = pozicija u klasteru**, B je uvijek 60.

- Segment se broji: **luk** → od donjeg LIJEVOG kraja prema desnom; **stub** → od PODA prema vrhu.
- Pozicija A / B: u svakom klasteru/sloju označi lijevi balon kao A, desni kao B
  (budi konzistentan kroz cijelu girlandu).
- Pozicija M = **treća pozicija u klasteru**: prednji (centralni) balon sloja kod stuba,
  odnosno mali filler balon kod "veliki+mali" varijante. Kod dijagonalnog slaganja
  M nastavlja spiralu između A i B — engine to računa sam.

| Segment | Pozicija A (hex) | Pozicija B (hex) | Pozicija M (hex) |
|--------:|------------------|------------------|--------------------|
| 0  | `#142864` | `#147864` | `#14C864` |
| 1  | `#1E2864` | `#1E7864` | `#1EC864` |
| 2  | `#282864` | `#287864` | `#28C864` |
| 3  | `#322864` | `#327864` | `#32C864` |
| 4  | `#3C2864` | `#3C7864` | `#3CC864` |
| 5  | `#462864` | `#467864` | `#46C864` |
| 6  | `#502864` | `#507864` | `#50C864` |
| 7  | `#5A2864` | `#5A7864` | `#5AC864` |
| 8  | `#642864` | `#647864` | `#64C864` |
| 9  | `#6E2864` | `#6E7864` | `#6EC864` |
| 10 | `#782864` | `#787864` | `#78C864` |
| 11 | `#822864` | `#827864` | `#82C864` |
| 12 | `#8C2864` | `#8C7864` | `#8CC864` |
| 13 | `#962864` | `#967864` | `#96C864` |
| 14 | `#A02864` | `#A07864` | `#A0C864` |
| 15 | `#AA2864` | `#AA7864` | `#AAC864` |
| 16 | `#B42864` | `#B47864` | `#B4C864` |
| 17 | `#BE2864` | `#BE7864` | `#BEC864` |
| 18 | `#C82864` | `#C87864` | `#C8C864` |
| 19 | `#D22864` | `#D27864` | `#D2C864` |
| 20 | `#DC2864` | `#DC7864` | `#DCC864` |

**Segmenti 21+** (kad girlanda ima više od 21 klastera): R kreće ispočetka, a B kanal je `A0` umjesto `64`:

| Segment | Pozicija A (hex) | Pozicija B (hex) | Pozicija M (hex) |
|--------:|------------------|------------------|--------------------|
| 21 | `#1428A0` | `#1478A0` | `#14C8A0` |
| 22 | `#1E28A0` | `#1E78A0` | `#1EC8A0` |
| 23 | `#2828A0` | `#2878A0` | `#28C8A0` |
| 24 | `#3228A0` | `#3278A0` | `#32C8A0` |
| 25 | `#3C28A0` | `#3C78A0` | `#3CC8A0` |
| 26 | `#4628A0` | `#4678A0` | `#46C8A0` |
| 27 | `#5028A0` | `#5078A0` | `#50C8A0` |
| 28 | `#5A28A0` | `#5A78A0` | `#5AC8A0` |
| 29 | `#6428A0` | `#6478A0` | `#64C8A0` |
| 30 | `#6E28A0` | `#6E78A0` | `#6EC8A0` |
| 31 | `#7828A0` | `#7878A0` | `#78C8A0` |
| 32 | `#8228A0` | `#8278A0` | `#82C8A0` |

**Završni balon na stubu** (veliki balon na vrhu): uvijek čisti plavi **`#0000FF`**.

(Formula: R = 20 + (segment mod 21) × 10; G kanal: A = 40 (hex 28), B = 120 (hex 78), M = 200 (hex C8); B kanal: segmenti 0–20 → 100 (hex 64), segmenti 21+ → 160 (hex A0).)

## Export

- File → Export → Export As → **PNG**
- Anti-aliasing: **None** (jako bitno — ivice moraju biti oštre, bez blendanja boja!)
- Background: **Transparent**
- Rezolucija: ista kao baza (72ppi / "1x" — da PNG ispadne piksel-identičan bazi)
- Ime fajla i lokacija iz tabele gore.

Kad ubaciš maske u `img/kreator/`, kreator automatski prelazi na fotorealistični prikaz —
ako maska ne postoji, prikazuje se dosadašnji sprite pregled, tako da ništa ne puca.
