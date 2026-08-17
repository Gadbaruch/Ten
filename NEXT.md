# TEN — where the audio channel stands, and what is next

Written 2026-08-15. Live at gadbaruch.github.io/Ten/ · dev server: `preview_start
name "ten-gad"` → localhost:3033 is Gad's, `ten-main` → 3032 is Claude's, both
serving this directory · one file, `index.html`, no build step. See CLAUDE.md
for who may be destructive where.

## The model, in one paragraph

An audio channel is a **cursor spawner**. Every playhead reading the take —
the loop, a key's grab, a grain — is one record in `this.cx` inside the
`ten-grsyn` worklet, rendered by one loop. A grain is a cursor with a finite
`dur`; the tape is a cursor whose window never ends. `bus` says where it
lands: 0 through the cloud's 1/sqrt(N) + gain + diffuser, 1 straight out.
When `size` is below its top the **autonomous cursor becomes a carrier** —
grains spray around where it is and it goes silent, because they are doing
its reading.

Two questions define the keys, and nothing else does:

- **keys mode** — a letter picks a POSITION (a cue) or a PITCH
- **auto** — does the loop cursor run by itself

`voice` (poly/mono/legato) says whether a key spawns a cursor, moves the
existing one, or glides it there. Freeze is pitch keys with `from: here`.
Gran is pitch keys with the loop off. None of them are modes any more.

## Where the page sits now (88cd60b)

- **Sound page**: mode · sync · speed · [window, stretch only] · start · end ·
  pitch · key vol, then the cloud's fourteen in grain mode.
- **Instrument row**: engine · sample · keys mode · auto · loop vol · voice ·
  [from] · input · chan · gain. Nine fields, readable at a glance.
- Both levels rest at the top and only cut (SAVEV/LIBV 25).
- Every audio dial, page or row, is a mod/automation destination — one list,
  `AUDADDR()`, so a param added anywhere shows up in the matrix by itself.
- A hold ends through `endAudHold(c)`, called by the key-up, by blur, and by
  the 400ms sweep; `AUD.hold` is a view of `AUD.gk`, not a copy.

## Just landed (2026-08-15 evening batch)

- **Ring reaches a ring.** `1 − amt + amt·mod`, the dry trim a second gain on
  the same amt fed by a constant −1 — so full level is true four-quadrant with
  no dry in it (twice the old depth), and an envelope closing the operator
  opens the dry back up in step instead of closing the channel.
- **Operator envelopes LAND.** setTargetAtTime is an asymptote; at tau=d/3 an
  FM index of 24 is still at 1.2 when the decay has nominally finished. tau=d/5
  plus an exact landing. Sustain 0 now means zero.
- **⌥e + a/d/s/r reached DELAY, not the envelope** — all four stage letters are
  also scope letters, and the scope-OPENING handler ran first. A held scope's
  `keys` row claims its letters now.
- **Cue flips crossfade** (3ms equal-power, inside detectCuts' existing 3ms of
  pre-roll). Measured on a sine: max step 0.2255 → 0.0041.
- **tab+↑↓ crops the take** on an audio channel; it was doing the same job as
  tab+-/= (both just changed `lane.len`). -/= still stretches the loop.
- **A take arrives knowing its tempo** — `guessTake()` picks the beat count
  that puts the implied bpm in 80..170, and the lane takes it on load (never
  over a lane with events in it).
- **Takes travel with the set.** `audRef()`/`restoreAudio()` — a factory phrase
  comes back by re-fetch, a dropped or recorded one comes back as a NAMED hole
  with its channel's settings intact and a flash saying which file to drop.
  SAVEV 26. Embedding the audio itself is deliberately still not done.
- **A live re-aim accepted no reverse.** `tset` gated on `m.rate>0`, so every
  negative rate was dropped and reversing under a sounding take did nothing
  until the next trigger. Measured forward 0.0207→0.1036, then back to 0.0031
  and round to 0.9826.
- **sync and speed are two fields.** They shared one dial with sync at the
  centre detent, so they were mutually exclusive and a mod route on speed had
  to outrank sync to move anything. `audRate()` is the one place the rate is
  decided. Synced-and-double-time is measurable now: 1.2 · 2.4 · 0.6 against
  a fitted 1.2. Old presets migrate through `audSpd()` — the detent reads back
  as sync + ×1 and nothing saved has to move.

## THE RULE: A CHANGE IS NEVER HEARD AS A STOP

Gad, 2026-08-15, and it is a standing rule rather than a bug report: every
audio change lands instantly, on what is already sounding. A cursor is told
its rate and its LIFE when it is born, so anything that moves the loop length
or the tempo has to re-aim all three — rate, life, position — or the take
carries on at the old speed and then dies at the old cycle end. That gap is
what "tab+-/= stops the audio" was. `engine.audRelock(pi)` is where the rule
is kept; call it from anything that changes what a cycle means. Measured, the
carrier sampled every 150ms across a x4 length change whose old cycle ended at
1.0s:
    no relock    1 1 1 1 1 0 0 0 0 0 0 0
    with relock  1 1 1 1 1 1 1 1 1 1 1 1

## The keyboard moved (2026-08-15, Gad)

  pattern edit   caps        →  ⇧p        a latching OS key was the wrong
                                          shape for a mode you flick
  sound scope    `           →  \         + its own row: \+[ ] presets ·
                                          \+; ' types · \+, . engines
  modcap         \           →  caps      Was called "automation"; it is where
                                          captured knob moves live AND where
                                          you arm the capture: caps on + tab
                                          arms the focused channel from ANY
                                          layer. A latching key is the RIGHT
                                          shape for this — a mode you are in
                                          or not — which is why pattern edit
                                          could not stay on it and this can.
                                          ⌥` still walks the captured knobs.
  mic            L-ctrl      →  R-ctrl    (+ Fn, PrintScreen as before), so
                                          LEFT CONTROL is the TOOLS modifier:
                                          a second ⌘ for c/x/v, z (⇧z redo)
                                          and s. A second home, not a move —
                                          ⌘ keeps all of them. LEFT ONLY, so
                                          the right control keeps the mic and
                                          the two overlaps stay over there:
                                          ⌃c is still patch-as-JSON and ⌃s is
                                          still snap. ⌃b ⌃o ⌃q ⌃m are
                                          unchanged from either hand.
  centre pairs               [ ]  , .     both keys of a direction pair at once
                                          means neither: pan to centre, octave
                                          to 0.
  param focus    [ ]                      the slot's TYPE — which reverb, which
                                          saturation curve, which filter shape,
                                          and on ⌥x which effect the slot IS.

`HOLD.a` is modcap's hold. The ` + tab branch is asked FIRST in the tab
handler, ahead of the audio channel's own three meanings for it, or the
gesture would mean different things on different channels.

## A SAMPLE'S PLAYHEAD IS A WORKLET, AND BOTH MODES DRIVE IT (2026-08-17)

Gad, two specifications on top of the scan fix.

**1. THE CROP IS THE WINDOW, AND THE DRIVER'S LEVEL IS ITS WIDTH.** Scan read
the whole buffer and ignored start/end, and the scanning operator's level did
nothing at all. Now the playhead never leaves the crop, and the driver's level
shortens the window FROM THE END — 1 sweeps all of start..end, 0.5 the first
half of it, 0 nothing. Anchored at the start, not centred: centred was the
first guess and Gad corrected it, and he is right — a start point is a position
you chose and a width control must not move it.

    buffer: quiet LOW first half, loud HIGH second half
    width 1.0   rms 0.226  centroid 7129     sweeps into the loud half
    width 0.5   rms 0.089  centroid 2549     stays in the quiet half
    width 0.2   rms 0.089  centroid 1474

The edge fade is measured from the WINDOW's edges rather than the buffer's, or
it would click at the crop. Start, end and the driver's level are all live on a
sounding note.

**2. FM ONTO A SAMPLE NOW MEANS FM OF THE PLAYHEAD.** The k-rate limit below is
real and unchanged for a BufferSource — but a worklet playhead has no such
limit, so an fm or pm operator aimed at a sample builds the sample as a
RATE-DRIVEN playhead instead: speed = rate + modulator x deviation, integrated
to a position, looping inside the same window scan uses. The deviation is
proportional to the sample's own playback rate exactly as an oscillator's is to
its frequency, so amt reads the same on a sample as anywhere else.

    no driver      worklet 0   centroid  426     a plain BufferSource
    FM amt 0.2     worklet 1   centroid  187
    FM amt 0.8     worklet 1   centroid 2801

TWO WAYS TO DRIVE A PLAYHEAD, AND THEY ARE DIFFERENT INSTRUMENTS: POSITION
(scan) makes the modulator BE the playhead — its value picks where to read.
RATE (fm) makes the modulator move the playhead's SPEED. Scan wins if both
point at the same sample; it is the more specific request.

## SCAN, AND WHY FM CANNOT TOUCH A SAMPLE (2026-08-16)

Gad: "scan mode doesnt work, do you understand how it should work? also
fm/pm/scan/sync doesnt work when the op they are applied to is a sample, my
guess is that the playhead of sample in synth isnt malleable."

His guess is right, and it is stronger than "not malleable" — it is a hard
platform limit, and it is the REASON scan exists.

**AN AudioBufferSourceNode'S PITCH IS k-RATE.** Measured: `detune` and
`playbackRate` both report `automationRate: 'k-rate'`. They are connectable,
but they update once per 128-sample block — about 344Hz — so an audio-rate
modulator reaches them as a staircase, not a waveform. FM and PM of a sample
are therefore IMPOSSIBLE with a BufferSource, and the builder's `tb.osc` guard
is correct rather than an oversight. SYNC is not a platform limit but a
meaningless one: hard sync resets an oscillator's PHASE, and a buffer has no
phase to reset.

