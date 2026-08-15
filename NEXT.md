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
  modcap         \           →  `         (the swap). Was called "automation";
                                          it is where captured knob moves live
                                          AND where you arm the capture:
                                          hold ` + tab arms the focused
                                          channel from ANY layer.

`HOLD.a` is modcap's hold. The ` + tab branch is asked FIRST in the tab
handler, ahead of the audio channel's own three meanings for it, or the
gesture would mean different things on different channels.

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

1. **KILL `center` ON MOD ROUTES** (agreed 2026-08-15). It is a second way to
   say what the destination already says: a modulator's centre is where the
   knob sits when nothing is driving it, which IS the destination's stored
   value. Two controls for one idea — the same confusion the key vol / loop vol
   pair had. Before deleting: check whether any saved preset has a non-zero
   `ctr` doing real work, and if so FOLD it into the destination's stored value
   on migration rather than dropping it.
   With it: **enter on a mod slot jumps to its destination**. Same gesture as
   `⌥\` stepping between automated knobs and taking you there, which already
   works — making enter mean "go to what this points at" everywhere is more of
   the homogenisation Gad is after.

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
