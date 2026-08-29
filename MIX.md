# MIX.md — how TEN decides how loud a thing is

`NEXT.md` is the state, `CLAUDE.md` is the rules of working, `SOUND.md` is the
model behind the roll. **This file is the model behind the MIX**: what a drum
is supposed to sound like against the other drums, how that is measured, and
which parts of it are measured versus reasoned.

Started 2026-08-29, from Gad: *"teach yourself online how to do proper music
production mixing, and try to take a kit and give me a drums mix that sounds
like high production level ... come up a system to make a mix, listen to it,
analyse it, compare to reference or to best practices and fix, so we can
improve the kit presets first and the automix later on."*

Every claim is marked **MEASURED** (a probe produced the number), **DESIGNED**
(reasoned, built, not yet measured) or **OPEN**.

---

## 1. THE ONE IDEA

> **Loudness is a property of the TAKE, not of the slot the take sits in.**

Every sampled pad used to take its fader from `MIXT`, which is one number per
CATEGORY: every hat in every kit got 0.35, every cymbal 0.30. **MEASURED**
across all twelve sampled kits, 144 pads, `tools/probe.sh kitmix`:

      mean |error| against the role target     3.7 dB
      pads more than 3 dB out                57/144   (40%)
      worst pad                               40.1 dB  (KTDR5 hat-closed)
      kick loudness, kit to kit                8.2 dB spread
      SAME ROLE, SAME FADER, ACROSS BANKS     38.7 dB spread

That last line is what decides the design. A category constant is not a wrong
value, it is the wrong KIND of value. No table of twelve numbers can balance a
kit it has not heard.

**And peak tells you nothing.** **MEASURED**: every one of the 273 takes on the
shelf peaks at 0.8912 — they are peak-normalised to -1 dBFS — while their
actual loudness spans **32 dB**, from `dr5-shaker-01` at -39.6 LUFS to
`dr5-perc-10` at -7.4. Matching peaks is matching nothing.

## 2. THE METER IS BS.1770, NOT rms

rms weights 40Hz and 4kHz the same and the ear does not, and a drum mix is
exactly the question of a kick against a hat. So the meter is ITU-R BS.1770
K-weighting: a high shelf and an RLB high-pass, then `-0.691 + 10log10(Σ z)`.

`smploud` compares with rms and that is still fine — it compares like with
like. This is not like with like.

**MEASURED — the coefficients are the spec's.** They are DERIVED at runtime
from BS.1770's design parameters rather than pasted from the published table,
because that table is 48kHz and `AC.sampleRate` here is 44100. At fs=48000 the
derivation reproduces

      shelf  1.53512485958697 -2.69169618940638 1.19839281085285
                              -1.69065929318241  0.73248077421585
      rlb    1 -2 1           -1.99004745483398  0.99007225036621

to **9e-16** — machine precision. `kCoef()` in index.html, `kCoeffs()` in
tools/probe.js, same arithmetic in both.

## 3. WHAT A PAD'S LOUDNESS ACTUALLY IS

`padLoud(buf, dcyF, rate)` — the take under its own amp envelope, at its own
playback rate, over the 400ms block BS.1770 measures momentary loudness in.

Three things that look like details and are not. Each was found by predicting
the pad offline, measuring it through the engine, and subtracting — if the
model is right the difference is ONE constant, the voice chain's gain, and not
a per-pad fudge. `tools/probe.sh padpred` is that test.

- **THE BLOCK IS A FIXED 400ms, ZERO-PADDED.** Momentary loudness averages over
  400ms whatever the source does, so the SILENCE AFTER a 60ms rim is part of
  its loudness — and is exactly why a rim reads quieter than a kick of the same
  peak. **MEASURED**: truncating the block to the take instead put the model
  out by 10log10(take/0.4), an 8.25dB spread, worst on the shortest pads (rim
  0.06s, -10.3dB) and near zero on the longest (clap 1.27s, -2.5dB). Fixing it
  took the spread to 3.5dB and the SD to 0.93dB.