**SCAN IS THE SAMPLE-NATIVE ANSWER TO EXACTLY THAT.** It is "my playhead is
your waveform": the driver's output, −1..1, is mapped to a position 0..1 in the
buffer and the sample is read there, in a WORKLET, per sample. That is why the
playhead can be moved at audio rate when `playbackRate` cannot. It reads both
ways — a sample op set to scan is driven by its dst/prev op, or an op set to
scan pointing AT a sample drives that sample and goes silent itself.

**THE REAL BUG: SCAN NEVER BUILT WHEN THE SAMPLE WAS OP 1.** Gad: "i had a
sample loaded in op1 and op2 was a sin set to scan and it didnt do anything."
The pairing loop happily names op 0 as the scanned sample — but the scan node
was only ever created inside the `for(let i=1;i<10;i++)` loop, and op 0 comes
from the ROOT build, which had no scan branch. So the pairing was computed and
then nothing consumed it:

    op1=smp, op2=sine SCAN          scan nodes 0   <- his setup
    op2 SCAN dst=op1 explicit       scan nodes 0
    op1=sine, op2=smp SCAN          scan nodes 1
    op1=sine op2=sine SCAN op3=smp  scan nodes 1

The pairing is computed BEFORE the unison loop now, so the root can ask whether
something is scanning it, and the root builds a ten-scan node when it is. Op 0's
`built` entry carries `scan:true`, so the existing connection loop wires the
driver in with no second code path.

PROVED with a ramp buffer — value proportional to POSITION, so a playhead
following a sine outputs that sine, and the scanned pitch must equal the
DRIVER's:

    driver  261.6Hz -> scanned  261.1Hz
    driver  523.3Hz -> scanned  522.2Hz
    driver 1046.5Hz -> scanned 1047.1Hz

A NOISE BUFFER CANNOT SHOW THIS, which is worth remembering: an op set to `smp`
with nothing loaded falls back to `E.noiseBuf`, and scanning noise gives noise
at every sweep rate. Two rounds of measurement here read as "inconclusive"
purely because of that.

**AND SEPARATELY: SCAN WITH NO SAMPLE IN THE PAIR IS A SILENT OP.** Only
`b.op.mode===0` ops get an output gain and reach `outN`, so a mode-5 op with no
sample partner is built, never connected, and heard as nothing — while still
counting toward `addAmt`, so it quietly divides the other operators down.
Measured: with a sample, one scan node is created and the op sounds; with no
sample, zero scan nodes and the op contributes nothing at any ratio.

NOT FIXED, and worth deciding: a mode that silently does nothing is the trap
here. It could flash when scan is set with no sample to reach, or fall back to
behaving as an additive op, or be refused. Not done unasked.

## KIT IS AN ENGINE AGAIN (Gad, 2026-08-16) — supersedes the entry below

It spent a while in the voice-mode list on the argument that a kit IS a
voice-allocation mode. True, and still true, but it was the ONLY entry there
that changed the ENGINE, so walking the dial onto it applied mono and legato on
the way past, and there was no position to come back to. An engine is a thing
you switch TO AND FROM; a voice mode is a thing you WALK. That is the whole
distinction, and it decides where a control lives.

    voice modes  poly · mono · legato
    engines      Synth · Kit · Proc · Audio

The voice mode is now untouched by the round trip, because the two are
different axes and nothing has to remember anything:

    mono,   synth -> KIT -> synth   mode stays mono
    legato, synth -> KIT -> synth   mode stays legato

KITBACK is gone with it — the memory only existed to paper over the wrong home.
And a display bug went with it: `engineName()` reads the ENGINES list, so a kit
channel used to report "Synth". It says Kit now.

## (superseded) KIT AS A ROUND TRIP IN THE MODE LIST

Kit sits in the voice-mode list because a kit IS a voice-allocation mode — the
pitch class picks which chain answers. But it is the only entry there that
changes the ENGINE, and it used to leave the voice mode wherever the walk
happened to pass on the way in: enter kit from poly and step back out and you
were on legato. Gad: "it kinda sucks... i feel stuck we should keep it in the
same position."

The mode a channel was on when it entered kit is remembered in `KITBACK` and
restored on the way out, so:

    on legato -> kit -> step off   ->  legato
    on poly   -> kit -> step off   ->  poly

`KITBACK` is deliberately module state rather than a field on the preset — it
is UI memory, not patch data, and must not land in a saved set.

STILL TRUE, and the thing to weigh if this comes back: walking the dial ONTO
kit still applies mono and legato on the way past, because that is what an enum
walk does. The round trip is fixed; the walk is not. Moving kit out of the mode
list and back into the engine type — Gad's own first instinct — is the fix for
that, and it is a UI relocation rather than a behaviour change.

## THE RULE A KEY CHANGES MEANING BY (Gad, 2026-08-16)

    A KEY MAY ONLY CHANGE WHAT IT MEANS WHILE A MODIFIER IS HELD.

Not "while a selection happens to exist", not "while you are on layer 2 with
an fx rack focused". Context is invisible; a modifier is a thing your hand is
doing. `,` and `.` are the OCTAVE, they sit right under the note rows, and
reaching for the octave must never depend on what else is true at that moment.

Two features had quietly taken them with no modifier and are now PARKED —
commented out in the `Comma||Period` branch, not deleted:

- **fine note nudge**, ¼ grid step on a ⌘A selection. The COARSE version is
  untouched and still live: select, then ↑↓ moves by a whole grid step.
- **slot swap** in the fx and flt chains, where order is audible.

Measured against the build before the fix, dispatching the real key:

    context                     before                    after
    layer 1, ⌘A selection       oct 0, notes +0.0625      oct ∓1, notes still
    layer 2, fx rack            oct 0, slot cursor moved  oct ∓1, cursor still
    layer 2, flt rack           oct 0, slot cursor moved  oct ∓1, cursor still
    ⇧ + , .                     keyboard velocity         unchanged (has a modifier)
    , and . together            octave centred            unchanged

Both ideas are wanted, neither can live at this level. A held scope's own row
is the obvious home — MAGPAIR already gives `, .` to `wid` inside a held
scope, which is exactly the shape: a modifier is down, so the key is free.
Put them there, not back on the bare key.

## 0. THE FILTER ENVELOPE — THE 350Hz HALF IS FIXED, THE RESTING POINT IS NOT

### FIXED: the dial was not in the sound at all (2026-08-16)

The 350 that blocked this entry was not a probe artifact, it was the bug. A
BiquadFilterNode is born at **350Hz — its factory default** — and the builder
only ever SCHEDULED the cutoff, `bq.frequency.setValueAtTime(fFrq, at)`. `at`
is always in the future (a note starts at `currentTime+0.005` at the earliest,
further out under live quantize), and an AudioParam's `.value` reports what it
is NOW. So the env block's `const base = ps[0].value` read 350 on every note,
then `setValueAtTime(base, at)` overwrote the builder's own correct event with
it. **The cutoff dial did nothing whatsoever once an env was routed to it.**

Same probe, both builds, reading back the base the env actually used
(`this.fEnvs`, which stores it):

    dial          previous build        now
    1000          350  → 5600 → 3500    1000 → 16000 → 10000
     400          350  → 5600 → 3500     400 →  6400 →  4000
    6000          350  → 5600 → 3500    6000 → 20000 → 20000
    24dB          [350, 350]            [1000, 1000]
    comb bank     [350 ×5]              [1000, 1879, 2717.6, 3530.8, 4325.8]

Three different dials producing one identical sweep is the whole report. The
fix is `setFrq(param,hz)` in the filter builder — write `.value` AND schedule
it, which is exactly what `setF` already did for oscillator pitch and the same
reason ("an oscillator is born at 440Hz"). The base is also read PER PARAM now
rather than off `ps[0]`, which is what keeps a bank's peaks at their own
multiples of the cutoff instead of collapsing all five onto the first.

`fBase[i]=fFrq` in the builder is written twice and read nowhere — the right
value was sitting there the whole time.

### SUPERSEDED — read the section after this one first

The "dial is the settling point" fix below was shipped and then REPLACED the
same day. It worked, but it invented a third convention (the filter anchored
at its sustain, where amp anchors at its peak and pitch at its rest value) and
it darkened every patch. Kept here because the measurements are still the
record of what the bug was. The real fault was never the anchor.

### ALSO FIXED, THEN SUPERSEDED: the dial as the settling point (2026-08-16)

Gad: "when I change the freq during play I expect it to sound as I set it,
even if there are modulations connected to it." The stored cutoff was the
FLOOR of the sweep, but `cutLive` treats it as the frequency you HEAR — two
meanings for one number, and the sound jumped between them every time he
touched the knob. Measured with a live audio clock, dial 1000 → 2000, amt 40 /
s 0.6 (G=4, K=1+(G−1)·s=2.8):

    step                  previous build        now
    note settles          2800                  1000   ← the dial
    turn dial to 2000     2000  (jumps DOWN)    2000   (continuous)
    next note             5600  (jumps back UP) 2000   ← where his ear left it

He tuned 2800 by ear, it fell to 2000 the moment he grabbed the knob, and the
next note came back at 5600. The sweep is derived BACKWARDS from where it has
to settle now — `base = dial/K`, peak = base·G — so the sustain lands on the
dial, cutLive aims where the envelope already sustains (no jump), and the next
note settles where he left it. Same principle that killed `center`.

