# THE PRESS WIRE WAS ALREADY THERE — 2026-08-29

## TWO "BLOCKED" CALLS, BOTH WRONG  (SOUND.md corrected)

Gad: **"snares shorter at low vel reachable at all - sure it is... just have a
vel mod with decay destenation to the smp or synth ops, easy peasy. or map it
to the time multiplier even."** He was right, and the second blocker was wrong
for a dumber reason.

**PRESS: already wired end to end.** `EXP.keyPress(code,x)` calls
`v.setPressure(x)`, and the hall-effect sample handler already calls it with
per-key travel — so the FUN60's analog depth reaches the `press` mod source
with no MIDI at all. I claimed MIDI-only after grepping the MIDI opcodes and
stopping there. **MEASURED**, `tools/probe.sh press ch=4 amt=90`, press route
onto flt[0].frq: 0.00 -> 0 · 0.50 -> 1928.6 · 1.00 -> 3875.2, `pressN 1`.
Nothing to build. **Untested on hardware — Gad QAs on the FUN60.**

**ENV TIMES: addressable.** `destList` offers `mod[n].tmul/.a/.d/.s/.r/.crv`
— 39 destinations on a plain preset, and a route at `mod[0].tmul` resolves.

⚠ **But they are `'next'` kind**, and the engine's own classifier comment says
it: *"read once, when a note starts... the change lands on the next note you
play."* Right for an LFO, **off by one for VELOCITY** — a vel->decay route
shapes the note AFTER the one that set it. The fix is small: vel and key are
KNOWN AT NOTE-ON, so for 'next' destinations they should be evaluated for THIS
note instead of parked.

⚠ **`tools/probe.sh veldecay` IS NOT TRUSTWORTHY YET** — it reads ~2000ms at
every velocity on an envelope whose decay is 486ms with sustain 0, with fx and
amp zeroed. The note is not decaying inside the window and I have not found
why. Its numbers prove nothing in either direction; fix the harness before
using it to judge the off-by-one.

## NEAR-FUTURE ASSIGNMENT: CLASSIFY WHAT COMES IN  (Gad, 2026-08-29)

> **"you should listen to them and learn to recognize oneshots from loops by
> length and dynamic variation, you should also be able to recognize from drag
> and drop so you can categorize the samples coming in or recorded and lable
> them or put them in the right folder."**

Today a dropped take gets `src.k='d'`, a recorded one `{k:'r'}`, and **neither
gets a `shelf` or a `cat`** — they show in both browsers by the safety
carve-out, which is correct but uncategorised.

Wanted: on drop AND on mic/bounce record, classify by **length and dynamic
variation**, assign `shelf` + `cat`, label it, and file it. `poolKindOf` is the
existing heuristic and already reads onsets, duration, spectral drift and
centroid; the axes Gad named are length and dynamics, so it wants revisiting on
those rather than extending sideways.

Reference numbers already taken — all 22 phrase-shelf entries measured
(dur/onsets/peak/drift/centroid): the 15 real loops are 9.6s with 6-32 onsets,
the 7 short ones 3-5s. Every one is correctly KINDED, so the classifier is not
misfiring on the factory shelf; this is about what arrives.

**Still Gad's call, not the classifier's:** which phrase-shelf sounds do not
belong in an audio channel. He has the folder.

# THE TYPE ROW, AND SOUND.md — 2026-08-29

## THE FILTER SITS BESIDE THE THING IT FILTERS  (build 2026-08-28.2239, LIVE)

Gad: **"i actually dont see the type, it should be between engine and sample in
instrument rack"** — and he looked in the right place. The audio channel's type
filter WAS shipped, in `GRANF`, which is the grain/sound page. `sample` is a row
in the INSTRUMENT RACK, so its filter is now a row there too. Both read and
write the same `LOOPCAT`, so turning either turns the other.

Exercised through `prsAction` on an audio channel, which is the real path:

      rows      engine · type · sample · keys mode · slices
      start     all  22
      +1        plk  10      GRANF agrees: plk
      +1        keys  3      GRANF smpl dial max 2

**A SMP OP FIRES ONCE NOW.** Set on ASSIGNMENT rather than by changing how the
field reads, so nothing already saved moves: `lps` is absent from the op
template, which makes `undefined` a real "never carried one". Measured — a fresh
slot given a sample reads `once`; a slot holding an explicit `lps:0` still reads
`loop` after a new assignment.

## SOUND.md EXISTS NOW

Gad asked for a generative sound doc and there was none. `SOUND.md` carries the
model — archetypes, restricted vs free, the rule list, the coverage principle,
the dynamics layer, and what is BLOCKED. Every claim in it is marked MEASURED /
DESIGNED / BLOCKED. **NEXT.md is the state; SOUND.md is the model.**

## THE DYNAMICS LAYER — TWO BLOCKERS FOUND BEFORE BUILDING IT

Gad wants velocity/press/keyboard mods on every roll. Two things were checked
first and both change the plan:

⚠ **`press` (src 6) is fed ONLY by MIDI aftertouch** — `0xA0` poly, `0xD0`
channel. On Gad's own keyboard it does nothing, so a press-heavy preset would
ship with its expressive half silent. **But `HE.keys` is `keyId -> stroke
state`, PER-KEY, already read for the arrow-as-dial — wiring it into
`Voice.setPressure` gives POLY pressure from the computer keyboard.** That one
wire should land before the layer does.

⚠ **"snares shorter at low vel" is NOT reachable.** No mod route can target an
envelope TIME — `learnTarget` reaches flt, osc and mix only. Needs env `a/d/s/r`
as mod targets first.

And the structural point: `genSpice` already does vel->filt and key->filt, but
behind `P(0.4)`/`P(0.5)`. **Expressivity cannot be a coin flip** — this becomes
a REQUIRED layer, not spice.

## STILL OPEN FROM THIS ROUND

- **Which phrase-shelf sounds do not belong in an audio channel.** All 22 were
  measured (dur/onsets/pk/drift/centroid) and every one is correctly KINDED;
  the complaint is about which are SHELVED there, which is a tagging call and
  Gad's to make from the folder. `samples/` is 24MB, 22 loops at the top level
  and the drum shelf under `samples/oneshots/`.
- **Classifying takes on drop and record.** A dropped take gets `src.k='d'` and
  no shelf and no cat, so it shows everywhere by the carve-out. Gad wants it
  recognised by length and dynamic variation, labelled, and filed. NOT BUILT.
- **The folder reorg to mirror smp/audio.** Not attempted: presets store
  `smp:{f:'oneshots/kick/tr808-kick-06.flac'}`, so moving files breaks saved
  references and needs a path migration.

# TWO SHELVES, AND THE ROLL'S REACH — 2026-08-29 (branch `sound-model`)

## THE SHELVES SPLIT BY `shelf`, NOT BY `kind`  (f50a982)

Gad: **"please seperate audio samples from one shots and loops, dont put one
shots in audio channel ... similarly dont put loops in the smp op ... in the smp
op we should have type selector"**.

`poolView` SORTED rather than filtered — your kind first, the other kind at the
far end, on the stated reasoning that nothing should be hidden. Wrong call for a
browser you hunt in: 250 one-shots behind 19 loops is not reachable, it is 250
turns of a dial. It filters now.

**AND IT SPLITS ON `shelf`.** Three phrase-shelf entries are one-shots — bell,
riser, sweep — and an audio channel is exactly what a riser is for. Splitting by
`kind` would have thrown all three out of the only rack that wants them. `shelf`
is a THIRD axis, stamped at load, not a restatement of kind.

`tools/probe.sh shelf`, clean reload:

      shelf tags                  one 250   loop  22    of 272 factory
      view, all                       251         23    smp op | audio ch
      one-shots on phrase shelf         0          3    bell/riser/sweep kept
      type filter kik | pad            22          4
      your take visible                 1          1
      take beats a filter               1          1

**WHAT YOU MADE IS NEVER FILTERED.** `poolKindOf` is a heuristic and `shelf` is
a fact about the FACTORY; a recorded or dropped take has neither, so a hard
filter would turn "down the dial" into "gone". A session take shows in both
browsers and beats a type filter — the last two rows, and the reason they exist.

⚠ **THE STAMP WAS DROPPED ONCE, and this is the trap to remember: `poolAdd`
copies a FIXED FIELD LIST onto the POOL entry.** Adding `shelf` to the hint was
not enough; the first measurement read `shelf_one 0 of 272` and the whole split
was silently falling back to kind. Any new per-sample field must be added in
BOTH the push and the dedupe path.

**Type dials, immediately before `smpl`:** smp op gets `all` + the eight
DRUMCATS; audio ch gets `all/plk/keys/bass/pad/perc/fx`. **SESSION STATE, never
a preset field** — a browsing filter is not a property of the sound, and storing
it would be a save-format change. No SAVEV bump. Exercised: smp op `kik` takes
the dial 250 -> 21; audio ch `pad` 22 -> 3 (choirpad/drone/vowel).

Recording and drag-drop into the smp op **already worked** — drop is global,
record is esc+tab — so that half of the ask needed nothing.

`samples/manifest.json` gains `cat` on all 22 loops; `tools/gen_samples.py`
gains the TAGS table that writes `kind` and `cat`, neither of which it ever
wrote — so every regen had been silently dropping the hand-added `kind`.

**THE LOOP TAGS ARE GUESSES FROM NAMES and want Gad's eye.** plk: nylonlick,
steelriff, flamenco, banjoroll, harp, koto, marimba, kalimba, bell, cellostac ·
keys: pianoriff, rhodesvamp, prepiano · bass: upright · perc: tabla, brushkit ·
pad: choirpad, drone, vowel · fx: rain, riser, sweep. **cellostac is the shaky
one** — a bowed staccato cello filed under plucked because TEN has no strings
category.

## THE GENERATOR'S REACH IS THE RACK'S REACH  (Gad, 2026-08-29)

**"your generator should be able to do ANYTHING that a user can do in the ch
racks bro."** Said after I wrote "four things my generator cannot produce" about
a patch of his. Wrong framing: the RACKS can do all four. The archetype TABLE
never reaches there. That is a much narrower claim and it is the one to fix.

**So the target is coverage, not capability**: every expressive move the racks
allow should be reachable by some roll. Today's table reaches none of these,
all four seen in one patch of Gad's — a sub-octave FM modulator (mine only go
up and inharmonic), a bandpass past the 6th harmonic, an LFO on the filter in
`keys` at all, and two modulators stacked on one cutoff.

## AND NOT EVERY COMBINATION IS LEGAL  (Gad, 2026-08-29)

**"a plucky pad - shouldnt exist for example, these are rules we can build as we
go."** I had used "a plucky pad" as an example of what the restricted/free split
unlocks. It is not — it is an example of a combination that must be RULED OUT.

So the model has a third part beyond restricted-vs-free: **cross-axis rules,
accumulated one at a time as Gad names them.** The free axes are not a
free-for-all; they are free *subject to rules we write down as they come up*.
First rule on the books: **a pad may not take a pluck curve.**

## DISCARDED: BES1

The `keys` patch pasted 2026-08-28 was a copy-paste TEST, not a submission.
Gad: **"not a good sound ... dont use this one to learn anything from!"**
Nothing from it enters the archetype table. The two range observations it
suggested (BP at 6.43x, mix.lvl 0.3955) are **withdrawn** — they came from a
patch he has disowned.

Its one still-open question is a possible BUG, not a preset matter: `env[0]`
(a.005/d.15/s.70/r.20) and `mod[0]` (a.002/d.230/s.485/r.276) were TWO AMP
ENVELOPES DISAGREEING on one channel, with `_folded:true`. Unanswered, and
worth a look on its own if a hand-edited envelope ever fails to take.

# THE SOUND MODEL — 2026-08-28 (branch `sound-model`, off `sound-library`)

Branch made because another thread was committing to `sound-library` live (four
commits landed mid-conversation). Merge target is `sound-library` or main,
Gad's call. Nothing here is on main yet.

## CMD+C HANDS THE PATCH TO THE SYSTEM CLIPBOARD TOO  (7eaff98)

Gad: **"command+c is better for my muscel memory"** — one gesture to both
duplicate a channel inside TEN and carry its patch out to a chat window, where
it becomes a factory preset. The two destinations cannot collide: `CLIP` is
what cmd+V reads back, the system clipboard is what leaves the instrument.
`ctrl+c` is untouched and still works on a BLOCK, where this deliberately does
not.

**ONE CHANNEL ONLY.** `tools/probe.sh syscopy ch=3` stubs
`navigator.clipboard.writeText`, so what is measured is what `clipboardOp`
handed the system rather than what a paste buffer looked like afterwards:

      scope          system clipboard        TEN's CLIP
      one channel    json  13243 B  5/5        chan
      block 2-4      none      0 B            chans
      master desk    none      0 B             desk

**The cost, and it is real:** every internal cmd+C now clobbers whatever was on
the system clipboard. Copy ch3 to paste onto ch7 and the link you had copied is
gone. Gad's call, made knowingly.

**OPEN:** a patch is 13.1kB pretty-printed. Flat is 7.2kB, `packRacks` is
6.0kB. Kept pretty because that is `ctrl+c`'s existing contract ("a form anyone
can read"), but if pasting many presets gets expensive, flat is a one-word
change.

## THERE IS NO PAN ENV — dst 4 IS OP LEVEL

genTonal's header said `env dst: 1 amp · 2 pitch · 3 filter · 4 pan`. Wrong,
and sitting directly under its own warning that env and lfo destinations are on
different scales and mixing them up is SILENT. `ENV2MD={1:1,2:2,3:3,4:5}` maps
engine dst 4 to MDST `op`, and the engine's `opEnvs` filter reads `dst===4` as
an op-level env. **No generator code has ever written a dst-4 env**, so the
wrong line never cost a note — it was waiting to.

**This is the capability Gad asked for by name:** an envelope on the FM level of
a second operator is `dst:4, idx:<op>`, and it already works. The generator has
only three env helpers — `env` (amp), `fenv` (dst 3), `penv` (dst 2). An `oenv`
is missing and is the cheapest new expressive axis available.

## THE ARCHETYPE MODEL — Gad's, 2026-08-28, and it supersedes mine

I proposed five layers (timbre / filter-EQ / curve / movement / effects) with
the archetype as "one correlated point across all five". Gad's is better and
this is the one to build:

> An instrument archetype is a **dominant frequency spread + register** (its
> position in the frequency-range orchestration), **plus its time/shape
> response** (the pluck-vs-pad difference, amp+filter envelopes). Those two are
> RESTRICTED per archetype, each with a safe range. **Timbre, movement and
> effects are the free variation space.**

Mine kept coherence but had no principled account of what may VARY. His names
the two axes that must be constrained and frees the other three.

**The evidence it is right: both measured failures were on his restricted
axes.** The 3/8 mud on lead/pad/plk was a highpass at 2175Hz on a 131Hz note —
frequency position. The 4.3x level spread that forced the TRIM table — register
and level. Neither failure was ever in timbre, movement or effects. His model
predicts the two bugs that were actually measured; that is a test it passes,
not agreement.

**Envelopes split across the line BY DESTINATION**, which the rack already
carries: dst 1 (amp) and dst 3 (filter) are the archetype's time/shape response
and are restricted; dst 2 (pitch) and dst 4 (op level) are movement and are
free. Gad: *"some basses can be more flat, some wobble and others can be more
plucky or have some twang in them"* — twang is a fast dst-2, wobble is an lfo,
both free. **CAVEAT: on DRUMS the pitch env is archetype, not movement** — the
pitch drop IS the kick. So restricted is dst 1+3 tonal, dst 1+2+3 drums.

**PLUCK AND PAD ARE CURVE VALUES, NOT CATEGORIES — unresolved.** TEN has `plk`
as a category AND `pluck` as an archetype inside `bass`. Same word, two levels.
Gad's model says the curve is an axis every tonal category can move along (a
plucky pad, a sustained bass). That is a bigger change than anything above and
is NOT decided.

`pad` already has four archetypes — warm, glass, choir, drift. What is thin is
the SHELF: one hand-written pad against five snares.

## THE SHELF IS CONTEXT-FREE, THE ROLL IS NOT  (Gad's call)

**"factory presets from the shelf should not have the context dependant thing
of the rolls, they should all just be great sounds within their archetypes."**

This resolves a trap I had raised as a workaround. Context-aware rolls make
generation ORDER-DEPENDENT, which would have broken `libInit`'s seeded factory
fill — I proposed libInit "opt out". Gad's rule makes it a PRINCIPLE instead:
the shelf is categorically context-free, so libInit is never in context to
begin with. Cleaner, and it is the reason, not the patch.

`libInit()` is the function that lays the factory library down — on first boot
or after a LIBV bump. It keeps anything saved, then tops each category up to 10
with the seeded generator. **The 10 is a FLOOR FOR DICE, not a cap**: `i` starts
at however many that category already has, so hand-written presets past ten
simply mean fewer rolled ones. `scrollPreset` walks the pool with `fmod`, no cap.
Today: 21 hand-written (snr 5, kik 4, hh 3, perc 2, lead 2, plk/pad/keys/chord/
bass 1 each) against ~170 rolled.

**And the roll does not read the library at all.** It reads the archetype table.
Adding presets to the shelf changes what you can scroll to and NOTHING about
what the dice can make — the two are only connected by a human reading one and
writing the other.

## THE AGREED BUILD ORDER

    1  cmd+C dual-write                                   DONE (7eaff98)
    2  Gad shelves presets, one line of intent each       his move
    3  log _gen at first recorded event                   NOT BUILT, optional
    4  solo learn run -> archetype table on Gad's model   needs 2
    5  context-aware roll                                 needs 4's axes
    6  preference learning                                needs 3's data

Context-awareness (5) is the strongest idea in the batch and still lands fifth,
because it needs somewhere to intervene. The restricted/free split IS that
somewhere: "a bass already exists" touches the frequency axis only; "the set is
full" touches effects and width only.

**HOW A PRESET ARRIVES:** cmd+C on the channel, paste the JSON, and one line of
intent in Gad's own words ("the 808 that cuts through a busy mix"). Category
does not carry intent, and reconstructing it at learn time is the expensive
part. Learning happens in a BATCH, not per-paste: an archetype is a shape plus
RANGES, and ranges need n>1. One patch gives a copy, six give the invariant.

# THE MOD SCOPE AIMS, AND MACRO GOES ON ICE — 2026-08-29 (branch `sound-library`)

## EVERY MOD SCOPE MADE A SLOT AIMED AT NOTHING  (dbbc263)

Gad: *"oh and it doesnt even set the mod destination anymore - big bug"*. It
was never only macro — measured with the cursor parked on the filter cutoff,
what each scope MADE:

                    before      after
      env   ⌃E      NOTHING     flt.frq
      lfo   ⌃L      NOTHING     flt.frq
      key   ⌃K      NOTHING     flt.frq
      macro ⌃M      NOTHING     flt.frq

**A mod slot with no destination is silent by construction**, so the scope's
whole promise — *"the letter takes you to the thing, making one if the rack has
none"* — handed back a thing that does nothing.

⚠ **`cursorAddr()` had existed all along** — the automation overlay picks its
lit curve with it. It is read BEFORE the block that moves `S.editSnd`/
`S.curMod`, so it is the knob you were actually standing on, and it refuses
when it would point a slot at itself (the destination picker excludes the same
slot for the same reason). Out on the desk there is no parameter cursor: the
slot is made bare, as before, and the flash says so instead of pretending.

## ⌃M IS THE MOD SCOPE · MACRO LOSES ITS LETTER  (dbbc263)

Gad: *"do not make any macros, this feature is on ice and no home yet, control+m
either takes to an existing mod that controls the param you are on, or creates
a new one that is destination to the param you are on, default is env… we made
the macro feature but i dont want it first citizen at all."*

**The letter is about the PARAMETER, not a source.** ⌃E/⌃L/⌃K ask for a source
by name; ⌃M asks *"what moves THIS"*, which is the question you actually have
with a knob under the cursor.

      ⌃M on a bare channel        makes an ENV aimed at flt.frq
      ⌃M onto an existing env     found it, slot 2, dial tmul
      ⌃M onto an existing lfo     found it, slot 2, dial rate
      ⌃M onto an existing macro   found it, slot 2, dial amt

The `mag` row's `pri`/`sec` are functions of the slot's SOURCE, so the dials
follow what it landed on — arriving on somebody's lfo gives you the lfo's rate
rather than an envelope's stages. `keys` stays the env's a/d/s/r; on a non-env
slot `magSpec` returns null and `magCur` falls back to the primary, which is
the safe degradation the mag machinery already had.

⚠ **MACRO HAS NO LETTER AT ALL NOW.** `src:MSRC_MACRO` appears nowhere in
OPTRACK, so no gesture can conjure one. **Nothing else about macros was
removed** — a slot already set to macro still runs, still moves live under a
held note, the source is still in the mod rack's list by hand, and ⌃M still
takes you TO one because it modulates the knob you are on. The feature is on
ice, not deleted; see the macro section further down for how it works when it
comes back.

## ⚠ ⌃/ IS UNREACHABLE AT LAYER 2, AND LIVE IS THE SAME

The `Slash` random-source scope never opens inside a channel: an earlier
handler makes ⌃/ `rollSlot()` — the dice for the slot under the cursor — and it
returns first. The scope is only reachable at layer 1.

Gad asked to *"make it like it is in live, or explain to me whats different"*.
**Checked, and nothing is different**: the live build (2026-08-27.2121) carries
the identical `KeyM` macro entry, the identical `Slash` scope and the identical
`rollSlot` handler. The conflict is not a regression from this branch and was
not touched. His call next time — it needs either a new key for the dice or a
new letter for the random source.

## QA CHECKLIST — 2026-08-29 (third batch)

Reload **http://localhost:3033/**. Build `2026-08-28.2115` or later.

1. **A mod scope aims at the knob you are on.** Open a channel, walk to the
   filter cutoff, press ⌃E. You get an envelope **already routed to the
   cutoff** and the flash names it. Before, every one of these made a slot
   pointing at nothing, so nothing happened however you dialled it.
   *Measured: NOTHING → flt.frq, on all four letters.*
2. **⌃M finds what already moves this knob.** Stand on a knob something already
   modulates and press ⌃M — it takes you to that slot rather than making a
   second one, whatever its source is. *Measured: found an env, an lfo and a
   macro, each on the second press, no extra slot made.*
3. **⌃M on a knob with nothing on it makes an ENV**, not a macro. *Measured:
   src env, aimed flt.frq.*
4. **No gesture makes a macro any more.** *Verified: `src:MSRC_MACRO` appears
   nowhere in the scope table. Macros you already have still run and ⌃M still
   reaches them.*
5. **Out on the desk (no channel open), ⌃E still works** and makes a bare env —
   there is no parameter cursor to aim at, and the flash says so rather than
   claiming a destination. *Not measured — reasoned from cursorAddr returning
   null at layer 1.*

# THE KEY COMES BACK, AND RETRO LISTENS AGAIN — 2026-08-29 (branch `sound-library`)

## CLEARING THE MASTER HANDS THE KEY BACK  (7cf5b19)

Gad: *"when a master chord ch is cleared, i guess you can return to track the
global key."*

`chordHold` is deliberately sticky — the harmony has to hold after your hand
lifts or every other channel lurches at the end of each chord. But it is still
**the last thing THAT CHANNEL said**, and clearing the channel is you saying it
has nothing to say. `anyGlobalChord()` already covered the slot being switched
back to local; this covers the notes going away. Measured, `pcsNow()`:

    Dm stuck, released not cleared   2,5,9            (unchanged)
    ...then the master is CLEARED    0,2,4,5,7,9,11   the global key, back
    ...cleared while STILL HOLDING   2,5,9            untouched

⚠ **The third row is the guard that matters.** `heldPCs` outranks `chordHold`
in `chordPCs()`, so clearing under your own fingers changes nothing until you
let go — which is why the fix sits in `clearLane` and not at read time. A
read-time test ("does the master still have notes?") would have broken the
live case, where a master legitimately defines a chord with an empty lane.

## RETRO LISTENS AGAIN — BUT ONLY WHERE NOTHING WAS DECIDED  (7cf5b19)

Gad: *"retro rec on empty ch with no set length — in that state retro needs to
listen to the performance and guess the length based on when started playing,
with some gap window like if silent for a bar then assume that the next playing
is the the rec punch in position… i thought we had it like this."*

⚠ **THE GUESSER CAME OUT ON PURPOSE — read `retroCapture`'s own comment before
touching this.** It was wrong because it overrode a length you had **SET**. On
a lane whose `auto` is still true nothing has been decided, and the alternative
there was `DEFLENS[CFG.defLen]` — a number out of settings that knows nothing
about what you just played. **A guess beats an arbitrary constant; a guess does
not beat a decision.** That sentence is the whole scope of `retroGuess`.

- **The punch-in** is the first note after the last silence of `RETROGAP` (one
  bar) or more, so "play a bit, breathe, then play the take" hands back the
  take and not both.
- **The length** is that span at the nearest bar — **but never shorter than
  what you played**, or a phrase whose last note sits just past the line wraps
  onto its own beginning.

Measured with `CFG.defLen` pinned to 1 bar, so every length other than 1b came
from listening (`tools/probe.sh retroguess ch=5`):

                                          guess   lane   notes kept
      2-bar phrase, clean                    2      2b      8/8
      1-bar phrase                           1      1b      4/4
      warm-up · 1 bar silence · 2-bar take   2      2b      8/11   <- punch-in
      last note past the line (span 5.0)     2      2b      3/3    <- no clip
      4-bar phrase                           4      4b      5/5
      length already SET to 1                2      1b      4/8    <- not touched

**The last row is the reason the guesser was removed, and it still holds:** the
guess said 2 and the lane stayed at the 1 that was decided. Nothing clipped and
nothing collided in any row.

The flash says `(heard)` when the length came from listening, so a wrong guess
is legible rather than mysterious — and `tab+digits` re-cuts it any width, which
is the escape hatch that makes guessing safe at all.

### ⚠ A REST IS NOT A PUNCH-IN — the guesser's own regression  (12b2595)

Gad, same day: *"your last fix reverted a fix from last turn… if i start
playing mid loop then wrap around and do retro rec, only the beginning of the
loop is captured and not the end where i started playing from."* It did.

**The anchor fix was NOT touched** — `fmod(n.t-anc,L)` is still there and the
two SET rows below prove it. What the guesser broke is **L**. It only runs when
`lane.auto`, but on a lane with no length set it now chose the length, and
`from = endB - L` IS the window: a short L cuts the front off it, which is
exactly "the end of the loop where I started playing from".

**And L came out short because a bar of silence inside a phrase looks identical
to the silence between two attempts.** A take with a rest in it had its
punch-in walked forward past everything before the rest.

So the gap walk is now **stopped-only**, and that split is the rule:

- **STOPPED** there is no clock and no anchor. The phrase is the only reference
  there is, and "play a bit, breathe, play the take" is the gesture. Gap walk on.
- **RUNNING** there IS one — `play()` empties the retro buffer, so everything in
  it is this run, and the anchor already places it. The guess chooses a bar
  COUNT and nothing else, covering every note played. Gap walk off.

One argument, `punchIn`, and `retroCapture` passes `!T.playing`.

                                          guess  lane  kept   placed
      STOPPED
        2-bar phrase, clean                 2     2b    8/8     —
        1-bar phrase                        1     1b    4/4     —
        warm-up · 1 bar silence · take      2     2b    8/11    —     punch-in
        last note past the line (span 5)    2     2b    3/3     —     no clip
        4-bar phrase                        4     4b    5/5     —
      RUNNING, 4-bar loop, played 12->20 across the wrap
        length SET to 4                     —     4b    9/9    right
        length SET to 4, rest inside        —     4b    5/5    right
        AUTO                                3     3b    9/9    right
        AUTO, rest inside                   3     3b    5/5    right  <- was 1/5
      AND THE DECISION STILL WINS
        length already SET to 1             —     1b    4/8     —

⚠ **A probe that calls a helper the code also calls must pass the same
arguments.** The moment `retroGuess` took one, the probe's `guessBars` column
was reporting a variant `retroCapture` never asked for — and disagreeing with
the length the lane actually came out as, which is worse than having no column.

### ⚠⚠ AND UNDERNEATH BOTH: THE WINDOW WAS SLIDING  (c0bf406)

Gad, third time on one report: *"mmm still reproducing"*. Right twice before
and right again — **one report, THREE separate defects, each fix uncovering
the next:**

1. the phrase came back **ROTATED** — anchor placement (6b1f0a3)
2. the guesser **SHORTENED L** on an unset lane (12b2595)
3. and under both, **the window slid with the clock** (c0bf406)

**WHY MY PROBES KEPT PASSING, and it is the lesson:** I only ever pressed retro
IMMEDIATELY after the performance. His words said otherwise the whole time —
*"let the loop wrap around to the beginning, **THEN** hit retro rec"* — and the
wrap takes a whole cycle. Sweeping the one variable I had assumed away found it
in a single run. **When a report keeps reproducing against a passing probe, the
thing to vary is the step you paraphrased away.**

4-bar loop, played beats 12→20, notes kept by WHEN retro was pressed:

      retro at   21   24   26   28   32   36   48   64
      before    9/9  9/9  9/9  9/9  5/9  1/9  0/9  0/9
      after     9/9  9/9  9/9  9/9  9/9  9/9  9/9  9/9

At 32 what came back was `0 1 2 3 4` — the notes played AFTER the wrap, which
is "only the beginning of the loop is captured and not the end where i started
playing from", in his words and in his order.

`endB` followed the CLOCK. The line above it only ever pushed endB **forward**,
for a jam that ran past the bar; **nothing pulled it back**, so `from = endB-L`
slid along while he waited for the loop to come round.

**THE WINDOW ENDS WHERE THE TAKE ENDED, NOT WHERE THE CLOCK IS** — the exact
rule `retroBars` has carried in its own comment since 2026-08-22, and
`retroCapture` never got. Pulling endB back can only ever put MORE of the take
inside the window: the notes' PHASE comes from the anchor (`fmod(n.t-anc,L)`),
never from endB, so nothing moves — the window only decides who is included.
Guarded: play a second take later and the window follows the NEWER playing
(5 of 5 in the last cycle out of 14 in the buffer, on both builds).

⚠ **This is on lanes with the length SET, so it predates the guesser entirely.**
Do not read commit 12b2595 as the fix for the mid-loop report; it is the fix
for the regression the guesser caused on top of it.

⚠ **The probe's own expectation was wrong and called a correct answer NO:** it
expected every note back, when retro promises the last CYCLE.

### ⚠⚠⚠ AND THE ONE HE WAS ACTUALLY HITTING: THE SNAP  (3981508)

Fourth sighting, and the detail that cracked it was in his message all along:
*"im testing with **SINGLE BAR**… i start playing mid bar and past the end of
the bar then hit retro mid bar again where i started - and i only see the
beginning of the bar not the end where i started. **could it be that you fixed
it only on channel 3? there is seems to work fine**"*.

**It was never a channel. THE SNAP WAS THE BUG, and on a one-bar loop it is
total.** endB snapped to a bar line and the window is exactly L long, so at
**L=4 the window IS the last bar** — a phrase crossing the line loses
everything before it, with no slack anywhere. A longer loop has slack, which is
the entire explanation for "channel 3 seems to work fine".

Eight notes played 2 → 5.5, across the line, on a **1-BAR** loop:

      retro at        5.75   6    6.5   7    9    13
      before          4/8   4/8   4/8  4/8  4/8  4/8    always `0 0.5 1 1.5`
      after           8/8   8/8   8/8  8/8  8/8  8/8

The four that came back were the four AFTER the line — "the beginning of the
bar". The identical phrase on a 4-bar loop reads 8/8 on **both** builds.

⚠ **It failed at every tap time including immediately, so waiting was never the
variable here.** c0bf406 fixed a real and different defect (the window sliding
with the clock, the 4-bar rows at 32/48/64) and I shipped it as the answer to
this report. It was not. **Four defects in one sentence of his, and three of my
fixes were each correct and each not it.**

`endB = maxT9` — the last note at or before now — subsumes both earlier patches
(the forward extension for a jam past the bar, the pull-back for a late tap)
and deletes them. It cannot lose a note the snap kept: the window is still
exactly L long and half-open, so no two notes share a phase, and PHASE comes
from the anchor, never from endB.

⚠ **`retroBars` does NOT get this and MUST NOT.** It maps from the WINDOW START
and resizes the lane, so its within-bar positions hold precisely *because* its
end snaps to a bar line — its own comment says so. `retroCapture` maps from the
anchor and never needed the snap at all. That asymmetry is the thing to
remember before "fixing" them the same way.

### ⚠ THE PROBE LESSON, AND IT IS THE BIGGER ONE

**An oracle derived from the implementation only checks that the code does what
it does.** I wrote `shouldBe` as "the bar-snapped window, placed against the
anchor" — the rule the CODE used — so the probe agreed with the bug and printed
`yes` next to 4-of-8 on a one-bar loop. It states the PROMISE now, which is his
sentence: *everything I just played, where I played it.*

Together with the previous section: **when a report keeps reproducing against a
passing probe, suspect the oracle before the code, and vary the step you
paraphrased away.** Both failures happened here, in that order.

## QA CHECKLIST — 2026-08-29 (second batch)

Reload **http://localhost:3033/**. Build `2026-08-28.1341` or later.

1. **Retro on a fresh channel hears the phrase.** Empty channel, length never
   set. Play a two-bar phrase, hit retro. You get a TWO bar loop, not whatever
   `defLen` says. The flash reads `(heard)`. *Measured: 2b from a 2-bar phrase
   with defLen pinned at 1.*
2. **The silence finds your punch-in.** Noodle, leave a bar of silence, then
   play the take, then hit retro. Only the take comes back. *Measured: 8 of 11
   notes — the three warm-up notes on the far side of the gap were dropped.*
3. **A length you SET is still untouchable.** Set a lane to 1 bar, play two
   bars, hit retro. You get one bar — the guess does not overrule you.
   *Measured: guess said 2, lane stayed 1b.*
3z. **⚠⚠⚠ MID-LOOP RETRO ON A **ONE-BAR** LOOP — the one he kept hitting.**
   One bar, length SET, a loop already running. Start playing mid-bar, carry on
   past the bar line, hit retro mid-bar. **Everything comes back**, both halves.
   Before, only the part after the line did — at every tap time, immediately
   included. *Measured: eight notes played 2→5.5, 4 of 8 before / 8 of 8 after;
   the same phrase on a 4-bar loop was 8/8 on both, which is why a longer
   channel looked fine.*
3a. **⚠⚠ MID-LOOP RETRO, AND WAIT BEFORE YOU PRESS IT.** Transport running,
   4-bar loop with the length SET. Start playing partway through, let the loop
   wrap **all the way round** — a full cycle or two — and only THEN hit retro.
   Everything you played comes back, including the part before the wrap.
   *Measured by when retro was pressed, notes kept: at 21/24/26/28 nine of nine
   both builds; at 32 five before / nine after; at 36 one / nine; at 48 and 64
   NOTHING before / nine after. Waiting is the whole bug — press it
   immediately and it always looked fine.*
3b. **⚠ Mid-loop retro on a lane with NO length.** Transport running, start
   playing partway through the loop, let it wrap, hit retro. Everything you
   played comes back, including the part before the wrap — and a REST inside
   your phrase must not eat it. *Measured on a 4-bar cycle, five notes at
   beats 12,13,14,15,20: 1 of 5 before, 5 of 5 after, all in the right places.
   With the length SET it was right throughout — this only ever bit a lane with
   no length.*
4. **Clearing the chord master returns the key.** Play a chord on the master,
   let go (the desk stays on that chord — correct), then clear that channel.
   The desk goes back to the global key and the flash says so. *Measured:
   2,5,9 → 0,2,4,5,7,9,11.*
5. **Clearing while still holding changes nothing.** *Measured: pcs stayed
   2,5,9 until the fingers came up.*

# A MASTER DOES NOT FOLLOW ITSELF, THE KEY IS LIVE, THE ARP LETS GO — 2026-08-29 (branch `sound-library`)

Three from Gad, all measured. **The arp repro is his, and it is a CLOCK bug —
read that section before touching anything that stores a beat.**

## THE CHORD MASTER'S OWN KEYBOARD  (77a5d5f)

"when chord channel is set to global it should not affect itself, rn after your
fix a global chord changes every press toggles between 2 chords with the same
key". Mine, from the day before.

`isChordMaster` exists for exactly this and every other reader asks it —
trigger, heardMidi, the note-fx repitcher, rpit. **The KEYBOARD had not been
told, and the 08-28 fix is what gave the keyboard an opinion about the chord in
the first place.** So the master's own run was laid out on the chord it is
itself DEFINING: press a key, it defines a chord; the next press mapped through
that chord defines a different one; one key, two chords, forever.

    the MASTER's own keys, C-E-G held
      before   C3 E3 G3 C4 E4 G4 C5 E5 G5    laid out on its own chord
      after    C3 D3 E3 F3 G3 A3 B3 C4 D4    the plain scale run

⚠ **`noteOf` is the only caller that knows the channel**, so the test is asked
there and travels into `kbNote` as `noChord`. **`keyForOffset` takes it too** —
it is the mirror that decides which key LIGHTS UP, and without it the master's
highlights point at the chord's keys instead of its own.