- **THE ENVELOPE'S TIME CONSTANT IS d/3, NOT d.** The engine schedules
  `setTargetAtTime(0, at+a, max(0.005, d/3))`. Modelling it as `d` makes every
  short pad read louder than it plays.
- **EACH PAD PLAYS AT ITS OWN RATE, and this one hurt.** A kit pad is a NOTE —
  pad *n* is KBBASE+*n* — and a sample op plays at `2^((midi-KBBASE)/12)`. So
  pad 11 runs at **1.89x** and pad 0 at 1.00x: the twelve pads of a kit are
  twelve different SPEEDS. **MEASURED** on KTJAZ, where the cymbal and the ride
  are the same file with identical envelopes and faders 2dB apart: pad 7
  rendered -27.4 LUFS and pad 11 -42.8. **Fifteen decibels apart for one take.**
  A model blind to rate reads them as the same sound.

**MEASURED — the residual.** With all three in, the offline model predicts the
bus to about **1 dB SD**, and the bus measurement's own run-to-run
repeatability is 0.8 dB. Below that is chasing noise.

## 4. THE TARGET — MIXROLE

One row per INSTRUMENT, which is itself the correction: KITMAP maps clap AND
rim AND snare onto cat `snr`, so `MIXT` gave a rimshot the snare's 0.9 fader
and the snare's +0.05 pan. Three instruments cannot share one seat.

`lu` is **LU relative to the kick**, the reference every drum mix is built
around. **DESIGNED**, cross-read from published mixing practice — kick -12..-8
dBFS, snare -10..-6, hats -18..-14, overheads around 60% of kick and snare —
and kept as ONE TABLE so it can be argued with in one place.

      kick    0     snare  -1     clap  -3.5   tom     -3.5
      hat-cl -6.5   hat-op -6     cymbal -7    ride    -9
      conga  -5     bongo  -6     timbale -5   cowbell -8
      rim    -9     clave  -9     wood   -9    shaker -11
      perc   -7     fx     -8     sub     0

`pan` is a right-handed kit from the AUDIENCE's side, the convention `MIXT`
already used: hi-hat right, ride and crash left, floor tom left of centre, kick
and snare up the middle. **hat-closed and hat-open share a pan because they are
ONE hi-hat** — `MIXT` could not say that either way, since both were cat `hh`.
Hand percussion is not part of the kit, so it is spread wider than any of it.

**MIXREF = -18.0** is the one constant the table hangs off: the `padLoud` value
a kick must have, after its fader, to land at **-20.0 LUFS** on the channel
bus. -20.0 is the MEDIAN of the twelve kits as they were, so half move up a
little and half down and nothing jumps. **CALIBRATED, not derived** — the first
value came from a mean chain gain taken over pads at twelve different rates and
landed the kick 0.85dB hot.

## 5. WHAT IT BOUGHT — MEASURED

Ten machine kits, 120 pads, `tools/probe.sh kitmix`:

                                     BEFORE     AFTER
      mean |error| vs target          3.70      0.42  dB
      median |error|                  2.40      0.10  dB
      p90 |error|                     8.80      0.40  dB
      pads more than 1 dB out        88/120     3/120
      pads more than 3 dB out        46/120     2/120
      kick spread, kit to kit         6.20      0.50  dB
      kick mean LUFS (target -20.0) -21.19    -20.01

KT808, every pad, after: kick 0.0 · snare -0.1 · hat-cl +0.3 · hat-op +0.2 ·
clap +0.1 · tom 0.0 · rim +0.1 · cymbal +0.1 · cowbell +0.1 · conga +0.1 ·
shaker +0.3 · ride +0.1.

**The three pads still out are TWO BAD SAMPLES, not a bad system.**
`dr5-shaker-01` is 30dB below a typical take and hits the 3x fader clamp; it
furnishes KTDR5's hat-closed (-21.6) and KTMX2's shaker (-11.5). `cr78-rim-01`
gives KTC78 rim -2.4. Every other pad in the library is inside 1 dB. See OPEN.