The envelope keeps its shape: attack still overshoots to base·G, release still
falls to base. Verified across amt 40/80, NEGATIVE amt (4000 dial sweeping
DOWN, settles 3999.3), s=1 and s=0, and with a second mod on the same cutoff:

    case                     dial   floor    peak    settled
    amt 40 s 0.6             1000   357.1  1428.6    1000.1
    amt 80 s 0.3             1000   181.8  2909.1    1000.6
    amt −40 (downward)       4000  7272.7  1818.2    3999.3
    s=1 (no decay)           1000     250    1000    1000
    s=0 (falls to floor)     1000    1000    4000    1000.9
    + press on same cutoff   1000   357.1  1428.6    1000.1

NOT MIGRATED, deliberately. Multiplying stored values by K would preserve the
old sound, but it clamps away anything whose sustain was over 20kHz and it is
a save-format change. So SAVEV/LIBV are untouched and stored sets load as-is —
but a patch with a filter env now SUSTAINS LOWER than it did (by K, up to 10×)
until it is re-dialled. That is the cost of the number meaning one thing.

## 0a. THE ACTUAL FIX: THE ENVELOPE IS AN OFFSET (2026-08-16, and this is the one)

Gad, after arguing both wrong answers out of me: **envs, lfos and every other
modulator are the same kind of thing, and the filter must not be a special
case.** He is right, and the mechanism was hiding in plain sight.

The env was **the only source in the instrument that WROTE `frequency`
absolutely.** lfo, vel, key, rnd, press and flw all sum into `detune`. And
`cutLive` writes `frequency` too — so the envelope and the live cutoff edit
were two pieces of code fighting over one AudioParam. Every symptom came from
that one fact:

- turning the cutoff mid-note yanked the filter to the dial and killed the
  rest of the sweep. Measured, setting the cutoff to the value it ALREADY had:
      untouched   1098 → 1249 → 1491 → 1992 → 2979
      knob poked  1098 → 1249 →  520 → 787  → 2979      ← a 22% dent
- the dial and the ear disagreed about what the number meant, so tuning by ear
  wrote one thing and the next note re-derived another.

On `detune` they cannot collide. `frequency` belongs to the dial alone. After:

    t(ms)      60    100    160    260    400    600   1100
    untouched 1098  1249   1491   1992   2979   3150   2333
    knob poked 1098  1249   1491   2025   2979   3099   2332      ← 0.0% dent

And the whole gesture, dial 1000 → 2000 mid-note, amt 40 / s 0.6:

    note settles      2297.4          (= dial · G^s)
    dial → 2000       4594.8          exactly 2×, continuous, no jump
    next note         4594.8          matches what his ear left

### THE RULE, and it is two categories, not four conventions

    AMPS (amp, op level)      the dial is the PEAK, the envelope scales down
                              from it. NOT a special case: an amp envelope is
                              not modulating a parameter, it IS the note's
                              existence. Every synth hardwires it for exactly
                              this reason. Already correct — do not touch.

    MODULATED PARAMS          the dial is the value with NOTHING modulating.
    (filter, pitch, pan)      Depth is in the perceptual unit — octaves,
                              semitones, dB — and every source SUMS there.

Multiplying Hz IS adding octaves (a filter CV is 1V/octave), so "additive vs
multiplicative" was always a false question: filter, pitch and amp all already
add, each in the unit the ear uses. The only thing that was ever wrong was
WHICH PARAM the env wrote and that it wrote it absolutely.

A consequence worth knowing: the envelope is linear in CENTS now, so the
sustain lands at dial·G^s rather than dial·(1+(G−1)·s) — amt 40 / s 0.6 gives
2297 where the Hz form gave 2800. The peak is unchanged, the sweep sounds even
across its range, and that is the analog behaviour rather than a new taste.
Verified across amt 40/80, NEGATIVE amt (4000 → peak 1000, settles 1741), s=1
(sustain = peak), s=0 (settles at exactly the dial), and with press and vel
routed to the same cutoff.

STILL DIFFERENT, and small: env→pitch anchors the same way but interpolates
its decay LINEARLY IN Hz (`base+(peak−base)·s`), where the filter is now
linear in cents. Same anchor, different curve. Moving pitch to cents would
finish the job; it was left alone because it was not what was asked.

## 0b. WHICH SOURCE MEANS WHAT — Gad's wider suspicion, measured

Gad, 2026-08-16: "this may not be only env or only filter, it's how mods are
applied to any sources." He is right, and the split is structural:

**The env is the only source that WRITES its target. Every other source ADDS
to it.** lfo, vel, key, rnd, press and flw all connect a node into `detune`
(or a gain), where the resting value is structurally 0 and there is no base to
get wrong. Only the env schedules absolute values, so only the env needs a
base — which is why only the env could read 350, and why only the env has an
opinion about where the dial sits.

Measured on real notes, one route at a time, amt 80 / s 0.6:

    env → filt       dial is the ZERO-MOD value, offset in cents  ← 0a, correct
    env → pitch      dial is the ZERO-MOD value (the played note) ← correct
    env → op level   dial is the PEAK — correct, it is an AMP
    lfo → anything   dial is the CENTRE     bipolar swing in cents
    vel/key/rnd      dial is the value at zero source
    press / flw      dial is the RESTING point (this is what killing `center` bought)

Read against 0a's two categories, this table is now consistent: everything in
the MODULATED PARAMS category anchors at the zero-modulation value, and the
two AMPS anchor at their peak because that is what an amp envelope is. The
earlier reading of this table — that op level was "the opposite convention" —
was wrong; it is not a modulated parameter at all.

**env → pitch IS IN CENTS TOO NOW (2026-08-16).** Same shape as the filter and
for the same reasons: an oscillator's env is a true offset on `detune`, so it
sums with lfo/vel/press instead of writing `frequency` absolutely. Measured,
C4 with amt 80 / s 0.6 — starts at 261.6 (the played note), peaks 793, settles
**508.9** against a cents-linear prediction of 508.9, where the old Hz-linear
form gave 580.5. A SAMPLE has no `detune` — its pitch IS `playbackRate`, a
ratio — so those targets keep the absolute form, interpolated in cents so both
kinds agree about where the sustain sits.

Still open: **`env → filt` resolves its slot with `clamp(idx,1,10)-1`** rather
than `_fltP`, so idx 0 means slot 1 for envelopes where it means ALL for every
other source. Left alone deliberately — fixing it changes what existing patches
with idx 0 do.

## 0f. THE UNIFICATION — LANDED FOR EVERY CONNECTING SOURCE (2026-08-16)

Three pieces, all in:

- **`_destOf(rt,p)`** — ONE resolver. Every (dst,idx) and every learned address
  comes through it and hands back targets that each carry their own full swing.
  Two sources of truth, each where it belongs: an OPERATOR GAIN takes its swing
  from the graph (an FM depth's real range is amt·carrierHz·kIdx, which no UI
  spec can know), everything else from its own `SP` declaration via `MODRANGE`.
- **`MODTAPER` + `MODRANGE`** — ONE depth rule, `taper(amt) × the target's own
  span`, with `taper(a)=sign(a)·a²`. No table; the range is read from the same
  `min`/`max` the UI draws the dial with, so param 231 is modulatable the day
  it is added.
- **`engine.modReaim(pi)`** — ONE live path. Every route leaves a handle
  `{p,span,mi,ri,kind}` on the voice, so one call re-aims all of them from the
  current preset values without knowing what they point at.

**NOT `modLive` — that name was already taken** by the LFO rate/depth editor
600 lines below, and a class body lets the later definition silently win. The
symptom was perfect: no throw, no effect, every cell still DEAD. Renamed.

### The matrix, before and after

    tweak (change the MOD under a sounding note)     before    after
    filt cutoff  lfo/vel/key/rnd/press               DEAD      yes
    pitch        lfo/vel/key/rnd/press               DEAD      yes
    op level     lfo/vel/key/rnd/press               DEAD      yes
    osc pitch (addr) vel/key/rnd/press               DEAD      yes
    flt Q (addr) vel/key/rnd/press                   DEAD      yes

**vel→op and press→op now EXIST** — those branches had never been written.

### Two lies the harness was telling, both fixed

- it played **note 60**, and the `key` source is `(midi-60)/24` — exactly ZERO
  at middle C, so every key row read DEAD for arithmetic reasons. Plays 72 now.
- it never **pressed** the note, and pressure is 0 until pressed, so every
  press row was multiplying its new depth by zero. It presses to 0.7 now.

A cell that reads `blind` still is not a pass: `AudioParam.value` cannot see a
connected input, so `reaches` is unverifiable that way. `tweak` sidesteps it by
watching the DEPTH HANDLE, which is exactly what `modReaim` re-aims.

### ALL THREE CLOSED (2026-08-16, same day)

- **env tweak** — an envelope SCHEDULES, so it now leaves a handle carrying what
  it takes to recompute the sustain it is HOLDING, and `modReaim` re-aims to
  that. Never re-runs the attack: that is already in the past and re-striking it
  under the player's fingers would be worse than doing nothing, so a handle is
  skipped until `now − startAt` has passed its own attack.
- **LFO on a LEARNED address** — a learned route carries `dst:0`, so `MD2LFO[0]`
  is undefined and it never entered `lfoList`. The learned block leaves its own
  handle now. Note it is LINEAR in amt (it predates MODTAPER), so the handle
  says `lin:true` rather than letting modReaim guess.