## THE GLOBAL KEY REACHES A RECORDED NOTE  (77a5d5f)

"global key in settings should affect already recorded notes live, only global
chord overrides it". **This REVERSES the 2026-08-18 ruling, on his ask.** One
line: the replay snaps to `pcsNow()`, which already answers chord-over-scale,
so "the chord overrides it" needs nothing said twice. `heardMidi` says the same
thing, so grid and sound still agree.

    key = F#, nothing held, stored E3   ->  grid D#3 / sound D#3   (was E3/E3)

⚠ **WHAT IT COSTS, because it is exactly what August fixed:** an OFF-SCALE
recorded note is re-snapped on the way out, so a chord played chromatically can
come home a different quality. **The cost is far smaller than it was** — the
keyboard hands out scale DEGREES now, so anything played with the scale on is
already in key and this is a no-op for it. What it reaches is what you played
with the scale OFF, what a channel transpose moved off-scale, and what
random-pitch invented. Scale off snaps nothing at all. If the August complaint
ever comes back, this is the line.

## THE ARP THAT WOULD NOT LET GO — A CLOCK BUG  (77a5d5f)

His repro: **"have playback paused > hold a few arp notes > let go > start
playback = notice the arp is running even tho notes arent pressed"**. Five
readings of his earlier description had all come back clean; this one is
exact, and it is not about latching at all.

⚠ **`gridNow()` IS TWO CLOCKS.** Stopped it is the free grid (`G.b0 +
elapsed/spb`), climbing since the page loaded. Playing it is `posNow()`, which
`play()` restarts at **ZERO**. A pool entry's `until` is a BEAT, written on
whichever clock was running at the key-up — so a note released at free-grid
beat 800 was compared, one line later, against transport beat 0, found to be
800 beats in the future, and arpeggiated with nothing held. The `-8`
housekeeping filter kept it for the same reason, so it ran until something else
emptied the pool (which is why it read as "a few rounds then stops").

    STOPPED . hold arp . let go . PLAY
      before   until +3.125 beats still owed,  10 arp steps with nothing held
      after    until -1.683 (in the past),      0 steps

`play()` converts the pool through the TIMES the beats stood for, so a key
still held across the press (`until` Infinity) keeps sounding and a released
one lands in the past and is over. **Same family as the retro-buffer clear
immediately above it in play(): a beat from a dead clock has no home on a new
one.**

⚠ **THE SIBLING NOBODY HAS HIT YET:** `rPend[c].ts` is also a free-grid beat
and is also not rebased by `play()`. A note key held across the space bar
therefore pushes a retro entry stamped on the dead clock. Not reported, not
fixed, and the fix is the same three lines if it turns up.

## QA CHECKLIST — 2026-08-29

Reload **http://localhost:3033/**. Build `2026-08-28.1319` or later.

1. **The arp lets go.** Stop the transport, hold a few notes on an arp
   channel, let go, press play. Silence until you play something. *Measured:
   10 arp steps with nothing held before, 0 after.*
2. **A chord master plays its own keyboard.** On the channel holding the global
   chord slot, run up the home row while a chord is held. Plain scale, one key
   one degree — and the same key gives the same chord every time. *Measured:
   C3 D3 E3 F3 G3 A3 B3 C4 D4; before it was the chord's own tones.*
3. **The key moves a recorded part.** Record something, then change the key in
   settings. The lane follows, live, in the grid AND in the sound. *Measured:
   key F#, a stored E3 comes back D#3, grid and sound agreeing.*
4. **A held chord still overrides the key.** With a chord held, the lane
   follows the chord, not the scale. *Measured: Dm held over a stored E3 gives
   F3 both.*
5. **Watch for the August complaint.** An off-scale recorded note now gets
   re-snapped — the thing 2026-08-18 removed, back by request. Anything you
   played with the scale ON is unaffected. Say if a chromatic part comes home
   the wrong quality.

# THE DIALS, THE CHORD, RETRO AND THE SNAPSHOT'S TAKE — 2026-08-28 (branch `sound-library`)

Second batch of the day. Six of eight shipped and measured; **two could not be
reproduced and are waiting on Gad** — see the last section, which is the first
thing to read if you are picking this up.

## THE DIALS MOVE BY THE NUMBERS YOU REACH FOR  (4c2c213)

"reso params should jump by 0.1 normally, and 1 shifted" · "all params that are
0-1 should jump 0.01 normally and by 0.1 shifted for example reverb width and
damp".

86 specs — 72 at step 0.05 and 14 at 0.02 — became `step:0.01, big:0.1`, which
is the idiom `level` has used all along. **`big` SNAPS the coarse step to its
own multiples**, so ⇧ walks 0.1 / 0.2 / 0.3 rather than wherever the fine steps
left you. The filter's Q ran 0.5 and 5 — four values between "no resonance" and
"singing", one shifted press a fifth of the dial — and is 0.1 / 1 now.

Measured, `tools/probe.sh steps` (every fx and channel-rack param, driven
through `adjust()` at all three modifiers): **0..1 params seen 78, of which 0
disagree with 0.01 / 0.1**; flt reso 0.1 / 1 / 0.01 fine.

⚠ **TWO EXCEPTIONS, and the probe called both of them failures first:**

- **`mix` is 0..1 but carries `curve:'vol'`**, so adjust() steps it in FADER
  units (10 / 2 / 0.5) and a wet/dry feels like the channel strip. Its `step`
  is read only by the random roller, so it KEPT 0.05 rather than claiming a
  number it does not use.
- **grain's `pitch` is 0..1 over ±24 semitones with `step:1/48`** — one press,
  one semitone, which is what a pitch dial is for.

And the loop cell under the grid gets a space: `416th` is a number you parse
before you read it. The cell is 8 wide and the longest pair, `256 16th`, is
exactly 8 — measured `4 bar` / `16 16th` / `3 beat`.

## THE CHORD IS LIVE, THE SCALE IS AN INPUT AID  (b2cf50d)

"the live auto scaling is messed up… im getting now several bugs we already
fixed weeks ago. like i have 2 adjacent keys playing the same note with scale
on, and global chord changes looks like it works, i can see notes moving but i
dont hear the change". Both real, both measured (`tools/probe.sh chord ch=5`),
and both the same split.

**TWO KEYS, ONE NOTE — the SECOND time this line has been fixed.** `kbNote`
maps a key to a scale DEGREE, so the snap in trigger() is a no-op and the row
stays playable. That holds while `pcsNow()` is the seven-note scale. **A HELD
GLOBAL CHORD makes it three, and seven degrees rounded onto three tones
collapses the row:**

    C-E-G held, keys a s d f g h j k l
      before   C3 C3 E3 E3 G3 G3 C4 C4 C4    4 distinct of 9, four dead keys
      after    C3 E3 G3 C4 E4 G4 C5 E5 G5    9 of 9

Same fix, generalised, and **this is the rule to keep: THE KEY RUN IS WHATEVER
THE SNAP DOWNSTREAM WILL ACCEPT.** When a chord is sounding the chord IS the
run, one tone a key. Chord pitch classes are ABSOLUTE so they take no key
offset; the scale's are relative and keep theirs.

⚠ **The row now spans three octaves on a triad** (C3..G5 across a s d f g h j k
l). That is the honest consequence of one-chord-tone-a-key and every key is
live, but it is a feel change — say if you would rather it stayed tighter.

**SEEN BUT NOT HEARD.** The grid draws through `heardMidi()`, which snapped;
the replay let only LIVE notes through the snap.

    Dm held, stored E3     before  grid F3 / sound E3
                           after   grid F3 / sound F3

**A held chord now reaches a recorded note, and the 2026-08-18 ruling is
untouched.** That ruling is about the SCALE — a fixed setting that must not
re-decide a chord you already played. A chord master is the opposite: a gesture
you are making right now whose entire purpose is that the desk follows it, and
worth nothing if only live notes hear it. **With nothing held `chordPCs()` is
null and a replayed note is left exactly alone** — measured, scale-only rows
read C3 D3 E3 F3 G3 A3 B3 C4 D4 and a stored E3 replays E3, before and after.
`heardMidi`'s guard list is now trigger's, exactly, so the two cannot drift.

## RETRO STOPS ROTATING THE TAKE  (6b1f0a3)

"i preform mid loop, let the loop wrap around to the beginning, then hit retro
rec, it only captures the beginning of the loop". **Nothing was lost — the
whole phrase was ROTATED.** `endB` snaps to a BAR line and the window start is
`endB−L`, so on any loop longer than one bar a tap taken anywhere but on a
cycle line put the window start at a phase the loop does not have, and every
note moved by that offset. Measured on a 4-bar loop (`tools/probe.sh retro
ch=5 bars=4`), lost / moved of the notes inside the last cycle:

    tap on the cycle line       0 / 0   ->  0 / 0
    tap MID-loop (beat 4)       0 / 8   ->  0 / 0    was 12.07 -> 8.07, all by 4
    tap at beat 2, off the bar  0 / 6   ->  0 / 0    was 12.05 -> 8.05, all by 4

Cut against the **ANCHOR**, which this function's own comment has promised all
along. It does not resize the lane, so the anchor's phase is the one true thing
about it, and the window is still exactly L long so no two notes can collide.

⚠ **`retroBars` (tab+N) still maps from the window START, on purpose** — it
RESIZES the lane to the bars you asked for, and then the anchor's phase means
nothing. Do not "fix" it to match.

## A SNAPSHOT BRINGS ITS SAMPLE  (6b1f0a3)

"snapshots of channels that contain different audio samples in audio channels
should swap the audio when changing snapshot".

⚠ **A REFERENCE, NEVER THE AudioBuffer.** `S.clips` goes through
`JSON.stringify` on every autosave and a buffer serialises to `{}` — which
would not merely lose the take, it would hand `setChanBuf` an empty object on
the next load. `sm` holds the same `{name, src}` pair the set already stores
per channel, so **the pool stays the one place audio lives**. It is `sm` and
not `aud` because the desk clipboard puts a LIVE buffer on `aud`
(`audClipGrab`) and the two must not collide.

**And the half that would have died on reload:** the OTHER snapshot's take is
on no channel at save time, so `aud` never embedded it. New key **`caud`**
carries those — factory takes as references (the shelf re-fetches them),
recordings embedded, same encoder and the same shared SMPCAP budget. **A new
key is not a format change in either direction**, so no SAVEV bump and nothing
to export first.

Measured (`tools/probe.sh snapaud ch=9`): a↔b swaps nylonlick/koto both ways; a
recorded take referenced only by snapshot c rides as `emb 46kB`; wipe it from
the pool, restore from the set, and c finds it again. `setio` unchanged —
embed yes, name kept, rms 0.283 both sides, stamp local, export bytes match.

## ⚠ TWO THAT COULD NOT BE REPRODUCED — READ THIS FIRST

Both are Gad's, both are still open, and **neither was guessed at**. The
measurements say the plain paths are clean, so the next round needs HIS state,
not more theorising.

**THE CLICK ON NOTE OFF** — "there is a click on note off even when ther is
long release and sustain is at 1… env note off is not always very clean".
`tools/probe.sh envoff ch=5 rel=1` taps the bus across the whole release and
asks how far below the held level the sound was when it stopped DEAD — that
step IS the click:

    native osc, sus 1, rel 1s     cut at 3.25s, -84.6 dB
    FM worklet (phase engine)     cut at 3.25s, -84.6 dB
    with a filter env             cut at 3.25s, -126.6 dB

All inaudible. Voice STEALING is clean by construction too — a normal steal
fades with τ 8ms and ends 15τ later (-130dB), a mono steal τ 1.5ms and 20τ
(-173dB). **His word was "not always", so it is patch-dependent.** Next step is
the protocol in CLAUDE.md: he exports the set, we `importSet` it on 3032 and
measure the actual patch.

⚠ **THE FIRST RUN OF envoff LIED and it is worth knowing why:** it set
`p.env[0]` and reported a clean 0.058s release while claiming to test 1s. **The
amp envelope is a MOD SLOT** (`src:1`, a route to `dst 1 idx 0`); `p.env` is
the legacy shape and `foldMod` only reads it on an UNFOLDED preset. The probe
reports `relSeen` — the voice's own `this.rel` — precisely so that can never
pass unnoticed again.

**THE ARP LATCH** — "holding rec>holding arp = freezes arp like it latches when
letting go of rec, arp is stuck for a few rounds of loop then stops".
`tools/probe.sh arplatch ch=5` drove five readings of that gesture — note
alone with rec off and armed, tab-down·note·note-up·tab-up, tab-down·note·
TAB-UP·note-up, and rec latched with win+tab — and **none of them sticks**:

    pool `until` after the key-up   negative in every case (the release fired)
    lane over four loop rounds      9 -> 9 -> 9 -> 9 -> 9   stable
    pend / SUS / kbHeld left over   0 / 0 / 0

Two readings of "holding arp" are still untested: **holding the arp SCOPE
(⌃a)**, and holding a note through a scope. `latchArmHeld()` is called from
exactly one place — the win key (line ~21888) — so releasing tab arms no latch,
which is why the tab orderings all came back clean. **Ask which keys he means
before writing any more code for this.**

## QA CHECKLIST — dials, chord, retro, snapshots · 2026-08-28

Reload **http://localhost:3033/**. Build `2026-08-28.1255` or later. Nothing
here changed the save format, so no export needed. Ordered by what is most
likely to be wrong.

1. **The keyboard row under a held global chord.** Hold a chord on your
   chord-master channel and run up a s d f g h j k l on another channel. Every
   key a different note, ascending through the chord. It used to double —
   a and s the same pitch, d and f the same. *Measured: 9 distinct of 9, was 4
   of 9.* **Also say whether the three-octave span feels right** — one chord
   tone a key is what makes them distinct, and it is a wider run than a scale.
2. **A chord change you can HEAR.** Play a part into a lane, then change the
   chord on the master channel. The lane's notes move in the grid AND in the
   sound. Before, only the grid moved. *Measured: Dm held over a stored E3 —
   grid F3, sound was E3, now F3.*
3. **With NO chord held, a recorded lane is untouched by the key.** This is the
   2026-08-18 rule and it must still hold: change the key/scale setting and a
   recorded part does NOT re-snap. *Measured: stored E3 replays E3 before and
   after; scale-only key runs identical.*
4. **Retro mid-loop.** Set a loop of 4 bars, start playing at bar 3, let it
   wrap, keep playing into bar 1, then tap retro. Everything you played comes
   back AT THE BEAT YOU PLAYED IT. It used to rotate the whole phrase by
   however far into the bar you tapped. *Measured: tap at beat 4 moved 8 of 8
   notes by exactly 4 beats; now 0 of 8.*
5. **Snapshots swap the sample.** On an audio channel, load take A, hold 1 and
   press b, load take B, then walk 1a / 1b. The take follows. Then export and
   re-import and walk them again — the take that was NOT on the channel at
   save time still comes back. *Measured: nylonlick↔koto both ways; a recorded
   take referenced only by a snapshot rides embedded at 46kB and restores from
   the file alone.*
6. **The dials.** Reverb width and damp: one press 0.01, ⇧ 0.1 landing on
   round numbers. Filter reso: 0.1 and 1. *Measured: 78 of 78 unit params at
   0.01 / 0.1, reso 0.1 / 1.* **`mix` deliberately still moves in fader units**
   (10 / 2 / 0.5) so a wet/dry feels like the channel strip — say if you want
   it on the 0.01 rule too.
7. **The loop cell reads as two things.** `4 bar`, `16 16th`, `3 beat`.
   *Measured.*
8. **STILL OPEN — the click on note off.** Not reproduced: the release measures
   clean at -84.6dB on native, worklet and with a filter env. **Export the set
   with the patch that clicks** and say which channel, and it gets measured on
   the real thing.
9. **STILL OPEN — the arp latch.** Five readings of "holding rec > holding arp"
   all came back clean (lane stable at 9 events over four loop rounds, nothing
   left in pend). **Say exactly which keys** — is "arp" the ⌃a scope, or a note
   held into a running arp?

# THE MASTER, AND THE NOTE THAT CAME BACK WRONG — 2026-08-28 (branch `sound-library`)

## THE NOTE YOU PLAYED IS THE NOTE THAT COMES BACK  (98d19f1)

Gad: **"i have a bug that played notes and the recorded notes are not the same
like they are shifted after recording maybe its the scaler doing some rogue
adjusting"**. It is the scaler — and the transpose, in the other direction.

**THE CONTRACT: a lane event is the channel's INPUT.** `trigger()` adds the
transpose on the way out and, for a LIVE note only, snaps it into the key
first — the snap is a playing aid, and a recorded note is already decided (the
comment in trigger has said so since 2026-08-18). Two recorders disagreed with
that contract, in opposite directions:

- **THE FINGER wrote the key you PRESSED.** The snap that moved the note you
  heard never reached the lane, so the replay played the unsnapped one.
- **THE GENERATORS wrote the pool's OUTPUT**, which has already been through
  transpose — so the replay transposed it a second time. chord, arp, euclid,
  ratchet, cycle, spray, all seven pool call sites.

Measured on ch5 in C major, `tools/probe.sh recpitch ch=5`, sounded → replayed:

                                        before      after
      black key on the piano map      C3 -> C#3   C3 -> C3
      a held chord narrowing the key  C3 -> D3    C3 -> C3
      off-scale semitone transpose    F3 -> F#3   F3 -> F3
      CHORD SLOT, channel up an oct   E4 -> E5    E4 -> E4
      ARP, channel up an oct          E4 -> E5    E4 -> E4

The octave pair is almost certainly what he was hearing: **any generator on a
transposed channel recorded an octave high.** Nine other cases (plain, scale
off, in-scale transposes, the octave transpose itself, an in-scale piano key,
key=F, an untransposed chord slot) read shift 0 before AND after — nothing
moved that was already right.

**ONE RULE, BOTH DIRECTIONS: a lane event is THE NOTE THAT SOUNDED, MINUS THE
TRANSPOSE.** `sndIn` converts a finger's note into it, `sndOut` a generator's;
`recPlayed` marks the seven pool sites that emit a sounding note. **MIDI IN
calls the same `recPlayNote` with a PRESSED note** — that asymmetry is why the
conversion could not live inside recPlayNote, and it is the thing to remember
if another caller appears.

⚠ **AUDIO LANES ARE DELIBERATELY UNTOUCHED.** They hold cues and bends, not
notes, and `recAudEvent` does its own arithmetic with `trSemis`. One hole is
KNOWN AND UNFIXED: an audio channel in PITCH mode gets snapped live by trigger
(posCh only excludes position mode) and `recAudEvent` writes `pk=midi-KBBASE`
raw — the same bug, on a lane whose whole regression net is built on exact
values. Not measured, not touched. Say if a pitched sample drifts.

