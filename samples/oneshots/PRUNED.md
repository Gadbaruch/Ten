# What the dedupe pass did

Measured with `tools/build_oneshots.py` — 24 log spectral bands, a 16-point
RMS envelope and log duration, compared only WITHIN an instrument folder,
every file peak-normalised first so this is about timbre and not level.

- **149 deleted** as the same sound (distance < 0.20)
- **312 copied into `_similar/`** as probably-the-same (distance < 0.45),
  grouped by a `gNN-` prefix so a group sorts together. Nothing in
  `_similar/` is in the manifest, so nothing there loads — audition it,
  keep what you want by moving it back up into its instrument folder,
  and delete the rest.

```
bongo       kept rx5-bongo-01.flac      dropped 1 identical
bongo       kept rx5-bongo-02.flac      parked 2 for your ear (g01)
bongo       kept rx5-bongo-01.flac      parked 1 for your ear (g02)
clap        kept tr8-clap-02.flac       dropped 2 identical
clap        kept tr808-clap-01.flac     dropped 3 identical
clap        kept trap-clap-01.flac      dropped 1 identical
clap        kept lofi-clap-01.flac      dropped 1 identical
clap        kept tr8-clap-07.flac       parked 1 for your ear (g03)
clap        kept tr808-clap-01.flac     parked 4 for your ear (g04)
clave       kept tr8-clave-01.flac      parked 1 for your ear (g05)
conga       kept tr808-conga-13.flac    dropped 2 identical
conga       kept tr808-conga-02.flac    dropped 1 identical
conga       kept tr808-conga-03.flac    dropped 1 identical
conga       kept tr808-conga-08.flac    dropped 1 identical
conga       kept tr8-conga-03.flac      parked 2 for your ear (g06)
conga       kept rx5-conga-01.flac      parked 1 for your ear (g07)
conga       kept tr8-conga-09.flac      parked 3 for your ear (g08)
conga       kept tr808-conga-15.flac    parked 1 for your ear (g09)
conga       kept tr808-conga-02.flac    parked 1 for your ear (g10)
conga       kept tr808-conga-12.flac    parked 1 for your ear (g11)
conga       kept tr808-conga-10.flac    parked 2 for your ear (g12)
cowbell     kept tr808-cowbell-01.flac  dropped 1 identical
cowbell     kept tr8-cowbell-02.flac    parked 1 for your ear (g13)
cymbal      kept tr808-cymbal-07.flac   dropped 1 identical
cymbal      kept tr808-cymbal-12.flac   dropped 9 identical
cymbal      kept tr808-cymbal-21.flac   dropped 3 identical
cymbal      kept tr808-cymbal-14.flac   dropped 3 identical
cymbal      kept tr808-cymbal-18.flac   dropped 4 identical
cymbal      kept tr8-cymbal-08.flac     dropped 1 identical
cymbal      kept tr808-cymbal-09.flac   dropped 1 identical
cymbal      kept lofi-cymbal-01.flac    dropped 1 identical
cymbal      kept tr808-cymbal-12.flac   parked 2 for your ear (g14)
cymbal      kept tr808-cymbal-14.flac   parked 7 for your ear (g15)
cymbal      kept rx5-cymbal-05.flac     parked 1 for your ear (g16)
cymbal      kept rx5-cymbal-03.flac     parked 3 for your ear (g17)
cymbal      kept rx5-cymbal-04.flac     parked 1 for your ear (g18)
cymbal      kept tr8-cymbal-04.flac     parked 2 for your ear (g19)
fx          kept dr5-fx-02.flac         parked 1 for your ear (g20)
hat-closed  kept tr8-hat-closed-05.flac dropped 3 identical
hat-closed  kept rx5-hat-closed-01.flac dropped 1 identical
hat-closed  kept dr5-hat-closed-04.flac dropped 1 identical
hat-closed  kept lofi-hat-closed-01.flac dropped 1 identical
hat-closed  kept tr808-hat-closed-01.flac dropped 3 identical
hat-closed  kept rx5-hat-closed-02.flac parked 8 for your ear (g21)
hat-closed  kept linn-hat-closed-04.flac parked 1 for your ear (g22)
hat-open    kept tr808-hat-open-02.flac dropped 3 identical
hat-open    kept lofi-hat-open-01.flac  dropped 1 identical
hat-open    kept tr8-hat-open-04.flac   dropped 1 identical
hat-open    kept tr8-hat-open-05.flac   dropped 1 identical
hat-open    kept dr5-hat-open-01.flac   dropped 1 identical
hat-open    kept tr808-hat-open-02.flac parked 1 for your ear (g23)
hat-open    kept tr8-hat-open-04.flac   parked 1 for your ear (g24)
hat-open    kept tr8-hat-open-07.flac   parked 3 for your ear (g25)
hat-open    kept tr8-hat-open-09.flac   parked 2 for your ear (g26)
kick        kept tr808-kick-08.flac     dropped 5 identical
kick        kept tr808-kick-06.flac     dropped 6 identical
kick        kept cr78-kick-02.flac      dropped 1 identical
kick        kept tr808-kick-22.flac     dropped 4 identical
kick        kept tr808-kick-20.flac     dropped 5 identical
kick        kept tr808-kick-19.flac     dropped 6 identical
kick        kept tr8-kick-05.flac       dropped 2 identical
kick        kept tr8-kick-04.flac       dropped 1 identical
kick        kept dr5-kick-06.flac       dropped 1 identical
kick        kept dr5-kick-23.flac       dropped 1 identical
kick        kept dr5-kick-13.flac       dropped 1 identical
kick        kept dr5-kick-27.flac       dropped 1 identical
kick        kept dr5-kick-18.flac       dropped 1 identical
kick        kept tr808-kick-22.flac     parked 2 for your ear (g27)
kick        kept tr8-kick-02.flac       parked 1 for your ear (g28)
kick        kept tr808-kick-20.flac     parked 1 for your ear (g29)
kick        kept tr8-kick-15.flac       parked 1 for your ear (g30)
kick        kept rx5-kick-06.flac       parked 4 for your ear (g31)
kick        kept rx5-kick-07.flac       parked 5 for your ear (g32)
kick        kept rx5-kick-08.flac       parked 1 for your ear (g33)
kick        kept tr8-kick-12.flac       parked 4 for your ear (g34)
kick        kept rx5-kick-11.flac       parked 6 for your ear (g35)
kick        kept rx5-kick-09.flac       parked 16 for your ear (g36)
perc        kept tr8-perc-02.flac       dropped 1 identical
perc        kept tr8-perc-06.flac       parked 1 for your ear (g37)
perc        kept rx5-perc-20.flac       parked 4 for your ear (g38)
perc        kept dr5-perc-13.flac       parked 1 for your ear (g39)
perc        kept dr5-perc-07.flac       parked 2 for your ear (g40)
perc        kept tr8-perc-04.flac       parked 1 for your ear (g41)
perc        kept rx5-perc-13.flac       parked 1 for your ear (g42)
perc        kept rx5-perc-06.flac       parked 1 for your ear (g43)
ride        kept dr5-ride-01.flac       dropped 1 identical
ride        kept dr5-ride-02.flac       dropped 1 identical
ride        kept tr8-ride-01.flac       parked 4 for your ear (g44)
rim         kept rx5-rim-02.flac        dropped 2 identical
rim         kept tr808-rim-01.flac      dropped 1 identical
rim         kept rx5-rim-03.flac        parked 6 for your ear (g45)
shaker      kept dr5-shaker-04.flac     dropped 1 identical
shaker      kept rx5-shaker-01.flac     dropped 1 identical
shaker      kept tr8-shaker-01.flac     parked 1 for your ear (g46)
shaker      kept rx5-shaker-01.flac     parked 3 for your ear (g47)
snare       kept tr808-snare-03.flac    dropped 2 identical
snare       kept tr808-snare-23.flac    dropped 1 identical
snare       kept tr808-snare-21.flac    dropped 2 identical
snare       kept tr808-snare-11.flac    dropped 1 identical
snare       kept tr808-snare-24.flac    dropped 1 identical
snare       kept tr808-snare-22.flac    dropped 3 identical
snare       kept tr808-snare-04.flac    dropped 3 identical
snare       kept tr808-snare-17.flac    dropped 2 identical
snare       kept tr808-snare-02.flac    dropped 4 identical
snare       kept cr78-snare-01.flac     dropped 1 identical
snare       kept lofi-snare-02.flac     dropped 1 identical
snare       kept tr8-snare-04.flac      dropped 1 identical
snare       kept tr8-snare-14.flac      dropped 1 identical
snare       kept dr5-snare-08.flac      dropped 1 identical
snare       kept dr5-snare-06.flac      dropped 1 identical
snare       kept rx5-snare-06.flac      dropped 1 identical
snare       kept dr5-snare-24.flac      dropped 1 identical
snare       kept dr5-snare-23.flac      dropped 1 identical
snare       kept tr8-snare-10.flac      dropped 2 identical
snare       kept linn-snare-03.flac     parked 1 for your ear (g48)
snare       kept tr808-snare-18.flac    parked 1 for your ear (g49)
snare       kept tr808-snare-16.flac    parked 1 for your ear (g50)
snare       kept tr808-snare-22.flac    parked 1 for your ear (g51)
snare       kept tr808-snare-17.flac    parked 3 for your ear (g52)
snare       kept cr78-snare-01.flac     parked 1 for your ear (g53)
snare       kept rx5-snare-19.flac      parked 1 for your ear (g54)
snare       kept tr8-snare-01.flac      parked 1 for your ear (g55)
snare       kept tr8-snare-14.flac      parked 1 for your ear (g56)
snare       kept tr8-snare-12.flac      parked 1 for your ear (g57)
snare       kept rx5-snare-10.flac      parked 6 for your ear (g58)
snare       kept rx5-snare-15.flac      parked 18 for your ear (g59)
snare       kept rx5-snare-03.flac      parked 3 for your ear (g60)
snare       kept rx5-snare-13.flac      parked 17 for your ear (g61)
sub         kept tr8-sub-02.flac        dropped 1 identical
sub         kept lofi-sub-01.flac       dropped 1 identical
sub         kept trap-sub-01.flac       dropped 1 identical
sub         kept bounce-sub-01.flac     dropped 1 identical
sub         kept trap-sub-02.flac       parked 2 for your ear (g62)
timbale     kept rx5-timbale-02.flac    parked 1 for your ear (g63)
timbale     kept rx5-timbale-01.flac    parked 1 for your ear (g64)
tom         kept lofi-tom-01.flac       dropped 1 identical
tom         kept lofi-tom-02.flac       dropped 1 identical
tom         kept tr8-tom-25.flac        dropped 1 identical
tom         kept tr808-tom-10.flac      dropped 1 identical
tom         kept tr808-tom-09.flac      dropped 4 identical
tom         kept tr808-tom-15.flac      dropped 3 identical
tom         kept tr808-tom-02.flac      dropped 1 identical
tom         kept tr808-tom-04.flac      dropped 3 identical
tom         kept tr8-tom-16.flac        dropped 1 identical
tom         kept tr8-tom-02.flac        dropped 1 identical
tom         kept tr8-tom-11.flac        dropped 1 identical
tom         kept tr8-tom-18.flac        dropped 1 identical
tom         kept tr8-tom-25.flac        parked 1 for your ear (g65)
tom         kept rx5-tom-19.flac        parked 1 for your ear (g66)
tom         kept dr5-tom-19.flac        parked 1 for your ear (g67)
tom         kept rx5-tom-16.flac        parked 1 for your ear (g68)
tom         kept rx5-tom-14.flac        parked 1 for your ear (g69)
tom         kept tr808-tom-09.flac      parked 2 for your ear (g70)
tom         kept tr808-tom-02.flac      parked 3 for your ear (g71)
tom         kept tr8-tom-16.flac        parked 1 for your ear (g72)
tom         kept dr5-tom-09.flac        parked 1 for your ear (g73)
tom         kept rx5-tom-20.flac        parked 1 for your ear (g74)
tom         kept rx5-tom-04.flac        parked 1 for your ear (g75)
tom         kept tr8-tom-08.flac        parked 1 for your ear (g76)
tom         kept tr8-tom-09.flac        parked 1 for your ear (g77)
tom         kept rx5-tom-05.flac        parked 2 for your ear (g78)
tom         kept tr8-tom-21.flac        parked 1 for your ear (g79)
tom         kept rx5-tom-06.flac        parked 2 for your ear (g80)
tom         kept tr8-tom-02.flac        parked 4 for your ear (g81)
tom         kept tr8-tom-11.flac        parked 1 for your ear (g82)
tom         kept tr8-tom-01.flac        parked 3 for your ear (g83)
tom         kept rx5-tom-12.flac        parked 1 for your ear (g84)
tom         kept tr8-tom-20.flac        parked 2 for your ear (g85)
tom         kept rx5-tom-11.flac        parked 5 for your ear (g86)
tom         kept rx5-tom-07.flac        parked 2 for your ear (g87)
tom         kept rx5-tom-02.flac        parked 3 for your ear (g88)
wood        kept dr5-wood-03.flac       parked 1 for your ear (g89)
```