- **`dialLive(pi,rack,slot,key,val)`** — every addressed param has a live dial,
  not just the cutoff. `_modParam` already resolved any (rack,slot,key); this
  writes the dialled value to them. **Cents params are skipped deliberately**: a
  `detune` is where the MODULATORS sum and has no dialled value of its own, so
  writing one would fight them — exactly the mistake the filter envelope made.

One bug worth remembering, because it read as "the feature does not work" for a
whole round: `this.modN=[]` at the LFO rack ran AFTER the envelope blocks had
already pushed their handles and threw every one away. `||[]` now.

### The matrix, all 42 cells

    dest              tweak
    filt cutoff       all 6 yes
    pitch             all 6 yes
    osc pitch (addr)  all 6 yes
    op level          all 6 yes
    osc level (addr)  all 6 yes
    flt Q (addr)      all 6 yes   · live dial now tracks x2
    amp               env + lfo yes · vel/key/rnd DEAD · press unverifiable

### The three that are NOT bugs, and why

- **amp × vel/key/rnd** — `ampBias` is folded into the envelope PEAK when the
  voice is built, so there is nothing to re-aim without rebuilding the envelope.
  A note's loudness contour is decided when the note starts; that is defensible
  and it is what every synth does.
- **amp × press** — the probe reads `v.vca.gain`, but pressure→amp rides
  `pGain`, a node AFTER the vca. `modReaim`'s bag loop does re-aim it. NOT
  MEASURED either way — do not read that DEAD as a finding.
- **flt Q + env, live dial reads `x0.26` not `x2`** — the dial and the envelope
  fight over one param, which is precisely the collision the cutoff had. It
  cannot be fixed the same way: `frequency` had `detune` to move the modulators
  onto, and `Q` has no companion offset param. Any param without one has this
  ceiling.

### What it costs

Depths moved. `taper(a)=a²` plus derived ranges means every mod route is
shallower in the middle of the knob than it was, and pitch/op depths changed
outright. No save-format change — SAVEV/LIBV untouched — but anything with a
mod route wants re-dialling. Factory drums A/B'd against the previous build:
fundamentals identical (+0Hz on all four), centroid within 2%, peak within
0.04, which is drum noise rather than a regression.

## 0c. THE MOD MATRIX, AND THE ONE THING STILL MISSING

Gad, 2026-08-16: "have the same conventional mod method for ALL possible params
that can be tweaked in ALL possible engines, i dont want to QA every single
param modulation by every mod type manually."