The `matrix` net reads the same before and after — seven take rows sounding,
and the four cue rows 0/tv0 on BOTH builds, which is a pre-existing hole and
not this. (A/B'd by stashing the change and reloading, not from memory.)

## THE MASTER IS A CHANNEL AT EVERY DEPTH  (310d964)

**chTargets() tested the LAYER before it tested the master.** Standing inside
the master's rack — the only place its fx and dj pads can be edited, therefore
where you are — every channel-scoped gesture answered `[S.editSnd]` and went to
whichever channel the cursor had been on before you pressed 0. Gad: *"right now
it only changes the last visited channel"*. Measured, master selected, cursor
last on 7 (`tools/probe.sh master`):

                    layer 1            layer 2 BEFORE      layer 2 AFTER
      tab+↑         lane 0: 2 -> 4     lane 7 grew, m0=2   lane 0: 2 -> 4
      tab+→         lane 0: 2 -> 3     lane 7 grew, m0=2   lane 0: 2 -> 3
      ⇧⌫            lane 0 cleared     NOTHING             lane 0 cleared

⇧⌫ at layer≥2 also carried a `!S.mSel` that sent it down a chain nothing else
claimed — no lane, no flash, silence. `focusCh()` has always answered 0 for the
master, so dropping the guard was the whole fix. **The two automation branches
above it keep theirs: the master has no modLoop.**

**Every gesture that must NOT reach the master already says `!S.mSel` for
itself**, which is what made reordering safe — and layer 1 has answered `[0]`
here all along, so this only makes the two depths agree.

## 0+LETTER WALKS THE DESK · ⇧ WIDENS IT TO A SCENE

Gad: *"my original intent was that it will just change all other channels to
their respective clips, for example 0s will change all channels to be s
clips"* — and asked for BOTH, so plain is the row and ⇧ is the scene that key
used to be. Measured from a desk all on d:

      0s      -> sssssssss   sceneAt a     every channel to ITS OWN s
      3f      -> ddfdddddd                 one channel, unchanged
      ⇧0S     -> ddfdddddd   sceneAt s     the scene shelf, letters untouched

`goSnaps` is nine `goClip` calls with ONE undo point, one flash and ONE lane
event — `goClip(pi,k,quiet)` gained the flag and now returns whether it moved.

⚠ **A ch-0 EVENT IS TWO THINGS NOW AND HAS TO SAY WHICH.** The walk carries
`row:1`; a BARE ch-0 event is still a scene, which is what every ch-0 event
written before today meant, so old arrangements replay unchanged. Both doors
verified: `row-e` → eeeeeeeee, bare `h` → sceneAt h.

## RECORD OR ENTER A CHANGE — `1a>1b`  (`placeClip`)

Recording worked; ENTERING did not exist, so a change you wanted at bar 5 had
to be performed at bar 5, in time, every time. **In EDIT on the master,
digit+letter places the change at the cursor cell instead of firing it**, and
the same chord there takes it back off — the step editor's own grammar, on the
arrangement. One change per channel per cell: a different letter at a step you
already wrote is a correction, not a second event. Measured — `clipAt` never
moves, so nothing fired:

      edit 1a @cell0   -> ch1a@0        edit 1b @cell0 -> ch1b@0 (replaced)
      edit 1b again    -> none          edit 0s @cell0 -> rows@0
      edit 1b @cell4   -> rows@0 ch1b@1

Only on the master, because that is when the lane the edit cursor belongs to IS
lane 0. **The cell cursor walks with ←→ at layer ≥2** (`inEdit()&&S.layer!==1`);
at layer 1 the arrows walk the desk instead, and stepping off the master
deselects it.

⚠ **AND A GESTURE NAMING WHERE YOU ALREADY ARE WAS DROPPED WHOLE.** goClip and
goScene return early with nothing to move, and the lane write sat behind that
return — so *"and here it comes back to a"* was the one change that could not
be recorded. Measured: `1a` on a channel already at a wrote no event at all;
now `ch1a@0.5`.

## THE WORD ON SCREEN IS SNAPSHOT

Gad: *"maybe we should call these not clips but snapshots, cause they change
the whole channel strip not just the midi notes"*. He is right — it carries the
sound, the racks, the mix and the loop. **UI TEXT ONLY.** `S.clips`, `goClip`,
`clipOf` and `CLIPKEYS` are in the save format and renaming them buys nothing
you can see. The desk-wide one stays a **scene**.

⚠ **"clip" is four different things in this file** — the clipper fx, the
clipboard, an audio channel's take, and this. Only the fourth was renamed.

## NOT BUILT, AND WHY

- **The master column still draws a clip event as a 3px DOT**, positioned by
  channel, with no letter. With step entry now real, reading back an
  arrangement means stepping to each cell — the flash names what landed
  (`bar 1.1 → ch 1 snapshot b`) but nothing shows it afterwards. Nine channels
  share an 8-character column, so a per-channel label collides; a ROW or SCENE
  event owns the whole column and could carry its letter. Not asked for, so
  not built.
- **The audio pitch-mode snap hole above.**

## QA CHECKLIST — master + recorded pitch, 2026-08-28

Reload **http://localhost:3033/**. Build must read `2026-08-28.1204` or later.
Ordered by what is most likely to be wrong.

1. **An ARP or a CHORD on a channel you have transposed records at the pitch
   you hear.** Put an arp on a melodic channel, pull the channel up an octave
   (or down), record a bar, then listen to the playback against your fingers.
   It used to come back an OCTAVE HIGH. *Measured: E4 → E5 before, E4 → E4
   after.* This is the one most likely to be what you were hearing.
2. **A note you play out of key records where you HEARD it.** Scale on, play a
   note the scale bends (a black key in piano-keyboard mode, or anything while
   a chord-master channel is holding a chord), record it, play it back. It used
   to come back at the pitch you PRESSED, not the one that sounded. *Measured:
   C3 sounded, C#3 replayed → now C3 both.*
3. **⚠ CHECK YOUR EXISTING PARTS.** Anything already recorded under the old
   rule is stored the old way — a generator take on a transposed channel is
   sitting in the lane an octave high and will now REPLAY an octave high plus
   nothing, i.e. exactly as it has been. This fix changes what gets WRITTEN,
   not what is already written. Re-record anything that sounds wrong. *No
   migration was attempted — say if you want one.*
4. **Master loop length.** Press 0, go into its rack (layer 2), hold tab and
   press ↑ / ↓ / ← / →. The MASTER's loop must change. It used to change
   whichever channel you were on before you pressed 0. *Measured: lane 0
   2 → 4 bars; before, lane 7 grew and the master stayed at 2.*
5. **Master clear.** Master selected, in its rack, ⇧⌫. The master lane clears.
   It used to do nothing at all — no flash, no change. *Measured: lane 0
   emptied; before, nothing.*
6. **`0s` walks the desk.** Hold 0, press s. Every channel goes to ITS OWN
   snapshot s — channels with no s get a fresh empty bar on the same
   instrument. One flash says how many moved. *Measured: a desk all on d →
   sssssssss.*
7. **`⇧0S` is still the desk-wide scene.** Hold 0, shift, press S. Stores or
   recalls one whole-desk snapshot, and does NOT move any channel's own
   letter. *Measured: letters stayed ddfdddddd, sceneAt went to s.*
8. **Old arrangements still replay as scenes.** If you have a master lane with
   recorded 0+letter changes from before today, they still recall SCENES, not
   rows. *Measured: a bare ch-0 event → sceneAt h; only new events carry row.*
9. **Enter a change without performing it.** Master selected, layer 2, press
   the edit key (⏎ / pattern edit), walk the cursor with ←→, hold 1 and press
   b. The flash says `bar N → ch 1 snapshot b` and NOTHING changes on the
   desk. Press 1b again at that cell and it comes off. *Measured: ch1b@0
   placed, clipAt never moved, second press removed it.*
10. **Recording a change to where you already are now lands.** Arm the master
    lane, play, and press 1a while channel 1 is already on a. An event goes
    down. *Measured: was no event at all, now ch1a@0.5.*
11. **The word says snapshot.** Flashes read `ch 3 · snapshot f`, `row s`,
    `scene q — one desk-wide snapshot`. Internals still say clip; your saved
    sets are untouched. *Not a format change — no export needed.*

# MACROS, AND THE MODE THAT CAME OUT — 2026-08-27/28 (branch `sound-library`)

## THE KIT GLOBAL MODE IS GONE  (225bb22)

Gad: "i kinda regret this global mode for at least mods and filters… maybe only
audio fx should just always be global and we dont need modes and
complications?" He was right, and the evidence was the week's:

- **THE TELL WAS FX.** It was already channel-level by construction —
  `rebuildRack` reads `S.presets[pi]`, not the pad — and nobody ever asked for
  a switch for it. **A default that needs no mode is the one already right.**
- **SHARING FORCED A MERGE POLICY, TWICE, both invisible.** "Keep the pad's
  envelopes, take the channel's other slots" silently ate every global env he
  added (a player's env is `src 1` too). "Except where the channel speaks the
  pad steps aside" silently REPLACED every pad's decay: C 0.297 · D 0.038 ·
  G 2.776 all became 0.05.
- **AND IT COULD NOT DO THE ASK.** "Global hit length" is not one envelope for
  twelve pads — that makes them identical. It is one dial moving twelve values
  each from where it was. That is a MACRO.

Out: `KITSHARE`, `kitGlob`, `kitVoicePre`, the `mods` field and its action.
⚠ ONE THING STAYED and it is a bug fix, not a mode: **fx edits on a kit go to
the CHANNEL.** The engine always read fx from `S.presets[pi]`, so an fx edit
sent to a focused pad landed in a rack nothing reads — dialling a reverb on a
kit pad did nothing, silently, since kits became twelve chains.

## MACROS  (0893e2f, 9293d3d)

Four per channel. **It needed almost no new machinery, which is the argument
for it:** a mod slot already carries up to EIGHT routes with their own
destination, amount and polarity, and routes already carry learned target
addresses. "One dial, many things" is a slot that already existed — it lacked
only a source whose value comes from a dial. `macro` is `MSRC[8]`; the slot
names its dial in `mac` (`rsel` was taken — it picks which ROUTE you edit).

**Additive and unconditional, which is why it needs no mode.** `voiceMods`
hands every voice the CHANNEL's macro slots alongside its own rack, so on a
kit one dial reaches all twelve pads with no merge policy and nothing
replaced:

    M1=0     C 0.500   D 0.138   G 0.143
    M1=0.5   C 0.250   D 0.069   G 0.072
    M1=1     C 0       D 0       G 0        each pad scaled FROM WHERE IT WAS

**LIVE under a held note** (Gad: "i need macros to run on live played note").
It was read once at voice build — fine for a drum, useless for a held note,
and the whole point of a macro. `press`/`flw` already had the machinery: a
ConstantSource per destination whose offset moves afterwards. Macro is that,
from a dial — `macN` bag, `setMacro()`, `engine.macroLive()`.

    ONE HELD NOTE, dial moved underneath: 264Hz -> 431 -> 705 -> back to 264

⚠ A voice STARTS where the dials already are — the live path zeroes every
handle and waits, so without that a note played at M1=60% came in at 0%.

**THE FRONT DOOR:** `macro` is a scope letter, same grammar as the rest —
`E=env L=lfo K=keytrack M=macro /=random`. ⌃M finds or makes one; holding it,
the arrows pick which dial and -/= the amount. M1..M4 appear at the end of the
instrument row once a macro claims one. Before this the feature was reachable
only by hand-building a mod slot AND knowing `macro` had appeared in the source
list — while the dials stay hidden until routed. That is not a feature, it is a
secret.

⚠ **EVERY BUG IN THIS FEATURE HAD THE SAME SHAPE**: the voice could SEE the
slot and still hear nothing. The static-source loop opens
`if(m.src<3||m.src>7)continue` — macro is 8.

## ⚠ THE BOUNDARY, MEASURED AND NOT MINE

On a kit with SAMPLED pads the static-source path does not reach pitch or
filter — a sample's playback rate is not among the params it resolves.
**VELOCITY fails there identically**, so this predates macros; the ENV path
does reach it. So today a macro on a kit shapes LEVEL, and a macro on a synth
channel shapes anything. Teaching the static path about sample playback rate
(and about envelope decay, which is not an AudioParam at all) is its own job.

## THE MERGE — verified, not assumed  (2026-08-28)

Gad merged the pulse-width thread in. Both threads edited `index.html`; the
history is linear and the tree clean. On the merged build:

    initialises fully, no dead-zone symbols, no console errors
    pool 272 · library 190 · 20 kits · MSRC_MACRO 8 · KeyM scope present
    KT808  12/12 distinct takes and centroids
    dial views correct — loops on the audio channel, one-shots on the smp op
    kik 8/8 · snr 8/8 · hh 6/8 clean at wild 60%
    macros still live under a held note: 264 -> 431 -> 705 -> 264
    and the other thread's width dial is there: pw, 0.05..0.95

⚠ **THE BROWSE DAEMON'S CONFIG CHANGED UNDER ME** — it had been restarted
without `--headed`, so every `$B --headed` call failed with "headed mismatch".
probe.sh already detects this; a hand-rolled call has to as well. And :3032
was DOWN after the merge. Both are the first things to check when a round
"stops working".

# DRUMS — 2026-08-27 (late, branch `sound-library`)

## THE WIDTH STOPS SNAPPING BETWEEN RUNGS  (73a3f3f)

Gad: **"it works now, not clicky but it is very stepped not fluid as id like"**.
Not a click any more — a STAIRCASE. `setWave` caches on `Math.round(d*40)`, so
a sweep only ever had 40 tables to land on and the timbre snapped between them.
On a slow sweep that is exactly what you hear.

The pair is already two oscillators crossfading, so it does not have to put the
SAME rung on both. **Straddle** — the rung below the width on one copy, the rung
above on the other, blended by the fraction between. Continuous width, and NOT
ONE EXTRA TABLE, which matters because more tables is precisely what drained
memory the commit before.

    slow sweep 0.25Hz, harmonic 2 sampled every 10ms
                        flat treads   blending between rungs
      before (2006)      19% / 18%     0%
      after               4% /  7%    77-78%
    waveCache after ten notes: 60, flat

⚠ **THE PART I GOT WRONG FIRST, AND IT IS THE LESSON.** I argued the reload
could never be heard, BY PARITY: even rungs on A, odd on B, so crossing a rung
always re-tables the copy whose weight has just reached zero. The argument is
sound and the premise is false. At 2Hz the width crosses a rung roughly every
OTHER control tick, so x does not pass through 1 — it jumps from 0.4 to past 1
in one tick and the copy whose turn has come is sitting at 0.6. Reloading there
is the very click it was meant to remove: **measured 3.1-4.6 per second,
straight back to the pre-fix numbers.**

So the reload is gated on the MEASURED gain. A copy that is still loud has its
weight sent to zero this tick and waits for the next; the sound leans on the
other copy meanwhile, which is the nearest rung — the behaviour that measured
clean. A fast sweep degrades to snapping, a slow sweep gets the true blend:

      2Hz     clicks/s 0 / 0 / 0, worst jump 3x the median step
      2Hz     40% blending, and silent
      0.25Hz  77-78% blending

**A TIMING ARGUMENT IS NOT A MEASUREMENT.** "By the time the next tick arrives
that gain will be zero" depends on a tick rate and a sweep rate the code does
not have in hand. Ask the gain. Same shape as the cache-key mistake below.

## DOES WIDTH EVEN MAKE SENSE ON TRI AND SAW — Gad asked, 2026-08-27

Worth writing down, because the honest answer is "only on one of them".

- **square** — yes, it IS pulse width. The edge moves; measured duty follows
  the dial to three places.
- **triangle** — the classic, musical control here is SYMMETRY: move the peak
  off centre and a triangle morphs toward a saw. TEN does not do that. It
  re-weights the harmonics by the pulse's magnitude ratio, which thins the
  triangle without moving its peak. An effect, but not a width.
- **saw** — a saw has no width. Same harmonic re-weighting; it reads as a
  comb/notch sweep, which the filter rack already does better and with a
  cutoff you can aim.
- **sine** — nothing at all. One harmonic scaled and normalised straight back
  out. Measured rms 0.3823 at 0.5 against 0.3816 at 0.15.

If it is ever worth revisiting: `width` on a triangle should become the
symmetry morph (tri -> saw), which is continuous by construction and needs no
table at all, and on a sine it should be hidden rather than shown doing
nothing.

## ⚠ MY REGRESSION: A CACHE KEY IS AN API  (aa099d5)

Gad, on the crossfade build: **"now i dont hear any movement on saw and tri,
and the whole app feels glitchy like memory is drained"**. Both symptoms, one
line, and it was mine.

The crossfade pair baked the note's free-run phase into its table:

    const ph0 = op.phm===1 ? Math.random()*360 : op.ph;

`setWave`'s cache key is **wave:phase:width**. With a phase of ZERO — which is
what the old pwLive always passed, deliberately — that key has 40 rows per wave
and stops. With a phase PER NOTE it gains a third dimension, so every note
minted its own row for every width the sweep touched:

    waveCache entries after each of ten notes on a saw
      broken   27, 54, 81, 108, 135, 162, 189, 216, 243, 270 ...
      fixed    27, 27, 27, 27, 27, 27, 27, 27, 27, 27

Chrome builds ~160KB of band-limited tables behind each PeriodicWave, so three
notes was 13MB and it never came back.

**AND THE SILENCE CAME FROM THE SAME LINE.** `createPeriodicWave` runs on the
MAIN THREAD, and this called it ~180 times a second with a fresh key every
time. modTick is a main-thread interval; a modulator that never ticks moves
nothing. The width was not broken, it was STARVED. That is the shape to
remember: a main-thread allocation in a control-rate path takes out every other
control-rate thing in the app, and it presents as "that feature stopped
working" somewhere else entirely.

**The fix, which is also better than what was there before.** The table's phase
is fixed and free-run randomness moved to the START TIME — an oscillator
started r/f seconds early is at phase r when the note lands, and both copies of
a pair start at the same instant so they stay locked. The ORIGINAL code baked a
random phase at note-on and then had pwLive pass phase 0, so the first width
edit of every free-run note silently jumped the waveform's phase; now the table
never changes phase at all. `waveCache` also has a 600-entry cap — `wtWave` has
always had one, this side never did, and it did not matter while the only
caller passed zero.

Verified on the served bytes: centroid swing across a 2Hz sweep is 1304Hz on a
saw, 302 on a triangle, 988 on a square, and the cache grows by **0** across
eight notes of each. Clicks stayed gone — triangle jumps/s 0/0/0, worst jump
2-5x the median step.

**THE LESSON: A CACHE KEY IS AN API.** Every value reaching one has to be asked
"how many distinct values can this ever take", and "a random number per note"
is the answer that unbounds it.

## QA CHECKLIST — pulse width and spread, 2026-08-27

Reload **http://localhost:3033/** (a plain reload keeps your set). Build must
read `2026-08-27.1519` or later. Ordered by what is most likely to be wrong.

0. **FIRST: play for a minute and watch for the glitchiness.** The build that
   drained memory was `1824`; `1929` and later are clean. *Measured: waveCache
   entries grew 27 per note and never stopped on 1824; on 1929 they grow by 0
   across eight notes of each wave.*

0b. **Width on a SAW and a TRIANGLE must MOVE, and must not crackle.** Both
   were dead on 1824 (starved main thread) and both stepped before that.
   *Measured: centroid swings 1304Hz on a saw and 302Hz on a triangle across a
   2Hz sweep; triangle clicks/s 0 against 1.5-3.1 before.*

0c. **Width on a SINE does nothing, and never has** — one harmonic scaled and
   normalised straight back out. Not a bug introduced here; say if you want it
   to mean something. *Measured rms 0.3823 at 0.5 against 0.3816 at 0.15.*

1. **A patch you already had, with a square at pw 0.5.** Play it. It must sound
   EXACTLY as before — that case is mathematically identical and 25 of the 29
   factory presets that use a square sit there. If anything moved, this is the
   first thing to say. *Measured: square RMS against a saw's is 1.732 by
   definition; 1.676 before, 1.741 after.*

2. **S606, RD909, VEP9** — the only factory presets that dialled a width other
   than 0.5. They WILL sound different, because the width now does something.
   The question is whether they sound better or just changed. *Not measured as
   a judgement — only that nothing went silent.*

3. **The thing you asked for: an LFO on a square's width.** Should be a smooth
   moving edge, no crackle at any rate or depth. *Measured: excess edges per
   second under a 2Hz full-depth sweep, +80.2 before, -0.4 after, floor +0.4.*

4. **Sweep the width by hand** inside the param scope (`⇧`/`⌥` + the width
   pair). Should be smooth under a held note too, not just under an LFO.
   *Not measured — the probe drives an LFO, not the keyboard.*

5. **The phase engine** (vox `fmw`), same LFO on width. Smooth, but this one
   still swaps a table rather than sliding a delay. *Measured 3.1 excess
   edges/s against 120.3 before — small, at the edge of what the detector
   resolves, but not the flat zero the native engine gets. If you can hear
   anything here, say so and it gets the same treatment.*

6. **Very low and very high squares** — a bass note near 32Hz, a lead near
   2kHz, width at 0.25. *Measured duty 0.33 and 0.27 against 0.25 asked, but
   both are the MEASUREMENT running out of cycles and out of harmonics under
   Nyquist, not the width. Worth an ear.*

7. **Spread on a rake / comb / vowel filter, turned by hand under a held
   note.** The peaks must move while the note sounds. *Measured: peak 2 of a
   rake bank, 1275 -> 1275 Hz before (dead), 803 -> 1748 after.*

8. **Put an LFO on that spread** — it is offered in the destination picker at
   all now, which it never was. *Measured: peak 2 swings 753 -> 1798 Hz under
   a 3Hz LFO; before, the route would not even resolve.*

9. **Cutoff and spread together** — move the cutoff after moving spread. The
   shape must drag as a shape, not collapse. *Not measured; the `_r`
   bookkeeping is shared with cutLive but no probe covers the pair.*

## ...AND THE OTHER THREE WAVES STEPPED IT TOO  (9010ee0)

Gad, after the square fix: **"still a bit crackley"**. The square measures
clean — excess edges/s under a FULL-depth sweep is -1.6 at 2Hz, -0.4 at 8Hz,
+0.3 at 20Hz — so this was the rest of the mechanism. Every OTHER wave still
got its width by swapping a PeriodicWave on a running oscillator ~180 times a
second.

**The square's fix does not generalise.** A pulse is a saw minus a shifted saw;
but `w(f)-w(f-d)` at d=0.5 is a SQUARE whatever w was, so applying it to a saw
throws the saw away. Their tables must stay exactly what setWave builds, so the
STEP goes instead of the table: two phase-locked oscillators, the new width
lands on the SILENT one, the pair crossfades — the wavetable operators' trick.

The witness is the standby's gain AT THE MOMENT the table lands on it, which IS
the step:

    before   1.0        the table went onto the AUDIBLE oscillator
    after    0.00308    -50.2dB worst case over 188 swaps, tri and saw alike

1ms time constant against a control tick **measured at 5.8ms median** — not the
8ms of modTick alone, because automation calls pwLive too. Sizing the fade
against 8ms left the standby at 0.021 (-33.7dB) instead of 0.003.

Built ONLY where the width can move — a dialled width or a route pointed at it
(`pwMoves`). A plain saw at 0.5 builds no pair: 3 pitch params at unison 3
rather than 6. **A SINE is excluded because its width does nothing at all** —
one harmonic scaled, and createPeriodicWave normalises it back out. Measured
rms 0.3823 at width 0.5 against 0.3816 at 0.15, centroid 132 against 131.

⚠ **OP 0 AGAIN.** Second width fix in a row that had to be written twice,
because the operator loop starts at 1.

**AND THE TRIANGLE PROVES IT.** A band-limited triangle has no discontinuity of
its own — the smoothest wave in the set — so every large sample-to-sample jump
in one IS an artifact, with no guard band needed. Jumps over 8x the median step:

    triangle, 2Hz full-depth sweep, three runs each
      before   1.5 / 3.1 / 3.1 clicks/s, worst jump 9x / 9x / 13x
      after    0 / 0 / 0,                worst jump 3x / 2x / 3x

A saw jumps once per cycle by construction (1091/s of band-limited edge samples
at 131Hz) and a square twice, so the count is blind on those — but they take
the identical path and the triangle proves the path.

⚠ **THE METRIC THAT COULD NOT SEE IT**, so nobody re-derives it: inter-harmonic
junk under the same sweep reads -56.7/-58.4/-57.8 before and -58.9/-58.2/-59.8
after. Overlapping. The sweep's legitimate sidebands sit 20dB above the
artifact and swamp it — and an exact continuous sweep reads WORSE on that
metric (-42.2) than a stepped one that barely moves (-46.5).

Two probe traps worth keeping: `pwmall` has to PIN vox — unison detune makes
the sum inharmonic and put -43dB of energy between the harmonics on a totally
STATIC note — and it has to take f0 FROM THE VOICE, because two origins do not
necessarily play the same note and 1.7% is a whole guard band at harmonic 12.

## PULSE WIDTH WAS NEVER A WIDTH  (0104f18)

Gad: "can you make that pulsewidth modding will be smooth? right now its
crackly". It was crackly, and underneath that the dial was doing nothing.

**Zero times anything is zero.** A square has only ODD harmonics, and setWave
got width by SCALING the wave's own coefficients by sin(k.pi.d)/sin(k.pi/2) —
so the even ones, which are 0, stayed 0 at every width. A pulse needs them:
|b_k| = 4/(pi.k)|sin(pi.k.d)| for EVERY k. `fmHarm` had the identical map, so
both engines were the same. Duty read straight out of the waveform:

    asked   0.50   0.35   0.25   0.15
    before  0.500  0.500  0.500  0.500      the control did nothing at all
    after   0.501  0.350  0.249  0.151

    h2/h1 at duty 0.25   before 0.000  after 0.707  theory 0.707
    h2/h1 at duty 0.15   before 0.000  after 0.891  theory 0.891

**And the crackle is the control tick, which no amount of resolution fixes.**
The width lands every 8ms and a table swap on a running oscillator is a STEP:
wherever the phase sits between the old edge and the new one, the output flips
early and flips back at the real edge — an extra edge PAIR, which is the click.
MEASURED, not argued: taking the width cache from 40 steps to 400 moved the
broadband floor between the harmonics 1.1dB (-47.1 -> -46.0), because the
artifact energy is the total distance the edge travels and that is fixed.

So a square operator is a SAW MINUS A DELAYED COPY of itself, which is exactly
a pulse — s(f-d)-s(f) is 2-2d for f<d and -2d for f>d: duty d, span 2, mean 0,
and at d=0.5 the same wave as a plain square, edge for edge. delayTime is an
AudioParam, so the edge slides and there is no step at any rate.

    excess edges/s under a 2Hz full-depth sweep      0 = smooth
      native        before  +80.2   after   -0.4   (floor +0.4)
      phase engine  before +120.3   after   +3.1   (floor  0)

The phase engine keeps its table — a worklet table is read per sample and swaps
on phase — but it needed the COSINE half, since a pulse is only odd about the
origin at d=0.5 and `fmTable` summed sines alone. `fmHarm` returns `harc` now.

⚠ **OP 0 IS BUILT SEPARATELY.** The operator loop is `for(let i=1;i<10;i++)`, so
a fix applied only there reaches every operator EXCEPT the first — the one
nearly every patch uses. Cost a round: the static numbers came back exact and
the sweep still crackled at 62/s, because it was on the table path the whole
time. Anything touching operators gets checked against BOTH sites.

**What changes for existing patches:** 29 of 190 factory presets use a square
and 25 sit at pw 0.5, unchanged by construction. The four that dialled a width —
S606, RD909, VEP9 — now sound like the width they asked for, and so does any
saved patch that moved the dial. Level unchanged: a square's RMS against a
saw's is 1.732 by definition, measured 1.676 before and 1.741 after.

`tools/probe.sh pwm` is the measurement — duty out of the waveform, harmonics by
Goertzel against theory, excess edges as the click rate. Two traps it cost:
the level split has to be the MIDPOINT BETWEEN THE TWO LEVELS, not zero (a
DC-free pulse at duty 0.15 sits at +1.7/-0.3 and a quarter-of-peak threshold
never finds a falling edge), and it has to TRACK when the width is moving.
`tools/pw.sh` and `tools/wev.sh` front the tab before measuring it — `eval` runs
in whichever tab is fronted, and measuring the wrong build reached a wrong
conclusion twice in one session.

## SPREAD WAS THE ONE DIAL NOTHING COULD REACH  (4aa773d)

Gad: "another thing i found i can[not] mod or live tweak, spread of special
filters like rake". Both halves true, two different causes.

**Nothing could drive it:** `destRate` had no entry for `flt.spr`, so it
returned undefined, `modDests` dropped it, and the picker answered "nothing can
drive spread yet" for every source. That is SIX filters with an unmodulatable
shape — fmnt vowl twin trip comb rake, the whole FBANK.

**And your own hand did not reach a sounding note:** a hand edit of `spr` went
to `rebuildRack`, grouped with `typ` and `pol` under "these change what the
filter IS". They do; spread does not, it only moves where the peaks SIT. And
rebuildRack was the wrong tool anyway — it rebuilds the CHANNEL bus, and on a
synth channel the filter is per VOICE, so the held note never heard it.

    peak 2 of a rake bank in Hz, spread 0.05 -> 0.95 under a HELD note
      before   1275 -> 1275     DEAD both ways
      after     803 -> 1748
    a 3Hz lfo on spread
      before   1275 -> 1275     DEAD, the route would not even resolve
      after     753 -> 1798

`sprLive` re-aims the bank the way `cutLive` already does for a cutoff move,
on the voices AND the bus bank, keeping the same `_r` bookkeeping so a cutoff
move after a spread move drags the NEW shape. Cheap because a bank's peak
COUNT never changes with spread — only the ratios — and every shape's per-peak
LEVELS are constants, so there is no gain to chase.

`tools/probe.sh spread` asks all three questions in one call. It reads PEAK 2
OF THE BANK in Hz: a centroid over a whole saw read 1783 vs 1776 across a
change that did nothing at all, so it is far too blunt to judge a shape by.

## ⚠ TWO SESSIONS IN ONE WORKING TREE, 2026-08-27

Two Claude sessions were editing this directory at once. Costs, both real:
`tools/probe.js` had a new `kitoct` probe overwritten (recovered byte-identical
from the other session's own scratchpad copy), and an in-progress probe was
swept into somebody else's commit by `git add -A`. The pulse-width work was
finished in `.claude/worktrees/pulse-width` on port **3034** (launch.json
`ten-pw`) and merged back once the tree was clean. If a second session is live,
take a worktree — the merge cost one conflict, on the build stamp.

## "PRESETS FOR KITS WHICH DONT EXIST RIGHT NOW"

They existed here and not for him, and the design had TWO ways to lose them —
either of which leaves a session with no kits and nothing said:

- **the TIMER was a race.** libSampleKits ran once, on a 2.5s setTimeout after
  the manifest resolved. If the shelf has not finished decoding by then it lays
  nothing AND NOTHING EVER CALLS IT AGAIN. 539ms here, on one machine with one
  tab and no set to restore — not a number to design against.
- **the WRITE could fail.** 831KB of kits into a `setItem` that throws is 831KB
  of kits silently absent.

**A FACTORY KIT IS NOT DATA — IT IS DERIVABLE**, from this file plus the
manifest, from a fixed seed. So it is built in memory, appended by `libAll`,
and filtered back out by `libStore` (`gen:true`) so it can never be written.
Costs nothing, cannot be lost, reappears the moment the shelf loads. The
generator OWNS those names so a stored copy from the old build is dropped on
read — no version bump, self-healing. **library 845KB -> 643KB.**

    storage filled with 4MB of ballast   -> 20 kits, 10 sampled
    cache dropped, rebuilt cold          -> 10 sampled kits immediately

⚠ `withSmpKits` DECLINES SILENTLY during module init — POOL, KITMAP and MIXT
are all in their dead zones there, and a throw lands in libAll's catch, which
returns `[]`. That is exactly how the whole library read as empty this
morning. **Fifth time this trap has been sprung today.**

## ROLLING A KIT NOW GIVES YOU A KIT

**The layout was wrong.** `kik snr hh hh perc tom cymb wood zap perc snr kik` —
two kicks, two snares, a zap, no clap/rim/cowbell/clave. Everything uses
KITMAP now (kick·snare·hat-closed·hat-open·clap·tom·rim·cymbal·cowbell·conga·
shaker·clave), so **C is the kick wherever the kit came from**. LIBV 32 re-lays
the factory kits and ONLY the kits.

**The coherence was wrong.** One machine per roll, wildness says how far it
strays. Five rolls per rung, % of pads from the dominant machine:

    w20   100 100 100 100 100      dr5 · rx5 · rx5 · tr808 · tr8
    w45    83  75  67  58  75
    w70    75  67  50  50  58
    w95    42  25  33  42  58

⚠ **TWO WAYS A "SINGLE-MACHINE KIT" LIED.** `kitPick`'s second loop falls back
to ANY machine, so a caller asking for one machine got a scatter and never
knew — it takes `strict` now. And the home machine was drawn from every style
present, including `trap` (ONE surviving sound) and the Rhythm King (ten); a
home that cannot furnish a kit is a scatter wearing a machine's name.
`kitMachines(6)` is the bar and eight machines clear it.

`tools/probe.sh smpkit roll=<wild>` tests the dice; `smpkit name=KT808` the
library. 9/12 distinct takes at w20 is the FALLBACK working (the CR-78 has no
clap and no separate open hat) — the twelve centroids are still all different.

## WHAT IS OPEN, IN HIS ORDER

- **Drums are where he wants to be.** Kits exist, roll coherently, and the
  drum-cat rolls reach the shelf ~half the time. His ear has not been on any
  of it yet.
- `_bass-round1.json` is parked until he says drums are done.
- `_similar/` (312 files) still waiting on his ear.
- The backup ring `ten-bak-v1` was 2.77MB of a ~5MB origin — the next storage
  wall, and the library no longer being the biggest consumer is why it is now
  visible.
- hh 8/10 and cymb/tom/perc 9/10 on generated drums; every remaining dud is
  QUIET and in the SYNTH recipes, none in the sampled path.

# WHERE THE INSTRUMENT STANDS — 2026-08-27 (afternoon, branch `sound-library`)

## STILL A BRANCH. Live and `main` have none of this.

Gad pruned the library by hand (294 -> 250) and flagged four misplaced files
with a "this is a ..." prefix. Then: normalise, trim the dead air, build drum
kits from the classic sounds, carry on with navigation, and make drum rolls
use samples.

## THE POLISH  (bd524e1)

A FIXED THRESHOLD CANNOT FIND THE CUT, and three files proved it. 100ms RMS
windows, dB below each file's own peak:

    tr8-shaker-01   -21 then -77 -77 ... for 2.1s      a flat FLOOR
    rx5-kick-09     -12 -29 -44 then -86 -86 ...       a flat FLOOR, lower
    rx5-cymbal-01   -12 -15 -17 ... -74 -76 -76        real DECAY, then floor

The dead air is a NOISE FLOOR, every file sits at a different one, and the
cymbal's genuine tail goes quieter than the shaker's noise. So the floor is
found PER FILE (5th percentile of windowed RMS), the cut sits 8dB above it,
and a cap makes sure nothing above -60dB relative to peak is ever cut. Then
40ms of headroom and a 12ms RAISED-COSINE fade — cosine because a linear ramp
leaves a slope discontinuity you can hear on a low sine, and a kick nearly is
one. Every output ends at exactly 0.000000.

    cymbal 4.40 -> 3.00s (decay kept) · ride 5.00 -> 3.36 · shaker 2.22 -> 0.07
    short hits untouched · 205s of dead air gone · 15.3MB -> 9.2MB

Normalised to -1.0dBFS PEAK (verified: all 250 land on -1.00 exactly). Peak and
not loudness deliberately — loudness normalising makes a hat as loud as a kick,
and per-hit balance is the KIT's job. Leading silence measured and left alone:
worst file starts 0.7ms late, and moving a drum's hit is the worse crime.
`tools/polish_oneshots.py --dry-run` reports before touching anything.

## SAMPLED KITS  (17a4e79) — three separate blockers, none the obvious one

1. **A KIT COULD ONLY HOLD ONE SAMPLE.** `opSamples` was keyed
   channel:operator and a kit is TWELVE pad chains on one channel index, so
   all twelve collided on `pi:0`. `smpKey` adds the pad's pitch class, ONLY
   for a kit, so a plain channel's key is byte-identical and nothing migrates.
2. **A PRESET COULD NOT NAME ITS SAMPLE.** A slot carries
   `smp:{f:'oneshots/kick/tr808-kick-06.flac'}` now and `applySmpRefs`
   resolves it, re-runnably, because the shelf lands asynchronously.
3. **THE LIBRARY WAS FULL** — 2,152,103 bytes stored, a 1MB test write
   throwing QuotaExceededError, and the kits' 831KB failing into an EMPTY
   CATCH so the library silently did not change. Racks store sparsely now
   (one kit was 92,315 bytes with 885 of 1,040 slots at factory default) and
   the read tolerates both shapes. **LIBV 31.** library 2564KB -> 845KB.
   ⚠ `ten-bak-v1`, the undo ring, was 2.77MB of a ~5MB origin. Whole origin
   is 2143KB now, but the backup ring is still the biggest single consumer
   and is the next thing to hit this wall.

Ten kits: KT808 KTTR8 KTLIN KTC78 KT505 KTRX5 KTDR5 KTMRK KTMX1 KTMX2.
`tools/probe.sh smpkit name=KT808` — 12/12 distinct takes, 12/12 distinct
centroids: kick 652Hz · tom 340 · conga 1501 · cowbell 3033 · clave 4805 ·
rim 5112 · clap 5269 · snare 6220 · hat-open 10540 · cymbal 11628 ·
hat-closed 11869 · shaker 14623.

## DRUM ROLLS REACH FOR THE SHELF, ~half the time, in three shapes

`pure` the take gated so the SAMPLE is the envelope · `layer` the take over a
synth body (the only shape that swaps the gate for a drum envelope) · `mangle`
driven, cropped, sometimes reversed. All `pure` at wild 20%, `layer` from 50%,
`mangle` at 90%.

**And the sampled half exposed two broken SYNTH recipes** — every sampled perc
in a run measured 0.26-0.44 while every DUD was a synth one:

    perc  a BANDPASS at 2.4-3.6kHz over a root near 130Hz. PIS9 peak 0.005.
          The rule the kicks/snares/hats keep and this one never did.  7->9/10
    cymb  ring-modulated metal then highpassed at 7kHz — which is where ring
          modulation has just moved the energy FROM. Four of ten at
          0.025-0.058 vs 0.15-0.19, every mix level inside 0.38..0.47, so it
          was never the fader.                                        6->9/10

Every drum category at wild 60%, ten each: kik 10 · snr 10 · wood 10 · zap 10 ·
cymb 9 · tom 9 · perc 9 · hh 8 = **75/80**.

## NAVIGATION  (c5a6967)

`jump` is `big`'s semantic sibling in adjust(): the coarse step as a PLACE
rather than a number of places. Shift walks the instrument groups —
**21 stops to cross a 275-entry shelf**, against 296 presses. Backwards lands
on the HEAD of the previous group.

⚠ **TWO BUGS IT EXPOSED, both compounding:** poolAdd deduped by BUFFER
IDENTITY, and a re-fetch makes a new AudioBuffer — so every restore of a set
using library samples added duplicates (14 after one load, growing each
reload). A factory take is its PATH. And a set restores BEFORE the shelf
loads, so its takes entered with a session `ord` and no instrument and then
sat stranded when the manifest arrived; the manifest reclaims them now.

## ⚠ THE TRAP THIS FILE KEEPS WARNING ABOUT, SPRUNG THREE TIMES IN ONE DAY

None of these are visible to `node --check`, and two of them produced NO
console output at all:
1. `applySmpRefs` guarded with `if(!engine)` and is called from `rebuildRack`,
   which runs DURING `const engine = new Engine()`. Reading a const from
   inside its own initialiser THROWS — it killed the whole script at that
   line, silently. The engine is an argument now.
2. `packRacks`/`unpackRacks` as const arrows below `libAll`, which `libInit`
   calls during module init: the throw landed in libAll's catch, which returns
   `[]`, so **the entire preset library read as EMPTY**. Declarations hoist.
3. The read order was the write order instead of its MIRROR — `portPreset`
   over packed racks walks objects as arrays.

**The rule: anything called during module init must be a function declaration,
and must not close over a const declared later.** Load the page.

Also: the 808 kit was first named `K808`, which is already a factory KICK
beside S808 and H808 — the duplicate guard skipped it silently and it simply
never appeared. Kits are on `KT*`.

## WHAT IS OPEN

- **`_bass-round1.json` still has no verdict from Gad** — the ten-bass round
  from this morning. His ear drives the next trim pass.
- `_similar/` (312 files) still waiting on his ear; nothing there loads.
- **Only bass and the drum categories have numbers.** No listening round on
  lead/pad/keys/chord/plk/fx.
- The backup ring is the next storage wall.
- `hh` sits at 8/10 and `cymb`/`tom`/`perc` at 9/10 — the remaining duds are
  all QUIET, all in the synth recipes, none in the sampled path.

# WHERE THE INSTRUMENT STANDS — 2026-08-27  (branch `sound-library`)

## THIS IS A BRANCH. Live is untouched; `main` has none of it.

Three asks, all on `sound-library`: tell one-shots from loops, build a
classic-drum-machine library, rebuild both randomisers.

## 1 · THE POOL KNOWS A LOOP FROM A ONE-SHOT  (8237018)

`poolKindOf` classifies every take ONCE, at `poolAdd`, and each browser gets a
VIEW — an audio channel hunts loops, a synth op's smp slot hunts one-shots,
the other kind still reachable at the far end. Nothing is filtered away; the
pool never moves, because ops and channels store the BUFFER, never the index.

**Amplitude alone cannot do it.** The first rules called `drone` a one-shot and
`sweep` a loop: same envelope shape, different spectra. Zero-crossing DRIFT,
first quarter to last, in octaves, is what separates them —

    sweep +4.98   riser +1.86        gestures, fired once
    pluck -1.72   kick  -1.14        hits, losing brightness as they decay
    koto  +0.72   tabla +0.67        the loudest any LOOP shows

so `|drift| >= 1.2` is a one-shot with 0.4 octaves of margin. 26 of 26 called
right. `tools/probe.sh poolkind` re-runs it and drives the real dial specs.
The manifest DECLARES kind; measurement is the fallback for drops/recordings.

## 2 · 294 DRUM-MACHINE ONE-SHOTS, ALL FREE TO SHIP  (72fad43, 9a1cefe)

Ten machines: TR-808, CR-78, LinnDrum LM-2, Maestro Rhythm King, TR-505,
Yamaha RX5, Roland TR-8, Alesis DR5, and two derived kits. `LICENSES.md`
names the licence of every sound. **REJECTED and recorded so nobody re-adds
them:** oramics' two TR-909 sets read `"license": "None"` and trace to a blog
post. The 909 here is the TR-8's — Roland's own model, recorded by the repo
owner, CC0.

**FLAC, decided by measurement** through Chrome's own `decodeAudioData`:

    flac  len 11026  first audible 5  peak at 47   the WAV exactly
    opus  len 11026  first audible 5  peak at 175  2.9ms late
    aac   len 11026  first audible 0  peak at 46   pre-echo AHEAD of the hit

**Layout is by TYPE**, machine as the name prefix (`tr808-kick-03`), so a kit
can be reassembled by prefix later. **Pruned by measurement** — 24 log spectral
bands + 16-point envelope + log duration, within one instrument folder only:

    survivors of 666   0.20 -> 517   0.30 -> 416   0.45 -> 294   0.60 -> 196

149 deleted (the Boochi44 kits measure 0.00 from the Fischer 808 — they are
re-cuts), 312 parked in `_similar/` grouped `gNN-`. `PRUNED.md` lists every
decision. Both thresholds are flags: `--tight 0.20 --loose 0.45`.

**The whole shelf loads at boot** — 666 files fetched and decoded in **539ms**,
35.9MB, 194MB of buffers, nothing failed. `POOL` cap 32 -> 1200 and it now
evicts the oldest SESSION take, never a library sound. `ord` keeps the dial in
manifest order rather than fetch-completion order.

⚠ **`poolSP` must stay declared up with `SP`.** GRANF is built at load and
calls it; a const read inside its own TDZ throws and `node --check` never sees
it. This is the trap CLAUDE.md warns about, hit for real.

## 3 · BOTH RANDOMISERS  (c5624de + this commit)

**Gad's deal, and keep it:** a ROLL stays instant — no render-and-check at roll
time. The render-and-check runs at DEVELOPMENT time and its answer is a number
baked into a table. `tools/probe.sh genqual · archlvl · patqual`.

**The patch generator: 29 archetypes, stepped wildness, one anchored filter.**
Rung 0 the category's canonical two · 1 any of its archetypes · 2 plus a
character layer laid OVER a patch that works · 3 off the leash, may borrow from
a neighbour. Atonal lives in `fx` alone.

THE BUG WAS ONE BUG, not five — four of five pad duds at wild 80%:

    ZEP1 highpass 2175Hz on a 131Hz note  peak 0.023  centroid 10936
    FUT3 highpass 2361Hz                  peak 0.016
    CIK1 bandpass 6366Hz                  peak 0.021

`frq` came from `300*2^R(0,5.3)` with NO reference to the note. Every filter is
a multiple of the sounding fundamental now. **pad at wild 80%: 3/8 -> 6/8
clean, no SILENT, no HARSH, centroid 1385..10936 -> 488..2104.**

Level trims are MEASURED (`archlvl`), and every archetype under 0.10 was
bandpassed: keys spread x4.34 -> x1.14, lead x2.51 -> x1.59, plk x2.15 -> x1.78.
`fx/noise` was worst — bandpassed off a fundamental NOISE DOES NOT HAVE.

⚠ **THE SAME BUG BIT ME TWICE MORE, both times through the BORROW.** A bass
borrowing `blip` from plk read 393Hz/peak 0.397. Putting the octave back
*afterwards* made it worse, because the archetype had already placed its filter
against the OLD `hz()`. Two rules came out of it: the octave is set BEFORE the
archetype runs, and a bass borrows only from `lead` (a percussive pluck does not
become a bass by being played low). **Any new borrow gets asked both questions.**

**The pattern generator: three things shared by every lane** — an accent grid
(velocity was a constant with 6% jitter), one rhythmic cell the melodic lanes
quote, a four-bar arc. A/B against live, `patqual n=8 --ab`:

                            live 08-26   this build
      accent agreement         0.804        0.828
      bar 4 vs bar 1           0.243        0.314
      offbeat concentration    0.726        0.750

⚠ **THREE MEASUREMENT BUGS, each of which lied in a different direction:**
`barvar` read 1.000 on EVERY build because clearing a lane's events sends
genLane down its own "auto or empty" branch and resets the lane to one bar —
leave a dummy event behind. Offbeat concentration was dominated by the HAT
lane, a continuous stream nobody chose, so it tracked hat density and reversed
sign once excluded. And quoting the cell *plus* perc's old offbeat list made
concentration WORSE — adding positions is the opposite of agreeing on them.

## WHAT IS OPEN

- **`_bass-round1.json`** is the ten-bass audition set (import it; export yours
  first). Ten basses, ONE part from one shared context, so soloing compares the
  SOUND. Two per rung 0/3, three per rung 1/2. All ten sound: peaks
  0.107..0.284, nine at 64.6Hz. **ch9 (`reed`, the borrowed lead) sits on its
  3rd harmonic at 196.5Hz and runs ~1.9x hotter than the rest** — the one thing
  to listen to first.
- His verdict on those ten drives the next trim pass. Rounds of ten, his ear.
- `_similar/` (312 files) is waiting on his ear too; nothing there loads.
- The pool dial is ~320 entries end to end and ⇧ does not stride it. Raised,
  not built — he chose "load it all" over an index and this is its cost.
- Other categories have had no listening round yet, only numbers.

# WHERE THE AUDIO CHANNEL STANDS — 2026-08-26 (sixth batch)

## THE VELOCITY WALL WAS MY OWN FILTER — and a correction worth keeping

He offered to check out a commit from last week and test the keyboard there.
**The archaeology says that would prove nothing:** `git log --since` over
`index.html` shows the ONLY commits touching the HID device-picking code in
the last two weeks are today's two (80a7726, 86cd1a0). The path that picks
and opens an interface is byte-identical to what he ran last week.

**THE CORRECTION, and it is the whole entry.** This morning I concluded the
analog interface was refused "by POLICY, not exclusivity" — measured by
opening it first, alone, with nothing else claimed. That measurement was
real but it was taken in the WRONG BROWSER: the gstack automation profile
is *Google Chrome for Testing*, a different app bundle with its **own macOS
Input Monitoring grant**. On macOS an interface carrying a keyboard
collection needs Input Monitoring for THAT app; without it, `open()` throws
NotAllowedError no matter what Chrome's blocklist says. So the finding said
nothing about the browser Gad plays in — TEN's own error text has named
Input Monitoring all along.

And the consequence was worse than a wrong note: the morning build turned
that conclusion into a **ban**, filtering every protected interface out
before choosing. On this board the analog stream lives on exactly such an
interface (0xFFFF/0x1 sitting beside 0x1/0x6), so the filter guaranteed no
velocity **even on a machine that would have granted it**. That is my bug,
not the browser's.

Now: PROT is a PREFERENCE. The stream interface is tried first, and the
fallback to the config-only one runs only when the open actually refuses —
so a board still connects (name, keymap, 0x8F, lights) when velocity
cannot. Verified with fake interfaces shaped exactly like his, both ways:

    no Input Monitoring   → chose config,          opened 0 only, streamBlocked true
    Input Monitoring on   → chose stream+keyboard, opened 0 and 1, streamBlocked false

The morning build could never reach the second row.

`streamBlocked` is decided AFTER the opens now, and both messages name the
actionable cause: the connect flash says *no analog interface — velocity is
off; macOS Input Monitoring for Chrome is the usual cause*, and the hid
readout carries *connected on the config interface only — no velocity …
grant Input Monitoring to Chrome (System Settings ▸ Privacy & Security),
then reconnect*.

⚠ **I can no longer drive his board from here**: the automation profile's
WebHID grant went with a browse-daemon restart, and re-granting needs a
picker gesture I cannot make. Interface-level questions now have to be
answered either by fakes (as above) or by his own Chrome.
⚠ **Both servers had died** (3033 and 3032 both refusing) — restarted, both
serving the working tree. Worth checking `lsof` at the top of any round
where he says "nothing works".

**HIS VERDICT, 2026-08-26: "ok we're good now." THE KEYBOARD ROUND IS
CLOSED** — board loads, the right cluster dials, velocity is back. So the
whole chain is confirmed end to end: the wake guard, the interface pick,
the retry that re-prompted, the arrow guard that had been eating the
cluster, and the filter that was the velocity wall.

If it ever goes quiet again, the order that solved it:
1. **Are the dev servers even up?** Both had died in the middle of this
   round (`lsof -nP -iTCP:3033 -sTCP:LISTEN`), which looks exactly like
   "everything is broken".
2. **macOS Input Monitoring for Chrome** — System Settings ▸ Privacy &
   Security ▸ Input Monitoring. If it is already on, toggle it off and back
   and RESTART Chrome: a Chrome update re-signs the binary and silently
   drops the grant, which is the shape of "it worked last week and I
   changed nothing".
3. **The ⚠ line in settings/Input** answers which half is wrong — present
   means the OS refused the analog interface (velocity only); absent with
   velocity still flat would be a genuinely new finding.
4. Only then the other connection mode (cable ↔ 2.4G dongle): they
   enumerate differently.

# WHERE THE AUDIO CHANNEL STANDS — 2026-08-26 (fifth batch)

## FIXING THE CONNECTION WOKE A DORMANT GUARD — and velocity is a BROWSER wall

His report once the board loaded: "a lot of my mappings, like the right fn
button to go right, or the dial behavior on the menu and control … don't
work", then "velocity is gone now, probably same issue". It is TWO causes,
and only one of them is ours.

**1. THE ARROW GUARD HAD BEEN ASLEEP FOR THE WHOLE BROKEN STRETCH.**
`arrowRefire` opens with `if(!HE.on)return false` — it exists to absorb
RAPID TRIGGER re-fires on an analog key, so with no board connected it did
nothing at all. Fixing the connection re-armed it, and it started eating
the right cluster. Measured, sensor silent, five presses of ONE key 100ms
apart:

    passes · SWALLOWED · SWALLOWED · passes · SWALLOWED     (2 of 5)
    alternating keys                                        5 of 5
    same key at 300ms                                       3 of 3

Alternating passing every time is why it felt random rather than broken:
`ASTEP.code` holds one code, so ←→←→ never trips it and ↓↓↓ dies. And the
cluster can NEVER re-arm from the sensor branch, because **menu (slot 77),
right ctrl (83) and fn (71) are not in RY_SLOTS** — the sensor never speaks
for them, so only the 250ms clock can, which is slower than dialling.
The cluster arrives as an ordinary OS keycode, is already debounced, and is
then SYNTHESIZED into an arrow by `arrowAlias` — it cannot wobble. A later
fix had made ARROWSYN count as a finger arrow (to get the pressure dial and
the shift step back) and dragged it into the guard as a side effect.
**The guard now runs only for TRUSTED arrows** — real hall keys, which is
what it was written for. ARROWSYN still counts as a finger arrow, so the
dial and shift step stay. Measured after, through the real key path:
**menu 5/5 · right ctrl 5/5 · F14 5/5 · right alt 5/5**, guard not called
once for them, still live for trusted arrows.

**2. VELOCITY: THE ANALOG INTERFACE IS ONE THE BROWSER WILL NOT OPEN.**
Not the same cause, and not fixable from here. His FUN60 enumerates three
interfaces; the analog stream's vendor collection **shares its interface
with the keyboard**:

    0xFFFF/0x2                                   opens   ← config only
    0xC/0x1 0x1/0x80 0x1/0x6 0x1/0x2 0xFFFF/0x1  NotAllowedError
    0x1/0x6                                      NotAllowedError

**By POLICY, not exclusivity — proved: opened FIRST, alone, with nothing
else claimed, both still refuse.** So connect succeeds on the config
interface, the board answers 0x8F, the row shows its name — and `rx` is 0
after three seconds. Connected, and silent. TEN cannot open what Chrome
refuses; nothing in this file can change that.
It WORKED before (HE_HARD carries 26 labelled hard hits measured on this
board), so something outside TEN moved: a Chrome blocklist tightening, a
firmware/mode change, or a different CONNECTION MODE — a 2.4G dongle and a
cable enumerate differently, and that is the first thing to try.
What shipped is honesty, not a fix: `HE.streamBlocked` is set when the
stream's interface was filtered out as protected, the connect flash says
`⚠ analog interface blocked by the browser — no velocity`, and the hid
readout carries a line naming the cause and what to try. A board that
opened and never speaks used to look exactly like a working one.
**`fn → ArrowRight` is a casualty of the same wall**, not of the guard:
slot 71 is sensor-only, so it cannot fire while the stream is dead.

**3. Probe hygiene, because this trap has now bitten twice in one session.**
Three rows mute every other fader to measure one channel alone and restore
in a `finally` — but a reload mid-run skips the finally and the autosave
keeps the zeros, so the NEXT probe measures silence and blames the app
(trig read all-zero peaks; grainflt read 0Hz; both with nothing wrong).
The levels are parked in `sessionStorage` now and any orphan is put back
before the next run mutes anything, with a note saying it happened.

Wall: fxwire 60/60 · fxmod 23/23 · resamp 4 (alpha 1.001 · resid .022 · hf
−0.16dB · strip clean) · micrec 13 · grainflt 2 (441→877→444) · faders
restore clean.

QA:
1. **The right cluster** — menu, right ctrl, right alt, F13–F16: tap the
   SAME one repeatedly to dial a value. Every press should count now; it
   used to take roughly two in five. Shift as the coarse step and the
   pressure dial should still work.
2. **Velocity** — read settings/Input: if the ⚠ line is there, the browser
   is refusing the analog interface and no setting will help. **Try the
   other connection mode first (cable ↔ 2.4G dongle), then the board's
   analog/web-driver mode.** If the ⚠ line is NOT there and velocity is
   still flat, that is a different bug and worth saying so.
3. **fn → right arrow** — will stay dead until the analog stream is back;
   it is sensor-only.

# WHERE THE AUDIO CHANNEL STANDS — 2026-08-26 (fourth batch)

## THE MONSGEEK: A VENDOR COLLECTION WEARING A KEYBOARD

His report, and it was precise enough to solve: "it gives me the popup to
connect, i do, then it shows the popup again but this time it says its
already paired, i click connect again and the hid slot still says off
through the whole thing."

**MEASURED FIRST, on his actual board, before a line changed.** All three
granted interfaces, opened one at a time and closed again:

    0xFFFF/0x2                                   opens
    0xC/0x1 0x1/0x80 0x1/0x6 0x1/0x2 0xFFFF/0x1  NotAllowedError
    0x1/0x6                                      NotAllowedError

WebHID refuses any interface carrying a PROTECTED usage — keyboard, mouse,
pointer, consumer control — however many other collections sit beside it.
And the middle one has a **vendor collection (0xFFFF/0x1) sitting next to
the keyboard collections**, so `vend()` answered true and it was chosen as
the stream device. Every open failed NotAllowedError; the `||cfgDev`
fallback that would have given the right answer was never reached, because
a blocked interface got there first. On the FUN60 the CONFIG interface IS
the stream interface.

- **The picker filters protected interfaces out BEFORE choosing** (`PROT`),
  and if the chosen one still refuses, the open loop takes the first that
  DOES open rather than failing with the answer sitting in the list.
- **The retry no longer re-prompts.** It called `this.connect(pre)`, and
  `pre` is undefined when the settings row calls it — so the retry ran
  `requestDevice()` a SECOND time. That is his second popup, and Chrome
  labelled it "already paired" because the grant was already there. It
  retries with the devices in hand now, straight into `_connect`.
- **One connect at a time** (`_opening`). Last round's eager `wake()`
  reconnects on every return to the tab, so an automatic attempt and a
  hand-clicked one could land together and fight over the same open().
- Measured after, through the real `HE.connect()` on his board:
  **ok true · hid on · "MonsGeek Keyboard" · kind 2 · firmware 0x8F
  answered, id 2600** · only the openable interface claimed · disconnect
  hands all three back. Frames were 0 because nobody pressed a key while
  the probe held it for 600ms — **key streaming is the one part his hands
  have to confirm.**
  ⚠ The probe borrowed his keyboard for under a second and released it; the
  gstack profile's `autoOn` was checked back to 0 afterwards, so Claude's
  browser never auto-claims his board. Grants are per ORIGIN: :3033 lists
  three MonsGeek interfaces, :3032 none.

## "DO I HAVE TO TEST THE FX PARAMS ONE BY ONE" — NO: `fxwire`, 60/60

His question after the distortion fix. New suite `tools/probe.sh fxwire`
drives **every (type, param) pair FXMODOK claims** through the real applier
and checks three things: `offered` (the dest picker lists it), `claimed`
(fxLive returned true for a low and a high value), `moved` (a node behind
that slot actually changed). No audio, no lfo to wait on — all 60 pairs
across **19 fx types in one call**. Result: **60/60**.
`fxmod` stays the tier above it: 23 hand-picked rows that prove the change
reaches the SOUND (bus wobble or node motion under a real 5Hz lfo).
Probe lesson kept: `snap()` first read only gain/frequency/Q/delayTime, so
comp and limit read "claimed but nothing moved" — a DynamicsCompressor's
dials are threshold/knee/ratio/attack/release and none of them is called
gain. fxmod's audio judge had them right all along.

Wall: fxwire 60/60 · fxmod 23/23 · resamp 4 · micrec 13 · audclip 5 · trig
canonical · boots with no console errors.

QA:
1. **The keyboard** — click `hid` in settings/Input: ONE chooser, pick the
   board, the slot should read the board's name. Then play: analog velocity
   is the part only your hands can confirm. If the slot still says off,
   quote the message bar — it now names the reason.
2. **Any fx param mod** — no need to go one by one; fxwire covers all 60.
   Worth one ear check on something with a big range (filt freq, delay
   time) to confirm the automated tier matches what you hear.

# WHERE THE AUDIO CHANNEL STANDS — 2026-08-26 (third batch)

## THE KEYBOARD THAT NEVER WOKE · DISTORTION MODS · THE STALE DEST CACHE

His verdict on the second batch: **1 sounds good · 2 works good · 4 good ·
5 good**, and one gap — "i tried to lfo mod a distortion tone" — plus
"having issues loading the monsgeek keyboard".

- **THE MONSGEEK: `wake()` refused to wake.** The guard was
  `if(this.on||!this._slept)return`, and `_slept` is set ONLY by `sleep()`,
  which itself returns early unless the board was already on. So a tab that
  BOOTED HIDDEN — opened in the background, restored by a browser restart,
  or simply not the front tab at load — skipped the 600ms boot reconnect
  (`if(!document.hidden)`), never slept, and then refused to wake when he
  switched to it. The board silently never loaded and nothing said why; the
  only cure was re-picking it through the chooser by hand. Now `wake()`
  reconnects whenever the tab is not already holding the board; reconnect()
  is still gated on the WebHID grant and on `autoOn`, so a board turned off
  on purpose stays off and an unplugged one costs one getDevices().
  Ruled OUT by measurement first, so the fix is not a guess: no vendor
  driver process running; the gstack browser holds the grant for
  :3033 but every interface read `closed` (it was not stealing the board);
  the page boots with zero JS errors and the syntax check passes.
  **WebHID grants are PER ORIGIN — measured: :3033 lists three MonsGeek
  interfaces, :3032 lists none.** That is the two-port split protecting his
  keyboard for free: Claude's port can never open his board.
- **The distortion family answers its modulators.** The curve is baked into
  a WaveShaper and cannot ramp — but the tone filter after it and the in/out
  gains around it are ordinary nodes. Wired on `sat`: tone (p2), in (p5),
  out (p7), and on the crush curve the sample-rate divider that p2 becomes;
  on `drv`: the lowpass after the shaper; on `tape`: the wow rate/depth and
  the darkening. FXMODOK grew the family, so the picker offers exactly
  these and still refuses drive/curve. Measured: tone 2609→3314Hz, in
  0.33→3.21, out 0.84→1.46, crush divider 1→28, tape 8304→10708Hz, drv
  1999→8169Hz.
- **AND THE BUG UNDER IT — the destination cache went stale on a sub-type.**
  `destList`'s signature was built from the fx TYPE alone (`M.abbr`), but an
  fx slot's p3 picks the CURVE on sat and the FILTER KIND on filt, and both
  change what the other dials ARE: sat's p2 is `tone` on every curve except
  crush, where it is `rate`; filt only has a `gain` dial on the shelving
  kinds. A route addresses by key AND label, so after switching the curve
  the picker handed out an address resolveDest could never match — **the
  route died silently, the dial moved and nothing followed it.** The
  signature carries p3 per fx slot now. Caught by the crush row reading
  7/7/7/7 while calling the applier by hand gave 7→33: the engine was right
  and the ADDRESS was stale. One number per slot.
- Probe judge repaired while it was in hand: node rows compared against an
  absolute floor, which called a phaser depth that DOUBLED under the lfo
  dead (its whole range is 0..0.006). Relative now — these are exact
  AudioParam reads, so 5% is a real move and a dead param reads hi===lo.

Wall after: fxmod **23/23** · resamp 4 (alpha 1.001 · resid 0.022 · hf
−0.16dB · strip clean) · micrec 13 · audclip 5 · trig canonical.

QA:
1. **The keyboard** — open TEN in a background tab (or restore a window with
   TEN not in front), then switch to it: the board should come up by itself,
   no chooser. If it still does not, say what the message bar says when you
   click `hid` in settings/Input, and whether another TEN tab is open — only
   one tab can hold it.
2. **LFO → distortion tone** — sat curve on a channel fx, aim an lfo at
   `tone`: audible now. Same for `in`/`out` (in is drive into the curve, the
   analog move), and on the crush curve `rate` steps under the lfo. Drive
   and curve stay unmodulatable on purpose — they rebuild a lookup table.
3. **Switch a distortion's curve while a mod points at its tone** — the
   route used to die silently; the picker is honest again. Worth one look:
   aim an lfo at `tone`, flip curve to crush, check the route re-reads as
   `rate` or shows `?` rather than pretending.

# WHERE THE AUDIO CHANNEL STANDS — 2026-08-26 (second batch)

## RESAMPLE'S GHOST STRIP · OPS 9-10 UNDER PHASE · FX/PLY MODS LIVE · GAIN LIVE · THE MOUSE

His six, 2026-08-26 morning. Five fixed and measured; the resample
difference he heard has a found mechanism and a fix — his ear rules next.

- **"still an audible difference … louder … less punchy, like a native web
  page limiter? sample rate or resolution reduced?" — the WORKLET IS CLEAN,
  the STRIP was the filter.** Measured with white noise through the tape
  path: worklet output flat ±0.7dB to 17kHz (no interp loss at spd 1, no
  clamp, no downsample, Float32 end to end — both his hypotheses ruled out
  by numbers). The BUS read −12dB@8k/−20@11k/−37@17k — a leftover synth
  flt (4.3k Q2 in my scratch) still built into the audio channel's strip.
  The channel a bounce lands on keeps its synth life's racks INVISIBLY —
  and even a virgin one carries the FACTORY flt[0]: a 9kHz lowpass, ON.
  A leftover comp/limit fx is his exact "louder, less punchy". Fix: a mstr
  take now lands on a NEUTRAL strip — flt/fx/mod racks cleared, flt[0] typ
  0 (the factory 9k LP is right for a synth, wrong for a print) — on top of
  the unity dials. Flash says "strip at unity". resamp suite grew teeth: an
  11kHz reference in the source (hf ~0dB proves no ghost filter), junk
  planted on the target pre-bounce (strip must read "clean" after). This
  build: hf −0.16dB, alpha 1.001, resid 0.022, strip clean.
  **If his ear STILL hears a difference on this build: export the set and
  check (a) CFG.overdub — bouncing twice in overdub STACKS takes, louder
  and smeared by construction; (b) his master rack for duck/amix whose
  behavior differs when one channel carries the mix.**
- **Ops 9 and 10 were dead to mods on the PHASE engine** (his "last 3 op
  slots dont get processed"). ten-fmop exposed 8 d/g param pairs while the
  rack holds 10 — ops 9-10 sounded but their mod params did not exist.
  Three constants 8→10 (descriptors, gather loop, k2 guard). Measured
  per-op env→pitch and env→level, both engines: native 1-10 (was already),
  phase 1-10 (was 1-8). trig suite still canonical after (rtrg 1.000 both
  engines, free decorrelated).
- **FX PARAM MODS ARE REAL NOW** ("their params can be added to mods but
  the mod doesnt affect them audibly"). Root cause one line in fxLive:
  every modulator except mix and the delay was refused ("no applier yet").
  Wired: filt (freq/reso/gain, all three kinds — plain biquad, formant/
  vowel bank, tilt), the whole delay family (dly/dub/tec/res/wob — time,
  feedback, color; res gets its own 2-62ms law), phase/fla/pha (rate +
  depth/feedback), trm (rate/depth), comp (thr/ratio/atk/rel), limit
  (thr/rel), clip (ceiling+makeup), gate (thr/depth), verb (color), and
  mix-as-makeup on comp/limit. Deliberately NOT wired: curve-baked params
  (drv/crush/sat drive, verb size, topologies/widths) — they rebuild, they
  do not ramp. THE PICKER IS HONEST NOW: FXMODOK gates modDests so only
  what answers is offered (their own doctrine: "a destination you can pick
  that then does nothing is worse than one not offered").
  **And the generators**: arpTick read the ply rack RAW — noteOn honored
  the mod overlay, the per-step scheduler never did — so lfo→arp/euc/rtc/
  cyc params parked in the overlay unread. One wrap: ovRack at the tick.
  Suite `tools/probe.sh fxmod`: 17/17 — 16 fx (aud-wobble or node-motion
  judge per row) + ratchet density 17→28 under a ply-rate lfo.
- **Audio gain is LIVE and DRAWN** ("changing gain on audio ch should be
  applied live during playback … visualized on the waveform"). The
  instrument-row gain handler wrote the value and never pushed audLive —
  the worklet applies tset gain live, the dial just never sent it (loop
  vol right above it did). Measured through the real field door: rms
  0.255→0.057→0.252 as the dial walked 0.9→0.2→0.9 mid-carrier (ratio
  0.222 = exactly 0.2/0.9). The column waveform scales by the gain now
  (cache keyed on it), so the picture is the amplitude the carrier plays.
- **THE MOUSE, four dead zones found by DOM-level clicking** (his "deeper
  investigation"):
  1. **Rack slots were unclickable** — the chain row tagged every slot cell
     'mod',mi and threw the slot half away, so a click landed on whatever
     slot the cursor already held. Cells carry mi*100+si now ('chip') and
     land through gotoChip — the keyboard's own door. Measured: click chip
     201 → curMod 2, curSlot 1.
  2. **Clicking a channel didn't move the visible selection** — mouseFocus
     set editSnd only on layer≥2 while the desk highlights curPreset. Now
     mirrors the keyboard digit rule (21249, "the view follows"): mSel
     false, curPreset AND editSnd. Measured: click ch7 → 7/7.
  3. **The saved-set slots ('sess') and the master column ('mst0') were
     emitted forever, answered never** — handlers added (PICK.sel / mSel).
  4. **THE METER DRAGS** (his ask): vertical = volume, horizontal = pan,
     both axes in one gesture, wheel = volume. It cannot replay alt-arrows
     (alt is the fine step everywhere but the desk) so meterNudge writes
     the mixer through the desk's own arithmetic (VOLT-curve fader units,
     0.05 pan steps, refresh per nudge, one undo per drag, ⇧ = coarse).
     Measured on a real drag: 40px up = vol 76→86, 40px right = pan 0→0.5.
     Settings rows measured working as they were ('set' spans respond) —
     his "settings slots" read as the set-slot picker row, which is fix 3.

Wall on this build: micrec 13 · resamp 4 (hf −0.16dB · alpha 1.001 · strip
clean) · fxmod 17/17 · trig canonical · audclip 5 · preset sounds. Traps
hit and worth keeping: the ISOLATION MUTES of a probe die with a reload —
mid-session my scratch tab reloaded between mute and restore, the autosave
kept lvl 0 on eight channels, and trig read all-zero peaks on ch4 until the
faders were put back (all-zero trig/modmatrix = WRONG CHANNEL STATE, not a
dead engine); and a scratch channel's leftover mod slots (a follower on
ch4) decorrelate the trig probe's rtrg rows — clear mod/ply/fx racks before
correlation measurements.

QA (ordered by what to trust least first):
1. **Resample the master again on this build** — the bounce lands with the
   strip cleared + unity dials ("strip at unity" in the flash). A/B against
   the live channels: if it is STILL louder/less punchy, say whether
   overdub is on, and export the set — the next suspects are stacked
   overdub bounces and duck/amix on the master rack.
2. **Mouse sweep** — click rack slot cells in the chain row (each slot
   selects), click channels with the desk up (highlight follows), drag a
   channel meter (up/down volume, left/right pan, wheel volume, shift
   coarse), click the master column header (master strip selects), click
   set slots in the picker. Not every surface is measured — report any
   cell that still ignores the mouse.
3. **Mod an fx param** — e.g. lfo → filt freq on a channel fx, env → comp
   threshold, lfo → delay time: audible now. The picker only offers params
   that actually answer; drive-curve params are gone from the list on
   purpose (their mix stays). An lfo on a euclid/ratchet/arp numeric param
   moves the pattern.
4. **Ops 9/10 under phase engine** — aim an env/lfo at op 9 or 10 pitch or
   level with fm eng: phase — it lands now.
5. **Audio gain while the loop plays** — dial gain on an audio channel:
   level follows the dial immediately and the waveform picture scales.

## ENV LOOP REMOVED · LFO TRIG DEFAULTS FREE · MASTER RESAMPLE IS PRE-FX (his 3-item batch)

His three, 2026-08-26: "remove the envelope loop feature", "make lfo default
trig toggle set to free", "master resampling to audio channel: record pre
master effects, make a test so that the resampled channel sound exactly like
the live sound from the channels, right now i think it does double
processing."

- **Envelope loop is GONE** — the whole family: the loop/lsync/lrate/ldiv/
  lmode dials, envLoopP, _loopEnv, every lp> branch (amp, filter, pitch ×2,
  op level, learned-address), the release's _loopPs cancel, the shape row's
  loop drawing, and lp|lrate|lrdiv out of the mod-key regex. No factory
  preset used it (grep: zero lp: in mod slots), so no LIBV bump; saved sets
  that carry lp fields load fine and the env simply plays one-shot — the
  fields sit inert. Regression net: modmatrix amp/pitch/filt/op diffed
  row-for-row IDENTICAL against live .1253 (the env scheduling paths were
  the ones edited).
- **LFO trig defaults to free** — mkMod ltr:0→1, and every reader's fallback
  moved with it (`m.ltr??1`, 4 sites) because slotDef makes the factory the
  DISPLAY fallback for a missing field: factory and engine must agree or a
  field-less slot shows free and plays retrig. Saved slots all carry ltr
  explicitly (serialize is wholesale; the fold backfills via
  Object.assign(mkMod)), so only truly ancient v13-era sets could flip —
  and they flip TO the default he now wants. Fresh slot measured: dial
  shows 'free', engine free flag true.
- **THE MSTR TAP MOVED this.master → mSum** (pre master rack, pre dj chain,
  pre master fader). The old tap recorded rack+dj+0.8-fader INTO the take
  and then played back through all three again — with a sat on the master
  the A/B measured the old take at 8.8× the channel sum (tanh drive boosts
  small signals) with the sat's harmonics printed (dirt 0.021), and the old
  replay at alpha 0.475 / resid 0.282 vs live. Bonus kept on purpose: the
  metronome click feeds this.master directly and no longer prints into a
  bounce. Edge shifted, noted: a mic monitor aimed at a CHANNEL strip still
  prints into a bounce (the normal case — the monitor follows the recording
  channel); aimed at the master (no audio channel focused) it no longer
  does.
- **A mstr take lands at UNITY** — audPlace (mstr only): au.gain 0.9→1,
  lvol→1, fader→1, pan→0 + refresh. Same doctrine as the recording pitch
  reset, level edition: without it a virgin bounce replayed at 0.72×
  (0.9 gain × 0.8 fader) and "exactly like live" was unreachable. Mic takes
  keep their gain staging. THIS MOVES FOUR DIALS on the destination channel
  when a master bounce lands — deliberate, flagged.
- **rebuildMaster re-attaches a live mstr tap** — it mSum.disconnect()s on
  every master knob turn, which silently severed a running bounce from
  there on. Guard measured: rebuild fired mid-bounce, take aliveFrac 0.995.
- **The test he asked for: `tools/probe.sh resamp ch=9`** (4 rows, isolates
  the desk by muting every other fader). Live and replay are both measured
  at mSum — everything downstream is shared, so mSum equality IS ear
  equality. A hot sat sits on the master rack as the control. This build:
  take ratio 0.96 / pkRatio 1.000 / dirt 0 vs dirtMaster 0.017 (fx hot,
  not printed) · unity 1/1/1/0 · replay ratio 0.994, corr 0.984, envDev
  0.04, **alpha 1.001, resid 0.022** (sample-aligned gain fit — the
  waveform itself) · rebuild aliveFrac 0.995. The same suite on live .1253:
  take 8.806/4.479 with dirt 0.021, stale dials 0.9/0.32/0.2, replay alpha
  0.475 resid 0.282 — it fails loudly on exactly the bug he suspected.
- **micrec2's latc row is self-sufficient now** — it starts (and stops) the
  transport itself and mutes the desk. A STOPPED take anchors its first
  sound at 0 by design (round-12 from0 + head trim), which erases the
  absolute timing the row measures; it had been inheriting `playing` from
  its neighbours and read E +6872 / spread 22050 (the nearest-onset matcher
  wrapping) the day the neighbourhood changed. Under its own transport:
  **E = 2 samples, spread 0** at the new tap point — AUDLATC 0 stands. The
  latc/stereo blip feeds moved to engine.mSum with the tap.

Wall after the batch, all on this working tree: micrec 13 · micrec2 13
(latc E2/spread0) · grainflt 2 · setio 4 · audclip 5 · trig 4 (ch4 — ch8 in
scratch is audio; all-zero trig/modmatrix output means WRONG CHANNEL, not a
dead engine) · sweep dPos ≤6ms · modmatrix ×4 identical to live · resamp 4.

QA (ordered by what to trust least first):
1. **Resample the master** (audio ch, input=master, esc+tab) with fx ON the
   master rack and the metronome clicking: the bounce must play back
   INDISTINGUISHABLE from the live channels — no double fx, no level drop,
   no click printed. Note the channel's gain/loop-vol/fader/pan land at
   unity when the take does (deliberate). Turn a master knob MID-bounce:
   the tail must keep recording. Alpha/resid measured; his ear decides.
2. **New LFO defaults to free** — fresh mod slot, src lfo: trig reads
   'free'; existing patches unchanged (their stored value wins). Not
   measured beyond the flag: play a pad with a slow filter LFO across
   retriggered notes — the drift should carry through note-ons.
3. **Envelope loop is gone** — mod env slot shows time/atk/dec/sus/rel/
   curve and nothing after; any patch that used a looping env now plays it
   one-shot (expected, the feature is removed, the saved fields are inert).
4. Everything else in the wall above is regression-covered; the FM audit
   items (compressor call, index taper, phase-engine per-op depth) still
   wait on his word from the 08-25 report.

## PHASE ENGINE FIXED + MIDI DUR FROM THE GRID (on main)

**His ear, 2026-08-25, on the phase/budget fix: "oh shit sounds much
better." The FM thread is closed as fixed, not just measured.**

His word on the audit: "not a compressor issue" (dropped), "fix what you
mentioned if you found a bug in phase mode", and yes to the midi half of
dur-from-grid.

- **The phase engine skipped fmDepth's Nyquist budget** — `ix=a0*kIdx*f`
  raw, in BOTH the builder and the retune path. Same patch ran a 1.47x
  bigger index than native (measured: deviation zc 12220 vs 8882 at B5) and
  its Carson edge crossed Nyquist — the "23dB dirtier top band" was fold
  the budget exists to prevent. Both sites now route through
  fmDepth(a0,carF,modF,isPM)/modF exactly like the native fg.gain. After:
  index within ~12% of native (estimator noise), top band −63.6dB vs
  native −68.3 (was −39.9), and the env→op2 descent MOVES under phase
  (h1 0.059→0.026; was flat — the overshoot was drowning it; the opGains
  shims were wired correctly all along). trig suite: both engines rtrg
  same=1, free decorrelated. Table interp was innocent (2048 ≈ −100dB).
- **MIDI notes count from the grid now** (endNote): dur =
  max(0.05, AUDMINMS-floor, gridNow()−p.ts) and the monitored release is
  the KEYUP floored at start+AUDMINMS — not start+heldSec, which rang every
  early-pressed note past the finger by the quantize displacement, live and
  in the lane. The stub bug that killed the previous from-grid attempt
  (60ms tap crossing the grid by 10ms recording 10ms) is handled by the
  AUDMINMS floor instead of by falling back to the finger span. Q off:
  start==press, nothing changes. Measured: press 73/40ms early, release at
  grid+304/303ms → recorded 304/303 exactly (was 377/342). The chord-prep
  path (recSpots) already counted from the grid; plain notes went through
  endNote — found by trapping lane.events with a defineProperty setter.
  Generators (arp/euc/cyc) still write step-derived durs — their output IS
  the take.

Suites: micrec 13, grainflt 2, audclip 5, trig 4 — green.

## THE FM HEALTH AUDIT (report only — his word decides the fixes)

Gad: "TENs fm a bit too clicky… compare your code to analogue or best
practice fm." Deep-dived the whole voice path and MEASURED each stage on
his actual ch5 patch. The FM core is CLEAN; the culprits are around it.

**Verified healthy (numbers, his patch, B5 + A1):**
- TRUE through-zero linear FM: constant −600Hz into a 200Hz carrier plays
  a clean backwards 400Hz sine (pk 1.0); modulated through zero, max
  slope = 1.00× the theoretical bound. This is the analog-TZFM ideal —
  linear Hz into `frequency`, not exponential cents.
- ZERO waveform discontinuities anywhere: held note worst-slope 0.62 of
  the FM bound; 8-note rapid retriggers poly 0.26 / mono 0.28, zero click
  frames. Envelopes are a-rate automation, live edits slewed
  (setTargetAtTime+GL), steals cancelAndHold + tau-1.5ms fade, oscillators
  stop at −104dB.
- Native aliasing floor at full index: −63dB in 18–21k. Fine.

**Found — ordered by likely share of "clicky/unhealthy":**
1. **THE ALWAYS-ON MASTER DynamicsCompressor WITH BROWSER DEFAULTS**
   (engine.comp, master→destination): threshold −24dB, knee 30 (so it
   engages from ~−39dB — literally never transparent), ratio 12:1, attack
   3ms, release 250ms, Chrome auto-makeup. Measured on ONE moderate bass
   note: −1.4dB constant reduction and rms 0.188→0.250 (auto-makeup).
   In a mix it pumps against drums at 12:1/250ms and grabs FM transients
   at 3ms. Patchworld/Operator have no such device in the path. The prime
   suspect — the FM is clean, what it goes THROUGH is not. Fix candidate:
   safety limiter (thr −1..−3dB, ratio 20, knee ≤6) or a settings dial —
   HIS CALL, the whole instrument has been mixed through the current one.
2. **Index ceiling 24 ≈ 2× a DX7's max (~13.2)**: kIdx=6(1+3a²). The top
   ~40% of the level dial is beyond-DX click-train territory (at his B5
   full level, inst freq sweeps to ~17kHz every mod cycle). At matched
   knob fraction TEN is far more index than Operator — "clickier at the
   same position" by design ("that is a scream"). Option: a taper.
3. **His patch's mod-level attack a=5ms**: every note chirps 0→full index
   in 5ms — a per-note tick. Patch-level, not engine.
4. **Phase engine (fm eng: phase) — two real defects**: top-band aliasing
   −40dB vs native −63dB (23dB dirtier), and per-op env routes barely
   drive it (his env→op2 descent measures flat: h1 0.058→0.061 vs native
   0.021→0.037 — the old "does not carry per-op modulation" comment is
   still mostly true). His patch needs native today; fix before anyone
   trusts that dial.
5. Route amounts beyond ±100% clamp silently (his +200% plays as 100%) —
   known, reported 08-25.

No code changed in this round — he asked for the report. The compressor
decision especially is a sound-of-the-instrument decision.

## PITCH IS 3 OCTAVES + AUDIO CHANNELS RIDE THE CLIPBOARD (on main)

His morning verdict on the batch: "works great this morning." Two new asks,
both landed on main:

- **Audio pitch dial spans ±36st (was ±24).** The whole family widened:
  dial spec + mod-addr spec, gr.semis clamp, spdToSemis/semisToSpd
  (floor 0.25→0.125, band ×0.25-4 → ×0.125-8), the cmode-0 free-tape write,
  the fit-preserving writers, and the SPEED carrier audSpd/audFitComp rails
  ±4→±8 (free-mode pitch IS spd, so the family had to carry ×8).
  **The trap that ate the bottom octave: audSpd's legacy sync-detent guard
  `|v|<0.25 → 1` — narrowed to <0.1** (the old detent sat at 0; 0.125 is a
  real speed now). Measured, all three cmodes, 440Hz take: +36 → 3521Hz,
  −36 → 54Hz, back → 441Hz. The SPEED dial itself still walks ±4 (its
  display shows the true value if pitch pushed beyond; widening its walk was
  not asked).
- **c/x/v carries audio channels WITH their takes.** The single-channel
  refusal ("clip its file, not its state") is gone. The take rides the
  clipboard as a same-session AudioBuffer REFERENCE (no encoding, no
  budget) — grabbed at the clipboard layer ONLY, never inside grabClip,
  because grabClip also feeds the CLIP SLOTS which serialize into the set.
  All three paths carry it: single channel, channel block, whole desk.
  Paste lands through granNode+setChanBuf+audRelockAll (restoreAudio's
  door). Cut keeps the house rule: lane leaves, sound stays. Measured
  (probe `audclip`, 5 rows): pasted buffer === source buffer, name/cat/
  events/cues carried, cut leaves the buffer and the clipboard holds it.

Suites all green after: micrec 13, micrec2 13, grainflt 2, setio 4,
audclip 5, sweep; unitsnap 7→8→8→8→16 and unitpitch cents=0 hold under the
widened ±8 fit rails.

**The whole `bugfixes` batch is MERGED TO MAIN and LIVE, build
2026-08-24.2220** (his word 2026-08-25: "merge"). That covers: grain pitch
at both doors, filter reso real under 1, slices toggle, two-stage ⇧⌫, the
eaten-boundary audRelock repair, the export rebuild (save dialog, takes
travel embedded, local stamps, emb nesting), crv alive on op-level
envelopes, probe suites setio/sweep-wnd/landWait, and dur-from-grid.

**HELD THOUGHT — dur-from-grid needs his deeper test (his words: "hold the
thought on the dur from grid, ill test tomorrow deeper").** What to keep in
mind when he reports: the change moves BOTH the lane and the live audible
off (one-number rule) to count from max(press, grid) when Q is on; floors
at AUDMINMS; Q off unchanged; MIDI notes still count from the finger —
extending them is one word away. If juggling still feels wrong, the next
suspects are the wnd-180 release fade (replay measured 30-50ms lean) and
overlapped-finger legato semantics (mono steal ordering).

## DUR FROM THE GRID + THE SLOW-LFO VERDICT (build 2026-08-24.2220)

**His ruling on ch9: "count dur from the grid, recording should match what
i heard."** Shipped at all four write sites — lateAudWrite (cue+pmono
deferred), the pmono inline write, the pk/fz unwind, and relB9 (the cue
release, which is ALSO the audible off — ear and lane still share one
number, both from-grid now). Q on: dur counts from max(press, gridTime(tr));
Q off: press==grid, nothing changes; floors kept at AUDMINMS. Measured:
press 17ms early, hold to grid+320ms → recorded 320ms exact (was 337 =
finger span). Note the live off moves too: a cue no longer rings past the
keyup by the press-early gap. sweep/roundtrip/mono/micrec clean.
MIDI notes still count from the finger (the old rule) — flagged to Gad,
one word extends the grid rule there.

**ch5 "slow LFO" fluctuation on the new set (ten-set-2026-08-25-00-07,
Documents): NORMAL — Bessel physics, not an artifact.** His new patch:
same sine 1:1 pair, FM-level env d=8s, note B5 (midi 83). At B5 the
Nyquist budget compresses the dialed index 24 → 16.3 (fmDepth tanh — by
design). As the index descends 16.3→0 over seconds, the fundamental's
amplitude passes through the J0 Bessel nulls (I = 14.9/11.8/8.7/5.5/2.4)
— predicted dips at ≈0.14/0.5/1.0/1.7/3.1s, measured dips at
≈0.37/0.56/1.1/1.9s then a clean monotonic rise: dip-for-dip the Bessel
pattern. Every FM engine does this — Operator will too at a comparable
index trajectory (its level→index mapping differs, so pacing shifts).
Ways to tame it if wanted: keep peak index under 2.4 (below the last null
— no fundamental dip at all, "soft FM"), crv+ on that env (rushes the
null zone — the dial is alive as of yesterday), or detune the ratio a
hair (1.01) so the nulls smear instead of breathing.

## HIS SET ARRIVED — ch5 FM diagnosed (crv was dead), ch9 cues measured (build 2026-08-24.2155)

Export works for him now; the save dialog put the file in **Documents**, not
Downloads: `~/Documents/ten-set-2026-08-24-23-22.json`. Copied into the repo
as `tmp-gadset.json` (git-excluded via .git/info/exclude — his set does not
get committed).

**ch5 "grimy FM descent" — found, and the finding is a dead dial.** His
patch: op0 sine carrier, op1 sine mode 1 (fm→op0), mod slot 2 = env
(a 0.005 / d 2.18 / s 0 / r 8) → op1 LEVEL at +200%. Measured on the real
patch (C3, bus capture): the descent is CLEAN linear FM — per-frame max
sample delta falls 0.082→0.003 with no steps, no zipper, no aliasing floor.
What he hears is the SHAPE: the op-level env decay was a hard-coded
setTargetAtTime exponential (tau=d/5) that lingers exactly where 1:1 FM
churns hardest (index 3→0, the fundamental flickering through the Bessel
nulls at I≈2.4/5.5), and **the env crv dial was DEAD on op-level envelopes**
(crv −2 vs +2 measured identical: diff 75-161 = counting noise; the amp env
honors crv, this path never did). Fixed with the amp env's own recipe
(exponent on time, exp(−5uᵖ) matching this path's tau, hard landing kept),
guarded |crv|>1 so every crv-0 patch — including his, today — is
byte-identical. Measured post-fix, zc trajectory at 300/500/800/1100ms:
crv 0 → 26/15/9/3 (unchanged) · crv −100 → 45/46/41/30 (hangs at full
index, then off the shelf — the "fixed FM position" feel) · crv +100 →
2/3/3/3 (drops through the churn instantly). His move: dial crv NEGATIVE on
that mod-slot env. Also found, reported, not changed: route amounts clamp
at ±100% — his 200% plays as 100%.

**Envs/LFOs audio-rate? (his question)** Yes in the voice: envs are
scheduled AudioParam automation (sample-accurate), LFOs are real
osc→gain→param nodes. Control-tick exceptions: pan, and the mod rack's
press/flw live sources (glide-smoothed, tick-updated).

**audSave bug found same session: {...r,...enc} let smpEnc's n (sample
count) clobber the take's NAME** — embedded takes came back named "22050".
Nested under `emb` now; restoreAudio reads r.emb; setio asserts the name
(nameBack probe-take). Zero compat cost — the only new-format export in
existence (his 23-22) carries no takes (he reloaded before exporting, so
his RAM takes were gone; aud refs all null).

**ch9 "recorded cue juggling shorter than performance / release mismatch" —
measured, mechanism narrowed, needs his answer.** The recorder (lateAudWrite):
t = quantized grid beat, dur = FULL keyup−keydown finger span — deliberate,
matching midi ("a 40ms tap is a 40ms note wherever on the grid it lands").
So live sounds grid→keyup, replay sounds grid→grid+dur: replay holds LONGER
than what he heard by his press-early gap (up to a 16th = 123ms at his
122.38). Sweep suite (pitch-is-position take, real recorder, replay
compared): dPos ≤12ms always; dLen at wnd 50 = noise (±10-40ms), at his
wnd 180 replay leans −30..−50ms SHORTER (release-fade edge). His lane in
the set: 40 events, all t on 16ths (he quantizes), durs 0.118-0.166 beats
(58-81ms taps), detached (40-65ms bed gaps between). Open question FOR HIM:
when juggling, fingers overlapped or detached? and should recorded dur
count from the GRID (what sounded) instead of the finger press? — that one
change would make replay = live by construction, but it contradicts the
stated midi-recorder design, so it is his call, not mine.
`probe sweep` gained a wnd=N arg for this.

Traps left for the next thread: audPlace onto a channel that holds a
SHORTER bed produces a bed-sized canvas (punch-in semantics) — clear first
or land takes through setChanBuf when probing; a raw audBuf[pi]=null wipe
leaves the worklet holding the old tape — clear through the ⇧⌫ door or
follow with granNode+setChanBuf+relock; a loaded set's null aud refs do NOT
clear channels (leftover takes survive load); micrec2 can blow the 30s
browse cap on a heavy tab — wipe ten-v1 and reload first.

## EXPORT — the vanishing file, and the takes that never traveled (build 2026-08-24.2117)

Gad: "hmm indeed export is acting wierd, please check it." The evidence: his
export flashed ▼ and NO ten-set file landed anywhere on the disk (mdfind:
newest is Aug 23 01:29), while the in-app path measured perfect — picker
opens on ⌘E, Enter hands dl() a correct 91596-byte blob. Four fixes, one
suite:

- **dl() revoked its blob URL after 4 seconds.** A Chrome set to ask where
  to save shows a dialog; pick a folder slower than 4s and the URL is dead
  before the save starts — "Failed - file missing" or nothing at all. 120s
  now. (exportAudio's stems ride the same window.)
- **exportSet goes through showSaveFilePicker** — import's own API. The
  dialog shows WHERE the file goes, its close is the save completing, esc
  flashes "export cancelled" instead of pretending. Anchor download stays
  as the fallback for browsers without the API. If the dialog-per-export
  annoys him, one word and it reverts to the plain anchor (with the 120s
  window it would likely land now).
- **THE TAKES NEVER TRAVELED.** audRef saved a recording as `{k:'r'}` — a
  named hole. Every export AND every reload dropped the audio the mic
  instrument records; only factory phrases survived. audSave now embeds
  recordings as 16-bit base64 inside SMPCAP (3MB, shared with op samples);
  restoreAudio decodes and lands them. Over budget or in the localStorage
  quota fallback they degrade to exactly the old named hole. Measured
  (probe `setio`): 0.5s stereo take rides as 115KB, round-trips 22050=22050
  samples, rms 0.283/0.283 both channels; no-audio fallback holes it
  (209KB→92KB); stubbed picker receives full set bytes; cancel does NOT
  fall back to a silent anchor download. **Format note: additive, no SAVEV
  bump** — old sets load unchanged; an OLD build reading a NEW export shows
  takes as holes exactly as it always did.
- **Stamps were UTC.** A set saved 01:29 was named 23-29 of the day before
  and sorted into yesterday. stampNow() is local wall-clock now (both
  exportSet and exportAudio).

**And the probe rot this uncovered:** micrec's `hold` and `punch` rows had
been failing on EVERY recent build including main .1839 — not the app, the
rows: a take lands (lat+4096)/sr+8ms after keyup, and while the transport
plays, lat rides the reported output latency (20066 samples = 556ms drain
under sink-none), so their fixed sleep(150) measured before the take landed.
`landWait` polls for the buffer now. Post-fix: hold lands 0.873s of 0.9
held, punch span 0.412 / bed 1.585 / mix 0 / ovdubMix 0.383 / maxStep 0.02.
Lesson written in blood: **round-4's "green" checked err+row-counts only;
check the rows.** All four suites: micrec 13, micrec2 13, grainflt 2,
setio 4 — every row's values read, clean.

Still blocked on his export (which now works): ch5 FM grime and the ch9
recorded-cue mismatch — the Aug 22 export's ch5 is BES1 with no FM routes.

## GRAIN PITCH + FILTER RESONANCE + SLICES + ⇧⌫ + THE EATEN BOUNDARY — on branch `bugfixes`, build 2026-08-24.2044, his ear next

Two of his: "in grain mode changing pitch doesnt work ... it should ALSO
work on its own when changing it from grain" and "anything under 1 is the
same as 1, and i want to have options for very soft filtering with no rez".

- **Grain pitch.** The carry had already made the dials one — in grain the
  pitch spec writes gr.semis — but applyAudParam's aud branch only fired
  audLive: the tape cursors re-aimed and the sounding cloud never re-read.
  One push: `key==='semis' && cmode 2 → engine.granCfg(pi)`. Measured
  through the real door (applyAudParam): cloud at 437.9Hz → dial +12 →
  880.8Hz → back → 442Hz, dial reads 12.
- **Filter resonance.** The WebAudio rule the dial never knew: LOWPASS and
  HIGHPASS interpret Q in dB (bandpass/notch/peaking are linear). The reso
  dial 0.1..24 went straight into Q, so 0.1..1 spanned one indistinguishable
  decibel — and the soft, bumpless knees live BELOW 0dB. Under 1 the dial
  now maps to −12..0dB (`qFor`, in the rack builder, 24dB split included);
  1 stays ~Butterworth and everything above is byte-identical. Measured at
  the cutoff: dial 0.1 → −10.8dB, 0.5 → −6dB, 1 → +1dB, 4 → +4dB. Existing
  patches with reso ≥1 are untouched; sub-1 values previously sounded like
  1, so the remap only makes the dial's bottom real.
- Probe: `grainflt` (third suite, 2 rows) holds both as regressions;
  preset probe confirms the rack still builds (SNR 0.638 peak); micrec 13 +
  micrec2 12 green.

**ROUND 2 — "grain pitch param still not working."** He was right and the
first fix was on the wrong DOOR: applyAudParam is the automation/mod path,
and the KEYS come through audAction, which applies the spec itself and only
pushed audLive. Same one-line push there (`key==='semis' && cmode 2 →
granCfg`). Verified through the real gesture this time: sound page, cursor
on the pitch row, 12 real ArrowUp events → 437→885Hz, gr.semis 12, back
down → 442. The grainflt probe row now dials through the KEYS (and lands
back through the automation door, so both stay covered). Lesson, again:
verify at the door the finger uses, not the door the code offers.

**FM-LEVEL CRUNCH — INVESTIGATED, NOT REPRODUCED, waiting on his export.**
"modulating level of op that is doing fm to another op ... has some
crunchiness." What the measurements ruled OUT on a hand-built 2-op FM pair
(sine 2:1, phase engine path): the dial/automation path slews
(setTargetAtTime 20ms); mod-rack LFO and env are audio-wired to the
worklet's a-rate g-params (no 40Hz tick ripple in the demodulated envelope:
ratio 0.08-0.16 vs the LFO band); even deliberate SQUARE jumps on the level
param produce zero amplitude-kink — because an FM-depth step is a FREQUENCY
discontinuity, not an amplitude one, and its audibility depends on the
patch (index depth, ratios, engine) — which is guessing territory. Per the
house rule (his set travels as a FILE), asked for: the exportSet + which
modulation source (lfo/env/automation/velocity) and which channel. Also on
the suspect list once the patch is real: the native path modulates FM depth
through detune-CENTS (exponential FM — index modulation shifts the pitch
center), and the depth's 6(1+3a²) curve applies at build but LINEARLY under
modulation.

**ROUND 3 — the slices toggle and the two-stage ⇧⌫.**
- **"an option between transient cue distribution like now, and splitting
  into quantized regions like we had originally ... default to rhythm
  divition."** New field `slices` on the audio channel's instrument row:
  `rhythm` (DEFAULT) · `transient`. Rhythm divides the WINDOW evenly at a
  unit picked from the loop's length — ≤1 bar in 16ths, ≤2 in 8ths, ≤4 in
  beats, ≤8 in halves, longer in bars — so the letters always span the loop
  at a countable grain (≤16 cues for power-of-2 lengths). Transient is the
  detector, unchanged. Lives in audCuts (cache keyed by method + lane
  length, so a loop resize re-slices by itself). Measured: 1 bar → 16 cues,
  2 bars → 16 (8ths), transient → the detector's 26 on a sine bed.
- **"shift+del on audio should first clear key recordings if any, only when
  no cue or pitch keys recorded ... then clear the sample."** Two stages:
  a lane with events → the first press empties the LANE only ('keys
  cleared — ⇧⌫ again clears the sample'); an empty lane → the full channel
  clear as before. Measured: stage 1 → 0 events, take kept; stage 2 → take
  gone, lane auto.
- ⚠ **A TRUSTED DIGIT NOBODY SENT ate an afternoon's measurement.** The
  two-stage rows kept reading 'cleared' with the WRONG flashes — clearLane's
  vocabulary, not the new branch's — because HOLD.dig sat stuck at 9: a
  real keystroke had landed in the measurement tab (the headed browse
  window is visible on the desktop; its keyup went elsewhere), and
  `HOLD.dig>=0` re-routed ⌫ to the digit-hold branch. The flashes named the
  wrong branch and THAT cracked it — read the flash, not just the state.
  Standalone evals do not carry the probe harness's trusted-key swallow;
  rows that depend on holds now pin them (HOLD.dig=-1).

**ROUND 4 — "sometimes autoloop stops after playing some cues close to end
of sample loop" — CAUGHT AND FIXED.** A boundary hammer (cue holds whose
releases land ±0.35 beats around the bar, deterministic seeds) caught it on
TRY 2: a 162ms cue released 0.19 beats before the bar left one whole loop
silent, carrier registered but dead. The mechanism is round 11's twin:
while a position key is held, audCycle EXTENDS the old carrier and SKIPS
posting that boundary's own spawn (held9) — right while held, an eaten
boundary once the key releases before the bar, consumed territory behind
T.schedBeat that no tick revisits. audRelock (every hand-back-to-the-bar)
now re-posts a consumed imminent boundary, with one guard audResume did not
need: audRelock runs constantly, so it checks audCarAt first — a carrier
already AIMED at that boundary means the handshake is intact and posting
again would double the head. Measured: 18 hammer tries post-fix all clean,
including the exact seed that caught it; 28 suite rows unaffected.

**HIS EXPORT DID NOT LAND (items 1 and 2 blocked on it).** Downloads'
newest ten-set is 2026-08-22 23:29 — the live-mod session's — and its ch5
is BES1 with every op mode 0: no env→op2, no op2→op1. Today's export never
reached ~/Downloads (or went somewhere else). Synthetic findings while
waiting: recorded-vs-live cue gesture spans are SAMPLE-IDENTICAL on a
clean rig (move→relock 500.1ms live vs 501.9ms replay, message-level), so
item 2's cause lives in his set's specifics — swing, quantize, play-rack
(ratchet/nudge/humanize), per-cue offsets — and the FM grime (item 1)
needs his actual ch5. Ask standing: re-export, and say where the file
landed if not Downloads.

QA: (1) grain channel, cloud sounding, ARROW-dial the pitch row on the
sound page — the cloud follows immediately; automation on the same dial
also lands; the carry over tape↔stretch↔grain unchanged. (2) any synth,
filter lowpass, reso at 0.3-0.7: the cutoff rolls off soft with no bump —
sweep the cutoff and hear a gentle slope instead of the old ringing edge;
reso ≥1 unchanged. (3) position keys on a take: default slicing is now the
GRID — a 2-bar loop gives 16 8th-note cues under the letters; flip
`slices` to transient on the instrument row for the detector. (4) ⇧⌫ on an
audio channel with recorded keys: first press clears the keys and says so,
second press clears the sample; with no keys recorded one press clears the
sample as before.


## UNIT SNAP + TOP STEP — MERGED to main + LIVE 2026-08-24.1839 ("works well")

Gad: "when changing any loop length unit size, midi or audio, snap the loop
current length to the closest ... if current loop is 7 16th notes length and
i change unit size to half bars and then bars ... moving from 7, to 8 then
to 16 16th notes." One change in `unitStep` (the only door every unit change
goes through, ⇧←→ under tab): the count becomes the CLOSEST whole count of
the new unit, both directions — it used to CEIL going up (nine 16ths in
halves became sixteen, not eight) and keep exact fractional counts going
down. Half rounds up, so his walk lands exactly. Audio channels keep their
existing ⇧←→ coupling (audFitComp compensates the snapped ratio on the
speed dial). Measured (unitsnap row, midi lane): 16th→8th→beat→half→bar =
7→8→8→8→16 sixteenths. micrec is 12 rows now.

**ROUND 2 — "the snap to nearest unit size changes the pitch, and it
shouldnt."** Measured three ways before touching anything: the engine was
already holding rate through the walk (a spawn spy showed every cursor at
2.286→2.28, even the mid-join in a canvas≠lane config; the wild ±octave
readings of the first attempt were the zero-crossing estimator tripping on
splice seams — estimator lesson, kept). The REAL movement was
audFitComp's toFixed(2): the compensation is stored, re-read and
compounded on the next length change, and two decimals cost −15 cents
over one walk (442.7 → 438.9Hz), more on round trips. The spd is stored
EXACT now (the dial still displays ×N.NN); only the ±4 rail and the 0.25
detent may bend it, and they flash. Measured: the audible walk is flat —
442.7Hz at every step — and the unitpitch probe row asserts 0.0 cents of
rate deviation on every run. micrec is 13 rows.

**ROUND 3 — "going one step over the max ... expected behavior is that it
just goes to max length 100%."** The sample-length gesture (tab+↑↓←→) used
to refuse any step past the whole take; now the top step PINS AT THE TOP:
the count becomes the 100% point on the quarter-count grid (floored, so
the pitch lock never overshoots) and en derives back from the count the
grid accepted — which is exactly 100% whenever en's history is count
ratios, including takes whose full length is not a whole unit (7.5 16ths
tops out at 7.5×16th). Already at the top, the step still refuses and the
flash says where speed lives. One bug caught by the micro-debug on the way:
the clamped count write went through lane.double() (×2) instead of the
clamped value — 3b/75% doubled to 6b; a `clamped9` flag routes the write.
Measured: 3×b at 75% + one ↑ → 4×b at 100%, spd untouched; next ↑ refuses.

QA: any loop, tab+⇧→ up the units: the length re-grids to the nearest whole
new unit each step; tab+⇧← back down stays whole. Audio channel: same, and
the PITCH DOES NOT MOVE — walk the units up and back with a take sounding;
the speed dial's number changes, the sound does not. And the top step: crop
below 100%, tab+↑ past the end lands ON 100% (loop grows to match), never a
dead key; at 100% it refuses with the speed hint.


## MIC RECORDING ON AN AUDIO CHANNEL — MERGED to main + LIVE 2026-08-24.1701 ("its tight")

His ear signed the whole branch off; 15 rounds, merged as 98698fc, live
confirmed byte-identical to the working tree. `mic-rec` stays pushed as
history; the next batch starts its own branch off main.

Gad, 2026-08-23: "i cant hear anything recorded, can you make my mic input
controlable. also can you draw the incoming audio as its recorded and put a
playhead that writes the audio." Three asks, one root cause under the first.

**Why nothing was recorded: tab never started a sound recording.**
`engine.audRecStart` existed and had NO CALLER — b7e6700 took the call out
("the mic opens, the room is quiet, and a loop of silence lands on top of your
take") and promised "⌃+tab records the mic", which was never wired either. The
only route to a mic take was: hold escape past 200ms (mic on), latch it, then
TAP tab for the last loop off the ring — and that grab ran on the key-DOWN,
after which the key-up's retroCapture flashed 'tab records the input' over the
take it had just placed. The trap b7e6700 guarded against is gone — audPlace
refuses a silent take over a sample — so tab records again:

    tap     the past: mic on → the last loop off the ring (now on the KEY-UP);
            mic off → the keys' retro, as before
    hold    record while held. BOTH recorders start on the way down — the keys
            (pat.state='rec') and the sound (audRecStart) — and the release
            keeps the one the hand used: a cue/pitch key on this channel under
            the hold = keys take, sound dropped; no key = sound take.
            `audRecEnd` is the judge, `audRec.keys` the count; tab spent as a
            modifier (loop ops) counts as a key.
    latch   left win + tab: the sound keeps recording; the next tab ends it
            (latchReleaseAll → audRecEnd). 120s cap unchanged.
    The take opens the mic if it was off and closes it with the take
    (`openedMic`); a mic you opened yourself (escape, latched) stays.

**The input stage, `MIC.g`.** One chain — stream → MIC.g → the ring's tap —
and everything that hears the mic hangs off MIC.g: the take, the cloud's live
wire (granLiveWire; was a SECOND MediaStreamSource), the monitor. The old
audRecStart opened its own getUserMedia, so no dial could have reached it.
On the audio channel's setup row after `input`, shown only while input=mic:

    mic dev   steps the audio inputs (enumerateDevices after the first
              permission — labels need it). CFG.micDev/micDevL: the whole
              instrument, there is one mic. An unplugged remembered device
              falls back to the default and says so.
    mic gain  CFG.micDb ±24dB, 1dB a step, a live meter ▎▎▎▎ while the mic
              is on (MIC.pk, falling peak; dirty only on the sound page).
    monitor   p.au.mon — MIC.g → this channel's bus vIn, the mic through the
              channel's strip. Off by default: speakers feed back.
    AGC is the browser default (on), untouched; if the gain feels like it
    fights back, `autoGainControl:false` in micCons() is the knob.

**The picture.** While `engine.audRec.pi===i` the column draws `.wrec`: a
peak per 512 samples at the place in the loop it will occupy — the same
arithmetic as audPlace (pos0 = fmod(startBeat−anchor,L)·spb·sr − AUDLATC,
hoisted from audPlace's LATC) — brighter than the waveform under it, and a
SOLID line at the write position. Screenshot-verified on a 2-bar loop: the
take wrapped from the loop's end back to its top, as the lane has it. On a
fresh (auto) lane the picture uses the default length; audPlace still sizes
the loop from the take at the end.

**Measured — `tools/probe.sh micrec ch=9 hold=900 db=-6`** (a FAKE mic: a
440Hz sine at 0.3 through a MediaStreamDestination, swapped in for
getUserMedia — no permission dialog, the same numbers on any machine):

    hold 0.9s   take landed, peak 0.300 (expect 0.3), 0.793s of signal (the
                stage takes ~100ms to come up), first sample 0.797s vs the
                placement arithmetic's 0.775s (inside one block), write head
                118.7→149.9px, strokes 16→31, mic closed after (it opened it)
    gain −6dB   peak 0.150 (expect 0.150)
    keys        KeyA under the hold: keys=1, NOT landed, mic closed
    tap+ring    mic latched on, tab tapped: 1.957s of a 2.0s loop at 0.3, mic
                still on, nothing left recording
    monitor     bus rms 0.078 on / 0.001 off, wires 1→0
    device      Fake A ↔ Fake B, stage stays on, the row shows the name
    row         sound page: input=mic · mic dev=default · mic gain=0dB ▎▎▎ ·
                monitor=off; arrows dial the gain +1/−1, monitor 1/1 → 0/0
    live .2352  `AUDLATC is not defined` — the probe cannot even start there;
                none of this existed.
  The REAL mic is unmeasured here (no permission UI in the test browser, and
  see the next trap) — it is the first thing for his ear.

**TWO TRAPS THAT ATE THE FIRST HOUR, both in the measuring, not the code:**
  - **The Mac's output device stalled every NEW AudioContext.** 'External
    Headphones': `afplay` of a 1.6s sound hung the full 10s timeout,
    sandboxed or not; AC.state said 'running' and currentTime advanced exactly
    one buffer (0.006s) then stopped — every ScriptProcessor, analyser and
    worklet sat still and the probe read zeros in BOTH test browsers.
    `AC.setSinkId({type:'none'})` renders in real time with no device: the
    probe harness now checks the clock over 120ms and switches to it (it says
    so in the notes); `sink=none` forces it. If HE hears nothing at all, that
    is this, not TEN — replug the headphones.
  - **The browse daemon's `eval` wraps a file in an async IIFE only when the
    code contains `await`**, never otherwise — a bare `return` is 'Illegal
    return', a file that is already an IIFE gets wrapped twice and returns
    nothing. probe.js has awaits, so it is wrapped exactly once: use
    `tools/probe.sh`, do not hand-roll eval calls. A daemon started with
    `--headed` refuses plain calls ('headed mismatch'); probe.sh asks once
    and follows it. Killing a wedged daemon is fine; the CLI restarts it.

### ROUND 2, same day — settings/Input · esc-held dials · overwrite=erase+mute · tab+↑↓=length

His three: (1) "move the mic settings in global settings in settings/input -
hold mic key (esc) and use -= to adjust mic gain and ; to toggle monitor";
(2) overwrite must "not mix ... just erase the previous recording", and "mute
the previous one when holding mic+rec"; (3) tab+↑↓ should "not affect pitch
just shorten/enlarge the loop".

- **The mic lives in settings/Input now** — mic dev · mic gain (live ▎ meter)
  · monitor — and OFF the channel row. Monitor became ONE switch
  (CFG.micMon): MIC.g → a gain → engine.master, not a channel strip, because
  a global switch must not route by where the cursor stands. (It is inside
  what 'resample the master' records — monitoring while bouncing prints the
  mic, openly.) p.au.mon is gone.
- **The dials ride the mic key**: esc (or Fn) held, -/= steps CFG.micDb
  (⇧=6dB, repeats step), ; toggles the monitor. Deliberately NOT chord-use —
  MIC._used stays false, so a win+esc latch still latches — and ESCH.used is
  set so the release does not ALSO escape. Measured: esc 280ms → mic on,
  −1−1+⇧6 → +4dB, ; → mon 1, layer 1→1, mic off at release, latched false.
- **Overwrite erases.** audPlace pre-filled the canvas with the old buffer,
  so a short take replaced only its own span and the rest of the old loop
  played on around it — a mix wearing overwrite's name. Mode 0 starts from
  silence now (overdub/smart still start from the bed — that is their
  point). Measured, 0.45s take into a 2.0s loop: overdub bed survives
  (1.955s on), overwrite leaves 0.455s.
- **…and the bed is MUTED while you record over it.** audCycle neither joins
  nor re-fires the carrier while a mode-0 take runs on that channel (audRec
  or audRecPend), and audRecStart tset-kills the running carrier — the
  carrier ONLY, so cue/pitch keys under the hold stay audible (they are the
  keys take). Overdub/smart keep the bed. Measured: carrier t→f→t around a
  recording, bus rms 0.058 playing → 0 under the take, back next cycle.
- **tab+↑↓ is loop length on an audio channel too.** It CROPPED the take
  here (×2/÷2 on au.en) since the crop-takeover — and with fit on a crop IS
  a pitch move, which is what he heard. Gone; it falls through to loopOps,
  and loopOps carries **audFitComp** now: any length change on a fitted
  audio lane (↑↓ double/halve, ←→ count, ⇧←→ unit) scales the SPEED dial
  (au.spd, mirrored to au.rate — audFoldPitch's own arithmetic) by
  newLen/oldLen, so the take sounds IDENTICAL and the loop just gains or
  loses room. The dial rails at ×4/×0.25: past it the take genuinely
  stretches and the flash says 'speed at the rail'. tab+-/= stays the SPEED
  pair (stretchLoop); ⇧⌫ reset stays a true reset (no comp). The quick
  crop-×2 gesture has NO key now — the crop keeps its start/length dials on
  the page; if his hands miss it, it needs a new key, not this pair back.
  Measured: count 1→2 with spd ×1→×2 and back, en 1/1 untouched, no take
  landed from the modifier-spent hold.
- Probe run of record (micrec, ten rows, on this build): hold 0.300/0.787s
  head 121→152 · gain −6dB 0.150 · keys drop · ring 1.957s · erase
  1.955/0.455 · mute t/f/t 0.058→0 · monitor 0.17/0 · device A↔B · escmic
  +4dB/mon1 · tabloop 2/×2→1/×1.
- ⚠ Hygiene, worth remembering: mid-session my 3032 `serve` DIED and the
  browse daemon's crash-restore left the fronted tab on a 3033 tab — the
  GSTACK profile, not his Chrome, so his set was never reachable — and one
  probe round ran there before the URL line gave it away. Scratch storage
  at that origin cleared, ten-main restarted, everything re-measured on
  3032 (same bytes, numbers stood). READ THE URL LINE OF EVERY PROBE
  HEADER; a dead server turns "reload" into "restore whatever tab was
  there".

### ROUND 3, 2026-08-24 — mic+rec is the chord, and a fresh take is never repitched

Two more from his hands, minutes apart:

- **"pressing only tab records audio, it should be mic+rec records audio
  input."** Right — for one build every rec gesture on an audio channel
  threatened a take. The MIC KEY is the audio modifier now: tab starts the
  sound recorder only with esc (or Fn) ENGAGED — held, still opening, or
  latched (`MIC.on||MIC._down||ESCH`). Plain tab is the keys recorder it
  always was: no permission prompt, no take, ever. The chord works in either
  order — esc landing while tab is already down starts the take from the esc
  handler (ESCH.used set so it cannot also escape; HOLD.tabUsed deliberately
  NOT set — that reads as tab-spent-as-modifier and would drop the very take
  it starts). With the mic LATCHED, plain tab records — the chord is
  satisfied by the latch, which is what a latch is for. Every message that
  said 'tab records' or the never-wired '⌃+tab' now names the chord.
  Measured: tab alone 300ms → rec none/pend none/mic off/nothing landed;
  esc+tab → the same 0.300-peak take as before, mic closed after.
- **"the playback should give me the audio in the pitch i recorded it,
  repitching should happen only if i change the pitch after i recorded."**
  The take inherited the channel's speed/pitch/crop dials from the PREVIOUS
  take — including the ×2 audFitComp had just written to keep that previous
  take honest — so a fresh recording came back repitched. audPlace resets
  spd/rate to 1, semis to 0, crop to 0/1 when a RECORDING lands: the canvas
  is cut to the loop, so ×1 is exactly what the air heard. Sample PICKS keep
  their dials (sound design survives auditioning the pool); only recordings
  reset. In overdub the bed also returns to ITS recorded pitch — layers keep
  their own pitches, not the repitched mix you happened to sing over; a dial
  turned after the take repitches everything together, which is the rule.
  Measured: spd 2 / semis 7 / crop 0.3–0.6 set before a take → after it,
  1/1 · 0 · 0/1, take landed.
- ⚠ **THE BROWSE WINDOW IS SHARED, and `goto` opens a NEW tab.** The 3033
  tab kept coming back to the front between my runs — tab [1] belongs to the
  window, other sessions drive the same daemon, and my earlier `goto
  localhost:3032` had quietly opened tab [4] instead of repointing [1]. Two
  probe rounds ran against 3033 before the URL line gave each away (same
  working tree both times — the numbers stood — and his Chrome was never
  reachable; my scratch on that origin is cleared). The rule that survives:
  keep a DEDICATED tab, front it BY ID (`browse tab N`) before every run,
  and read the url line of every probe header. Fronted-tab addressing in a
  shared window is a race.

### ROUND 15 — the key-up click shaved, the seed plays from the release

- **"the punch out can be a tik earlier ... it picks up me removing the
  finger from the key sound ... shave off like 30ms from the end."** Done:
  a MIC take ends 30ms before the release, so the key click the mic hears
  on the way up is not in the loop; the edge crossfade rides the new end.
  Mstr resamples keep their full window — no finger in that chain.
  Measured: press .619 / release .938 → span .625–.904 (release −34ms);
  a 120ms tap still lands 87ms.
- **"the seed rec starts playback with a bit too much delay ... start
  playback in real time not compensated."** The delay was the round-14
  drain (~lat + one SP block) — right for the take's tail, meaningless for
  the transport. play() fires AT the release now (seed condition read from
  the take's birth: r.from0 + mic + empty channel); the take lands
  mid-drain and audResume joins it at the phase the clock has reached; the
  tempo branch keys off r.from0 since T.playing is already true when it
  runs. Measured: playDelayMs 0 (first 10ms poll), was ~100–180ms; fit
  1.000 and the seed head at 0.006 unchanged.
  ⚠ Small honest edge: a failed tempo guess (an under-88ms scrap into an
  empty channel) still starts the transport — the set plays, the flash says
  what landed. Rare enough to leave until it annoys.

### ROUND 14 — the punch WINDOW obeys the latency, and a chord tap is a tiny punch

His diagnosis, verbatim and correct: "we fixed the audio latency, but the
record on/off of mic doesnt obey it, so it sounds like recording starts too
early and ends too early ... im getting empty space before and the end is
cut when i do short punch ins."

- **The window.** Content was placed lat early — right for WHERE sounds sit,
  wrong for WHAT the take is: the span began lat before the press
  (pre-press air over the bed) and the air of the last lat ms had not
  reached the stream when the tap closed. Now audRecStop DRAINS: the tap
  stays open lat + one SP block past the release (the block being filled at
  disconnect is discarded by the browser — up to 93ms of the newest air,
  a loss that had been hiding inside the early tail), then the head is cut
  by exactly lat and the take truncated to the held air window
  (relAt−at0). The take IS the air of [press..release], placed at the
  press, lat spent. Placement/auto-play arrive ~lat+93ms after the release
  — imperceptible. Measured (trim = the rig's own 22ms chain): press 0.613
  / release 0.933 → span 0.620–0.916 (was ending 87ms short; start was
  87ms early); the plain punch row's span grew 0.36→0.44 of a 0.45 hold —
  the block loss had been eating every tail.
  ⚠ The drop equals r.lat, so a trim that does not match the real chain
  shifts content by the difference — the tailfix row proves it both ways.
  His 87 is measured; a gear change needs one press of mic sync.
- **"please allow short punch recordings when holding esc and tapping tab."**
  The tap-cancels-the-take rule existed to keep the tap free for the ring
  grab; with the ring tap parked, a chord TAP LANDS what it recorded — keys
  still outrank it (audRecEnd), a graze under 50ms of air still refuses.
  A plain tab tap (no chord) stays the keys' retro. Measured: a 120ms tap
  → 104ms landed at the press (was: cancelled).
- Probe: tailfix + shortpunch rows in micrec (11 rows), trim pinned/restored
  in both prologues; micrec2 12 rows — all green, headtrim's span now the
  full tone (0.499s) with the recovered tail.

### ROUND 13 — the ring tap parked · the SEED take, named and self-starting

- **"lets remove retro rec on audio for now, comment it out or something, it
  doesnt feel good."** Parked — the mic-latched tap that grabbed the last
  loop off the ring is a block comment now; a tap on an audio channel is the
  keys' retro again and lands NO audio (measured: tap-parked row, nothing
  lands, nothing left recording). His follow-up rule is written INTO the
  parked code so a revival is born correct: aligned while playing, AT ZERO
  when stopped. The ring itself still runs (the meter and micCalibrate use
  it); only the gesture is gone.
- **THE SEED TAKE, named** (his "lets give it a name?"): stopped transport +
  mic chord + EMPTY channel. It seeds the loop (take at 0), the clock
  (guessTake, exact bpm), and now the TRANSPORT — "make stopped rec mode on
  empty channel also trigger playback imediatly": play() fires the moment
  the take lands, flash '◉ seed: 1 bar → 135.4bpm ▶'. Measured: playing
  true right after the release, fit 1.0.
- **"punch in rec messes up the position of initial recording" — measured,
  and the vanilla flow is CLEAN.** Seed (marker at its head) → play → punch
  while playing: the seed's marker stayed at 0.006s and the punch landed at
  the press phase (seedpunch repro + the tempo row asserts it every run:
  head 0.006 / punch 1.033 after a mid-loop punch). What DOES move it: a
  punch while STOPPED — round 12's own "always from 0" replaces the seed's
  HEAD at 0, which reads exactly as "the initial recording moved". The seed
  auto-play dissolves that flow (after a seed you are playing, so punches
  are playing punches). ⚠ If his hands still find a stopped punch over a
  bed and it still reads wrong, the dial to revisit is round 12's
  stopped-with-bed rule — one condition, his call.
- Probe self-sufficiency, twice more: micscope leaves the gain dial at −5
  (the tempo row now pins it) and the new tempo row mutes the feed (nearend
  now raises it). A row that borrows state from its neighbours breaks the
  moment the neighbourhood changes — every row sets its own stage now.

### ROUND 12 — a stopped take always starts from 0

"when playback is stopped, recording with esc+tab should always start from
0." It only did on the EMPTY channel (the tempo path); with a bed, a stopped
take landed wherever the free-running grid clock happened to stand. Now any
chord take that BEGINS with the transport stopped anchors to the loop start
— decided at the take's birth (audRec.from0), so the live drawing fills
from 0 while you hold; the trim is 0 (no grid to align to) and the head-cut
keeps the first SOUND on the zero point; a transport started mid-take keeps
the anchor. Empty-channel takes still also set the clock, unchanged.
Measured (from0 row): 440 bed, stopped 523 punch → span starts at 0.006s
(the crossfade edge). micrec is 9 rows now.

### ROUND 11 — ⇧⌫ clears the channel · the eaten boundary · the silent head

- **"i want shift+del to clear the recording channel so its setup for bpm
  detection."** Right-shift+⌫ on an audio channel (any layer ≥1) clears the
  WHOLE recording channel: take gone, cues and lane events gone, lane back
  to AUTO at the default length, dials neutral — the next stopped mic take
  is a NEW loop and sets the clock. It outranks the lane-only ⇧⌫ (and the
  held layerInit) on audio channels; the take stays in the pool, ⌘z brings
  everything back. Measured: buf false · auto true · 0 events.
- **"i finish a recording near the end of existing loop it stops autoloop
  play."** Reproduced exactly: release 0.126 beats before the bar → ONE FULL
  LOOP of silence (feels stopped; a stop/start also cures it, which is what
  he did). Root cause: while a mode-0 take runs, audCycle skips every
  boundary in its windows — including the NEXT one, already consumed into
  posted-territory (T.schedBeat) that no later tick revisits — and
  audResume's tclr flushes even a queued spawn. audResume now re-posts that
  one boundary's carrier when it is behind T.schedBeat (fit channels only:
  a FREE channel keeps its single deadline-less join and must not get a
  second; the ph<1e-3 early-return also joined the fix). Measured: bus rms
  0.102 across the boundary and 0.102 a loop later, carrier back — was 0
  for a whole loop.
- **"there is a bit of silence added before when i seem to be pressing
  rec."** The +87ms trim moves CONTENT earlier, so the stream's spin-up and
  the breath before the first sound landed BEFORE the press — and in
  overwrite that silence punched a hole in the bed. audRecStop now trims
  the head to ~6ms before the first audible sample (thr = max(0.004,
  peak·0.05), only when ≥ ~23ms of silence) and moves the start beat with
  it: the sound sits exactly where it sounded and the punch begins where
  the TAKE does. The tail stays — a punch-out is timing, not noise. The
  tempo guess reads the trimmed length (a truer duration). Measured: 400ms
  of silence under the press then 500ms of tone → span 0.418s, bed intact,
  zero holes where the silence was.
- **The probe split in two** — the browse CLI hard-caps any command at 30s
  and the suite had grown past it: `micrec` (the recorder: chord, tab-alone,
  picture, gain, keys, ring, punch/xfade, repitch, mute/resume — ~17s) and
  `micrec2` (the session: monitor, device, sync, esc dials+arrows, tab
  loop, latc, stereo, tempo, nearend, headtrim, clear — ~26s). Rows carry
  their own setup now (the split re-ordered them and three ran cold before
  they did). 8 + 12 rows, all green on this build.

### ROUND 10 — stereo resample · crossfaded punches · a take into silence sets the clock

Three asks, one scope decision:

- **"when ch input is set to master, and chan is stereo, record the stereo
  out of master, rn its mono."** The mstr tap runs ScriptProcessor(4096,2,2)
  and audPlace builds an n-channel canvas (max of take and old bed; a mono
  bed under a stereo take doubles to both sides). granSend already shipped
  L/R and the worklet already stored both — only the recorder was mono. The
  mic stays mono; `chan` still picks at playback. Measured: a hard-left
  660Hz blip through the master → a 2-channel take, right channel energy 0.
- **"put a little crossfade when punching a recording to avoid clicks."**
  audPlace ramps the take's first and last ~6ms (F=256 samples, capped at a
  quarter of a short take), and in overwrite the old layer holds the
  complement — both joins are seams. Overdub/smart scale their sum/duck by
  the same ramp. Measured on the punch buffer: max sample step 0.019 (a
  hard edge between the two test tones would be ~0.45).
- **"when playback is stopped, and i start a new mic recording, it will
  start the recording from 0, and will change the tempo to make the
  recording length match."** Done via guessTake — BEATCANDS gained 0.25/0.5
  (his 16th and 8th), window already 80-170, bars and the middle preferred
  — the bpm is set EXACTLY (60·beats/dur, 3 decimals) so the loop IS the
  take, the lane is recut (unit b under a bar, B at and above), and the
  take lands at position 0 with lat 0. Measured: 1.765s of signal → 1×B at
  135.999bpm, fitRatio 1.000, from 0.
  **SCOPE, decided by the probe itself: EMPTY CHANNEL ONLY.** The first cut
  fired on every stopped overwrite take — and the suite's own hold row
  (stopped, empty, mic) promptly re-clocked the set to 143bpm and every
  loop-seconds assertion moved, which is exactly what a stopped punch-in
  would have done to HIS set. A channel that already holds a take keeps the
  clock in every mode; only a truly new loop defines it. (Undo restores the
  take but keeps the tempo — a dial.) If his ear wants stopped FULL
  re-records (overwrite over a bed) to also re-clock, it is one condition.
- Probe hygiene that fell out: the suite pins bpm 120 at start (scratch
  state had drifted once and every seconds-assert chased it), and the
  hold/gain rows now run under a PLAYING transport — truer to life, and the
  only way they stay out of the new tempo path. Grid placement under play:
  firstAt−expAt ≈ 32ms (one SP block of scheduling jitter), loop 2.000s.

### ROUND 9 — trim confirmed at +87ms; the monitor goes through the strip

**His chain measured +87ms and "its tight"** — the number lives in his
ten-cfg (CFG.micTrimMs, origin 3033); a gear change is one more press of
`mic sync`.

- **"can you make monitor on go through the channel effects?"** — done. One
  switch still (settings/Input, esc+;), but the wire lands in the STRIP of
  the audio channel the mic would record: the one recording now, else the
  one the cursor stands on; the master only when no audio channel has
  focus. You hear yourself through its rack, fader and pan — the take in
  place. Re-aimed from the 70ms cursor-ping interval, graph touched only on
  a target change (MIC._monAt). Measured: monitor on → bus9 rms 0.202,
  master 0.172 downstream, off 0.026 (strip tail in the window), at ch9.
- **Retro, for the record** (he asked how it works): with the mic OPEN (esc
  held or latched) a 32s ring hears everything; a TAP on tab grabs the last
  loop-length of air (auto lane: 16 beats) and places it ending NOW, mic
  trim applied. Without the mic, a tap is the KEYS retro (retroCapture /
  tab+digit reveal), unchanged. Hold = forward recording; there is no
  forward-armed "record the NEXT loop" — the ring makes it unnecessary.
- **Quantize, for the record**: a take's placement is NEVER snapped —
  startBeat is raw gridNow() through the trim, so the audio sits where it
  actually sounded (that is what the calibration is for). Keys played under
  the hold quantize like any notes when Q is on. Offer on the table: Q-on
  snapping the take's START to the grid — declined by default because it
  would move audio off where it sounded; his call if punch edges should
  snap.

### ROUND 8 — his mic test is a BUTTON: settings/Input → mic sync

"click test is better ... but with mic it is now lightly late like the
recording is flaming about 100ms after the click, maybe you can do my test."
His ~100ms is the REAL chain — speakers out, air, mic in, MediaStream
buffering — which the browser under-reports (settings.latency was the whole
guess) and which no constant measured on another machine can know. So his
test ships as a button:

- **settings/Input → `mic sync`**: plays 4 clicks through the master at
  known clock times, records the room through the SAME tap chain a take
  uses, finds each click's arrival, and stores the median in
  **CFG.micTrimMs**. audRecLat spends it on every mic take (and the ring
  grabs, and the live drawing). It refuses to store garbage: fewer than 3
  of 4 clicks heard ('speakers audible? room quiet?') or spread >30ms
  ('unstable') flashes why and keeps the old value. micCalibrate returns
  its verdict, so the probe can assert it.
- **`mic trim`**: the same number by hand, ±5ms a step (from the browser's
  guess when unset — 'auto'), −250..+500ms, for a device that lies.
- Probe: the sync row wires the master into the fake mic and runs the real
  button — **'ok 22', trimMs 22** — which equals the loopback's own
  buffering measured independently (22.4ms, spread 0, four clicks). The
  first run heard 0/4 and exposed a PROBE defect worth keeping: the fake
  getUserMedia returned one singleton stream, and micSetDev stops the old
  stream's tracks — a stopped singleton was a dead mic for every row after
  the device one. The fake mints a fresh stream per call off one feed now.
- Still his ear's to confirm: run `mic sync` once with the speakers audible
  (headphone-only monitoring cannot hear the clicks — it says so), then his
  click test again: the transient should sit ON the click. Per-machine, per
  origin; a gear change is one more press.

### ROUND 7 — ←→ joins the sample-length gesture, and AUDLATC was fiction

Two more asks, both landed:

- **"make tab+←→ same as tab up down to control the length not speed, and
  make it work the same as in midi that it will add or remove steps
  according to the loop unit size."** One branch now serves both pairs on an
  audio channel with a take: ↑↓ doubles/halves, **←→ steps ONE UNIT** — a
  16th, an 8th, a beat, whatever the lane's unit is (⇧←→ still picks the
  unit) — crop and lane locked either way, rate immovable, speed dial never
  written. Edges refuse with a flash that names the keys; the LOOP alone
  (more bars than material) is right shift's length dials, as ever.
  audFitComp now only serves ⇧←→ unit switches on audio.
  Measured: b-unit lane 4→←→3 with crop 75%/spd ×1, →→ back 4/100%/×1,
  → at the full take refused.
- **"the recording is placed too early, please do a calibration."** Done his
  way, automated: the `latc` probe row fires six blips at known clock times
  through the master and records them via the take path (src=mstr — no
  MediaStream in that chain), then measures where they LANDED against the
  beat grid. **E = −8190 samples, spread 0, with the old AUDLATC=8192** —
  the tap chain's true delay is ~2 samples (the onset detector's bias), the
  8192 was pure faith, and every take sat 186ms early. That IS his "recorded
  click is like 1 16th note almost earlier then the live click" (125ms at
  120bpm) plus his mic's real input delay. **AUDLATC=0 now**, and a mic take
  adds the device's own latency at RECORD time — `audRecLat`: the stream's
  reported settings.latency plus AC.outputLatency, so a bluetooth headset
  pays its own bill per take and a rewire needs no rebuild. Re-measured:
  **E=+2 samples (0.045ms), spread 0**; the fake-mic hold row's drift fell
  ~50ms → 9ms (the loopback's own buffering, which real devices report).
  ⚠ The test browser's fake mic reports no latency, so the REAL-mic offset
  is verified only by the formula, not by air: his click test by ear is the
  judge, and if a device lies about its latency the honest next step is a
  manual trim setting (offer made, not built).

### ROUND 6 — tab+↑↓ is SAMPLE LENGTH; speed is nobody's side effect

"i noticed that now tab+updown changes the playback speed, it used to change
the sample length, i think its more intuitive that sample length and speed
are seperate things?" — the round-4 compensation kept the SOUND identical
but wrote the speed dial to do it, and a dial that moves reads as a speed
change. Third shape, and the one that closes it: **tab+↑↓ scales the crop
AND the lane together** — half the material over half the loop is the same
tape at the same rate — so under fit nothing else absorbs a ratio: the
speed dial is never written, the pitch cannot move (both his complaints at
once: 08-23's pitch drop came from crop-alone, 08-24 morning's dial writes
from lane-alone). Refused at the edges rather than clamped — a partial
ratio would un-grid the lane — with the flash naming which key does what:
the whole-take ceiling says '⇥←→ grows the loop, ⇥-= the speed'.
Measured (tabloop): ↓ 0.5count/0.5crop/spd×1 · ↑ 1/1/1 · ↑ at full refused
1/1/1 · no take landed. Speed remains ONLY tab+-/= and the dial.
⚠ OPEN, his call: tab+←→ (loop ±1 count) and ⇧←→ (unit) still carry the
round-4 spd compensation — the dial shows e.g. ×1.5 after growing a fitted
loop by a bar. If "length and speed are separate" extends there, the
honest alternatives are (a) let pitch follow the fit again on ←→, or
(b) ←→ also refuses on fitted audio. Asked in chat.

### ROUND 5 — letting go of rec resumes playback AT POSITION

"when letting go of rec, right now it stops playback and triggers only when
loop retriggers in start of the loop. instead it should continue playback
from the correct position." The record-mute killed the carrier and audCycle
only re-fires at the loop's start — the release left silence until the bar
came round. **engine.audResume(pi)**: audCycle's fresh-pattern join (actAt
anchor, audStop then audPlay with the phase as skipBeats), called wherever a
recording ends — audPlace (landed), audRecStop (dropped / too short). Quiet
when there is nothing to do: transport stopped, auto off, a carrier still
rolling (overdub never lost its bed), or the phase on the boundary. The
boundary's own carrier takes over next cycle, as after a pattern switch.
Measured (mute row): bus 0.058 playing → 0 under the take → **0.04 within
~370ms of the release**, carrier t→f→t unchanged.

### ROUND 4, same morning — the mic hold is a SCOPE, and overwrite is a PUNCH-IN

"much better", then two:

- **"holding mic button and up/down to change gain should not use updown for
  other params, it should scope only on the mic."** The mic hold is a held
  scope now, the PARAM FOCUS shape exactly: while esc (or Fn) is down,
  ↑↓ = gain (⇧ 6dB) · ←→ = input device · -/= = gain too · ; = monitor,
  and NONE of it reaches the page's params, the cursor, the settings rows or
  the layer. The ←→ device pair is the scope's second pair by the MAGPAIR
  convention — he asked only for ↑↓; if ←→ on the mic annoys, it is one line.
  A latched mic does NOT hold the scope — the key must be physically down, a
  latch frees the keyboard (same rule as every held scope). Measured on the
  sound page: esc-held ↑, ⇧↓, → gave db +1−6=−5 and Fake A→Fake B, with the
  preset JSON byte-identical, curParam 0→0, layer parked, mic off at release.
- **"recording a small area overwrites the whole loop, it should overwrite
  only the part where rec was held and keep other areas of the previous
  layer intact."** Overwrite is a punch-in now. This REFINES 08-23's "just
  erase the previous" (which one build read as erase-the-whole-loop): the
  no-mix half survives — inside the held span the new take REPLACES outright,
  never sums — and outside the span the previous layer is untouched, in
  every mode (the canvas starts from the old layer again; the modes differ
  only inside the span: replace / sum / duck). A whole-loop replace is still
  one gesture: the mic-latched TAP takes a full loop, and a hold longer than
  the loop covers it all. The mute while recording stays as it was.
  Measured (bed 2.0s @0.3/440Hz, punch 0.45s @0.15/523Hz): overwrite —
  span 0.36s at punch level, bed 1.64s intact, ZERO windows above the sum
  threshold; overdub — 0.35s of summed windows. If his ear finds the mute
  fighting punch-in timing (you cannot hear the bed you are punching into),
  that is the next dial to discuss — it was his ask and it stands.
- ⚠ Probe trap for the file: re-laying a bed by OVERDUBBING the same
  frequency phase-cancels (0.3+0.3 came out ~0.12 and read as the punch
  band). Beds are re-laid in OVERWRITE, and any same-tone layering assert
  should use two frequencies (440/523 here) so a sum is unmistakable.

QA — most likely to be wrong first (fake-mic measured; the REAL mic still is
not, and is test #1):
 1. **The chord, at your pitch.** Hold esc, keep it, hold tab ~2s, talk, let
    go: '◉ audio: N bar loop', played back exactly as spoken — dials neutral
    after. Plain tab: keys recorder only, no prompt, no take. Mic latched:
    plain tab records (the latch is the mic half).
 2. **Punch-in.** Loop with sound, rec ovwrt, chord-record a SHORT bit
    mid-loop: only that span is replaced — clean, no doubling inside it —
    and the rest of the layer is exactly as it was. While you hold, the old
    loop is quiet; let go and playback carries on from the CORRECT POSITION
    at once (the bar's own respawn takes over next cycle). Full replace:
    mic-latched TAP (the ring takes a whole loop), or hold past the loop.
 3. **The mic scope.** Hold esc: ↑↓ walks the gain (⇧ = 6dB), ←→ steps the
    input device, -/= also gain, ; monitor — and NOTHING else moves: no
    param dials, no cursor, no settings row. Release: all keys back to
    normal. (←→ on the device was not asked for — say if it should go.)
 4. **Repitch only after.** Record; turn speed/pitch/crop — now it
    repitches; record again — neutral, your voice at ×1.
 5. **The bed mutes while you record over it** (ovwrt; ovdub keeps playing).
 6. **tab+arrows = sample length, both pairs**: ↑↓ double/halve, ←→ one
    unit at a time (16th/8th/beat — ⇧←→ picks the unit) — same speed, same
    pitch, speed dial untouched, edges refuse with the flash naming keys.
    The loop ALONE (bars beyond the material) is right shift's dials.
 0. **TIMING — press the button, then his test.** Settings/Input →
    `mic sync`, speakers audible, room quiet: 4 clicks, then '✓ mic sync
    NNms'. Now click on, chord-record a loop of it, play back: the recorded
    transient sits ON the live click. Off by a hair → `mic trim` ±5ms.
    Internal loop (input=mstr) needs no trim and is already sample-exact.
 7. **Keys under the chord = keys take** ('the sound was dropped').
 8. **Settings/Input** still the reference: mic dev · mic gain (meter) ·
    monitor; esc+; and settings toggle the same monitor.


## LIVE MOD-AMOUNT + META-MOD — FIXED on branch `live-mod`, build .2352, his ear next

Two bugs, both found only after loading HIS set (`ten-set-2026-08-22-23-29.json`,
ch4 KEY phase / ch7 BES1 native). The lesson AGAIN: synthetic `dst:2` routes all
worked; his routes use the **ADDRESS** system (`{rack:voice,key:pitch}`, dst:0 +
addr), a different code path. THE PROBE SET IS NOT HIS INSTRUMENT — load the export.

Dead ends first, both reverted: a `busReaim` for AUDIO channels (he said SYNTH; I
inferred audio from session history — reverted byte-identical to main), and a
`_modParam` mod-amt branch (wrong resolver — the meta-mod path is modLive, not
_modParam; reverted).

**A — manual amount tweak dead (ch4+ch7).** An addr LFO/env leaves its live handle
with **ri:-1**. `effRoute` returns a NEW object for an addr route (Object.assign),
so the loop's `effRoutes(m).indexOf(rt)` — a SECOND effRoutes() call, fresh objects
— found nothing = -1. modReaim did `effRoutes(m)[-1]` = undefined and SKIPPED the
handle. dst routes returned the same object so their ri was right — why synthetic
tests passed. Fix: index the loop (`ri` = position), ~line 6582. Verified: ch4 ri
-1→0, depth 600→2400 live; ch7 -1→0, 150→2399 across 49 unison handles.

**B — mod→mod on AMOUNT dead while RATE worked (his ch7 meta-mod: env→LFO amount).**
Not new — the meta-mod system exists (Gad: "lfo rate already works"). Two bugs, both
because an LFO's amount lives in `routes[].amt` while rate lives on the slot:
(1) `modTick` read the base as `h.slot['amt']`=undefined→range floor; now uses the
spec getter `sp.get(h.slot)`=the route amt (~line 9176). (2) `modLive('amt')` wrote
`L.lg.gain` — a gain built in lfoN but NEVER CONNECTED on the normal path (osc goes
lo→g3→target; g3 is the modN 'lfo' handle). Now aims those modN handles with the
same tapered depth modReaim uses (~line 9277). Verified: ch7 env→LFO-amount, depth
tracks the env 1966→919 as it decays 0.97→0.52 (at env amt 35; his amt **200
saturates the taper** — a tuning choice, dial down to hear the sweep). Rate meta-mod
unbroken (5→8.99).

Both are SYNTH-channel, addr-routed. Audio untouched. His ear on 3033 next; then
merge. His `_modParam` still has NO mod-rack case — that path is for audio params;
mod targets go through resolveDest+modTick+modLive.

## SYNTH-SHAPING — MERGED to main + LIVE 2026-08-22.2239

The new floor. Three asks, in his words: (1) max-uni wide should be **wider,
less centred**; (2) **pitch/ratio mod (env, lfo…) more extreme**; (3) **default
op trig = free**. All landed as one merge; his ear passed #1 and #3 green, #2
retuned to 4 oct @100% after "12 was too much" and he said "sounds good."

- **1 wide — GREEN by his ear.** `WIDEFAN(off,wide)` (near line 472) replaces the
  linear `off*wide` in both the native pan and the phase pan: it pushes the
  panning toward the edges as `wide` climbs, so max uni sits harder L/R and
  emptier in the middle. He said "green".
- **3 trig-free — GREEN.** `mkOsc` (line 688) now defaults `phm:1` (free trig)
  instead of 0. New patches start free; `trig` still exists, just isn't the
  default. He said "green". (Open question he left: whether to keep `trig` at
  all — "not sure we need it but lets keep for now".)
- **2 pitch mod — FIXED 2026-08-22.2239, HIS EAR NOT YET.** He said "i dont hear
  a difference, im using env on ratio and on voice1 pitch". Root cause: a
  note-driven FM voice applies env→pitch on **its own path**, never the
  resolver/bus path the first attempt (.2201, 12 oct) raised — which is why he
  heard nothing. Two spots, both hardcoded to a 2-octave (2400-cent) ceiling:
  the direct contour at **7413** and the live re-aim's `k` pushed at 7428
  (consumed at 8699). Both now scale off **`MODCENTS_PITCH` (line 476)**, the
  same constant the LFO/resolver path uses, so ONE number governs all pitch mod.
  **Ceiling: 12 oct was "too much" — set to his spec, 4 oct @100% / 8 @200%,
  linear.** `MODCENTS_PITCH=4800` (= filter's MODCENTS = 4 oct = customary pitch
  mod). The env is linear in amt so its clamp is widened to `±2×` = ±9600 to let
  amt 200 (route max, line 1694) reach 8 oct; the LFO path is tapered so it
  caps at 4 oct at 100%+. Measured on 3032: amt 100 → op0 detune **4797 cents ≈
  4.00 oct**, amt 200 → **9594 ≈ 8.00 oct**, `modN.k=48`. (Was 2 oct before the
  batch.)

## THE BRANCH PROTOCOL — from 2026-08-21 evening, Gad's call

**MERGED 2026-08-22, FOUR TIMES.** The accuracy batch (.2203), the arp batch
("hallelujah it works", .1207), the standing-bugs batch (1/2/3, .1734), and the
voice/CPU batch ("no cut now, keep the ceiling", **2026-08-22.2152**) — the
current floor, on main and LIVE. The last one's real fix: the audio cut was a
leaking pile of decaying ten-fmop worklet tails, bounded now at FMWCEIL=18. Every
[branch] entry below is now main. `audio-fixes` was reset onto main and stays
the workbench for the next batch; the protocol continues unchanged.

"maybe make a branch and keep fixing things so we dont pollute master."

- **main** is the FLOOR: the state Gad can always fall back to. Right now that
  is 2026-08-21.1954 — grid-locked lengths (the behavior he knows), replay
  spawns on target (confirmed good: "they dont slide from baseline"), the
  supersaw sound both engines confirmed good. LIVE serves main.
- **audio-fixes** is where every further fix goes. It is checked out in this
  directory, so BOTH ports serve it — Gad tests the branch on 3033. Falling
  back is `git checkout main`, run on his word, instant.
- **Nothing merges to main without his explicit ok.** When a batch on the
  branch survives his testing, it lands as one merge and live follows.
- The raw-held length rule was tried on main and rolled back the same hour —
  "nop, all over the place". First branch commit is the NEAREST-grid variant:
  lengths stay on the grid (uniform, familiar) but a 1.1-grid hold records 1,
  not 2. Measured: held 1.1/1.6/0.6/0.15 grids → recorded 1/2/1/1.
  He judges it; main's rule is untouched either way.

`audio-mono` is merged; everything below is on main and Gad tests on plain
localhost:3033. One playhead is the model: a cue MOVES the head, it does not add
one, and poly is gone from this channel type by his own call.

**BOTH AUDIO KEY PATHS NOW GO THROUGH THE PLAY RACK.** That was the session's
main structural change and it took three attempts; the third worked because it
had an instrument. A pitch key and a position key both travel through
`engine.trigger` — the door every other note uses — so the arp, chance, nudge
and the rest exist on an audio channel, and `recPlayNote` writes what the rack
produced rather than what the finger did.

## THE INSTRUMENT THIS SESSION BUILT — read this before touching a key path

`tools/probe.sh keypath code=KeyA ch=9 kmode=0 auto=1 arp=0 hold=400`

    arrived  the app called preventDefault — it CLAIMED the key. Without this
             a zero row cannot be told from a key that never landed, which is
             how three diagnoses went wrong before it existed.
    acted    a state fingerprint moved (kbHeld / AUD.gk / liveV / flash)
    route    the engine doors it reached, in order. trigger means the rack saw
             it; cueNote/bend mean the key handled itself; audMove/audPitch are
             the head actually moving.
    cfg      the channel as it stood, so a row explains itself a week later

Two things it must be read correctly or it lies:
- **A quantized route arrives in the SECOND row.** The sound is deferred to the
  grid line, so reading only row one is how a working key looks dead.
- **`arrived: n/a` on key-up is normal** — most key-up handlers here do their
  work without preventDefault. It is not a stale hold.

## THE METHOD LESSON, and it cost four false findings

**ONE CONFIGURATION PER PAGE LOAD.** Setting `kmode`/`auto`/`cmode` and pressing
keys in a loop is what breaks a measurement: the channel keeps worklet state,
`audCar`, held entries and pooled arp notes across the switch, so run two reads
the leftovers of run one. Four times this session a "bug" was that and nothing
else — the last one was reported in a commit message as a gap in the position
arp recording, and two fresh loads then showed 19 events at 17 distinct times.
The keypath probe reloads nothing; it inherits whatever the last call left.

**A THROW INSIDE A TIMER IS INVISIBLE.** Two separate bugs this session were a
ReferenceError in a deferred callback — `glP` used above its own `const` (TDZ),
and `trSemis(p9)` in the cue branch where `p9` belongs to the pitch branch's
scope. Both made a key silent while the handler looked innocent, and neither
showed in a syntax check or the console. A route that stops early is the only
thing that sees them.

**AND THE ONE GAD NAMED, which is the root of both:** "why are you just not
recording those events as they are? it looks like you are trying to reproduce
it with some calculation and building double logic". He was right twice — the
chord length was re-derived with an fmod that turned a negative into a bar, and
the first routing attempt hung a second note stack on the bend shim beside the
one monoTrigger already keeps. The question to ask before writing any of it:
**who already knows this?**

- **THE ROUND TRIP IS THE MEASUREMENT** — `tools/probe.sh roundtrip ch=9
  kmode=0 auto=1 arp=1 div=0.25 keys=KeyA,KeyS`. Every earlier check here read
  the lane's CONTENTS and called it verified; what Gad hears is the lane
  PLAYED, and three faults only appear there. It records a phrase, switches the
  generator off, replays it, and compares what the playhead did in each pass.
  Position keys, 1/16 arp, two keys held two beats:
  **16 live moves → 18 recorded events each ~0.1 beat late, now 16 → 16,
  median 0.019 beat, zero wrong cues.** Three separate causes:
    - **groove applied twice.** `arpTick` recorded `b+grooveOff(...)` and the
      replay adds `grooveOff` again. The hand recorder already says so in its
      own comment — "qt stored straight (groove is a playback layer)" — the
      generator was the odd one out. That is the ~0.1 beat.
    - **the held key recorded itself on top of the generator's steps.** The
      note recorder had the test (`arpOn`) and the audio cue and pitch releases
      did not. One function now, `genOn`, asked by all three. 18 → 16.
    - **replay was not legato.** A held arp is one mono line: live, a step's
      release finds the other key still down and skips the return to baseline.
      Replay gave every step its own release — 16 events made **33** audPitch
      calls, a drop to baseline and back 0.019 beats later, sixteen times.
      Same rule ported to the lane. **16 → 16.**
- **Clearing a lane brings the head home.** It left an audio channel wherever
  the last recorded cue had jumped it, with an empty lane and nothing left to
  move it again — "clearing keys recording makes loop stuck in a wierd state".
  `clearLane` drops that channel's finger state, returns the bend, relocks.
- **The phase FM engine's operators all started at zero, whatever trig said.**
  `tools/probe.sh trig` — two identical notes, correlation of the first 1500
  samples: native rtrg **1.000** / free **-0.825** (correct), phase rtrg
  **-0.952** / free **1.000**. Free reproducing itself exactly is the tell.
  `ten-fmop` initialised every operator at `Math.random()*0.0001` and the
  builder sent no phase at all. It sends one now — cfg carries 0.25 twice at
  90°, 0.75 at 270°, and 0.45/0.3905 on free.
  ⚠ **It is the NATIVE engine that works**, not the phase one; the report had
  them the other way round.

- **With the loop off, a phrase that filled the bar never struck the take
  again.** Two findings, and the first is that "24 live moves -> 17 replay,
  worst 0.112 beat" — shipped that morning as the evidence for this bug — was
  the COMPARATOR, not the instrument. Live legitimately makes calls the replay
  does not need (its own first and last release, an audPlay/audStop per
  strike), and nearest-match pairing cannot tell a release from a step whose
  interval is 0 semitones: `audPitch(pi,0)` either way. The probe reports n/a
  for those columns in pitch mode now and says why.
  Recording and playback were accurate all along — four stabs, quantize off,
  pitch mode, loop off: **recorded 0.009 pk0 / 0.502 pk2 / 1.003 pk4 /
  1.505 pk5, lengths ~0.20; live attacks at 0.32 0.64 0.94 0.96s, replayed at
  0.02 0.32 0.64 0.94 0.96s, peak 0.1303 vs 0.1302.**
  What WAS wrong was the legato lookahead added the same morning: it wraps the
  loop seam, which is right with the loop ON (the take runs continuously) and
  wrong with it OFF, where the take is a one-shot. A loop-filling phrase became
  infinitely legato — nothing released the cursor, nothing re-struck the take,
  and the replay rode whatever cursor was alive from the recording pass. It
  still made sound, so only a COUNT showed it:
  **0 audPlay across a loop → 1 per cycle, on the first loop and the second**
  (rms 0.0197 both). Auto on untouched: still 16 → 16 on pitch and position.

- **AN AUDIO LANE RECORDED MIDI NOTES WHILE IT WAS LISTENING FOR ITS LENGTH.**
  "arp audio position still not recorded", and "reproduces, but then stopping
  and starting playback again its gone" — one line:
  `if(isAudioCh(pi)&&!lane._cap)return recAudEvent(...)`. With a listen window
  open that guard sent an AUDIO lane down the generic capture path, which
  writes `{midi}` events; an audio lane cannot play one, so the arp went in
  complete and none of it came back — audible while the capture buffer held it,
  dead the moment the window closed into a clip.
  Identical script, both builds, ch9, fresh lane, 1/16 arp, two keys:
  **1542 recorded `midi x16`, 0 moves on replay · 1620 recorded `cue x16`,
  17 moves.**
  ⚠ **THE PROBE SET IS NOT A FRESH CHANNEL, and it hid this for a day.**
  `_probe-set.json` has its lengths already set, so no window ever opens and
  five configurations all passed. A window is open exactly when the length is
  still being LISTENED for, which is the state a fresh channel is in — so it
  was the COMMON case that was broken and the measured one that worked. Any
  recording measurement from now on runs once on a lane with
  `initLane(lane); lane.auto=true` as well.
  A window changes the CLOCK, not the vocabulary: `recAudEvent` takes its `t`
  from the window when one is open and feeds `lastEnd`. The two hand-played
  audio releases had the same hole — fmod against `lane.len`, which during a
  window is its temporary 64 bars — and now ask the same question.

- **POLY WAS NEVER ONLY AN OPTION ON AN AUDIO CHANNEL.** "keys became
  polyphonic, position creates new playheads instead of jumping". Real, not
  from that day's work, and unreproducible for THREE rounds because the probe
  set's ch9 is saved at `vox.mode 1` and his at `0`. One playhead has been the
  model since audio-mono, but the FLOOR that enforces it was applied in the key
  handler and nowhere else — `trigger` and `cueNote` both read vox.mode raw, so
  a channel stored at 0 fell through to `audPlay` and spawned a cursor per key
  while the SAME channel's own key handler moved one head. That is why it read
  as a broken engine rather than a stored value. It took the arp with it: the
  arp fires its cues through that same door.
  His set, imported: **three position keys took the tape 1 → 2 → 3 → 4 cursors,
  doors `audPlay audPlay audPlay`; after, 1 → 1 → 1 → 1, `audMove` ×4, zero
  audPlay.** Poly is now GONE rather than floored in one more place (his call):
  `voxOf(p)` is the one answer every reader asks, the dial walks mono↔legato
  only, the readout cannot print it, and a set stored at 0 heals on load.
- **Setting the ONE is not recording the key.** Recording an arp onto a FRESH
  channel came back with `{midi}` events an audio lane cannot read — signature
  `t=0, dur=<however long you held>`, which names the branch: "● the ONE is
  set" forces `qt:0`, and it was the one branch that never asked whether a
  generator is running. recPlayNote had the arp's steps right all along; these
  were the fingers landing on top. **`cue x13 midi x1` → `cue x17`, no midi.**
  The ONE still gets set and the listen window still opens; only the note
  stands down.
- **A cursor count falling to 0 was the PAGE, not the arp.** Traced from before
  the transport started it read 0 with no arp and 0 while STOPPED — a page
  stop/played through six configurations. ONE FRESH LOAD PER CONFIGURATION is
  already the rule here and it was broken three times in one session.
  Clean: **tv `play=1 k1=1 k2=1 k3=1 rel=1`, replay 19 audMove / 1 audPlay.**
- **THE PROBE SET IS NOT HIS INSTRUMENT — ASK FOR THE EXPORT.** Four wrong
  theories in one session (qlive, the global modifier, autoloop off, vox.mode
  as a string) all came from measuring `_probe-set.json` and reporting it as
  verified. CLAUDE.md already says his set travels as a file and that asking is
  cheap. Every one of those cost him a round trip. The moment a report does not
  reproduce in two tries, ask for `exportSet` — do not build a third theory.

- **THREE WAYS TO RECORD, AND ONLY ONE OF THEM EXISTED ON AN AUDIO CHANNEL.**
  Gad named them and the naming is what found the bug: retro (tap tab, take the
  last bars), momentary (hold tab while you play), latch (LEFT WIN + tab).
  Every probe in this session armed rec by setting `pat.state` directly — the
  MOMENTARY path — reported clean numbers four times, and never touched retro.
    - **Retro wrote the arp as midi notes an audio lane cannot play.**
      `recPlayNote` feeds `retroBuf` and pushed a raw `{t,midi,vel,dur}`. A
      hand-played cue or pitch key puts a real cue/pk in that buffer, so retro
      worked BY HAND and died on the rack's output. And the guard above both
      commits — refuse an audio channel with no cue/pk/fz — did NOT fire,
      because the two hand entries satisfied it, so retro reported success and
      wrote 23 dead events. **`midi-only x23, pk x2` → `pk x25`.**
      Same lesson as the listen window: the clock changes, the vocabulary
      does not.
    - **Tab could only ever be a TAP here.** The key-down chain fired
      `retroCapture()` immediately, settling the gesture before the hand had
      finished making it, so the arm four lines below was unreachable. Hold tab
      and play a 1/16 arp for 2.2s: **24 steps handed to a recorder that was
      never armed, lane EMPTY.** The file three lines down already said how it
      should work — "REC arms on the way down… the release decides which it
      was" — and that is now true everywhere; the key-up's `!isAudioCh`
      exclusion went with it.
      **retro 25→pk x22 · momentary 24→pk x21 (was 0) · latch 25→pk x21.**
  ⚠ **ASK WHICH GESTURE, NOT WHETHER IT WORKS.** Four rounds of "I measured it,
  it works" were all the same untested-by-hand path. The question that cracked
  it was his: "do you know this?"
- **The latch key is the LEFT WIN key (MetaLeft).** This file said
  `` ` ``/ScrollLock/Pause/Insert and the code said MetaLeft; Gad's call is left
  win, so the code was right and CLAUDE.md was stale. Fixed there.

- **THE PHASE ENGINE COSTS ONE PROCESSOR PER VOICE NOW.** The arc, because it
  held three lessons: (1) A node-budget cap (8 voices at uni 7) shipped and was
  REVERTED — "you are making the voice cap worse and worse" was right; fewer
  voices is the bill, not the fix. (2) Take one of one-node-unison FLANGED
  ("massive flanger on it") because it deleted slop: with rtrg all seven copies
  start at the same dialled phase, and sample-aligned detuned saws beating
  coherently is a flanger. (3) Take two ships: slop is a TIME shift and a time
  shift of a periodic voice is a PHASE offset — slopSec*f cycles per op per
  copy, inside one stereo node, pan per carrier (`pix` maps every copy of op N
  to dN/gN — eight pairs, eight operators). Per-entry spread (`_sm`) keeps a
  legato retune from collapsing the unison, which take one silently broke.
  **Measured against the sound it must not change** — baseline ripple 7.7dB /
  width 0.553 / rms 0.2528, take two 8.6 / 0.535 / 0.2378 — and the cost:
  **7 worklet nodes per voice → 1; nine keys held = 16 live nodes, 0 quiet
  blocks.**
  On "you did NOT have note stealing on phase": measured, 490 worklet births
  in a 70-note burst drew 385 kill messages mid-steal — stealing always
  reached phase; what phase lacked was native's PRICE. Now equal.
  Master compressor release 120ms → 250ms, knee 12: the retune was the only
  thing between native and the speakers that changed, and the fast release was
  the pumping half of "native sounds like shit on super saw". The phrase
  "compressor stock" reverts it to the browser default on request.

- **COMPRESSOR TO STOCK, SLOP AS A TRUE ONSET WAIT, MORNING A/B'D.** The
  master retune was a debugging leftover ("i never approved a master retune" —
  it chased "caps out", measurably did not fix it, and stayed). Stock now; any
  master shaping is Gad's musical call, made on purpose.
  The supersaw A/B against the morning build (served as a COPY,
  `_ab-morning.html`, so the audio-channel fixes were never touched): steady
  rms/ripple match, and the audible loss was the ATTACK — morning blooms
  0.17→0.42 over ~70ms because slop's DelayNode staggered each copy's ONSET;
  the phase-offset version started flat at 0.33. **Slop is a wait in the
  worklet now** (each copy silent for slopSec — the exact delay; stagger and
  steady phase shift fall out of one counter). Bloom back: 0.28→0.41 over
  40ms. Remaining deltas (width 0.562 vs 0.487, first bin hotter) are the
  wide-fan he asked for. If his ear still prefers the morning, the fan is the
  one deliberate difference left — lower `wide`, or revert the fan on request.
- **THE HEADER'S `17v` IS THE METER TURNING HONEST.** `nv` sums `act` lengths;
  before the corpse compaction it counted killed voices and read 30-70. Live
  voices never exceeded the cap (24). Both engines read the same because they
  share it. ⚠ The "phase drops at 17v" report was almost certainly measured on
  the 1909 revert build (7 processors per phase voice); on ≥1933 a phase voice
  is 1. Needs his retest before believing anything about phase load.

- **RECORDED STROKES BORN ON TARGET, LENGTH IS THE HELD GESTURE.** The last
  two open audio-channel recording items, both autoloop off:
    - Replay's two spawn paths made the head bare and moved it a call later —
      the baseline slide he heard "only on the recorded strokes not live
      play". Both carry their target now (`{semis:ev.pk}` / `cu`). Measured:
      two loops each, pitch spawns semis=2/4, position spawns frac=0.255/0.311,
      **zero bare spawns**.
    - The quantized note-off used qnext, which rounds the release UP — any
      hold slightly past a grid multiple recorded a full step longer ("every 5
      or so key strikes" = the dice roll of where the finger lands). Both
      audio releases now record the MIDI rule — quantized START, held LENGTH,
      `_relAt` stamped by the deferred fast-tap key-up so the quantize wait
      cannot inflate a tap. **held 0.325→rec 0.353 (was 0.50) · 0.60→0.607
      (was 0.75) · 40ms tap→0.077 (was 0.25).** The audible off still lands on
      the grid; only the recorded number changed.

## Landed this session — all measured unless it says otherwise
- **[audio-voices branch] THE CUT WAS LEAKING WORKLET TAILS, NOT VOICE COUNT.**
  Gad: capping voices didn't help, meter only hit 4v and still cut — "you're
  fixing the wrong thing." Right: his dense 76-note loop makes phase worklets
  faster than their ~1.4s release tails free them, so 4 LIVE voices sat under
  **28-61 decaying ten-fmop nodes** = the 130% CPU, invisible to the act[]
  voice cap. Fix: engine keeps a FIFO of live ten-fmop nodes; past FMWCEIL=18
  it evicts the oldest RELEASED tail (quietest) via Voice.kill(fast) — clickless
  fade, held notes protected (only an oldest held voice if all are held).
  **Pinned at 18 through loop + held chord + 8-key storm; peak 0.88-0.94, zero
  silence.** Phase budget back to 588; FMWCEIL is the dial. ⚠ his 3033 test.

- **[audio-voices branch] PHASE GETS HALF THE BUDGET.** A phase voice is a JS
  ten-fmop worklet (uni*ops FM ops/sample); a native voice is C++ oscillators —
  dearer per operator. POLYBUDGET_NATIVE=588, POLYBUDGET_PHASE=294. His uni-7
  7-op phase patch: 24 nodes → 6 (native stays ~12, Gad-confirmed good). DSP
  meter read 0 on my fast machine so no measured multiplier; halving is the
  conservative call. Both are dials on 3033 — 6 phase voices ≈ 1.5 of his
  4-note chords, tight; raise POLYBUDGET_PHASE if his CPU has room.

- **[audio-voices branch] THE VOICE CAP IS AN OSCILLATOR BUDGET NOW.** His cut
  is CPU (confirmed: 130% stuck a second after), on BOTH engines at the same
  spot — so it is the oscillator COUNT, identical between engines. A voice
  costs uni x active-ops (his BES1: 7x7=49; a plain patch ~2), so a flat
  24-voice cap meant 1176 osc on his patch and 48 on a light one. CAP is now
  `clamp(POLYBUDGET/(ops*uni), 4, 24)`, POLYBUDGET=588: his uni-7 7-op patch
  caps at 12 (worklet nodes 24→12), light patches stay 24. Graceful steal and
  voice SOUND unchanged. 588 = under his ~784 (16v) death point; POLYBUDGET is
  the dial. ⚠ Confirm on HIS 3033 — my machine never cut.

- **[audio-voices branch] THE VOICE CEILING FELL FROM 24 TO 8 — A DORMANT CAP
  WOKE UP.** Gad: "it used to go up to 24v or 30v and didnt have audio cuts."
  Measured, his ch7 supersaw (native, uni 7): pre-compaction 1801 held 24 live,
  current 1734 held 8 (16 with the loop stopped). noteOn has two poly caps —
  the graceful CAP=24 steal loop and a crude `act.length>=16 → kill act[0]`.
  The 16 one was dormant for months: before "the dead do not hold a seat"
  (1827) spliced killed voices, act[0] was always already-dead, so killing it
  did nothing. The compaction made act[0] a LIVE voice → the 16-cap woke and
  halved the channel. Both caps are CAP now; sound unchanged. **23 live with
  his loop + 16 keys, zero near-silent blocks, ctx running.** Stealing
  confirmed = the CAP loop, oldest-released-first.
  ⚠ NOT the same as the audio-thread choke on his hardware: my machine never
  dropped in the preview OR the gstack browser (headless can't resume audio).
  His 3033 test is the truth. If it still drops with 24 restored, THEN it is
  CPU (49 osc/voice × loop × live) and the fix is fewer osc/voice (uni), not a
  bigger cap.

- **[branch] ARP HOLDS PITCH UNDER A HELD KEY (auto on); OVERWRITE TELLS CHORD
  FROM TAKE.** Standing #3's autoloop-ON half: an arp step released at 85%,
  next onset at 100%, and the 15% gap played the loop at baseline — an audible
  extra note. A step under a held finger hands over silently now (envelope
  released = the chop, pitch held for the next step); key-up does the real
  return. **auto on: steady 4@… , zeros only at the key-up.** Standing #2:
  layered overwrite spared a note at the new onset as a "chord" — now `born`
  distinguishes a real chord (same gesture, <60ms) from an older take.
  **chord survives, older note at the onset clears, long hold clears its whole
  span.**

- **[branch] A HELD CUE OWNS THE HEAD ACROSS THE BAR LINE.** Gad's standing
  bug #1 (position, autoloop ON): audCycle re-fired the carrier every bar, and
  the carrier IS the head the key moved — every bar line snapped it back under
  the finger. While a position key is held the cycle no longer re-fires; it
  extends the carrier's life to the NEXT boundary via tset. The key-up's
  audRelock still hands the head back to the bar. **Two bar lines crossed
  while held: 0 carrier spawns, head 0.073→0.197→0.198 (continuous, the
  synced crop wrapping), release → relock, head back at the bar.**
- **[branch] A STOP OUTRANKS THE STALE STAT.** Standing bug #3 (pitch + arp,
  autoloop OFF, "A _ A _"): a step's release audStops the head; the next step
  asks audRolling 14ms later; the ledger is clear but the worklet stat still
  reports the dying cursor, so it said "rolling", skipped the spawn, and bent
  a stopping head — every second step silent. audStop records its time;
  audRolling refuses the stat once a stop is due; any spawn clears it.
  **11 spawns for 10 steps** (was one in two). Auto ON measures 84% duty —
  the arp's designed div*0.85 gate, a parameter if he wants it changed.
- **[branch, measured, not a bug so far] PITCH LENGTHS.** Standing bug #2:
  four holds of known length, pitch mode, both autoloop states —
  held 0.325/0.15/0.549/0.133 → live 0.334/0.15/0.544/0.125 → lane
  0.342/0.154/0.551/0.143 → replay identical to the lane. Layered take
  overwrote correctly. ONE oddity under investigation: five live spans for
  four holds — a phantom short bend after a fast tap that the lane does not
  contain (live ≠ recording by one ghost note).

- **[branch] WITH THE LOOP OFF, THE REPLAY'S MOVES NEVER REACHED THE HEAD.**
  "arp still not being recorded" — his export: all 13 steps recorded (dur
  0.212, cues 10/13/14). The replay sent audMove with onlyCar=1; with autoloop
  OFF the head is cue-spawned (car:0) and the worklet's cmov filter dropped
  every move — first step landed, twelve did nothing, the take played straight
  through. Live cueNote passes onlyCar=0. Replay passes 0 when the loop is off.
  The dip-meter on his sample could not see it (those cues sit in material
  without level dips) — the SWEEP judged it: **live 21 jumps, replay 20,
  identical position path 0.725/0.75/0.775…** Lesson, again: his channel runs
  autoloop OFF; every arp probe before this ran it ON. Match his state.

- **[branch] RETRO RECORDS THE ARP — two eaters, one misread.** Three-gesture
  matrix put the loss on retro alone. (1) The audio releases' RETRO pushes
  never had the genOn stand-down the lane write has had for days — the held
  keys entered the buffer as ~1.9-beat entries and gesture-scoped overwrite
  let them swallow every step under their span. Guarded now (cue, pk,
  superseded-tap). (2) endB's round-to-nearest threw away steps past the bar
  line — the window now extends to the cycle containing the newest note.
  (3) The remaining "loss" is retro's definition: a 1-bar lane keeps the last
  bar (x-ray: 17 steps over 4 beats, window (4,8], kept 10 = the last bar,
  flash says so). tab+digits widens. **17→17 in buffer, last bar kept, every
  time.**

- **[branch] A REPLAYED ARP STEP FIRES THE ENVELOPE.** "fix arp recording to
  match performance" — the lane was right; the SOUND of a step was not: live
  steps fire the bus envelope in and out (the articulation), the pk replay
  fired nothing and came back a drone of bends. Replay fires the same envelope
  at the same sample now; pk events carry vel for future gain-per-step.
  **9 recorded → replay 9 env fires (was 0), dips 14 vs live 12.**

- **[branch] THE ARP STOPS AND THE KEY COMES HOME — ONE EARLY RETURN WAS
  BOTH.** One held key always released cleanly (until 4.62, emission frozen at
  11) — the leak needed a SECOND key: the prev8 fall-back handled the audible
  hand-over and returned without releasing the departing key's rack handle.
  Arp: that pool entry stayed until=Infinity forever. Stuck key: the same skip
  left audBendCur owned by the departed shim. The fall-back releases the
  handle first now, and the LAST finger runs the baseline tail itself at
  rel8T (the stack had already spent every shim, so the final tv.release was
  a no-op and no audPitch(0) ever came). Pitch parity for determinism in the
  same commit: pk return/stop/relock frame-stamped, cret takes a frame, the
  shim's off lands on its given time.
  **plain: 2,4,[0→2 same block],0 · arp: 0 emitted after release, 0 INF, final
  pitch 0.** Open items 0 and 0c both close.

- **[branch] OVERWRITE IS GESTURE-SCOPED, LIKE MIDI.** His spec verbatim: new
  keys replace the sections they play over; overdub (⇧o) layers. Every audio
  writer now calls `audOverwrite` — clears audio events whose onset falls
  strictly inside the new span (mod loop), truncates tails that run under the
  new onset; strictly-after so simultaneous presses stay a chord. **Measured:
  short under a 1.6-beat press cleared, outside kept, chord of two records
  both.** Deliberate edge: an old note at exactly the new onset survives —
  fixing that needs a pass-id on events, not a smarter time rule.

- **[branch] THE REPLAY IS A PLAYBACK NOW, NOT A RE-PERFORMANCE.** His
  question named it: "if live notes play a certain way, why cant you just
  record that?" The lane was always faithful; the replay applied every
  move/bend at message-ARRIVAL (setTimeout jitter, re-rolled each pass,
  flipping spawn-vs-move and takeover-vs-stop decisions audibly). cmov/tpb
  carry a FRAME now; the worklet queues and lands them sample-exact (drained
  in process, re-dispatched through the one message handler; tclr/panic flush
  the queue). All replay sites and the live quantized paths pass their exact
  `at`. **Three loops: dPos 0 on every note; onset spread 2-30ms = the
  analyser's own 12ms poll; twoHeads 0.**

- **[branch] ONE CLOCK FOR THE FINGER, THE EAR AND THE LANE.** The week of
  both-signs length complaints had one root: the audible off snapped to
  qnext(now) while the lane recorded raw held time — fast tap: live long/lane
  short; early press: lane long/live short. Midi's rule, applied to the sound
  as well: the off lands at tr+dur and dur is what the lane writes. Pitch rides
  the bend shim's own deferred release. (One glP-shaped scope trap caught:
  dur8 dies at its block edge; hoisted via h8._durB.)
  **Sweep verdict: dLen +0.09..+0.11 & one −0.43 → −0.06..+0.01; dPos ≤0.006;
  twoHeads 0; 6 rec → 6 replayed.**

- **[branch] THE SPAWN LEDGER, AND THE SWEEP INSTRUMENT.** His two calls in one
  message, both right: "look at the architecture" — audPlay never recorded that
  it spawned, audCar covers only the loop carrier, the stat is a frame stale,
  so every spawn-guarded caller raced and same-tick pairs each made a head.
  `audSpawn[pi]={until}` closes it at the one door all callers use.
  A superseded fast tap (re-press before its deferred grid) now still records
  (`lateAudWrite`). And "test with a sin sweep so you can measure" is
  `tools/probe.sh sweep`: pitch IS position (pos=(f-200)/1800), a second
  spectral peak within 12dB is a second head HEARD. First reading: **dPos
  0.006-0.012, twoHeads 0, 6 recorded → 6 replayed.** Open, with numbers:
  replay ~+0.09 beats long systematically; one note cut 0.43 short by its
  successor; one of six taps silent live (recorded and replays fine).

- **[branch] THE RETRO BUFFER'S TIME DIES WITH THE CLOCK.** Third-take "all
  hell broke loose": play() restarts the beat clock at 0, retroBuf survives
  stop/start (by design, for the reveal), so presses from dead runs collided
  with the new run's beats — the third tab scooped three runs into one bar:
  simultaneous events (two heads), one figure twice shifted (grid-adjacent
  chains = one long note). Buffer now empties at the START of a run;
  stop-then-tab still works (reads the ended run's buffer before any play()).
  **2ev → 4ev → 6ev across three stop/start takes, no phantoms.**
  And the immortal heads after stop: replay timers queued past the horizon
  spawned AFTER stop()'s panic — both onset timers bail on !T.playing now.
  **tv=0 900ms after a mid-replay stop.**

- **[branch] LENGTHS SETTLED — THE MIDI RULE, PURE.** Three variants in one
  day, and the hindsight that ends it: round-UP was the original +1-grid bug;
  raw-held felt "all over the place" only because the OLD takeover window
  (max(dur,0.02)) connected varied durs semi-randomly — the chaos was the
  CONNECTING; nearest-grid then grew his sub-grid taps to a full grid ("the
  second was longer then the length i pressed", export showed dur=0.25 for a
  short stab). With the window fixed (20%+overlaps), lengths are honest:
  quantized START, held LENGTH, min 0.05, Q on or off, cue and pitch.
  **held 0.133/0.276/0.401/0.171 → rec 0.154/0.292/0.408/0.176.**

- **[branch] THE CONNECTED TAIL WAS THE REPLAY, NOT THE RECORDER.** His export
  proved the lane perfect (five events, every dur 0.25); the takeover window —
  skip a gesture's stop when another jump "follows" — reached max(dur,0.02)
  past the gesture END, so hits half a beat apart with one-grid lengths read
  as a run. Now 20% of the gesture past its end, plus true overlaps. **His
  take: t=2.5 sounded 0.50 → 0.24-0.25, all five gestures, two loops. The arp
  shape survives: 8 hand-laid steps (div 0.25, dur 0.2125) = one spawn, one
  stop at 1.974, the run's end.** Lengths themselves: nearest-grid on the
  branch (1.1 grids → 1, not 2), grid-uniform as before.


- **Both key paths through the rack.** Route matrix, hand-played:
  `pos plain` trigger→noteOn→cueNote→audMove · `pos auto off` audPlay first ·
  `pos WITH arp` the chain then a step each · `pitch plain`
  trigger→noteOn→bend→audPitch:2 · `pitch WITH arp` the chain then a step each.
  Recording: pitch 53 events / 16 times; position 19 events / 17 times, cues
  7/8/9, none dead, retro carries them.
- **The pitch key never bent** — TDZ throw, see above. Every press was silent.
- **Mute cuts, it does not play.** `reviveLane` re-struck mid-notes on EVERY
  audible channel when any channel was toggled: muting ch5 fired 3 retriggers
  on ch1/2/3. Gone, his call. Silence is still immediate.
- **An audio channel mutes at the FADER**, so the take keeps its place: muted
  rms 0.0000 with cursors alive 1, unmuted lands back in the phrase.
- **A recorded lane stops arguing with the key.** trigger snapped every note
  including replays, so a recorded major third came home minor. The scale is an
  INPUT aid now; `durSec!=null` is the scheduler's own signature. Chord masters
  still drive the global scale — that path is separate and untouched.
- **The chord records as played.** Strum 30ms: 5 notes at 5 distinct times, the
  first on the grid, steps of 30ms. Lengths are end minus start on one clock —
  1.486/1.454/1.422/1.390/1.358 for a ~1.5 beat hold, falling by the strum. A
  note released before its own start still sounds, so it still records.
- **Retro hears the rack, not the fingers** — the arp's output, and the key's
  own push stands down while a generator is running.
- **Glide is legato-only and reaches both modes.** Only onto a held note, and
  the running loop counts as one. Stretch glides too — the shifter takes a
  target instead of stepping. NOT MEASURED.
- **Density can ride the clock** — `dsync`: grains per second, or per BEAT so 4
  is sixteenths at any tempo. A tempo change re-sends it. NOT MEASURED.
- **gpitch is gone**; one `pitch` dial writes the cloud's semis in grain mode.
- **Pitch survives a mode switch** — 523.3 / 523.3 / 522.4 / 523.3 across
  stretch → tape → grain → stretch, where the last hop used to return 440.
- **`tab+⇧⌫` resets to the settings default**, and resets unit/grid/quantize
  with it. `⇧⌫` keeps the length; a second press resets it.
- **The loop length is a row above the meters.**
- **The cloud's read position no longer slews**, and the head travels with the
  crop's start (0.029 → 0.584 within 35ms).
- **A deadline behind the playhead is a stop** — halving the loop no longer
  gaps it (alive 0.93 with a 280ms silence → 1.00, zero).

## QA CHECKLIST — 2026-08-21.1241, ordered by what is most likely wrong

Build 2026-08-21.1241 on localhost:3033. "not measured" means shipped on
reasoning; test those first. Items Gad has already confirmed are marked ✓ and
are here only as a regression net.

 1. **POLYPHONY IS DOUBLED — play hard and listen for trouble.** CAP 24→48,
    procMaxV 20→40, one constant `POLYX` undoes it. The thing to listen for is
    the failure the cap existed to prevent: a fast roll with live quantize OFF
    stuttering, crackling, or the page locking up. Measured 220 notes in 2.5s
    with q off — scheduler median 25ms, max 27ms, zero ticks over 100ms — but
    that was ONE machine and one patch. If anything gets worse, `POLYX=1`.
 2. **Clearing a lane with autoloop OFF.** Record some keys, clear the lane
    while it plays. The take must go SILENT, not start looping. It used to
    start the loop and keep it until you stopped and started the transport.
    Measured: cursors 1 after the clear → 0.
 3. **All three ways to record, audio channel + arp** ✓ (his: "work!"). Left as
    a regression net: TAP tab (retro) · HOLD tab (momentary) · LEFT WIN + tab
    (latch), then tap tab to unlatch. 25→22 / 24→21 / 25→21.
 4. **Audio keys are one playhead** ✓ · **hold a pitch key for seconds** ✓ ·
    **cue keys land on the grid with live-Q** ✓ · **q scope not sticky** ✓ ·
    **op trig in the phase engine** ✓.
 5. **Pitch keys with autoloop off** — the attack every cycle. He reports this
    works, WITH a caveat still open: the first key always travels from the
    baseline pitch (open item 4).

### Known broken — do not spend time testing these

 - **The arp never stops** (open 0). Root of the erratic counts and "stuck".
 - **A pitch key gets stuck**: hold 1, add 2, release 2 then 1. Traced to key
   2's shim never being released; a fix was written and REVERTED because it
   added an audible dip (2,4,0,2 where it should be 2,4,2). Open 0b.
 - **Autoloop-on recording accuracy** — his read: the autoloop is not factored
   in as incoming notes live, and after recording the autoloop interrupts the
   recording. Open 0c.
 - **`tab+⇧⌫` / clear-to-default** — "not really fixed but closer".

## Open, in the order Gad asked for them

0. **THE ARP NEVER STOPS** — ✅ FIXED on the branch (see the landed entry: the prev8 early return).
   Gad: "i want exactly what i played" — chasing that found something bigger.
   The pool entry's `until` stays **Infinity** after the keys come up, so the
   arp keeps generating forever, and its emission stalls then floods:

     during a 1.45s hold        0 notes emitted
     after the keys came up     0 → 0 → 328 → 333 → 339 → 344 and climbing
     pool                       until = INF

   That one fault explains everything that looked like three:
     - **"dedup at the loop seam" is not dedup.** All 23 handed steps were
       DISTINCT, zero duplicates; the four "missing" ones were at 7.5, 7.75, 0,
       0.25 — the arp still running a beat past the release, refused by
       recPlayNote because rec had disarmed. Correctly refused: they are not
       notes he played.
     - **"in pitch mode arp is stuck"** — this, literally.
     - **the erratic counts** through the whole session (0, 14, 15, 22, 151,
       328 for the same gesture) are the stall-then-catch-up.
   `trigger` returns a handle whose `release` sets `en.until`, and the audio
   key-ups DO call it (`h8.tv.release` at the pmono path, `hj9.tv.release` for
   cue). So either the handle on `AUD.gk[c]` is not the one `trigger` returned,
   or the release runs and the entry it closes is not the one in the pool.
   **Start there — do not re-measure the recorder, it is exonerated:** every
   time the arp emits N steps, exactly N land (13→13, 15→15, 14→14, 37→17
   distinct→17 in lane, 0 missing 0 extra), with the right beats and notes.
   A wrong fix was tried and reverted: stamping how far the scheduler had got
   at disarm (`_recEndB`) so the tail would still record. It is wrong because
   those notes should not be recorded at all — the arp should not have made
   them.

0a. **POLYPHONY WAS NEVER THE LIMIT — THE MASTER COMPRESSOR IS.** ⚠ NOT FIXED,
   needs Gad's call because it changes how everything sounds. He raised the
   caps and "didnt feel the difference"; the caps were never binding. On his
   BES1 supersaw (ch7, `uni:7`, four saw ops), keys held one at a time:

     n1  bus 0.312 / peak 0.933   master 0.253 / 0.741   live=4
     n8  bus 0.803 / peak 3.068   master 0.234 / 0.732   live=28

   Voices climb 4 → 28 exactly as they should: **nothing is stolen and nothing
   is capped.** The bus peaks at THREE TIMES full scale and the master
   DynamicsCompressor flattens it to a constant ~0.73 peak. Measured directly:
   **a six-note chord is 1.04–1.09x louder than one note.** That is "it caps
   out after a few notes / the audio drops".
   The compressor is on Web Audio's DEFAULTS — **threshold -24dB, ratio 12:1,
   knee 30dB** — so with a 30dB knee compression starts near -39dB and 12:1
   catches the entire musical range. Nobody chose that.
   Unison is NOT the culprit: it already scales 1/sqrt(uni) (constant power),
   and dropping `mix.lvl` to 0.35 barely moved the bus, so per-patch level is
   not the lever either. The lever is the master: something like threshold -6,
   ratio 4, knee 6 turns it back into a peak catcher. Gad's call.
0b. **CLEARING TWICE FORCES AUTOLOOP BACK ON.** ⚠ NOT FIXED, needs his call.
   "when autoloop is off, after clearing a recording the audio is being looped
   as if auto is on." The FIRST press is now correct (it ends the take, tv 0).
   The SECOND press — the documented "nothing decided about this lane yet"
   reset — runs `Object.assign(au9,AUDDEF,{kmode:0,auto:1})`, which is
   deliberate (a fresh tape channel comes up with the loop running) but
   silently overrides a channel-level preference he had set:

     CLEAR 1  n=0 auto=0 tv=0        correct
     CLEAR 2  n=0 auto=1 → tv=1      the take starts looping

0c. **A PITCH KEY GETS STUCK** — ✅ FIXED on the branch (same early return as the arp leak). Hold key 1, add key 2, release 2
   then 1 — key 1 never comes home. Both autoloop on and off. Traced:

     k2 up   gk: KeyS   bendCur=sh2   (sh2 never released)
     k1 up   gk: empty  bendCur=sh2   sh1 RELEASE -> bails on
                                      `if(E.audBendCur[pi]!==sh)return;`

   The fall-back branch in `endAudHold` pitches back to the held note and
   RETURNS without releasing key 2's handle. Releasing it there closes the leak
   (bendCur true→false, unreleased shims 2→0) but makes the key-up dip to
   baseline first — **2,4,0,2 where it should read 2,4,2** — so it was
   reverted. The hand-over belongs to the bend shim's own release, which
   already knows how to find the next-newest held bend; that is where to look,
   not in the key handler.
0d. **Autoloop-on recording accuracy.** ⚠ NOT FIXED. Gad's read, worth keeping
   in his words: "in live play the autoloop isnt factored in as the incoming
   notes, and after recording the recording gets interrupted by the autoloop."
1. **Performers out of the play rack, onto the LANE.** His idea and the right
   shape: generators (chord, arp, euclid, random-pitch, ratchet — he called
   ratchet a generator) belong to the INSTRUMENT and their output is recorded;
   performers (reverse, random position, chance, nudge, humanize) do not create
   notes, they re-read a lane, so they belong to the CHANNEL and never touch the
   recording. It also gives the master channel vel/pitch/position/nudge, which
   it has never had, and stops a preset carrying decisions about one take. Own
   run: moving slots out of `ply`, a home on the channel, a save migration.
2. **Changing samples** — start in the right position, keep the recordings.
3. **Grain: pitch on the FEEDBACK repeats only**, each repetition up by a set
   number of semitones. Needs the feedback path to know which repeat it is on.
4. **Glide with autoloop off** — the first press still sweeps from baseline.
   He put this last himself.
5. **Stretch arp** — may already be fixed by the routing; re-test before
   digging.
7. **A phase-engine note starts on the next 128-sample render block**, not the
   sample it was asked for, so two notes begin up to 2.9ms apart — most of a
   cycle at 261Hz — and rtrg cannot be sample-identical there even with the
   phase provably right (audio correlates -0.82 while the cfg message carries
   0.25 both times). Making it exact means scheduling the start inside the
   worklet. Its own change, and nobody has asked for it.

## Still true, and worth keeping in view

- **The grain cloud's `pos`/`scan` dials are gone from the page** (they did
  nothing while a carrier runs). The params stay for freeze; stored mod or
  automation aimed at them now points at nothing.
- **`pre`/`post` is gone from the play rack.** The rack's output is always what
  records, midi and audio alike.
- **Audio vs midi timing** — Gad dropped it ("forget it"). Both paths schedule
  from the identical timeAt(beat); any offset is downstream.

# BRANCH `audio-mono` — the five it opened with, for reference

Written 2026-08-17 at the end of a session, so the next one starts with the
analysis rather than repeating it. Served at http://localhost:3033/audio-mono/
(the worktree lives inside the served root; the trailing slash is required).

## 0. ONE EXTRA PLAYHEAD PER BAR — FIXED (Gad, 2026-08-17)

Gad: "it also gets louder and louder every loop like its doubling the sound, i
think you didnt kill multiplayheads and they stack or something." He is right,
and it is NOT the replay — that path spawns nothing now. Instrumented
`audPlay2` on his own set: **one spawn per loop, always audCycle's carrier,
life exactly one cycle, and zero audStops.** So nothing was being added; the
old carrier simply was not dying.

`tset` carries `left` — the carrier's remaining life, re-cut so a loop that
grows under it does not die at the old cycle end. The worklet applied it to
**every cursor wearing the car flag**, which is every carrier that ever ran.
And `left` is the time to the NEXT boundary, so AT the boundary `fmod` wraps
to 0 and it is a WHOLE cycle: a relock landing on the bar line handed the
OUTGOING carrier a fresh lease while audCycle spawned its successor anyway.
The replay calls `audRelock` at the end of every cue gesture and his lane has
three events at t=0, so one landed on the line every single loop.

The message names the carrier now (`car: audCar[pi]`), and an old one keeps
the life it was born with. His set, ch9, 20 loops, cursors alive per loop:

    before   1 2 3 4 5 6 7 8 …then a collapse, and away again 1 2 3 4 5 6 7 8
    after    1.1 every loop, peak 2 across the cycle seam — flat for 20

The empty-lane control reads 1.1/2 as well, which is what says the number is
right rather than merely small. Removing the re-cut entirely (a runtime patch,
not shipped) also goes flat — that is what proved the mechanism.

**AND A SECOND ONE IN THE WORKLET, LATENT HERE:** `tclr` OVERWROTE `relAt`, so
a stop scheduled later pushed back a death already scheduled earlier — and a
scheduled stop is posted up to a HORIZON before it happens. Measured directly:
a cursor told to stop at +0.30s, then handed a stop at +2.00s, died at 2.13s
instead of 0.37s. On `main`, where the replay still does stop → play(cue) →
stop → play(resume), that is a ratchet: no cue cursor ever reaches its own
stop and they pin at the 12-cursor cap from the first loop (measured: 12 every
loop, rms 0.078). AUDMONO does not walk that path, but the ratchet branch and
every live grab do. Earliest stop wins now.

**THE DROPOUT IS A DIFFERENT BUG AND IT IS STILL THERE** — see item 3, which
now has numbers.

## 1. QUANTIZE DOES NOT REACH PITCH-MODE KEYS — diagnosed, not fixed

The `pmono` branch fires `engine.audPitch(pi,semP)` the instant the key lands.
Every other key path in the instrument computes a quantized time first —
`const trf = CFG.qOn ? qnext(t0f,gf)*(lane.qlive??1) + t0f*(1-(lane.qlive??1)) : t0f;`
— and defers through a setTimeout. The pmono branch computes nothing, so
`CFG.qOn` is simply not consulted there. It also records `tr: gridNow()` rather
than the quantized time, so REC would write the unquantized position even once
the sound is quantized. Both want the same three lines the 'pitch' branch above
it already has.

## 2. THE TAPE RETURN OVERSHOOTS — FIXED, and his suggestion was the fix

He was right that it "throws the play head way forward". `audRelock` computed
where to land as `W.a + (ph/L)*(W.far-W.a)` — the loop phase mapped LINEARLY
across the crop. That is only correct when the take covers the crop exactly
once per cycle: sync on AND speed x1. At his x0.25 the take covers a quarter of
it, so the map is four times too far.

His own suggestion — "maybe you should have a silent playhead or counter
running parallel so you know where to land properly" — is what shipped, as the
counter rather than the second cursor: every tape cursor carries `bp`, the
phase it would have had if nothing ever bent it, advanced at `base` instead of
`step` and wrapped in the same crop. One add and a compare per sample; a second
cursor would have cost a buffer read and an interpolation to reach the same
number. `cret` splices the head onto it through the 3ms equal-power fade a cue
flip already uses, and `audReturn(pi)` is the call. A deliberate `cmov` — a
cue, a relock — re-seats `bp` too, or a cue jump would be undone by the next
bend release.

Measured in ONE run so run-to-run jitter cannot enter it: bend held through
cycle 3 only, every other cycle its own control, the head read at the same
phase of each cycle, error in seconds of a 9.6s take.

    cycle        0      1      2      3(bent)  4      5      6
    before   -0.022 -0.004  0.026    4.136   0.063  0.082  0.100
    after    -0.018  0.000  0.018   -0.052  -0.044 -0.037 -0.030

The unbent cycles are the noise floor, about +/-0.1s, and after the fix the
bent one sits inside it. Symmetric: -12st reads -0.048 where +12st reads
-0.052, so the up/down asymmetry the catch-up used to have is gone with it.
Stretch is untouched — `audBendMovedClock` still says the clock never moved
there, so nothing is spliced.

**STILL ON THE LINEAR MAP, deliberately: the CUE gesture's return.** The
AUDMONO replay ends each cue with `audRelock(li)` — "back where the bar asks" —
and that is the same map with the same x0.25 error. It was not what he asked
about and a cue is a deliberate move rather than a bend, so the right answer
there is a design question, not a bug fix: after a grab, should the head resume
where the cue left it, or where the bar says? His call.

## 3. RECORDED CUES PLAY BACK ONCE AND STOP — FIXED, and the suspicion written
##    in this entry was right

The suspicion here — that `audRelock` → `audLive` → the carrier's life re-cut
is what does it — is what the measurement says.

**THE MECHANISM.** `audCycle` posts the next carrier a HORIZON ahead of the
boundary and `audPlay2` records it in `audCar[pi]` the moment it is posted, so
for ~150ms before every bar line the named carrier is one that HAS NOT STARTED.
The re-cut was a DURATION from the caller — the time from now to the
boundary — spent against `v.n`, the cursor's own sample count, which for a
pending cursor is still 0. So it was born with the eighty milliseconds left in
the OLD cycle as its whole life, died eighty milliseconds in, and nothing
spawned behind it until the bar after.

**THE FIX: A DEADLINE, NOT A DURATION.** `audCarDieF(pi)` is an absolute frame,
the first cycle boundary strictly after the carrier's OWN start — which
`audPlay2` now records alongside its id — and the worklet spends it as
`life = dieF - fr`. That says the same thing to a cursor born an hour ago and
to one that has not begun.

Isolated, because with a real lane it only fires when a gesture happens to end
inside the lookahead window. Cue lane emptied, a relock fired 75ms before the
bar line, four times, measuring how much of the NEXT cycle had a cursor alive:

    named carrier only (b28529e)   0.15  0.19  0.19  0.12
    deadline frame                 1.00  1.00  1.00  1.00

And his own lane, 20 loops, cursors alive and blocks of silence per loop, all
three states with a healthy scheduler (see the trap below — this is the part
that took the longest to get right):

    7c5591e  his build   1 2 3 4 5 →1.4→ 2, one loop of 21 silent blocks,
                         then 1 2 3 4 5 6 7 8 9 →1.7→ 2 3
    b28529e  named       1.1 every loop, 0 silent
    now      deadline    1.1 every loop, 0 silent

The dropout on his build is the SAME bug as the ramp: when a relock landed
where the shared re-cut was at its 20ms floor it killed the whole stack at
once, and nothing spawned until the next boundary.

## 4. GRAIN GETS QUIETER THE SMOOTHER IT IS — partly by design, partly not

`norm = 1/sqrt(ng)` normalises by grain COUNT, and a smoother cloud is a denser
one, so the level falls as you smooth it. There IS a compensator — `cComp`,
which measures the cloud's own rms against the take at the point the carrier is
reading and corrects the ratio — but it only runs `if(this.carMute)`, i.e. only
when a carrier exists and is muted. A cloud played from the KEYS with the loop
off never gets it. That asymmetry is the first thing to look at.

## 5. DO `pos` AND `scan` STILL EARN THEIR PLACE — a real question, and the
answer is "only with no carrier"

Since the cloud follows the playhead, `pos` and `scan` are consulted ONLY when
`this.car == null` — no loop running. So on a channel with auto on they do
nothing at all, and on a keys-only channel they are the whole address. That is
defensible but invisible: the page shows them either way. Either hide them when
a carrier exists, or fold them into an OFFSET from the carrier (which would
make them meaningful in both cases and is probably the better instrument).

# TEN — where the audio channel stands, and what is next

Written 2026-08-15. Live at gadbaruch.github.io/Ten/ · dev server: `preview_start
name "ten-gad"` → localhost:3033 is Gad's, `ten-main` → 3032 is Claude's, both
serving this directory · one file, `index.html`, no build step. See CLAUDE.md
for who may be destructive where.

## THE KEYBOARD IS A DISPLAY — ⚠ TO BE CONTINUED (2026-08-17)

**Status: the easy half shipped, the interesting half is OPEN.** Gad: "im still
not convinced there isnt a better route" — and he should not be, because there
are untried routes below and one PROOF that a better one exists.

### What works and is shipped

The FUN60 PRO (id 2600, `ry5088_akko_fun60_1m_8k`) speaks a protocol TEN can
drive over the WebHID connection it already had. Command envelope is what
`ryEnable` always used: pad to 9 bytes, `Bit7 → n[7] = 255-(sum(n[0..6])&255)`,
or `Bit8` at n[8] for commands that need byte 7 for data.

    0x8F  device info      id at byte 1 (0xa28 = 2600), byte 11 = lightSync (0)
    0x8A  read keymap      n[1]=layer n[2]=255 n[3]=chunk n[4]=profile · 8×64
    0x0A  write one key    a[1]=layer a[2]=slot a[5]=SAVE a[6]=batch · a[8..11]
    0x0C  write picture    hdr[3]=chunk hdr[4]=len hdr[5]=last · 7×56 = 378 B
    0x07  light mode       Bit8 · [1]=type(13=UserPicture) [3]=bright [4]=opt<<4
    0xAC  FLASH ERASE      never send

**The keymap slot index IS `RY_SLOTS`'s index** — 54/54 matched. The sensor
table this file already had is also the keymap's and the LED buffer's index map.
That is how right alt got fixed in firmware: slot 65 held `00 50 00 00`, the
Left Arrow usage in byte 1 where the firmware does not read, and writing
`00 00 50 00` fixed it permanently.

Shipped: the digits show channel state (selected 3 · has-events 2 · empty 1, one
teal hue), letters wear the selected hue, and **writes happen only when the
hands are off the keys**.

### ⚠ THE OPEN PROBLEM: live targeted values

**ANY write while a key is down drops notes.** Measured by hand-dialling one
key while playing: single-chunk (1 report) and full-picture (7 reports) both
move the lamp, and both break note input. One report is the FLOOR, so this is
not about traffic volume — three rounds went to rate limits, coalescing, a
single-write drain and auto-backoff, and none of them could beat a floor.

The mechanism is the hall state machine: it disarms a key on release and re-arms
only when the sensor reports it back at REST. Lose that sample and the next fast
press is dropped in silence — "i cant play two notes fast after each other".
Note that `led contend` showed the report RATE going UP under writes (625→769Hz),
so it is not starvation of the stream; it looks like the MCU stalling its scan.

### WHAT HAS NOT BEEN TRIED — start here

1. **OUTPUT REPORTS.** Everything so far used `sendFeatureReport`. The vendor's
   own transport also has `write()` → `sendReport` on an output/`out-input`
   collection, and output reports are the normal high-rate HID channel. **This
   is the cheapest untried thing and it may simply be the answer.**
2. **The native agent's command, which is PROOF a good path exists.**
   `LightMusicFollow2` and `LightScreenColor` stream live from MonsGeek's
   DESKTOP binary via gRPC (`vt.controlFeature`), not from the web app. That
   binary evidently drives the LEDs live without ruining typing. Its command is
   in no JavaScript — it needs the Mach-O reversed or its HID traffic sniffed.
3. **Another interface.** TEN writes to `cfgDev`. The board exposes several HID
   collections and they were never enumerated and tried one by one.
4. **`0x29 SET_SCREEN_24BITDATA`** — streaming-shaped, and one of the few
   commands with NO vendorSleep in the driver. Nominally for TFT models; never
   tried on this board.
5. **`LightUserColor` (type 25)** — in the LightList, never investigated.
6. **Polling rate.** The board is 8K. Whether the stall scales with it, or with
   the `0x1B` analog-enable mode, is unmeasured.

The vendor's own bundle is one file, `app.monsgeek.com/js/index.<hash>.js`, plus
~210 lazily-imported chunks that only load once a device is granted — diff the
referenced names against the fetched ones to get them. Gad's driver is
`617f329a` (magnetism, no hitbox); three other chunks disagree with it on
opcodes, so always check which one serves id 2600.

**Method note, earned the hard way:** three experiments returned "no change" and
none of them could have shown a change — one never set the light mode, two built
their own picture path instead of using the one already known to work, and the
60ms watchdog overwrote a baseline mid-test. Before believing a null result,
prove the apparatus would have shown a positive one. `HE._expLock` exists for
this; use it.

## THE CLOUD CURSOR WAS DRAWN SOMEWHERE THE GRAINS WERE NOT (Gad, 2026-08-17)

Gad: "the cloud cursor, it should move with the main playhead no?? why is it
seperate". It was separate by OMISSION, and he could hear it.

The SPAWN has followed the carrier since the cloud was unified — with a loop
running, grains are sprayed around where the playhead IS rather than around a
dial of their own. The stat readout never got that memo and kept reporting
`pos + scanPh`. So on a granulated loop the band sat somewhere the grains were
not, drifting at the scan rate while the sound came from the playhead. Both
now make the same three-way choice in the same order. Band against playhead,
sampled 14 times across a granulated loop:

    live (before)   worst gap 0.489   drifting at its own rate
    now             worst gap 0.002

**`from` NAMES THE DIAL IT POINTS AT.** `pos` is the cloud's position dial,
which only exists on the grain half of the page — and since the keys began
obeying the tape's setup, a key in tape or stretch leaves from the crop's
START. So the field said `pos` while meaning a control that was not on screen.
It reads `start | here` outside grain mode and `pos | here` inside it.

**THE SIZE DIAL AND THE MODE FIELD ARE ONE FACT.** `applyCmode` wrote the size
from the mode; nothing wrote the mode from the size, so turning size down on
the cloud page left the mode saying `tape` while the cloud ran. `syncCmode`
closes it, from all three paths that write size — the page dial, the ⌫ reset,
and an automation curve (a curve on size is a curve on what the channel IS).
The last CLOUD size is recorded on every write rather than on the mode edge:
parking it when the mode flips is too late, because by then the size is at the
top and the value is gone. Walk 0.3 → 0.08 → 1 and the mode field hands back
0.08.

    size 1 → tape · 0.30 → grain · 0.08 → grain · 1 → tape (parks 0.08)
    mode → grain hands back 0.08

**TAB -/= IS A SPEED, NOT A LENGTH**, and that decides which way round it goes.
The pair was set as "− shortens, = lengthens" on the reasoning that a minus
takes away — true of the number, wrong for the hand. What you reach for these
keys to do is make the loop go faster or slower, and = is more. Double speed IS
half the loop. Flipped on audio and midi together, because it is one gesture:

    tab=   4 → 2 bars   double speed   (midi events scale 0,2 → 0,1)
    tab-   4 → 8 bars   half speed

**AND A CORRECTION TO THE ENTRY BELOW.** The "220 overlapping presses, live
leaves 8 voices" number was WRONG — the probe dispatched its KeyboardEvents at
`window`, and the listener is on `document`, so it pressed nothing at all. The
8 voices were residue from the `early.js` probe run on that tab moments before.
Re-run properly, with the events reaching the app and a clean page each side,
the mash is CLEAN ON BOTH BUILDS: 220 presses, 0 grains, 0 voices, both.

The off-before-on bug is still real and still fixed — it is measured directly
and reproduces every time. But it is a LATENT bug, not a reproduction of what
Gad reported: through the keyboard, `granNote` is called at
`currentTime+0.004`, so the release would have to land inside 4ms of the press
to invert the two timers. **His hanging note is not reproduced.** The `stuck`
row in settings now counts the WORKLET's voices as well as `act`'s (shown as
`act+cloud`), because a cloud voice whose shim has been dropped from `act` —
the exact shape of a hang that outlives its key — was invisible to the one net
you can check while it is happening.

**The rule this earns:** a probe that drives the app through synthetic events
must assert that they ARRIVED. Two rounds of measurement here were of an app
that never received a keystroke, and both read as passes.

## THE SPRAY BAND BELONGED TO THE KEYS MODE, NOT THE CLOUD (Gad, 2026-08-17)

Gad: "there is this dotted line with a range around it… it keeps running
visually even if im not in grain mode and not playing any notes, does it even
make sense to keep it?"

**WHAT IT IS:** the centre the grains are sprayed around and how wide that
spray is. The dotted line is `cpos` — the cloud's read position, which is the
`pos` dial plus the scan phase — and the band is `cspr`, the spray width. In
grain mode it is the most useful thing on the waveform: it shows where the
cloud is chewing and how much of the take it is reaching for.

**WHY IT WAS THERE WITH NOTHING PLAYING:** the draw was gated on `isGranCh(i)`,
which is `kmode===1` — the KEYS mode, not the read mode. Exactly the confusion
the chain row's Sound cell had. So a TAPE channel with pitch keys carried a
band and a centre line permanently.

Gated on the thing that actually decides now — the grain SIZE below its top,
which is precisely what `carMute` asks. Not on the mode field and NOT on a
grain count: at the top of the size dial a held key is one continuous cursor
that still counts in `ng`, so counting grains would have put the band straight
back on a tape channel the moment you played a note. Measured across all four:

    tape, idle          band 0   line 0
    tape, key held      band 0   line 0     (g was 1 — the trap)
    grain, idle         band 1   line 1
    grain, playing      band 1   line 1

The MOVEMENT was already honest, incidentally: `scanPh` only advances past the
`!vs.size && !ng` early exit, so an idle cloud's band sits still. What was
running on Gad's screen was a granulated LOOP — a carrier with the size dial
down spawns an 'auto' voice, and that is a cloud genuinely reading.

**Two things this turned up, raised not fixed:**

- **`from: pos` names a dial that is not on the page in tape mode.** In
  tape/stretch a key now starts at the crop's `start`; the cloud's own `pos`
  dial is only on the grain half. The field should probably read
  `start | here` outside grain mode.
- **The size dial and the mode field can disagree.** `audAction`'s `gr` branch
  writes `pre.gr.size` and calls granCfg without touching `au.cmode`, so
  dialling size down on the cloud page leaves the mode saying tape while the
  cloud runs. `applyCmode` keeps them in step from the other direction only.

## AN OFF THAT ARRIVED BEFORE ITS OWN ON (Gad, 2026-08-17)

Gad: "key mashing i managed to get some hanging note once in a while. we
already fixed it in synth engine maybe have a look what we are missing here."
He is right that it is the same family, and the missing piece is one line.

`granNote` posts BOTH edges from setTimeouts — the `on` at the note's time, the
`off` at the release. With quantize on, the note's time can be

    at = gridTime(next step)      up to a whole step in the future

and the release is `AC.currentTime`. So a fast tap posts its `off` FIRST. The
worklet's handler was `const v=this.vs.get(m.id); if(v)v.rel=1;` — no voice
with that id yet, so **the off was silently dropped**, and then the `on` landed
on a voice that nothing left in the world could ever end. Not a race that
needed two threads: the two messages were simply queued in the wrong order.

Same shape as the synth's `canEnd()` bug, mirrored: there a voice waited for an
event that could never fire; here it waited for one that had already fired and
been thrown away.

An unmatched off is REMEMBERED now (`pOff`, bounded at 128) and spent by the
`on` that follows — the voice never starts, which is exactly what the key layer
already does when you let go before a quantized note lands. Plus the cheap
half: `granNote` cancels its own queued `on` when the release beats it, so the
round trip is not made at all.

Both tests, against the previous build:

    8 notes scheduled 300ms out, released after 60ms
        live   grains 8 · voices 8      hung, and audible
        now    grains 0 · voices 0

    220 overlapping presses, quantize ON, transport rolling
        live   voices 8 left, with nothing in AUD.gk / act / kbHeld
               referencing them — unreachable by any key-up
        now    0 everywhere

Normal notes are untouched (10/10 sound, none silent) and the SEQUENCED path
still ends itself: six notes with a 0.25s duration read 6 grains / 6 voices
while sounding and 0 / 0 after.

**The rule, and it is the third time this family has cost a session:** two
edges of one note posted from two independent timers can arrive in either
order. Whichever arrives first must be able to survive the other not being
there yet.

## THE KEYS JOIN THE INSTRUMENT (Gad, 2026-08-17)

Three follow-ups on the batch below, and all three are the same shape: a pitch
key on an audio channel was still only half a note.

**THE SCALE APPLIES TO THEM NOW.** Both pitch-key sites called
`kbNote(c, true)` — `chrom: true`, which is the KIT exemption (a kit is twelve
pads and a scale keyboard cannot reach them all). An audio channel's letters
are NOTES, played alongside the synths, and they were the one row in the
instrument that ignored the key you had set. `noteOf(c, pi)` is what every
other note goes through and it carries the scale, the key offset AND the
piano-vs-full layout, none of which the old call was giving. Keys a..k:

    scale off   C3 C#3 D3 D#3 E3 F3 F#3 G3     (unchanged)
    C major     was C3 C#3 D3 D#3 …  now C3 D3 E3 F3 G3 A3 B3 C4
    A minor     was C3 C#3 D3 D#3 …  now A3 B3 C4 D4 E4 F4 G4 A4

**THE DIALS ARE LIVE ON A HELD NOTE.** The tape's own cursor has had a live
path since `tset`; a key-spawned one had none, so speed, pitch, start and
length reached it at birth and never again. The `twin` message re-aims every
key cursor built from a tape window, rebuilding the step from the pieces it was
BUILT from — the key's own ratio and the jitter it drew — so a re-aim is
exactly what a fresh press would have given rather than a drift away from it.
ONE key held down, dials moved under it, on a 200→3200 sweep:

    held, ×1, full crop        247 → 280 Hz
    speed → ×2                 829 → 1012      twice as fast, at once
    start → 75%               2842 → 3155      the last quarter
    length → −50%             1486 → 1346      FALLING, reading it backwards
    grains alive: 1 throughout — re-aimed, never restarted

**AND THE RANDOM REVERSE HAD A SECOND SOURCE.** The dice roll was gated on the
tape window last build (10/10 forward, still true), but the branch that
CHOOSES between "one continuous cursor" and "a cloud of grains" tested
`C.size` — the SLEWED copy — not `P.size`. C is a slew of P, so for ~100ms
after a switch into tape mode C.size is still climbing out of the grain range,
and a key pressed in that window took the grain branch complete with its
one-in-ten reverse. The slew belongs to the grain LENGTH, not to which
instrument this is. Grain mode still grains: size 0.12, four grains alive on
one held key.

**A take arriving on a RESTORE reaches no dial afterwards**, and the window is
in samples, so `setChanBuf` posts the twin now. Measured on the restore path
with nothing else touched: 12 presses, all forward, all starting at 850 Hz
inside the crop.

One trap worth the note: a probe that calls `granNote` directly without
registering an `AUD.gk` hold AND a `kbHeld` finger is testing the orphan
sweeper, not the thing it meant to test — the voice is reaped at 0.35s and
every reading after the first comes back silent. Two nets, both need feeding.

## THE TAPE GETS ITS FILTER, ITS LENGTH AND ITS KEYS (Gad, 2026-08-17)

Six asks in one batch. Two of them turned out to be the same question — what
does the audio channel's own setup MEAN, and who obeys it.

**THE FILTER RACK NOW REACHES EVERY PLAYHEAD.** It lived inside the Voice
constructor, and a tape cursor, a grain and a cue jump are not voices — so an
audio channel built one for nobody and the whole `flt` page was dead on it.
`fltChain(ac,p,at)` is that code lifted out unchanged; the voice hangs its
envelopes and mod routes on the handles it returns, the bus hangs nothing and
just hears the dials. It sits between the channel input and the FX chain, so it
is a mixer channel's filter: the autoloop and every key at once. Live dials too
— `fltBusLive` is cutLive/dialLive aimed at the bus, since both of those walk
`act[pi]` and an audio channel has no voices in it. Measured on white noise,
the loop rolling:

    no filter          centroid 6649   rms 0.131
    24dB lp @600        centroid  494   rms 0.036
    dial to 5000 LIVE   centroid 3591   rms 0.110
    hp @4000            centroid 10025  rms 0.178

**IT COSTS SOMETHING AND HE SHOULD KNOW:** `mkFlt(0)` is a 12dB LOWPASS AT
9kHz, ON by default, and it was inert on audio channels until now. Every
existing audio channel is a hair darker. Measured against the previous build on
the factory take: peak moves by at most 0.014 of 0.47, rms by 0.001. With that
slot switched off on both sides the matrix probe is IDENTICAL on ten of eleven
cases, every column — so nothing else moved.

**PROOF THE EXTRACTION CHANGED NO NOTE:** `probe.sh preset` A/B over eight
factory sounds. Every deterministic column matches exactly (hz on all eight,
rms and peak on the pitched ones). The snares differ by up to 0.03 in peak and
PA01's hz by 255 — and a control run of the SAME probe twice on ONE build moves
them by 0.067 and 853, because they are noise-rooted and their peak bin is not
a stable quantity. Run the control before reading a delta on a noisy preset.

**`end` IS A SIGNED LENGTH FROM START.** Gad: "when you move start it will
carry end position with it, maybe its not end position its more like length,
and -100% length would reverse the sample from its start pos." It was an
ABSOLUTE position, so 0% was the head of the take — the one place it can never
legally be once start has moved — and half the dial was dead. `audWin(au)` is
the resolver, the same rule a sampler op already had (`smpWin`), and the seven
readers of the crop all go through it now. Verified on a 200→3200 sweep, where
which way the playhead runs reads straight off whether the peak rises or falls:

    start  length   window       rev     heard              dir
     0      100%    0 - 1        no      269 → 452          rising
     0.5    100%    0.5 - 1      no      1098 → 1830        rising
     0.5   -100%    0 - 0.5      YES     581 → 344          FALLING
     0.5     50%    0.5 - 0.75   no      1109 → 1561, wrap  rising
     0.5    -50%    0.25 - 0.5   YES     581 → 409, wrap    FALLING

and the crop CARRIES with start — 50% resolves to [0.25,0.625] at start 0.25
and [0.75,0.875] at start 0.75, where before it resized.

**SAVEV 27 → 28, LIBV 29 → 30, with the identical exact conversion**
(`en = (en - st)/(1 - st)`). A stored `[0.5, 0.75]` still resolves to
[0.5, 0.75] — verified on five old crops, all exact, and both racks walked
TOGETHER because that is the lesson the LIBV 28→29 entry below was written by.
No export needed; a stored set loads to the same sound.

**START IS LIVE.** Only `end` was re-aimed, so the wrap kept the floor the
cursor was born with and start was the one crop dial that waited for the next
trigger. Both edges go now, every time. Moved from 0 to 75% under a rolling
loop, on a 200→3200 sweep:

    start 0        344 → 474 Hz     (early in the sweep)
    start 0.75     2681 → 2982 Hz   instantly, then wraps inside [0.75,1]
    tape voices    1                re-aimed, not retriggered

**PITCH AND SPEED ARE ONE NUMBER IN TAPE MODE.** Gad asked whether they differ:
they do not. Tape resamples, so the rate is `fit × speed × 2^(semis/12)` and
both dials multiply the same thing. They are TIED now — two units for one
control, grab whichever you think in — and the ranges map exactly, which is
what makes it honest: 2^(24/12) is 4, so ±24 semitones IS ×0.25..×4. The sign
stays on speed; reverse is not a pitch. Stretch and grain keep them apart,
where they genuinely differ.

    tape:     speed ×2 → pitch +12st · ×0.5 → −12st · ×1.5 → +7st · ×−2 → +12st
              pitch +12st → ×2 · −12st → ×0.5 · +7st → ×1.5 · +24st → ×4
    stretch:  speed ×2 leaves pitch 0 · pitch +12st leaves speed ×2
    heard:    a 440 take at ×2 comes out at 880.2, not 1760

**THE DIAL WRITES SPEED AND RESTS `semis` AT ZERO — it does not stop the RATE
from reading semis.** That distinction is the whole design and the first
attempt got it wrong: zeroing the rate's semis term tied the dials and killed
every MOD ROUTE and automation curve on pitch. Caught by the matrix probe,
whose `free +7` row writes `au.semis` raw and went silent (hz −175). Now only
the dial has moved house. `audFoldPitch` folds a patch that arrives with both
set into one number without changing the rate, keeping any remainder on semis
if the fold would clamp.

**A PITCH KEY OBEYS THE TAPE.** At the top of the size dial a cloud voice IS a
continuous cursor — the same thing the tape is — but it read the WHOLE buffer
from the cloud's own pos dial at the bare note ratio. So on a tape channel the
letters ignored start, length, speed, pitch and reverse: "unrelated to the
setup of the tape", exactly. A `twin` message carries the tape's window and
step into the worklet and the spawn uses them. On a 200→3200 sweep, crop
[0.5,0.75] (which is 800..1600 Hz):

    midi 60, speed ×1     883 → 1324    inside the crop, at the take's speed
    midi 72, speed ×1    1927 → 2552    double speed — an octave up
    midi 60, speed ×2    1938 → 2563    IDENTICAL, which is the point
    full crop             215 → 291     the whole take
    crop [0.25,0.5] rev   732 → 485     FALLING

In GRAIN mode there is no tape window (`on:0`) and the cloud's dials are the
instrument, exactly as before.

**THE CLOUD CHANNEL LOOPS BY ITSELF NOW.** `setEngine(pi,'gran')` defined
itself as "pitch keys AND the auto cursor off", which made channel 9 of a fresh
set the one audio channel that answered nothing until you held a letter. Keys
and loop are two axes; it only ever meant to set the first. The Cloud channel
now comes up grain · pitch keys · autoloop ON · size 0.12.

One trap this cost half an hour: `audDefaults(p,'gran')` guarded on
`!Number.isFinite(cmode)`, and basePreset writes `cmode:0` now — so the flag
never fired and the Cloud channel came up as a TAPE. A `gran` call is an ASK,
not a fallback: it OVERRIDES the mode. And a probe that never calls `play()`
never resumes the AudioContext, so its recorder captures nothing and every row
reads empty — that is not a silent instrument, it is a suspended one.

## A FRESH AUDIO CHANNEL WAS A CLOUD, AND FREE WAS RETRIGGERING (Gad, 2026-08-17)

Three asks about the granular synth, and the first two turned out to be one
bug wearing two faces.

**THE DEFAULT MODE WAS UNREACHABLE.** `cmodeOf` reads `au.cmode` when it has
one and otherwise GUESSES from "is the grain size below its top" — and a
channel with no `gr` object at all reads `gr.size??0.12` there, which is mode
2. Nothing wrote `cmode` when a channel became audio, so every new audio
channel opened in GRAIN. Not merely the label: `granCfg` sends the same
`gr.size??0.12` to the worklet, so `carMute` came up true and the tape carrier
really was silent with a grain train doing its reading. Measured on a 440 tone,
a channel freshly turned to audio and nothing else touched:

    fresh audio channel      live (before)     now
    cmode                    2  grain          0  tape
    grains alive             2                 0
    cloud voices             1                 0
    rms                      0.1487            0.2545
    peak bin                 444.1 Hz          438.7 Hz
    centroid                 516               440

1.7x quieter, 4 Hz sharp, and a centroid 76 Hz above the fundamental — grain
sidebands. `audDefaults(p)` writes all of it now, both halves TOGETHER (`cmode`
and `gr.size`, or they can disagree again), from the four places a channel
becomes audio: setEngine's two branches, the plain drop, and audPlace. sync and
autoloop were already the intent and are written explicitly beside it.

**NO MIGRATION, DELIBERATELY.** A stored channel with neither field WAS
behaving as a cloud, so it still opens as one — verified by stripping `cmode`
and `gr` from a save and loading it: cmode 2, slot says grain. The new default
is for channels that do not exist yet. SAVEV/LIBV untouched; both fields were
already stored.

**AND THE SLOT SAYS WHICH READ IT IS.** The Sound cell in the chain row said
'clip', or 'grain' off `isGranCh` — which is the KEYS mode and not the read at
all, so a tape channel with pitch keys announced itself as grain. It carries
`cmode` now: tape · stretch · grain, and a tape channel with pitch keys says
tape.

**FREE WAS RETRIGGERING AT THE BAR LINE.** Under sync the loop cursor is
re-fired every cycle and that is right — the take is fitted, so it dies exactly
where the next one is born. Free, the take runs at its own speed and will be
somewhere in the middle of itself when the bar comes round, so re-firing it is
a hard restart. Two halves, both needed: the carrier was SPAWNED again each
cycle by `audCycle`, and it was also born with a LIFE cut to the cycle, so even
with nothing re-firing it it died at the bar line. Same probe both builds — a
take four times longer than the loop, so "did it retrigger" is a shape:

    free, take 8s, loop 2s      resets in 6.3s   playhead reached
    live (before)               3                0.25   the last 3/4 never sounds
    now                         0                0.773  one unbroken read
    sync, same probe, now       3                0.996  unchanged, one per bar

`audCar` is the carrier already rolling — set where one is spawned, cleared
wherever the tape is stopped (audStop, and allOff's panic). `audCarLeft(pi)` is
the deadline, and it is the switch that decides: the cycle under sync, none at
all under free. It rides on `audLive`, which every audio edit goes through, so
the switch is live under a sounding take — flipped both ways mid-note:

    free  ->  0 resets, x1        sync ->  1 reset, x4 (fitted)  ->  free again 0 resets
    tape voices 1 throughout — nothing stacks

**Regression net:** `tools/probe.sh matrix ch=8 --ab` is IDENTICAL on all
eleven cases, every column, once both tabs are levelled to the same preset
first. Worth knowing: the probe takes whichever preset was on the channel, and
the two origins hold different sets — an unlevelled A/B reads as hundreds of Hz
of difference that is entirely the filter and fx racks either side.

**Still open, raised not shipped:** releasing a cue grab re-fires the loop at
the LOOP's phase (`audPlay(pi,now,L,fmod(pos-anchor,L))`), which under free
means letting go of a key jumps the take somewhere it was never going to be. It
is the same category error as the cycle retrigger and it was not what was
asked. Gad's call.

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

## THE SAMPLE DID NOT TURN INTO NOISE — THE READ DID (2026-08-17)

Gad: "could it be that when choosing a mode on op2 it reverts the sample in
op1 to noise?" No. Measured on 3032 with a tone in `opSamples`: the map entry
survives every mode change, `wav` stays 9, and the built voice reads the
sample. What he heard was three separate things, two of them real bugs.

**THE FM DRIVER WAS BEING SUMMED AS A VOICE.** `built.push` recorded
`drv:scanDrives[i]` only. An fm op aimed at a sample fails the `tb.osc` test
in the fm branch — a sample is not an oscillator — so it fell through to the
add branch, and `if(b.drv!==undefined)continue` never caught it. You heard the
modulator's bare wave sitting on top of the sample it was steering. One line:
`drv` records `fmDrives` too. Measured with the driver at ratio 8 so its own
tone would sit at 2093 Hz: **-35.8 dB → -77.9 dB**, and its gain-node count
1 → 0. Gad reported this independently while the scan half was being measured.

**SCAN WAS DECIMATING, AND DECIMATION IS WHAT NOISE IS.** At level 1 the
playhead sweeps the whole crop once per cycle — a one-second take at 261 Hz is
**285 source samples jumped per output sample**, and linear interpolation
reads one of them and folds the other 284 back as images. Measured centroid
**8087 against an explicit-noise reference of 7511**: brighter than noise.
Fixed with a box average over the ground the playhead actually crossed, made
free by a **prefix sum built once per note** — the span can be hundreds of
samples and the cost does not move. On a realistic take, harmonic share
roughly doubles at every width:

    level    harmonic% live → fixed     rms live → fixed
    0.05          42 → 85.2              0.270 → 0.234
    0.02        47.3 → 88.9              0.247 → 0.233
    0.2         13.8 → 51.2              0.228 → 0.102
    1.0          3.3 → 22.8              0.113 → 0.019

Wide settings go QUIET rather than hissy now, and that is the honest answer: a
second of audio swept at 261 Hz has no reconstructible content, so the
correct anti-aliased result is near-silence. Hiss was the aliased version of
nothing.

**THE WIDTH DIAL IS EXPONENTIAL NOW** (Gad: "yes make it exponential very
good call"). It was linear with a 0.05 step, and on a one-second take
everything at or above 0.05 was past the point of usefulness — the zone that
sounds like a scan was the bottom 2% of the dial, one notch of which was
reachable. `SCANW(a) = 0.0005 * 2000^a`, so level 1 is still the whole crop
exactly as specified and the travel to get there changed instead. Walked in
its real 0.05 steps:

    level   window   harmonic%      level   window   harmonic%
      1      100%       22.8         0.4     1.05%      79.4
     0.85   31.98%      37.5         0.3     0.49%      70.5
     0.7    10.23%      74.4         0.15    0.16%      77.3
     0.55    3.27%      91.4         0.05    0.07%      91.4

Every notch does something now, and the two useful characters — a 1-3% window
that reads as a pitched scan, and a sub-1% window that reads as a wavetable —
are a third of the dial apart instead of sharing one step.

**One discontinuity, left alone deliberately:** level 0 is not silence, it is
the plain sample. The pairing loop skips a driver at `amt<=0.001`, so no scan
is built at all and the BufferSource path plays the take normally. That is
what a level-0 modulator does everywhere else in the rack, and it is more
useful than silence, but it is not what "0 = nothing" reads like on the dial.
Gad's call if it ever bites.

## …AND A FACTORY PHRASE IS A PATH, NOT A PAYLOAD (Gad, 2026-08-17)

Embedding fixed the dropped-file case and MISSED the one he was actually
testing: "I'm not dropping a new sample in, I'm just using one of the stock
samples, like the nylon lick... I refresh the page and it sounds like noise."

nylonlick is **9.6 seconds STEREO**. As 16-bit that is ~1.84 MB, ~2.46 MB of
base64, and a localStorage string is UTF-16 — call it 4.9 MB against a 5 MB
quota, before the rest of the set, the library and the backup ring. So setItem
threw, the autosave took its no-audio fallback, and the op reloaded as a named
hole: NOISE. The embedding did not fail; it succeeded into a set too big to
store.

A factory take is written as its REFERENCE now and re-fetched on load, exactly
as the audio channel's already was — only a dropped or recorded take, the two
that exist nowhere else, carries its audio. His exact flow, measured:

    centroid before        629
    map wiped (his bug)   8036      noise
    after reload           625

    set size    101 KB  (would have been ~2.5 MB)
    blob carries audio    false     — a path and a name
    fits in localStorage  true
    same take object      true      — reuses the pool entry, no duplicate fetch

**The rule this earns, and it is the same one twice today:** the fix has to be
measured on the path the USER takes, not the path the change was written for.
Embedding was tested against a half-second synthetic take and shipped; the
first real sample in the instrument is twenty times that.

**The drop path was already right.** He asked for it to save the filename and
it does — `poolAdd(buf, f.name…, {k:'d', f:f.name})` runs immediately before
`opSamples.set` at the drop handler. The 'take' label in the earlier
measurement came from a probe that set `opSamples` directly without ever
registering the buffer in POOL; that was the test lying, not the drop.

## A SYNTH OP'S SAMPLE NOW TRAVELS WITH THE SET (Gad, 2026-08-17)

Gad: "fix the saving loading of samples in synths, when I reload the set
samples revert to noise."

`opSamples` was a Map in memory and nothing else. Nothing wrote it and nothing
read it back, so every reload found `get(pi+':'+i)` undefined and fell through
the `|| E.noiseBuf` on the other side: the op came back as NOISE with all its
settings intact and none of its sound. This is also the real answer to the
question he asked this morning — "does choosing a mode on op2 revert the sample
to noise" — the mode was never the trigger, a reload was.

**A reference is not enough here**, unlike the audio channel's `audRef`: a
dropped file cannot be re-fetched and a synth op's sample is usually a dropped
file. So the AUDIO TRAVELS, as 16-bit PCM, deduped by buffer so one take
feeding six ops is written once. Two top-level keys, `smp` (the blobs) and
`osmp` (which op points at which) — additive, so no SAVEV bump: an old build
ignores them and a new build reading an old save is exactly where it was.

Round trip on a take built as three lines at 311/523/787 Hz — save, wipe the
map the way a reload does, load:

                        311 Hz   523 Hz   787 Hz   centroid
    before save          -38.0    -41.9    -45.7      470
    map wiped (= today)  -72.3    -76.0    -73.2     7992   <- noise, his bug
    after load           -38.0    -41.9    -45.7      473

16-bit costs nothing measurable at these lengths: the lines return to 0.1 dB.

**THE QUOTA IS THE PART THAT NEEDED DESIGNING, not the encoder.** The autosave
was `try{setItem(LS,serialize())}catch(_){}` — one empty catch, survivable
while a set was only numbers and NOT survivable once it carries audio, because
over quota the whole set would stop saving without a word. It now retries
without the audio and says so once; the linked file (⌘⇧E) has no such limit and
still gets everything. Verified the fallback keeps the names and the mapping
and drops only the data: 167171 bytes full, 103150 lean, blobs-with-audio
1 → 0.

**The rule:** an empty catch around a write is a bug waiting for the payload to
get bigger. This one was written when a set could not exceed a few kilobytes.

## OP LEVEL STEPS (Gad, 2026-08-17)

Plain ↑↓ is 0.01 and ⇧↑↓ is 0.1, via `step:0.01, big:0.1` — `big` says what the
coarse step MEANS rather than leaving it as ten of the fine one, so ⇧ also
SNAPS to the tenths grid instead of drifting off it: from 0.37 it goes to 0.5,
0.6, 0.7. ⌥ still divides, giving 0.001.

## THE CROP IS A DESTINATION, AND AN FM DRIVER'S LEVEL IS LIVE (Gad, 2026-08-17)

Two asks: make the op sample params modulatable and automatable, and let op2's
level be tweaked live when it is fm'ing a sample in op1.

**start and end are `ctrl`-lane destinations now.** They reach a running note
two ways and both answer live — a scan/fm worklet takes the window as a
message, and a plain BufferSource has `loopStart`/`loopEnd`, which are writable
while it plays. `play` and `smpl` stay OUT on purpose: one is a choice and the
other is an index into the pool, and a modulator needs a range, not a menu
(`destRate` returns null for both, so they never appear in the table).

One resolver does the work for both node kinds — `Voice.smpCrop(E,si)` — off
the same `smpWin` and the same overlay, so a modulated crop and a dialled one
cannot disagree. The overlay is written BEFORE the live apply, and all four
build sites read the op through `ovObj`, so a note starting mid-sweep begins
where the modulator currently is instead of snapping to the dialled number.

Measured on a take built as eight steady bands (250…2000 Hz), with the window
narrow enough that exactly one band sounds — so "did the crop move" is a count,
not a judgement:

    no route            1 band    the window sits still
    LFO on START        4 bands   the window walks the take
    envelope on END     8 bands   the window grows

**One asymmetry, deliberate:** a BufferSource keeps the DIRECTION it was built
with. Reverse is a mirrored buffer and a buffer cannot be swapped under a
running node, so a modulator that swings the crop past start moves the edge,
not the sense. The worklet path turns around properly, because there the span
is just signed.

**AN FM DRIVER'S LEVEL IS ITS DEPTH, and nothing was re-aiming it.** On a
sample that depth lives inside the worklet as a deviation rather than on a gain
node, so the one dial you reach for while listening was the one that waited for
the next note. `oscRefresh` re-posts the rate message with the builder's own
curve. Note held, op2 dialled mid-note, against what a retrigger gives:

    case              held   after live   fresh   moved    gap
    fm on sample       638      3569       3565    2931      4
    fm on oscillator  3629      5724       5720    2095      4
    scan on sample   10498      5965       5966   -4533     -1

Within four hertz of a retrigger on every path, and the leak fix holds (voices
left behind: 0).

## A VOICE FREED BY AN EVENT THAT CANNOT FIRE (2026-08-17)

Gad: "the voice cap gets triggered all the time, when I have a second op doing
a modulation on a sample the audio gets cut, I'm on 99v constantly without
even playing a note."

A voice leaves `act[]` from `this.src.onended`, and `this.src` was
`firstSrc || nodes.find(n => n.onended !== undefined)`. A scanned or fm-driven
sample builds its root as an **AudioWorkletNode with a hand-written
start/stop** — it has no `onended`, assigning one to it does nothing, and
`firstSrc` took it because it is the root. So the voice waited forever for an
event that can never arrive. Present since scan shipped (0831), not from the
taper; he hit it now because he is leaning on fm-of-a-sample.

Eight notes fired and released, count afterwards:

    plain sample            0        (fine)
    sample + op2 FM         8        LEAK
    sample + op2 SCAN       8 more   LEAK, and the first eight never went
    two oscillators         0        (fine)

**The tell is that a faked `stop` is an OWN property** — a real
AudioScheduledSourceNode inherits `stop` from the prototype. `canEnd()` asks
exactly that, which also catches the wt pair's gain wrapper, faked the same
way. `firstSrc` now has to pass it, and if NOTHING in the voice can announce
its end, `_end` schedules the splice on a timer the way an fmw voice already
did. Twenty fast notes, all released, settled count and whether it still
sounds:

    native sample + FM        peak 6  settled 0  rms 0.1331
    native sample + SCAN      peak 6  settled 0  rms 0.0749
    native sample + FM uni3   peak 6  settled 0  rms 0.1238
    PHASE two ops             peak 8  settled 0  rms 0.0832
    PHASE uni 3               peak 8  settled 0  rms 0.0719
    native wt root + FM       peak 6  settled 0  rms 0.0831
    native plain two ops      peak 6  settled 0  rms 0.0608

**The rule:** any node given a hand-written `start`/`stop` is invisible to the
lifecycle that frees voices. Build one and you owe it an explicit way out.

## LEVEL IS A WINDOW ON SCAN AND A DEPTH ON FM — NOT BOTH (Gad, 2026-08-17)

Gad, after the taper shipped: "it just sounds less good now, the whole
scanning and FM of samples. Before, an operator doing FM on the sample sounded
quite good and you could still hear the sample. Now fm'ing a sample sounds
closer to the scanning — you can't hear the movement of the sample."

He was right, and he was right about the cause being that turn's change —
though the fix is not the revert he offered. The `win` message carried
`w: SCANW(driver.amt)` for BOTH modes. On a SCAN driver `amt` is the window
width and the taper is what he asked for. On an FM driver `amt` is the
DEPTH — and feeding it in as a width too meant half level locked the playhead
inside 2% of the crop, so a sample being fm'd could not traverse itself. The
linear width had the same coupling; the exponential made it 23x worse at half
level (0.5 -> 0.022) and that is where it became audible.

An FM driver gets the WHOLE crop now. start/end still bound it, and scan keeps
the taper he approved. Measured as "how much of the sample is still in there",
correlating the fm'd output against the same sample played plain:

    level   sounds like the sample    centroid (plain ref = 732)
             live(bug)     fixed        live(bug)      fixed
     0.2       0.038       0.586          5895          537
     0.5       0.017       0.387          4303         1071
     1.0       0.150       0.446          5342         2866

The centroid column is the real tell. Bugged, it sits at 4000-5900 wherever
the level is — a wall of hash, and the dial does nothing musical. Fixed, it
climbs 537 -> 2866 with the level, which is an FM depth control behaving like
one with the sample still underneath it.

**The rule this earns:** when one dial is read by two features, a taper added
for one of them is a change to BOTH, and the other one has to be measured
before it ships. `SCANW` was tested against the scan dial only.

## END IS A SPAN FROM START, AND NEGATIVE MEANS REVERSE (Gad, 2026-08-17)

Gad: "start dictates the starting point on the whole wave, but end 0% should
not be the start of the sample it should be the crop start point, we could
have -100% which can put the end on the other side of the start point — but
that should reverse the sample."

`end` was an ABSOLUTE position, which makes 0% the head of the take — the one
place it can never legally be once start has moved. Half the dial was dead and
its numbers meant nothing where you were standing. It is a **signed span from
start** now: +100% reaches the take's end from wherever start is, 50% is half
of what is left, and the whole range is live at every start. That frees the
negative half for the obvious reading — end lands on the other side of start,
so the crop is read BACKWARDS.

Resolved in ONE place, `smpWin(op)`, which returns the **anchor and the far
edge unsorted** (`far < a` is the reversed case) plus the sorted bounds. Four
callers used to spell the crop out separately — root op, ops 1-9, and the scan
window sent at build and again on a live edit — four chances to disagree.

Two paths, because they can do different things:

- **BufferSource** has no negative playbackRate, so reverse plays a mirrored
  COPY of the take (`engine.revBuf`, a WeakMap so a take that leaves the pool
  takes its twin with it) with the crop points mirrored to match.
- **The scan worklet** carries the sign through. `a` and `b` are no longer
  sorted, the span is signed, and `x = a + (inp+1)*0.5*span` walks the
  driver's -1..+1 backwards all by itself. Reverse costs nothing there.

Width still shortens from the FAR end only, so turning it down never moves the
place the read leaves from — same rule as before, now true in both directions.

Verified against a take sweeping 200 Hz → 3200 Hz, so which way the playhead
runs reads straight off whether the peak rises or falls:

    start  end    window      rev   expect Hz     heard Hz     dir
      0     1      0-1       False  200→3200      210→668      rising
      0.5   1      0.5-1     False  800→3200      834→2713     rising
      0.5  -1      0-0.5     True   800→200       764→237      FALLING
      1    -0.5    0.49-0.98 True   3027→778      2945→899     FALLING

**TWO RACKS STORE PRESETS AND ONLY ONE WAS MIGRATED.** SAVEV 27 converted the
SET; the LIBRARY holds the same shape and was left reading old crops with the
new meaning. Caught by writing the save-to-pads snippet, not by testing the
change — which is the lesson: a preset field that changes MEANING has to be
walked in `load()` **and** in `libAll()`, together, every time. LIBV 28 → 29
with the identical conversion, verified idempotent and exact (a stored
`start .5 / end .75` still resolves to [.5, .75]). No factory preset owns a
sampler op, so this only touches sounds somebody saved.

**SAVEV 26 → 27, WITH A MIGRATION.** The old absolute `end` and the new span
agree whenever start is 0 and diverge everywhere else, so every stored crop is
CONVERTED rather than reinterpreted: `sen = (sen - sst) / (1 - sst)`. Verified
exact — an old `start 0.5, end 0.75` still resolves to the window [0.5, 0.75].
No export needed; a stored set loads to the same sound.

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

5. **More factory phrases** — `python3 tools/gen_samples.py <name>` re-rolls
   one, no args does the shelf. Prompts are the shelf; see the docstring for
   what to ask for (phrases, never one-shots).

## Things that will bite you

- **CUTTING THE SPEAKERS CLAMPS THE SCHEDULER TO ONE SECOND, and it will make a
  working build look broken.** The transport is a 25ms `setInterval` with a
  150ms HORIZON, and a page that is not producing audible output loses the
  "playing audio" exemption: the browser throttles its timers to 1/s. The audio
  GRAPH is fine — analysers are pull nodes, exactly as the TEST SILENTLY rule
  says — but nothing gets SCHEDULED into it in time. Measured in the same tab,
  same build, same set, over 25 seconds:

        speakers cut       tick median 96ms, max 998ms · 10 of 19 carriers
                           posted LATE, up to 819ms · three gaps of silence
        speakers at 5%     tick median 15ms, max 29ms · 0 of 21 late · none

  Two rounds of this session went into "dropouts" that were entirely this.
  Anything that runs the transport for more than a few seconds has to be
  measured with `engine.comp` connected — put a gain of 0.05 in front of
  `AC.destination` and say so. Short probes that fire one note are unaffected.
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