## 6. WHAT WAS DELIBERATELY NOT DONE

- **No high-pass on any pad.** **MEASURED**: every non-kick, non-tom pad across
  all twelve kits has under 2% of its energy below 120Hz. There is no mud to
  remove, and toms legitimately carry 78-97% down there. Filters would have
  been processing for nothing.
- **No peak guard.** Four of 120 pads peak over 1.0 on the CHANNEL bus, which
  looks alarming and is not: Web Audio is float and does not clip between
  nodes. **MEASURED at the master, post-comp, over a full pattern: 0 samples
  over 1.0** on KT808, KTLIN and KTRX5. The only place clipping is real is the
  last node before the destination, and it is not happening there.

## 7. THE BUS — MEASURED, and where the reference runs out

`tools/probe.sh mixbus at=master` plays a representative 2-bar pattern (density
matters as much as level: a hat on every eighth puts far more into the mix than
a crash on bar one) and reads gated INTEGRATED loudness, PLR, and an 8-band
balance Welch-averaged over the whole take.

      kit    lufs   PLR   sub   low  lomid  mid  himid  pres  bril  air
      KT808  -19.2  17.7  23.7  26.4  19.6   8.4   4.7   1.7   7.3  7.1
      KTLIN  -18.5  16.6   5.0  29.1  32.8   6.8   7.3   5.6   6.9  4.5
      KTRX5  -18.0  16.1   8.5  21.8  30.7  12.0   6.9   8.9   8.6  2.5
      REF    -22.5  21.3  22.5  25.0  31.5  14.9   4.5   1.1   0.4  0.0

- **The low end tracks the reference.** 47-50% of energy below 120Hz on the
  kits against 47.5% on the record.
- **PLR 16-18 dB is where a raw drum bus belongs** (published range 16-20;
  10-14 after parallel and bus compression). Nothing here is over-compressed.
- **THE REFERENCE CANNOT JUDGE THE HIGH END and must not be used to.**
  `brushkit` is the only real drum recording on the shelf, it is an MP3, and it
  is a BRUSH kit — no cymbals and a codec lowpass. Its 0.4% brilliance and
  0.0% air are artifacts of both. The kits reading 11-14% above 6kHz against
  that is expected, not a fault. **OPEN: TEN has no reference worth the name.**


## 9. THE SYNTH KITS — measured, and why a table is the ceiling

`padLoud` reads a buffer. `kitPads()` and the synth fallback inside
`randomizeKit` have no buffer, so KT01-10 and the generated pads in a roll
never went near it. **MEASURED**, `tools/probe.sh kitmix` on KT01-10:

      mean |error| 7.45 dB · median 5.00 · 74/120 pads more than 3 dB out
      51/120 more than 6 dB · worst 35.1 · kick spread kit to kit 9.8 dB

Worse than the sampled kits had ever been.

**AND A TABLE CANNOT FIX IT.** `tools/probe.sh synthlvl` rolled 288 pads at
each slot's own note and asked what predicts their loudness:

      predictor                                  residual SD
      per-category constant                         6.39 dB
      category + the amp envelope's own dB          5.81 dB
      per-VOICING (47 groups, n=1..6)               3.44 dB   — and over-fit
      per-SLOT median  (SYNLVL, what shipped)       6.59 dB

The generator's own randomising moves a pad by ±10 dB inside one recipe:
hat-open spans -42.5 to -6.0 across rolls, rim -42.4 to -13.4. That is a
DISTRIBUTION, not an offset waiting for a constant, and the only thing that
reads a distribution is a measurement of the individual roll.

**MEASURED — what SYNLVL bought anyway:**

                                     BEFORE     AFTER
      mean |error| vs role target     7.45      4.95  dB
      median |error|                  5.00      3.60  dB
      pads more than 3 dB out       74/120    66/120
      pads more than 6 dB out       51/120    33/120
      kick spread, kit to kit         9.80      9.60  dB
      kick mean LUFS (target -20.0) -18.17    -21.00