So it is a probe now, not a chore: **`tools/probe.sh modmatrix`**. It fires real
notes and asks four questions of every source × destination —

    reaches  does the modulator move the destination at all
    anchor   with NOTHING modulating, does the param sit on the dial
             (measured with no mod in the rack — reading a sounding modulated
             note just reads the sustain, which is legitimately not the dial;
             that was this probe's own first bug)
    live     turning the DIAL ×2 under a sounding note — does the sound follow
    tweak    changing the MOD ITSELF under a sounding note — anything?

Run it per destination (`only="filt cutoff"`); all 42 cells at once exceeds the
browse eval timeout. `blind` means AudioParam.value cannot see a CONNECTED
source, which is every source except the envelope. **A blind cell is not a
pass.** The first full sweep:

    dest              anchor   live        tweak
    filt cutoff       ok       tracks x2   DEAD (all 6 sources)
    pitch             —        —           DEAD (all 6)
    amp               n/a      —           env only; lfo/vel/key/rnd/press DEAD
    op level          n/a      —           DEAD (all 6)
    flt Q (addr)      ok       DEAD        DEAD (all 6)
    osc pitch (addr)  —        —           DEAD (all 6)
    osc level (addr)  n/a      —           DEAD (all 6)

**TWEAK IS DEAD IN 41 OF 42 CELLS.** The single working cell is amp × env,
which is `envLive` — the only live path anyone ever wrote. `lfoLive` looks like
a second one but only ever re-aims `m.routes[0]`, so a slot's second route is
dead too. And `flt Q` shows `live: DEAD`: turning the resonance dial does
nothing to a sounding note, because only `frq` has a `cutLive`.

### WHAT THE UNIFICATION NEEDS, and it is one idea

Every route should leave a LIVE HANDLE on the voice when it is built:

    {mi, ri, param, kind, aim(depth)}     kind = env | connected

Collected into one `this.modN`, so a single `engine.modLive(pi)` can walk every
voice and re-aim every route from the current preset values — connected sources
by writing their depth gain, envelopes by re-aiming the current setTarget. One
list, one method, and a param added anywhere is live by construction rather
than by somebody remembering to add a hook. That also kills the `routes[0]`
limit and gives `flt Q` (and every other addressed param) a live dial for free.

The harness above is the net for doing it: every DEAD in that table should read
`yes`, and nothing that reads `ok` may become `off dial`.

## 0g. LEGATO ONLY EVER MOVED OP 0 (2026-08-16)

Gad: "legato/mono doesn't track for all ops." Exactly right, and the arithmetic
says why. `oscRefresh` pitches operators 1-9 from

    tTgt = target x toneFreq/rootFreq
         = (rootFreq x k) x toneFreq/rootFreq

**and rootFreq cancels.** So tTgt is `toneFreq x k` and nothing else. `retune`
moved `rootFreq` and `noteRatio` but never `toneFreq`, so tTgt did not budge:
op 0 glided (it reads `target` directly, which does scale with rootFreq) and
every other operator stayed on the old note.

Measured, three oscillators at ratios 1/2/3, legato retune one octave up:

    op    previous build              now
    op1   130.8 -> 261.6  x2          130.8 -> 261.6  x2
    op3   261.6 -> 261.6  DID NOT MOVE  261.6 -> 523.2  x2
    op5   392.4 -> 392.4  DID NOT MOVE  392.4 -> 784.7  x2

`retune` carries `_tf0` alongside `_rf0`/`_nr0` now and scales it by the same
ratio.

### AND THE PITCH TRACKING WAS ONLY HALF OF IT — THE FM DEPTH DID NOT MOVE

Gad, after the above: "other ops besides 1 don't track at all, not only when
gliding." Measured every operator MODE (add/fm/ring/sync/pm) on fresh notes at
48/60/72 and across a legato retune, with op 0 as an oscillator, as noise and
as a sampler: **every pitch param tracks**, and did before this entry too. So
the literal reading did not reproduce.

What DOES fail is the FM/PM **depth**, and it sounds exactly like an operator
that is not following. The builder makes the depth `amt × (the carrier's or the
modulator's) Hz × kIdx` — a FREQUENCY — so it is tied to the pitch the note was
built at, and nothing rescaled it on a retune:

    before   depth 979.5   modHz 261.6   index 3.744
    after    depth 979.5   modHz 523.2   index 1.872     <- index HALVED
    now      depth 1958.7  modHz 523.2   index 3.744     <- holds

The index halving across one octave is the timbre sliding dull as you glide up
while every frequency tracked perfectly. `oscRefresh` scales those depths by
`toneFreq/_tf0` now. **add and ring depths are LEVELS and are deliberately not
touched** — only modes 1 and 4 carry a frequency in their depth.

SEPARATELY, and found on the way: **a SAMPLER did not glide.** Both sampler
sites wrote their pitch straight in — `pitchParam.setValueAtTime(target,at)`
for a sampler root, `s2.playbackRate.value=ratio` for a sampler operator —
bypassing `setF`, so on a glide the oscillators slid and the sampler jumped.
Portamento is a RATIO, so `glR` multiplies a playbackRate exactly as it does a
frequency; both go through `setF` now. NOISE deliberately stays out: its rate
carries no `midi` term, so it never tracked the note and has nothing to glide.

## 0h. CH 6 "OPS DON'T TRACK" IS ALIASING — diagnosed, NOT fixed

Gad's channel 6 (STRUC), imported from his own export and measured on 3032:
op0 sin rat 0.5 · **op1 FM rat 6** · **op2 PM rat 16**, poly, glide 0.036.

**Every parameter tracks perfectly.** Pitch doubles per octave on all three
operators, and both modulator indices hold exactly (FM 4, PM 24) — so it is not
the pitch bug from 0g, and it never was: the patch is POLY, so `retune` never
runs and today's legato fixes could not have touched it.

What does not track is the SOUND:

    note  f0     centroid   energy above 16xf0
     36   65.4     1136       35.3%
     48  130.8     1098       19.8%
     60  261.6     1232        4.8%
     72  523.3     1393        0.3%
    centroid ratios octave to octave: 0.97, 1.12, 1.13   (2.0 would be tracking)

The spectral centre of gravity is PINNED near 1.1-1.4kHz across four octaves
while the fundamental moves by a factor of eight. At note 72 the LOUDEST peak
sits at 40Hz — nothing to do with a 523Hz note.

It is aliasing, and the arithmetic is not close. Carson bandwidth for op2 at
index 24, ratio 16, is 2·(24+1)·16·f0 = 800·f0:

    note 36   52 kHz  =  2.4x Nyquist
    note 48  105 kHz  =  4.7x
    note 60  209 kHz  =  9.5x
    note 72  419 kHz  = 19.0x

Everything past Nyquist folds back DOWNWARD, so as the note rises the folded
content moves the wrong way and swamps the real partials — which is exactly
what "the upper operators don't follow" sounds like. The falling
`energy above 16xf0` column is the same fact from the other side: at the top
octave there is nothing left up there because it has all folded down.

CONFIRMED BY CONTROL: same patch with the two depths turned down (op1 0.25,
op2 0.15) gives centroid ratios 1.6 / 2.06 / 1.35 and a centroid that actually
climbs 235 → 377 → 777 → 1051. Lower the index and it tracks.

### FIXED — a Nyquist budget, soft, at zero CPU

Gad: "do what you think will sound best and be most reliable, don't prioritise
easiness, but tell me if something is a major cpu eater."

**Oversampling is the textbook answer and it is the wrong one here.** Rendering
that patch honestly needs ~19x; even 4x, already costly, would not come close.
At those settings the sound is NOT REPRESENTABLE at 44.1k, so the index has to
be bounded whatever else is done — which makes the budget the honest fix rather
than the cheap one. Hardware FM has key-scaled for this reason since the DX7.

`fmDepth(amt,carHz,modHz,isPM)` holds the peak deviation inside the room left
under Nyquist, SOFT via tanh so it is a budget and not a cliff:

    rat 2  index 6  @C4      1570 -> 1566 dev    (-0.3%, inaudible)
    rat 4  index 12 @C4      3139 -> 3113 dev    (-0.8%)
    Gad's PM rat 16          index 21.3 @C2 · 16.0 @C4 · 8.6 @C5 · 3.6 @C6

Ordinary patches are untouched; only the extreme ones roll off, and they roll
off WITH PITCH instead of turning to mush. `sc` is bounded rather than just the
dialled gain, so an envelope or LFO on the index cannot push back past Nyquist
either. A retune RE-DERIVES the budget at the new pitch rather than scaling the
old one, because the room shrinks as the note climbs.

**CPU: none.** One `tanh` per FM operator per note. No per-sample work anywhere,
no worklet, no extra nodes.

Measured on Gad's own set, same patch both builds — and note the metric. Once
the index is key-scaled the CENTROID cannot double: capping absolute bandwidth
means the spectrum stops scaling with pitch, and that is physics, not a bug.
What must improve is HARMONICITY, because aliased content folds to arbitrary
frequencies:

    note   harmonic energy      loudest peak
     36    18.1% -> 17.9%       harmonic 0.99 -> 0.99   (untouched, as intended)
     48    18.1% -> 23.8%       harmonic 1.03 -> 0.99
     60    14.4% -> 24.9%       harmonic 1.01 -> 0.99
     72    12.4% -> 34.2%       harmonic 0.15 -> 4.97   <- junk to a real 5th

At the top note the loudest thing in the mix was a 40Hz fold; it is a 1300Hz
fifth harmonic now, and harmonic energy nearly triples.

WHAT IT COSTS: any patch relying on an index past the budget loses brightness
up top. That IS the aliasing being removed — there was never a clean version of
that sound — but it will not sound identical.

### The options that were considered and rejected

TEN band-limits its oscillators per note (`setPeriodicWave`), but FM/PM is done
by connecting a modulator into `frequency`, and those sidebands are not
band-limited by anything. `kIdx = 6·(1+3a²)` takes the top of the amt knob to
an index of 24, which guarantees this at any ratio above about 2.

Three ways out, in increasing cost:
  1. **Clamp the index against Nyquist** — hold Δf + f_mod under Nyquist per
     note, which is key scaling and what every hardware FM synth does. Cheap,
     one expression in the builder plus the same in oscRefresh. It makes high
     notes duller, and it changes every FM patch's top octave.
  2. **Scale the index by pitch** (a gentler version of 1, a fixed dB/octave
     rolloff) — more musical, less exact.
  3. **Oversample the FM operators** in a worklet — correct, and much the most
     work.

(1) is what the evidence argues for and it is one line, but it audibly changes
the top of every FM patch in the library, so it is Gad's call, not a cleanup.

Extracted from every depth-setting line in the engine, 2026-08-16. This is the
real answer to "make every mod affect every dest consistently": the MECHANISM
is now nearly uniform, but the DEPTHS never were.

    destination     env        lfo        vel/key/rnd   press      learned addr
    filter cutoff   5 oct      4 oct      4 oct         4 oct      4 oct
    pitch           2 oct      2 SEMI     1 oct         1 oct      4 oct
    op level        full       +-half     MISSING       MISSING    +-full
    voice amp       the env    +-half     env peak      base+A     —

Pitch spans **24x** between an LFO (200 cents, index.html ~5993 `A*tg.sc`) and
a learned route (4800 cents, `A*4800`) for the identical destination.

**AND THE OBVIOUS FIX IS WRONG.** One number per destination would break the
two commonest uses at once: an LFO on pitch at amt 100 wants ~2 semitones,
because that is vibrato; an ENVELOPE on pitch at amt 100 wants ~24 semitones,
because that is a drum pitch drop. Both are right. A single ±4-octave range
makes vibrato live in the bottom 4% of the knob.

### THE TABLE MUST NOT EXIST — Gad, 2026-08-16

"you listed 4 destinations, but we may have hundreds as we continue."

That settles it, and it kills point 3 below rather than answering it. A
hand-maintained depth table rots the moment somebody adds a param, and the
evidence is already in the tree: `_modParam` declares Q as `range:14` where its
spec says `min:0.1,max:24` (23.9), and gain as `range:18` where its spec says
`-18..18` (36). **Two of three hand-written ranges had already drifted, with
only four destinations in play.**

There are **230 `SP()` declarations**, and every one carries `min`, `max` and a
`type`, because the UI cannot draw or step a dial without them. That is the
single source of truth, and it is already maintained by whoever adds a param.
So the depth is DERIVED, never declared twice:

    range   = spec.max - spec.min        declared once, by the UI
    domain  = spec.type                  freq/time -> log (cents/octaves)
                                         lin       -> linear
                                         enum      -> stepped, or not a mod
                                                      destination at all (45 of
                                                      these are type selectors)
    depth   = range x taper(amt)         ONE global taper, not per destination

And the vibrato-vs-pitch-drop conflict stops being a range problem and becomes
a KNOB TAPER problem, which has one answer for the whole instrument. With
`depth = range · sign(a)·a²` over a ±4-octave pitch range:

    amt  20  ->  ~2 semitones      vibrato
    amt  50  ->  ~1 octave
    amt 100  ->   4 octaves        the drum drop

Same rule, same destination, both playable — and it applies unchanged to param
number 231, which is the whole point.

Two global decisions remain, and they are global, not per destination:
  - the taper exponent (2 is gentle and probably right; 3 gives finer vibrato
    resolution at the cost of a twitchy top end);
  - whether `enum` params are modulation destinations at all — a swept filter
    TYPE or wave SHAPE is a real effect, but it must quantize, and "off" is
    usually index 0 which means a mod can silence the slot.

So the unification is three things, and only the first two are mechanical:

1. **One resolver.** Every (dst,idx) and every learned address resolves through
   ONE function to `[{param, range}]`, each target carrying its own full scale.
   `_opA` is the first piece of this; `_modParam`'s `ranges` is the second.
2. **One live path.** Every route leaves a handle on the voice; one
   `engine.modLive(pi)` re-aims all of them. See 0c.
3. **A DECLARED depth table** — per destination AND per source kind, in one
   place, chosen deliberately rather than inherited from whoever wrote each
   branch. This is the part that changes how existing patches sound, and it is
   Gad's call, not a refactor detail. Nothing above should be built until the
   numbers in it are decided, because they are its central parameter.

## 0k. WHY NATIVE'S LIVE-TWEAK MISMATCH CANNOT BE FIXED IN PLACE

Gad asked for the native one to be fixed too. It cannot be, in the native
engine, and the measurement says why. Carrier wave changed, everything else
identical, amt 0.3 -> 0.7 live vs retriggered:

    carrier        native    phase
    saw            0.804     0.9997
    SINE           0.909     1.0000

A sine carrier improves native and still does not reach 1. The cause is
structural: FM on an OscillatorNode modulates its FREQUENCY, so the carrier's
phase is the INTEGRAL of the modulation — its state depends on the whole
history of the depth. A note that RAMPED to depth D has accumulated a different
phase than a fresh note built at D, and with a harmonically rich carrier the
sidebands from different harmonics overlap and interfere, so that phase
difference becomes a magnitude difference. Hence saw (0.80) being worse than
sine (0.91).

TRUE PHASE MODULATION HAS NO SUCH STATE. The carrier's accumulator advances on
its own nominal schedule and the modulation is an offset applied at read time,
so the relationship between carrier and modulator is fixed by their frequencies
alone and is history-free. That is why the phase engine reads 1.0000.

So "fix native" means "make native do phase modulation", which is the phase
engine. Nothing smaller closes it.

## 0j. LIVE TWEAK vs RETRIGGER — native mismatches, phase does not

Gad: hold a note, raise op2's level, release, play it again — the retrigger
does not match what you were just hearing. Real, and measured with a CONTROL so
it is not a measurement artefact: two identical fresh notes correlate at 1.000,
so anything below that is the instrument, not the probe.

    engine   tweak-then-retrigger      control (fresh vs fresh)
    native            0.806                     1.000
    phase             0.999                     1.000

THE DEPTH IS NOT THE PROBLEM ON NATIVE — the FM depth gain matches to the digit
(596.13 -> 2681.14 live, 2681.14 on the retrigger, ratio 1.000). `oscRefresh`
recomputes `sc` from the current amt, so the amount arithmetic is right. What
differs is the SOUND at identical depth, which points at the oscillator's
response to a RAMPED depth versus a static one rather than at the routing —
the same band-limited-wavetable behaviour that 0i is about. Not yet fixed.

PHASE HAD ITS OWN VERSION OF THIS AND IT IS FIXED. Its `g` param is a
multiplier over the level baked into the cfg, and it was being written as the
plain ratio `amt/b0`. But a modulator's depth goes as a·6(1+3a²), so a linear
ratio drifts from what a rebuild gives: 0.3 -> 0.7 was landing at 0.43 of the
retriggered depth. It is the ratio of the DEPTH CURVES now, and an additive
op — whose level really is linear — keeps the plain ratio.

## 0i. CH4: FM INTO FM PUSHES THE CARRIER NEGATIVE — diagnosed, NOT fixed

Gad: "its when i fm and fm, op3 is fming op2 which fms op1, thats what seems to
cause this." He is right, it predates the Nyquist budget, and the budget does
not fix it.

ch4 (MOG0): op1 `org` rat 1 · op2 `sin` rat 3 +40c · op3 `tri` rat 3 +40c, the
two FM ops CHAINED (3→2→1), uni 3, poly.

TWO THINGS ARE NOT THE BUG, both measured:
- **the pitch complaint is SCALE SNAP.** `CFG.scaleOn` is 1 with pitch classes
  [0,2,4,5,7,9,11] — C major — so every black key plays the white key below it
  (61→60, 63→62, 66→65, 68→67, 70→69). That is the feature working. It reads as
  "weird pitch modulations" because it is silently on.
- **it is not unison, not the org wave, and not the Nyquist budget.** With
  uni 1 the within-note wobble drops to ~0% and the per-note centroid is still
  erratic; with a sine carrier it is still erratic; and the pre-budget build
  gives the same pattern (C 1414 · D 1612 · E 2320 · G 1735 — non-monotonic).

WHAT ISOLATES IT, all ops sine, uni 1, scale off:

    op3 amt 0.38 (his)   centroid 694 730 892 1057 1087 1149 1175 862 …  jumpy
    op3 amt 0.10         centroid 513 547 589 635 683 724 753 783 827 …  SMOOTH

Turn the CHAINED modulator down and the timbre becomes a clean monotonic curve.
Leave it up and adjacent semitones differ by up to 1.4x.

THE MECHANISM. At C4 his chain gives:

    op2 instantaneous freq   803 +- 2488  ->  -1685 .. 3291 Hz
    op1 instantaneous freq   262 +-  490  ->   -228 ..  752 Hz

**Both swing through zero and negative.** In ideal FM that is harmless — phase
simply runs backwards, and a DX7 does it constantly. But an `OscillatorNode` is
a BAND-LIMITED WAVETABLE oscillator: it selects a table by |frequency|, in
octave bands, and those thresholds are ABSOLUTE Hz. So where inside each
modulation cycle the table switches depends on the note's absolute pitch —
which is exactly "every note has a different timbre", and exactly why it does
not transpose. A richer modulator (his triangle) crosses more thresholds, which
is why sine modulators are so much tamer.

TWO BUDGET EXTENSIONS WERE TRIED AND REVERTED, because neither moved it and
both dulled patches for nothing: weighting the budget by the modulator's
harmonic reach, and walking the chain deepest-first to accumulate each link's
real reach. Both are more correct in principle; measured on ch4 the octave
ratio went 1.35 → 1.19 and the jumps stayed 0.73..1.38. The budget is not the
lever, because there IS room under Nyquist here — the fault is the oscillator,
not the bandwidth.

### THE CONTROLLED EXPERIMENT — chained FM is BROKEN natively, not "expected"

Gad: "i cant understand why fm'ing the fm would make atonal notes that dont
corrolate anymore to the keyboard, if they are all tracking the same. i dont
get it." He was right not to accept it. On an EMPTY set, a channel blanked to
nothing (no filter, no mods, no fx, no play rack, no transpose, drum category
cleared), three IDENTICAL sine ops, main ← fm-prev ← fm-prev:

    case                              harmonic energy        transposes
    2 ops (one pair)  rat 1  native   62 · 68 · 62 · 68 %    0.62 .. 0.85
    3 ops CHAINED     rat 1  native    2.4 · 1.4 · 1.6 · 1 %  0.08 .. 0.29
    3 ops CHAINED     rat 1  PHASE    68 · 70 · 74 · 78 %    0.97 .. 0.996
    2 ops (one pair)  rat 3  native   61 · 68 · 69 · 69 %    0.95 .. 0.98
    3 ops CHAINED     rat 3  native    1.8 · 10.7 · 1.4 %     0.04 .. 0.49
    3 ops CHAINED     rat 3  PHASE    64 · 71 · 71 · 75 %    0.96 .. 0.99

    his ch5 (ROK3) as saved  native    1.1 · 0.6 · 0.5 · 0.4 %
    his ch5 (ROK3) as saved  PHASE    31 · 75 · 16 · 40 %

`transposes` is the correlation of the LOG-frequency spectrum taken relative to
f0 between one note and another: 1.0 means the timbre is the same shape simply
moved, which is what an ear calls consistent between notes. Centroid was the
wrong metric and this is the right one.

**A single FM pair is fine. Chaining it natively collapses harmonic energy from
~65% to ~1% and transposition from ~0.97 to ~0.05.** That is NOT FM physics:
ideal chained FM at INTEGER ratios is exactly harmonic at any index, so ~1%
harmonic with every op identical at rat 1 is the engine failing, not the maths.
The phase accumulator restores both to 68-78% and 0.99. It is a bug, and this
is the proof.

### AND HIS PATCH ALSO ASKS FOR MORE INDEX THAN 44.1k CAN HOLD

ch5 has amt 1 on BOTH links, which is kIdx 24 — an index of 24 twice over.
Chained, that is beyond Nyquist at any real note, so even a perfect oscillator
cannot render it:

    3 CHAINED rat 1, PHASE, amt 1.0    harmonic 31 · 73 · 16 · 39 · 12 %   transposes 0.64 .. 0.84
    3 CHAINED rat 1, PHASE, amt 0.5    harmonic 65 · 72 · 72 · 73 · 78 %   transposes 0.97 .. 0.996
    3 CHAINED rat 1, PHASE, amt 0.3    harmonic 67 · 72 · 72 · 76 · 79 %   transposes 0.85 .. 0.96

So there are two separate causes and his patch has both. The engine bug is
ours; the index is his dial. Turn the two op levels to about half and switch to
phase and a chained stack is 70%+ harmonic and transposes at 0.99.

WORTH SAYING PLAINLY: he reports native SOUNDS better. At ~1% harmonic energy
the native chain is inharmonic clangour, which is a real and usable noise — it
simply cannot also track the keyboard, which was the complaint. That is a taste
choice now rather than a bug, and it is his to make.

### BUILT, BEHIND A DIAL — `voice → fm eng → phase` (2026-08-16)

Gad: "im interested to at least try the real but heavy fix." So it exists, as
an experiment rather than a default: **`ten-fmop`**, an FM stack on a real
phase accumulator. Phase runs backwards happily when the instantaneous
frequency goes negative — which is what ideal FM does — and **the band-limit
table is chosen ONCE PER NOTE and never switched under the modulation.** That
single difference is the fix. It is also true PHASE modulation, so mode 4 stops
being a scaling trick standing in for a phase input.

ch4, chromatic, his patch, same everything but the engine:

    native   centroid 1478 1635 1543 1937 2317 2264 1984 1968 1818 …
             semitone ratios 0.81 .. 1.34        <- jumps, does not transpose
    phase    centroid 2459 2524 2621 2712 2720 2763 2798 2832 2869 …
             semitone ratios 1.00 .. 1.04        <- smooth, monotonic

**CPU, measured rather than guessed** — voices piled on until the audio clock
would fall behind the wall clock:

    8 voices   native ratio 0.9999   phase 1.0001
    16 voices  native ratio 0.9989   phase 1.0013

16 voices x 3 ops x 3 unison is 144 phase accumulators and it still renders in
real time, so the bill is far lighter than the 5-10x estimate feared. Caveat:
this measures WHETHER it keeps up, not how much headroom is left — it cannot
read the audio thread's actual load, so a slower machine or a heavier patch is
untested.

**PER-OPERATOR MODULATION NOW WORKS** (2026-08-16). This was the one thing
keeping it from being the default. The mod rack aims at AudioParams, so the
worklet EXPOSES them: `d0..d7` are detune in CENTS — the same unit and the same
summing behaviour an oscillator's detune has — and `g0..g7` are the operator
levels, both a-rate. They are registered into opDet/opPitch/opGains/opAmt at
build, so `_destOf` and every env, LFO, vel and pressure route reach an operator
without the rack knowing it is talking to a worklet. Measured: an env aimed at
op2's pitch writes 731 cents and decays to 720; both routes leave live handles.

**LEGATO RETUNE WORKS TOO** (2026-08-16). A retune is a MESSAGE rather than a
param write: the built frequencies scaled by the pitch ratio, so unison spread,
ratios and fine all come along without being recomputed. Glided in the LOG
domain, one `pow` per op per block, because a glide is a constant number of
cents per second rather than of Hz. The modulation INDEX needs no correction at
all — in true phase modulation it is in cycles and already pitch-invariant,
which is the native path's fmDepth problem simply not existing here. The
band-limit table is deliberately NOT re-chosen mid-glide; for a sine, the usual
FM operator, there is only one harmonic anyway. Measured, 3-op chain, +12
legato, tapped at the node: peak 654.1 → 1305.5, **x1.996**.

**RING WORKS TOO.** It had been mapped to a modulator with zero depth, so it
neither summed nor modulated and the operator silently vanished. It is its own
mode now, same 1-amt+amt*mod as the native path. All six modes checked: add,
fm, ring and pm run in the worklet; sync and scan correctly decline to the
native path rather than breaking.

ONE TRAP WORTH REMEMBERING: the worklet's `g` params are MULTIPLIERS over the
level already baked into the cfg, so their resting value is 1. `oscRefresh`'s
amount block wrote the raw `op.amt` into them, which scaled every modulator to
0.4x and collapsed the index — and it looked exactly like a broken retune
(x0.5 instead of x2) while the retune itself was perfect. The shims carry
`fmw:true` and their built amount now, so a live amt edit becomes a ratio.
- **oscillator ops only** — samples, noise, scan, wavetable and hard sync all
  still take the native path, and the flag silently declines rather than
  breaking them.

**THE WORKLET OUTPUTS ONE CHANNEL, and that was the level difference.** The
native voice chain is MONO until the bus panner, and a StereoPanner attenuates
a mono input by 0.707 at centre while passing a stereo one straight through —
so a 2-channel worklet output made the phase engine sqrt(2) louder for no
musical reason. It showed up worst on a sine, which was 1.407x native while
every other wave sat at 0.97; the isolation test is what separated it, since
the worklet's raw sine matched a raw OscillatorNode at 0.9993. Now:

    sin 0.971 · tri 1.037 · saw 1.033 · sqr 0.996
    org 0.948 · bel 0.983 · vox 0.989 · mtl 0.989

all within 5%, and unison spread lines up too (native 0.668, phase 0.699).

**OP1'S RATIO AND FINE WERE FROZEN.** `baseTarget` already carries op0's `rat`
and `fine`, so the builder multiplying op0 by its fine AGAIN applied it twice,
and the live path stored a `_tgt` computed from the old ratio — which is
exactly "on op1 all params except level". The base is stored WITHOUT op0's
rat/fine now and both are re-derived from the current ops:

    op1 rat    moved 0.0005 -> 0.991   matches 0.003 -> 0.955
    op1 fine   moved 0.959  -> 0.959   matches 0.062 -> 0.9999

**UNISON IS NOT ONLY DETUNE** (2026-08-16). The phase path had the detune right
from the start — three nodes at 259.518 / 261.626 / 263.75 for sprd 14, exactly
±14 cents — but every one of them went straight into `merge`, dead centre and
sample-aligned, because the native path's other two unison nodes were missing:
a StereoPanner at `off × wide` and a Delay of `slop × |off|`. That is what "it
lost its unison spread" was; the pitches were never wrong.

    uni 3  native  side/mid 0.411      uni 1  native  0.006
    uni 3  phase   side/mid 0.476      uni 1  phase   0.000

And it tracks the DIAL — `wide` 0 / 0.5 / 1 gives native 0 / 0.330 / 0.695 and
phase 0.010 / 0.377 / 0.749; at wide 1 phase reads 0.840 against native's 0.639.

**BUT THE DIAL IS BUILD-TIME IN BOTH ENGINES**, and that is worth knowing before
chasing it again: turning `wide` under a SOUNDING note moves nothing in either,
measured 0 -> 0 on both. The panner is made when the note is. If width is
reported dead, the question to ask is whether a NEW note was played, and what
`uni` is — at uni 1 there is no unison to spread and both read mono.
**THE WAVES ARE THE ENGINE'S OWN NOW** (2026-08-16). Two of Gad's three
observations were the same mistake — approximating five waves inside the
worklet, so everything else silently became a sine, and capping the harmonic
count at 64 regardless of pitch:

  1. "basic waveforms sound low rez in lower octaves, fine in higher octaves" —
     the 64 cap. At 65Hz a saw wants ~305 harmonics and got 64, so everything
     above 4.2kHz was missing and it sounded like a low sample rate; at 1kHz,
     64 is already more than Nyquist allows, so high notes were right. Native
     had learned this exact lesson and says so in `harmonics()`: "a 24-harmonic
     saw tops out ~1.3kHz at 55Hz, which is what made low notes sound cheap."
  2. "vox, mtl etc sound like sin waves — lost their character" — those waves
     were ACCEPTED by the eligibility test and then rendered from a recipe that
     had no entry for them, so they came out as a single harmonic.

Both fixed by sending `E.harmonics(wav)` — the engine's own recipe, pulse width
folded in the way setWave does it — with the note, band-limited to Nyquist and
QUANTIZED TO A POWER OF TWO so the cache stays ~10 tables per wave rather than
one per pitch. Measured, plain carrier, native against phase:

    wave   low C2   high C5        wave   low C2   high C5
    sin     1.0000   0.9998        org     0.9997   0.9998
    tri     0.9997   0.9998        bel     0.9998   0.9998
    saw     0.9998   0.9997        vox     0.9998   0.9998
    sqr     0.9999   0.9998        mtl     0.9997   0.9998

  PULSE WIDTH was the same omission wearing a third hat. It is an operator's
  `pw`, nothing to do with unison width — which is what a whole round of
  measurement went looking for. The worklet ignored it entirely, so the dial did
  nothing in phase mode; folding it into the shared recipe fixed the new-note
  case, and `pwLive` needed a branch of its own because it looks for
  `setPeriodicWave` on `opNodes`, and a phase operator has neither.

    pw 0.5 vs 0.15, square    new note   native 0.9513   phase 0.9516
                              sounding   native 0.9467   phase 0.9446

  3. "wt sounds exactly the same between the 2 modes" — CORRECT AND BY DESIGN.
     Wave 14 is not in the eligibility test, so a patch containing one takes the
     NATIVE path entirely. It is identical because it IS native. Same for
     samples, noise, scan and hard sync.

### THE ORIGINAL SKETCH OF THE FIX, kept for the reasoning

Operators in an **AudioWorklet doing true phase accumulation** — real phase
modulation rather than frequency modulation of a wavetable oscillator. A phase
accumulator handles negative instantaneous frequency exactly right and never
switches tables mid-cycle, so a chain transposes properly. It also makes mode 4
honest: the current PM is FM scaled by the modulator's frequency (see the
builder comment) precisely because an OscillatorNode has no phase input.

