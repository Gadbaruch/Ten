# SOUND.md — how TEN generates sound, and the rules it generates by

`NEXT.md` is the state and `CLAUDE.md` is the rules of working. **This file is
the model behind the roll**: what an archetype is, what may vary, what may not,
and what is not reachable yet. Gad asked for it 2026-08-29 — *"add this to your
generative sound doc if you have one - if not maybe you should? so you can keep
track?"*

Every claim here is marked **MEASURED** (a probe produced the number),
**DESIGNED** (reasoned, built, not yet measured) or **BLOCKED** (cannot be
built until something else exists).

---

## 1. THE PRINCIPLE ABOVE ALL THE OTHERS

> **"your generator should be able to do ANYTHING that a user can do in the ch
> racks bro."** — Gad, 2026-08-29

The target is **coverage**: every expressive move the racks allow should be
reachable by some roll. When a roll cannot make a sound, the honest sentence is
"the archetype table does not reach there", never "the generator cannot do it".

Known gaps, all four seen in ONE patch of Gad's and none reachable today:
a sub-octave FM modulator (the table's only go up, and inharmonic) · a bandpass
past the 6th harmonic · an LFO on the filter in `keys` at all · two modulators
stacked on one cutoff.

## 2. WHAT AN ARCHETYPE IS  (Gad's model, 2026-08-28)

> An instrument archetype is a **dominant frequency spread + register** — its
> position in the frequency-range orchestration — **plus its time/shape
> response**, the pluck-vs-pad difference. Those two are RESTRICTED, each with
> a safe range. **Timbre, movement and effects are the free variation space.**

This replaced my "one correlated point across five layers", which kept
coherence but had no principled account of what may VARY.

**MEASURED — the evidence it is the right split: both failures this generator
has ever had were on the restricted axes.** The 3/8 clean rate on lead/pad/plk
was a highpass at 2175Hz on a 131Hz note — frequency position. The 4.3x level
spread that forced the TRIM table — register. Neither failure was ever in
timbre, movement or effects.

**Envelopes split across the line by DESTINATION:**

    dst 1 amp · dst 3 filter        the time/shape response   RESTRICTED
    dst 2 pitch · dst 4 op level    movement                  FREE

⚠ **dst 4 is OP LEVEL. There is no pan env.** `ENV2MD={1:1,2:2,3:3,4:5}` and
the engine's `opEnvs` filter (`dst===4`) both say op. The generator's own
header said "4 pan" until 2026-08-28 and no generator code has ever written a
dst-4 env, so the wrong line never cost a note — it was waiting to.

**CAVEAT: on DRUMS the pitch env is archetype, not movement** — the pitch drop
IS the kick. Restricted is dst 1+3 tonal, dst 1+2+3 drums.

## 3. NOT EVERY COMBINATION IS LEGAL  (Gad, 2026-08-29)

> **"a plucky pad - shouldnt exist for example, these are rules we can build as
> we go."**

The free axes are free **subject to rules written down as they come up**. This
list grows one entry at a time and each entry names who called it.

    R1  a pad may not take a pluck curve.                   Gad, 2026-08-29

## 4. THE ROLL, AS IT STANDS

1. **Category first** — never "a sound", always "a `bass`". 20 categories, 8 drums.
2. **Drums and tonal split entirely.** A drum roll reaches the 250-hit shelf about
   half the time (pure / layered / mangled); no modelling gets you a LinnDrum.
3. **Archetypes, not dials.** 30 of them. Each lays wave + ops + envelope +
   filter TOGETHER. Rolling those independently is what measured 3/8.
4. **Wildness is 4 stepped rungs, not a slope** — canonical / any archetype /
   + character / borrow from a neighbour — with a gradient inside each rung.
5. **Filters are placed as a MULTIPLE of the sounding fundamental**, never
   absolute Hz. LP above it, HP below it, BP on the body.
6. **MEASURED, never reasoned: level.** `TRIM` is 30 numbers from
   `probe.sh archlvl`, target peak 0.20. Re-run it after touching an archetype.
7. **Atonal lives only in `fx`.** Rung 3 gets unusual, not unpitched.
8. `_gen` records rung/archetype/borrowed-from and is stripped before saving.

## 5. THE EXPRESSIVE DYNAMICS LAYER  (Gad, 2026-08-29 — NOT YET BUILT)

> **"IMPORTANT to have an expressive dynamics layer - setting up mods like
> velocity, press, and keyboard to make each roll sound expressive alive and
> fun to play."**

**The structural change: this is a REQUIRED LAYER, not spice.** `genSpice`
already adds vel->filt and key->filt, but behind `P(0.4)`/`P(0.5)` — so a large
share of rolls get no dynamics at all. Expressivity cannot be a coin flip.

**Sources.** `MSRC=['off','env','lfo','vel','key','rnd','press','flw','macro']`
— vel is 3, key is 4, **press is 6**. All three work. None of the three is
used to anything like its reach, and press is not used at all.

### What Gad specified

    kicks     less bassy AND less bright at low vel
    snares    less bright, shorter, a bit pitched down at low vel
    pads/keys a lot of modulation and movement around PRESS, then vel
    plucks    vel shapes timbre and frequency response;
              press adds an audio-effect dimension
    keys      volume and colour spread across the keyboard so high notes
              do not bite

### Reachable today — and BOTH earlier "BLOCKED" calls were WRONG

**MEASURED.** Two things this file called blocked on 2026-08-29 were already
built. Gad pushed back on one of them (*"sure it is... easy peasy"*) and he was
right; the other I got wrong by grepping for the MIDI opcodes and stopping.

    less bassy at low vel     vel -> op level (dst 5) on the sub/body op
    less bright at low vel    vel -> filt cutoff (dst 3)     already in genSpice
    pitched down at low vel   vel -> pitch (dst 2), small
    colour spread             key -> filt (dst 3)            already in genSpice
    high notes do not bite    key -> amp (dst 1), NEGATIVE   never used
    press dimension           press -> anything              WIRED, never used
    shorter at low vel        vel -> mod[n].d or .tmul       addressable, see below

**THE PRESS WIRE ALREADY EXISTS.** `EXP.keyPress(code,x)` calls
`v.setPressure(x)` on the live voice, and the hall-effect sample handler
already calls it with per-key travel — so per-key analog depth reaches the
`press` mod source with no MIDI controller at all. **MEASURED**, without the
board, `tools/probe.sh press ch=4 amt=90` — a press route onto flt[0].frq:

      press 0.00   param 0
      press 0.50   param 1928.6
      press 1.00   param 3875.2      pressN 1 — the route claimed a real param

⚠ What is actually missing is that **`src:6` appears NOWHERE in the
generator.** The axis is built, tested and unused. Untested on hardware — Gad
QAs on the FUN60.

**ENV TIMES ARE ADDRESSABLE.** `destList` offers `mod[n].tmul`, `.a`, `.d`,
`.s`, `.r`, `.crv` — **MEASURED**: 39 destinations on a plain preset, and a
route aimed at `mod[0].tmul` returns `resolveDest ... 1`.

⚠ **But they are a `'next'` kind destination**, and the engine says so in its
own words at the classifier: *"These have no node to write and no value to ramp
— they are read once, when a note starts... the change lands on the next note
you play."* For an LFO or a macro that is right. **For VELOCITY it is off by
one**: a vel -> decay route shapes the note AFTER the one whose velocity set it.

    THE FIX, and it is small: a note-scoped source (vel, key) is KNOWN AT
    NOTE-ON. For 'next' destinations those two should be evaluated for THIS
    note rather than parked for the following one. Everything else about the
    mechanism already works.

**NOT MEASURED, and the probe is not yet trustworthy.** `tools/probe.sh
veldecay` reads ~2000ms at every velocity on an envelope whose decay is 486ms
with sustain 0 — the note is not decaying inside the window even with fx and
amp zeroed, so the harness is wrong before the question is. Do not read its
numbers as evidence either way until that is found.

### Build order for this layer

    1  fix vel/key on 'next' destinations   evaluate at note-on, not parked
    2  fix the veldecay probe               it cannot currently prove step 1
    3  dynamics as a REQUIRED layer         per-family tables above, always on
    4  roll press into the layer            src=6 is built and unused
    5  re-run archlvl and genqual           a new always-on layer moves both

## 6. THE SHELF IS CONTEXT-FREE, THE ROLL IS NOT  (Gad, 2026-08-28)

> **"factory presets from the shelf should not have the context dependant thing
> of the rolls, they should all just be great sounds within their archetypes."**

Context-aware rolls make generation ORDER-DEPENDENT. Because the shelf is
categorically context-free, `libInit` is never in context and stays
reproducible — a principle, not a workaround.

A context-aware roll reads the desk and intervenes on the RESTRICTED axes only:
"a bass already exists" touches frequency position; "the set is full" touches
effects and width. **DESIGNED, not built.** Derive the desk profile from the
PATCHES, never by measuring live audio — rolls must stay instant and
deterministic, the same deal `archlvl` already made.

## 6b. WHAT GAD'S OWN PRESETS REACH THAT NO ROLL DOES

The coverage principle in section 1 is abstract until a real patch of his is
measured against the archetype table. **BES1** (keys, shelved 2026-08-29,
`GIVEN()`) does five things the generator has never once produced:

    osc mode 3, SYNC             the table only ever writes add and fm
    flt typ 8 FORMANT            rolls use lp / hp / bp, nothing else
    flt typ 11 TRIPLE            same
    an LFO on a filter's SPREAD  rolls modulate frequency, never spread
    KEY -> filter freq at 200    hard tracking as a deliberate voice
    ONE modulator, TWO routes    flt freq AND vox wide from one LFO

Every one is reachable in the racks and unreachable by a roll — which is the
gap, stated as a list rather than as a principle. The last one is structural:
`genSpice` gives a modulator a second route only for an LFO's pan drift, so
"one source, two destinations" is essentially unexplored.

## 7. HOW A PRESET GETS SHELVED

cmd+C on the channel puts the patch on the system clipboard as JSON; paste it
with **one line of intent in Gad's words** ("the 808 that cuts through a busy
mix"). Category does not carry intent and reconstructing it later is the
expensive part.

**Learning happens in a BATCH, not per paste.** An archetype is a shape plus
RANGES; ranges need n>1. One patch gives a copy, six give the invariant.

`libInit`'s `while(i<10)` is a FLOOR FOR DICE, not a cap — hand-written presets
past ten simply mean fewer rolled ones. Today: 21 hand-written against ~170
rolled. **The roll does not read the library**; the two are connected only by a
human reading one and writing the other.