The mean moved and the tail shrank by a third. **The kick spread did not move
at all, exactly as the residual analysis said it would not** — synth kits still
do not match each other, because each kit's kick is a different roll of the
dice and no per-slot number knows which roll it got.

⚠ **CALIBRATE ON KIT PADS, NOT ON STANDALONE PRESETS.** The first SYNLVL was
measured by putting a generated drum on a plain channel at fader 1.0 and landed
the synth kits 3.8 dB under. A kit pad does not take the channel path — it gets
its own bus in `voiceOut` with the kit channel's fader on top — and the
difference is not one constant: per slot it ran from -2.8 dB on the kick to
-11.6 on the open hat. The shipped table is `lufs - 20log10(lvl)` read off the
ten factory kits themselves, which is invariant to the fader and so a fixed
point.

**LIBV had to go to 34.** KT01-10 are STORED, so without the bump every
existing library keeps the old faders forever and the change is invisible to
anyone who has run TEN before.

## 10. ROLLED KITS — MEASURED, and they were already right

`randomizeKit` builds its sampled pads through the same `smpPad`, so the
measured fader reaches a roll. That was asserted when the sampled work shipped
and not checked; `tools/probe.sh kitmix kit=ROLL` checks it now — twelve rolled
kits, 144 pads:

      wild 35   mean |error| 1.36 dB · median 0.15 · 11/72 pads over 3 dB
      wild 80   mean |error| 1.26 dB · median 0.10 ·  9/72
      sampled pads only, wild 80:  0.97 dB mean, 0.10 median

⚠ **ONE REAL BUG WAS HIDING THERE.** `randomizeKit`'s third branch — the synth
fallback when no take fits the slot — was still reading `MIXT`, so **a rolled
kit could carry TWO level scales at once**: a measured hat next to a
table-valued one, in the same twelve pads. At wild 80 that is up to 15% of
them. It uses `synthPadLvl` now, so a rolled kit is on one scale even where it
is part synthetic.

⚠ **AND A MEASUREMENT TRAP, for anyone testing a roll.** `randomizeKit`
replaces `p.kit` and leaves `p.mix` alone — the CHANNEL fader is the channel's,
not the roll's. Measuring a roll onto whatever preset happened to be on the
channel read every rolled kick at -26.8 LUFS against a -20.0 target. The probe
sets the channel to `MIXT.kit` first.

## 11. WHAT WOULD ACTUALLY FIX THE SYNTH PADS

Measure them. The cost is smaller than it looks, and the reason is
architectural: **every kit pad already has its OWN bus** (`voiceOut` builds
`kitBuses[pi][pc]`), so all twelve can be tapped separately, fired at once, and
read independently in a SINGLE 400ms pass — not twelve passes. One silent
render per kit, at roll time and at boot for the factory ten, would put synth
pads on the same footing as sampled ones: from 4.95 dB to the ~0.4 dB the
sampled path gets.

**DESIGNED, not built, and it is Gad's call**, because it is not free: a kit
would settle its levels a moment after you roll it rather than at the keypress,
and that is a UX change, not an implementation detail.

## 8. OPEN

- **A real reference.** One brush-kit MP3 is not a tonal-balance reference.
  Until there is one, the high end is judged by the role table alone.
- **Two bad samples.** `dr5-shaker-01` (-39.6 LUFS, 30dB under) and
  `cr78-rim-01` (-34.2). The system already gives them everything the clamp
  allows. The honest fix is upstream: either keep takes this far under out of
  `kitPick`, or normalise them on the shelf.
- **The synth kits are on SYNLVL and that is the ceiling for a table** —
  4.95 dB mean error, kick spread still 9.6 dB. Section 11 is what would fix
  them and why it needs a decision first.
- **Standalone drum channels still use MIXT.** Only kit PADS are measured. A
  `hh` channel on its own is still a category constant.
- **The automix.** `mixChannel()` sets levels, pans and sends from `MIXT` for
  the whole song. Everything here is the drum half of the problem.