COST, since Gad asked to be told: this is the one that eats CPU. Every operator
becomes per-sample JS instead of a native node — call it 5-10x the oscillator
cost, per voice per operator, and unison multiplies it. A 3-op patch at uni 3
is 9 accumulators per note. It is the correct answer and it is a real bill, so
it wants deciding rather than sneaking in.

## 0d. TWO REPORTS ON AN FM OPERATOR — one bug, one physics

Gad, 2026-08-16: env on op4's amp with op4 doing FM on op1, long attack — "the
fm rises in wavey steps like there is an lfo somewhere but there isn't". And:
"LFO on the same dest does nothing."

### THE LFO WAS A UNITS BUG, and it is fixed

**An operator's level is not 0..1.** An additive operator's gain is amt·0.9; an
FM operator's is amt·carrierHz·kIdx — **measured 6279** for one operator at
full level on middle C. Every modulator aimed at an operator used a flat
`A*0.5`, written for a 0..1 voice gain:

    depth applied      0.5
    gain's own base    6279
    depth as % of base 0.008%          <- which is nothing, exactly as reported

The envelope escaped this only because it is MULTIPLICATIVE (base·(1−w) → base)
and so scales itself. `opAmt` has carried every gain's own full-scale `sc` all
along, parallel to `opGains` and covering all five operator modes — it was
simply never used. Depth is `A·sc·0.5` now, via `_opA(idx)`, with a gain node
PER TARGET because sc differs per target. Same fix in `_modParam`, which
returned `range:1` for operator levels and now returns per-target `ranges`.

