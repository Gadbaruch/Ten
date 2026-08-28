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
— vel is 3, key is 4, **press is 6**.

### What Gad specified

    kicks     less bassy AND less bright at low vel
    snares    less bright, shorter, a bit pitched down at low vel
    pads/keys a lot of modulation and movement around PRESS, then vel
    plucks    vel shapes timbre and frequency response;
              press adds an audio-effect dimension
    keys      volume and colour spread across the keyboard so high notes
              do not bite

### Reachable today

    less bassy at low vel     vel -> op level (dst 5) on the sub/body op
    less bright at low vel    vel -> filt cutoff (dst 3)          already in genSpice
    pitched down at low vel   vel -> pitch (dst 2), small amount
    colour spread             key -> filt (dst 3)                 already in genSpice
    high notes do not bite    key -> amp (dst 1), NEGATIVE amount  never used
    press dimension           press -> filt / op level / fx mix    never used

⚠ **`press` (src 6) appears NOWHERE in the generator.** The engine supports it
fully — `Voice.setPressure`, and `src===6` is treated as a LIVE source that
keeps moving — so it is an entire expressive axis that has never been rolled.

### BLOCKED, and these are the prerequisites

**B1 — "shorter at low vel" is not reachable.** No mod route can target an
envelope TIME. `learnTarget` reaches flt (freq/q/gn), osc (amt/pitch) and mix;
nothing addresses env `a/d/s/r`. Until env times are mod targets, the nearest
honest approximation is vel -> filter with a fast filter envelope, which
shortens the BRIGHT part and not the note.

**B2 — press does nothing on Gad's own keyboard.** It is fed only by MIDI
aftertouch: `0xA0` poly and `0xD0` channel. Speccing a heavy press layer today
produces presets whose expressive half is silent unless a MIDI controller with
aftertouch is plugged in.

**But the fix is close and it is worth doing before this layer ships.** TEN
already reads live analog key depth off the FUN60 — `HE.pressure()`, `HE.keys`
is `keyId -> stroke state`, used today for the arrow-as-dial. **`HE.keys` is
PER-KEY, so wiring it into `Voice.setPressure` gives POLY pressure from the
computer keyboard itself.** That single wire is what makes the whole press half
of this layer real, and it fits the north star: playable without a screen.

### Build order for this layer

    1  wire HE.keys -> setPressure          unblocks B2, makes press real
    2  env times as mod targets             unblocks B1, "shorter at low vel"
    3  dynamics as a REQUIRED layer         per-family tables above, always on
    4  re-run archlvl and genqual           a new always-on layer moves both

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
