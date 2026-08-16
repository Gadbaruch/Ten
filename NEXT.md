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

## 0e. WHAT `amt 100` MEANS — the table the unification has to agree on

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