Measured on the carrier partial, 4Hz LFO on op4's amp:

    previous build   flat −50.7 dB, twelve identical samples, 0 peaks in 2s
    now              swings, 12 peaks in 2s

### THE "WAVEY STEPS" ARE BESSEL, NOT A MODULATOR

The control ramp is smooth — first differences across a 1.2s attack were 561,
546, 516, 577, 577, 546, 516, 577, 577, 546, 546, which is ±5% setTimeout
jitter on a straight line. Total RMS is flat too (~0.11), because FM
redistributes energy rather than changing power.

What moves is the CARRIER PARTIAL, whose amplitude is J₀(index) — and J₀
oscillates as the index grows. Sweeping the index 0 → 23 over the attack:

    carrier dips at index   6.83  8.69  9.96  12.98  16.12  19.25  22.39
    J₀ zeros below 24       2.40  5.52  8.65  11.79  14.93  18.07  21.21
    seven dips, seven zeros

So it is textbook FM, not a hidden modulator — every DX-shaped instrument does
it. If a SMOOTH swell is what is wanted, the index has to rise so that the ear
hears one sweep rather than seven nulls: a shorter attack, a lower top index,
or an exponential rather than linear rise. That is a feature request, not a
fix, and it is not done.

### STILL MISSING, confirmed by reading the branches

`vel`/`key`/`rnd` handle only dst 3 (filt) and dst 2 (pitch). `press`/`flw`
handle 3, 2 and 1. **Neither handles dst 5 (op) at all** — those routes are not
mis-scaled, they are absent. That is why the matrix reads op level DEAD for
every source but the envelope. Adding them is part of the unification in 0c,
not a separate job: they want the same `_opA` scaling this commit introduced.

Caveat on the numbers above: `AudioParam.value` never reflects a CONNECTED
input, only the intrinsic value — so the connected sources (lfo/vel/press)
read back as the bare dial and their motion has to be measured from rendered
audio, not from the param. That is a probe limitation, not a finding.

## What is next, in order

0. **MAGNETIZE THE SCOPE HOLDS — DONE.** A held nav scope is a complete little
   editor now, at any layer: the arrows and `-/=` belong to THAT scope for as
   long as the letter is down, and the channel strip follows as a VIEW when it
   happens to be open. The table is `mag` on each OPTRACK row —
     `-/=`  amount        (a route's depth · an effect's mix · absent on a
                           plain series filter, which says so and reads the
                           row back at you)
     `↑↓`   primary       (env: time · lfo: rate/div · flt: cutoff · fx: p1)
     `←→`   secondary     (env: attack · lfo: shape · flt: reso · fx: p2)
     letters  sub-fields  (env: a d s r)
   — and every cell may be a function of the slot, which is how a synced LFO
   dials divisions rather than Hz. `=` used to grow the family; the amount took
   it, so **a digit past the last instance makes another** (⌫ still removes).

   **THE ←→ QUESTION IS SETTLED: PINNED, NOT A WALK.** Both were built and
   played. Walking is the strip's own gesture and it is right when you are
   LOOKING at a list — but with the strip closed nothing on screen says where
   the cursor went, so every press needed the flash read back, and on env the
   walk put `dest` eight presses left of the primary: one ↑ there re-routed the
   whole envelope from amp to pan, in the dark. Pinned, the two pairs are two
   knobs and the letters cover the rest. Nothing is lost — the strip's own ←→
   still walks the list when no scope is held.
   Related and already done: `scopeStepped()` — n/i/sc/v/m arrows are notches;
   c and r still dial, in both senses (repeat runs AND the step is multiplied
   by key pressure).
   Left for later, deliberately: only `env` has a letters row. delay, reverb
   and the rest reach two dials and their mix from the scope, and the strip for
   everything else — add `keys` to a row when a third dial earns a letter.

1. **`center` IS DEAD — DONE.** The audit it asked for found exactly ONE
   non-zero `ctr` in 180 library entries (factory VEP9, lfo→cutoff, amt 25 /
   ctr 70), and it was folded rather than dropped: 678Hz → 7607Hz, which is the
   same place the LFO used to swing around. keytrack and random lost their
   second dial (`mag.sec`) — amount was always their whole control.
   ONE THING CENTER DID THAT NOTHING ELSE DOES: a pressure→amp route could
   start at SILENCE (ctr −100) so a note had to be pressed into existence. The
   resting point is full now and a negative amount presses DOWN from it. If the
   swell-from-nothing gesture is wanted back it needs its own home, not a
   second centre.
   Still open from that entry: **enter on a mod slot jumps to its destination**.
   Same gesture as `⌥\` stepping between automated knobs and taking you there.

2. **MONO CUE RELEASE THROUGH THE RACK.** The live keyboard path is momentary
   and measured so — with auto on and off, the cursor is gone within 150ms of
   the release. But `cueNote`'s mono branch (the path the ARP and the sequencer
   use) returns a sham handle whose `release()` sets a flag and touches no
   audio at all, so a cue fired through a play slot in mono never ends. Not
   fixed: in mono the moved cursor IS the loop carrier, so stopping it there
   can gap the loop, and the keyboard path only gets away with it by re-firing
   audPlay afterwards. Decide what the rack should do before changing it.

3. **THE ARP ON POLY + POSITION** — Gad still reports held keys playing nothing
   there. The twelve-cue jump had two causes (piano mapping 29e7608, channel
   transpose in slot space fac7260) and both are fixed; this is a third thing
   and it has never been diagnosed. Build the readout before touching code —
   log what `cueNote` receives from the ply delegation with poly + arp + keys
   on position, and compare against mono.

4. **Level across the size dial — PARTIALLY DONE (eddae35, d7abace).**
   Predicting it (window rms x 0.5 x sqrt(duty) x norm) took the worst case
   from 5.7x to ~3x; MEASURING it — an rms of the cloud against the take's own
   level, slewed into a compensation — did better again. Against a clean read
   of 0.318: 300ms 0.112 · 120ms 0.220 · 40ms 0.351. Long grains are still the
   quiet end. The measurement window is 24 samples strided through the take,
   which is a poor estimate of a slow-moving carrier; try integrating over a
   real span before adding more gain.

5. **Width as a stereo spread** rather than random placement per cursor.
   Whole notes are centred now (they keep the take's own stereo); grains
   still scatter, which is right for grains and wrong as a "width" control.

6. **More factory phrases** — `python3 tools/gen_samples.py <name>` re-rolls
   one, no args does the shelf. Prompts are the shelf; see the docstring for
   what to ask for (phrases, never one-shots).

## Things that will bite you

- **No backticks inside the worklet code strings.** They live in a template
  literal. A backtick in a comment breaks the whole page.
- **A long-lived browser tab lies.** After dozens of probes, panics and
  chokes it will report the cloud silent while the worklet insists grains
  are spawning — identically on HEAD and on your branch. Reload first.
- **Syntax checks pass on TDZ bugs.** `const` at line 11000 used at line 200
  parses fine and kills the keyboard at runtime. Exercise a keystroke.
- **`.value` IS NOT WHAT YOU SCHEDULED, AND IT IS NOT WHAT IS CONNECTED.** Two
  ways it lies, and the filter env fell for both. (1) A param written only with
  `setValueAtTime(v, at)` reads back as the node's FACTORY DEFAULT until `at`
  arrives — 350Hz on a biquad, 440Hz on an oscillator — and `at` is always in
  the future. Write `.value` as well as scheduling if anything will read it.
  (2) `.value` never includes a CONNECTED input; an LFO or constant source
  feeding `detune` moves the sound and not the number. Reading a modulated
  param and getting the bare dial back does not mean the mod is dead.
- **`$B eval` only wraps your file in an async IIFE if it contains a top-level
  `await`.** Without one you get `SyntaxError: Illegal return statement` and no
  hint why. `await Promise.resolve();` at the top is enough.
- **The headless browse tab can have a dead audio clock.** `AC.state` says
  `running` while `currentTime` never leaves `baseLatency`, so every scheduled
  automation reads flat at its intrinsic value and a working build looks
  broken. Check `currentTime` actually advances before believing a flat trace.
  Measurements that read state synchronously (what base did the ctor use)
  survive this; anything that needs the graph to RENDER does not.
- **`adjust()` wants a NUMBER as its multiplier.** `audAction(1,{})` in a probe
  writes NaN into the param, `audLive` posts the NaN to the worklet, and the
  channel outputs NaN from then on — silent, and no reload of your reasoning
  will fix it. If a bus reads NaN mid-session, reload before diagnosing.
- **YOUR TEST TAB RECEIVES GAD'S REAL KEYSTROKES.** The browse window is headed
  and focused, so anything he types lands in whatever tab is fronted — including
  the one you are measuring in. State moves under a probe mid-run (curPreset
  went 7 → 3 → 2 during one measurement and produced a bug that did not exist).
  Pin the state immediately before each measurement, or swallow trusted key
  events in the test tab — and if you do that, CLOSE that tab the moment you are
  done, because it also swallows his.
- **Never close the last tab.** `closetab` on all-but-one is a loop that eats his
  window when the ids have moved. Check `tabs` first and leave one alive.
- **`npx serve` caches.** A reload can come back with the previous file. Load
  with `?cb=$RANDOM` and check a distinctive token from your edit is in the page
  before believing a measurement.
- **`serve.json` TAKES NO KEYS SERVE DOES NOT KNOW — not even `$schema`.** It
  validates the file against its own schema and exits code 1 on an unknown
  property, so a comment or an editor hint in there does not degrade, it stops
  the dev server booting: `must NOT have additional properties`. The `$schema`
  line that shipped with the no-store header did exactly that (serve 14.2.6).
- **Measure, do not model.** Every real bug this week was found by asking
  the running engine what its state was: audPlay's arguments logged from
  both builds, cursor positions sampled over time, the seven-case matrix
  A/B'd against the previous commit served side by side at /head-check.

## The measurement kit

`tools/stamp.sh` writes the build string; the `build` settings row fetches
the served copy to compare.

**`tools/probe.sh <name> [k=v …] [--ab <url>]`** is the analyser, written once
instead of hand-typed into the browser every session. `tools/probe.js` is the
library it runs inside the page; the wrapper carries the arguments in, prints a
table, and with `--ab` runs the IDENTICAL script against a second build and
prints the delta — which is how "measure against the previous build" stops
being a rule you remember and starts being one keystroke.

    tools/probe.sh help
    tools/probe.sh preset names=SNR,S909,S808,S606 note=48   # peak Hz + centroid
    tools/probe.sh matrix ch=8                               # the regression net
    tools/probe.sh cursor chs=9                              # tv / g / tpos
    tools/probe.sh key code=KeyC ctrl=1                      # is this binding free?
    tools/probe.sh matrix --ab https://gadbaruch.github.io/Ten/

Every probe pins curPreset/editSnd/layer immediately before measuring and
swallows TRUSTED key events for the length of the run, removing the listener in
a finally — so Gad's typing cannot walk the state mid-probe and the tab is his
again the moment it returns. No probe ever closes a tab.

The seven-case matrix (plain, sync +12, free +7, channel select, hard pan,
crop, rate 0.5) plus four cue jumps is the regression net for anything touching
the engine — `tools/probe.sh matrix --ab <the previous build>`, not remembered
numbers. It controls what it measures: position keys, loop on, **poly** (a cue
jump SPAWNS a cursor, and in mono cueNote moves a head that is not there, so
all four cue rows read silence), and the cloud parked at size 1 so the rows are
repeatable to ~1% instead of swinging 40% on grain randomness. `grains=1`
measures the cloud too, and accepts the noise.

To A/B against an old commit, extract it somewhere the dev server already
reaches and open it on a DIFFERENT HOSTNAME — `127.0.0.1` against `localhost`
— or it shares localStorage with the current build and its stored library
shadows its own factory presets, which is the LIBV trap wearing a second hat.
