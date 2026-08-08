# TEN — keyboard-only groovebox

An OP-1-inspired music instrument that lives entirely on a computer keyboard.
Nine channels and a master on the `0-9` keys, twenty-six clips per channel on
the letters, and one desk you never leave.

**Play it:** https://gadbaruch.github.io/Ten/ — or just open `index.html`
(double-click works; no server, no build, no dependencies, one file).

Sets autosave to the browser. `cmd+S` / `cmd+L` save and load ten set slots;
`cmd+E` exports a set as JSON and dropping a JSON on the page loads it.
`cmd+Z` / `cmd+shift+Z` undo/redo almost everything.

## One page

There is no navigation tree. Everything opens *around* a permanent desk —
the grid, the mix picture, and the channel strip — and closes again without
the screen ever being swapped for another screen.

```
              SETTINGS       esc from the desk, above the grid
                  ↑
  ┌─────────────────────────────────────────────────────────────────┐
  │  grid          one column per channel, each at its own length    │
  │  mix           volume, level and pan as one picture per channel  │
  │  strip         Inst · Ch — the channel you are on is the lit box │
  └─────────────────────────────────────────────────────────────────┘
                  ↓  enter
              CHANNEL        1 PRST · 2 OSC · 3 FILT · 4 MOD
                  ↓  enter     5 FX · 6 VOICE · 0 PLAY
              LIBRARY        (from PRST only) browse — enter keeps, esc restores
```

`1-9` pick a channel, `0` is the master — which is a channel like any other,
with its own looper and its own rack. **Hold a channel digit and press a
letter** and you are in that clip; hold `0` and press a letter for the scene.
You do not save to a clip and you do not recall one: while you are there the
clip *is* the channel, so whatever you change is what it now is.

`←→` picks the channel; in a channel it walks params, spilling into the next
rack at either end, and **`shift+←→` picks the slot** (one list across the
whole chain, in the order it runs). `↑↓` walks the step cursor on the desk and
changes the focused value inside a channel (shift ×10, option ×0.1). `+`/`-`
add and remove rack slots. `cmd+↑↓` tweaks the **last-played note only**
(prepared-piano on any channel — `•` marks a prepped param, `⌫` removes it).
`cmd+C/X/V` copy, cut and paste a **whole channel** — sound, racks, loop and
clip together — including out of a set you are only previewing.

Half the keyboard is a scope you hold: `tab` loop, `m` tempo, `c` channel,
`v` velocity, `n` notes, `` ` `` instrument, `q` quantize grid, `/` roll. Hold
one and the arrows mean that one thing; tap and release without moving and you
get the tap action instead.

**Left option and a letter** reaches a rack directly: `⌥a` puts an arpeggiator
on the channel, and while you hold it the digits and arrows are its rate, mode
and octaves. The arp is an *edit*, so it stays until `⌥a+⌫` takes it off —
letting go only ends the editing. **Latch across the hold and the keyboard
stays pointed at the arp**, which is the part that matters: both hands go back
to playing while the digits keep changing its rate underneath, and with REC
armed those changes record into the channel's mod loop. You are performing the
arp, not configuring it. `F1` shows the full keymap — that is the authoritative
reference.

## Core ideas

**Clips, not an arrangement.** Every channel has twenty-six clips on the
letter keys and the master has twenty-six scenes. Hold `3`, press `b`, and
channel 3 is now playing clip B — the edits you make land there because
that clip is the channel while you are in it. Leaving writes nothing down as
a separate act; it simply stops being where your edits go. There is no save
key for a clip, because a save key means there is a version of this you could
lose, and there isn't one.

**A clip is the notes.** Volume, pan, mute and solo belong to the *channel* —
they are decisions about the whole mix, not about one bar of it — so reaching
for a different clip never takes your mix apart. The sound is the interesting
case: a clip carries one, but only if you actually changed it while you were
in there. Otherwise switching clips is about the part, not the patch, and an
empty letter is an empty bar on the instrument you already have.

**One generic Looper everywhere.** Every channel lane and every sound's mod
loop are the same primitive: `unit × count` (fractional counts cut early), a
flat event list, REC (`tab`, momentary by default — hold to record) and EDIT
(caps lock, tracker-style step cursor). Lanes are polymetric — each has its
own independent length, and the grid gives all of them the same height,
divided by their own step count, so nine different lengths end level.

**The mix is a picture, not three numbers.** One widget per channel, four
levels of brightness on the same strip of pixels: the cell is the darkest,
the **volume** is a band opening symmetrically from the centre line — the
whole cell at full, a single pixel at nothing — the **level** pumps inside
that band, and the brightest thing is the **centre line**, whose position
along the cell is the **pan**. The level is divided back out by the volume
setting, so the fill reads as how hard the channel is being driven inside
its own ceiling rather than repeating the width underneath it. The goal
throughout is to see state rather than read it.

**Sets.** Ten slots, saved and loaded the way every other program does it:
`cmd+S` asks where the first time and goes back to that slot after,
`cmd+shift/alt+S` always asks, `cmd+L` loads, `cmd+alt+N` starts a new one.
In the load picker, **hold shift and the whole desk shows that set instead
of yours** — grid, mix and strip — with nothing loaded. Arrows and digits
point at a channel inside it, digit+letter at one of its clips, and `cmd+C`
copies it out. Which means the same copy/paste moves a channel between two
loaded sets: copy in set 1, load set 2, paste on whichever channel you want
it on. `shift+backspace` deletes a slot, asking once.

**Recording feels like tape.** Overwrite deletes only what the playhead has
actually passed. The sweep runs ahead to the scheduler's lookahead so that what
you are covering never gets queued, but everything in that ~150ms of future is
only *marked* — silenced, not destroyed — and committed once the playhead
reaches it. Let go a moment early and the marks lift, so releasing a note just
as the next one begins no longer takes that next one with it.

What you hear is exactly what gets stored and played back. Live quantize pushes notes to the next point on **that
channel's own grid** — hold `q` and press 1-8 to choose it, from beats to
32nds by way of triplets, dotted 8ths and sevenths, because a hat and a
swung rhodes should not have to agree. Toggle quantize with a tap of `q`;
snap a loose take later with `shift+Q`. Held notes replace what's under
them audibly and immediately; while recording, hold `⌫` to record silence.

`tab` is one key and your hand decides which part of it you meant: **tap**
takes what you just played (TEN is always listening — it forgets anything
before a long pause and loops the take at a sensible power-of-two length,
wrapped from your entry point), **hold** records while held, and **latch
across the hold** leaves it on. Those used to be three settings, which
meant two of the three gestures were dead at any moment. An empty
pattern's first hit **sets the One** (transport retriggers on it).

**A channel is racks.** Every rack is 10 slots: operators (add/fm/ring/**sync**
with free dest routing, phase + rtrg/free trig, incl. an `smp` sampler wave —
drop an audio file on an op), filters incl. EQ bands, a **MOD** rack, an
**FX** chain, and **PLAY**. The MOD rack unifies modulation — each slot
picks a *source* (env / lfo / velocity / key-track / random-S&H /
**pressure**) and fans it out to one or more *routes*. A route is a
*destination* plus a *slot number*: the destination says **what**, the slot
says **whose** — `amp`+`all` is the voice, `amp`+`3` is operator 3's level,
`filt`+`2` is the second filter. Slot number defaults to `all`. (There used to
be a separate `op` destination doing the same job as `amp`+slot, and `amp`+`1`
meant the voice rather than operator 1, so operator 1 could not be reached at
all — one destination now, one meaning.) Each route also carries an *amount*
and a *range*. An LFO source adds **sync** (free-running Hz, or divisions of
the bar that follow the tempo) and **trig** (retrig at every note, or free so
every voice agrees on where the wave is). So a single LFO can sweep the filter, wobble pan and bend pitch
at once, each at its own depth. Add routes with the `route` field or the
**learn** gesture: `cmd+C` on a MOD slot arms it, then `cmd+V` on any
filter/osc/mix param maps a route to that target. The amp envelope is
just a MOD slot (env → amp). The FX chain runs
delay/chorus/flanger/phaser/trem/**dist** (all nine drive curves, the
former AMP distortions — standalone `drv` and `crush` folded into it)/
verb (50ms rooms to 4.5s halls)/comp/gate/roll/tape/grs8/send/limit/duck/
hp/lp/bld. PLAY: chord (with strum ±, or `mstr` role = its held chord
live-retunes all other channels), arp (slot order matters: arp→chord
chords every step), groove, prep, plus rev / random-playhead /
velocity / chance / euclid / nudge / humanize (±ms jitter) / flam (grace
hits) / rpit (random pitch: ±cents and ±semitones per note, optionally
snapped to the key — on a kit it repitches the pad you hit rather than
jumping to another one). On a kit each pad has its own PLAY rack. Every slot carries a
**stage**: `post` = a playback effect, `pre` = the recorder captures its
output, so recording a held chord or an arp writes the notes you hear.

**Operators are live.** Wave, ratio, fine and level land on notes that are
already sounding — hold a chord and sweep a ratio, no retrigger. (Mode,
dest, phase and trig rewire the graph, so those still take effect on the
next note.) `sync` is hard sync: the operator locks to whatever `dest`
points at and its **ratio becomes the sync sweep**, not its pitch — the
classic tearing lead. Non-integer ratios are where the character lives.

**Hall-effect keyboards, direct.** SETTINGS `hid` connects an analog keyboard
over WebHID. One chooser lists every supported board and the transport is picked
from what you chose — Keychron/Lemokey HE use the raw-HID matrix
(request/response); MonsGeek FUN60, Akko and Attack Shark use the RongYuan
event-driven push, which needs no firmware mod. On the Keychron the playing keys
are already mapped, so it plays as soon as it connects; other boards number their
keys by matrix position, so run `hid keys` once. TEN never reads the board's
keystrokes: the analog stream is the
only trigger, so set actuation deep (2–3mm) or park the playing keys on a layer
with no keycode and it stops spraying text. Velocity is unaffected either way,
because the trigger point is a software number (`hid trig`, default 15% of
travel — shallow, so soft playing still speaks).

Velocity is the **steepest single frame** of the downstroke. A hard hit is over
in one or two frames at 250Hz, so anything needing a multi-ms ramp is measuring
a key that already stopped moving. `hid range` auto-learns the ends of your own
playing; `hid curve` (gamma, default 0.5) and `hid floor` shape the rest. The
remaining travel *after* the trigger becomes per-note pressure, so the same
press that sounded the note goes on shaping it.

Run `hid keys` once per board: press each playing key in turn and TEN records
which matrix slot moved. Key IDs are matrix positions and differ per model. The
Keychron 6x16 scan order (K2 HE, Q3 HE) ships built in; everything else needs
the one pass, and the mapping is saved once you've done it.

**macOS: the FUN60 needs Input Monitoring.** System Settings → Privacy &
Security → Input Monitoring → enable your browser, then quit it fully (⌘Q, not
just the window) and reopen. macOS gates any HID interface that declares a
Keyboard or Mouse usage, because reading one means reading everything you type,
and the gate is per interface and all-or-nothing. The FUN60 packs its analog
stream onto the same interface as its keyboard reports, so it falls inside the
gate; the Keychron puts its matrix on a private vendor interface with nothing
else on it, so it never does. Without the permission the board connects and
reports nothing — a firmware packaging difference, not a broken board.

If the chooser is empty, another tab is probably still holding the keyboard —
WebHID grants are per page, and the analog protocols are request/response, so
two pages will fight over the same pipe. Close the other one first.

**Velocity and pressure.** The laptop keyboard has no sensors, so it plays
at a fixed velocity you step with `c` / `v` while playing — the same way
`z` / `x` move the octave. Recorded notes keep whatever velocity they were
played at. `midi in` in SETTINGS has three states: `off`, `solo`
and `+kbd`. Use **solo** with a hall-effect keyboard — it types *and* sends
MIDI, so without it every note fires twice, at two different velocities.
`+kbd` keeps both alive for a normal MIDI controller. Notes that fall inside
the current key range are played through the real key path, so retro
capture, live quantize and the ONE all still work. Aftertouch, channel pressure and CC11/CC2/CC1 all feed the
`press` MOD source, which — unlike `vel`, sampled once at note-on — keeps
moving while the note sounds. Route it at the filter, at pitch, or at amp — a gain
*after* the envelope, so a note can still release. On an amp route `center`
sets where an unpressed note sits: `0` leaves it at full and pressure adds
on top, `-100%` starts it at **silence**, so the note has to be pressed into
existence. That last one is the breath/swell gesture. Under
MPE, where each note owns its own channel, channel pressure is therefore
genuinely per-note: press one key deeper and only that voice opens up.

**Procedural instruments.** Set a channel's type to `proc` and its sound
becomes real DSP running in an audio worklet — for the instruments the rack
cannot express. **18 models**, grouped by how they actually make sound:

- *modal* (struck bars, tines, pans) — kalimba, xylophone, marimba,
  vibraphone, steeldrum, woodblock
- *struck* — piano, rhodes · *tonewheel* — hammond
- *string* — string (Karplus-Strong), bowed (a saw section, not a waveguide)
- *blown* — clarinet, flute, saxophone, harmonica, accordion, trumpet
- *skin* — skindrum (a real membrane: modes at the Bessel zeros)

Each model exposes 8 named params, live-tweakable with the arrow keys while
it plays, and ships **10 presets** (180 in all) — mostly the real instrument
in a real room, with one or two deliberately strange per set. A preset carries
the model's params *plus* a filter, amp envelope, voice settings and an fx
chain, so it's a whole voice rather than a timbre tweak. PRST picks `model`
then `preset`.

The rest of the rack applies on top: FX and PLAY come free (the worklet
feeds the channel bus above them), and FILT, MOD and VOICE — unison, stereo
spread, mono steal, glide — are applied per voice. Every model is level-matched
to a plain saw on the normal engine, and RELEASE in the MOD rack governs all of
them. Note this half is web-only: arbitrary DSP doesn't port to hvcc.

**Audio channels.** Set a channel's type to `audio` and it becomes a
looping audio track: drag a file onto it, or record straight in from the
mic (`tab`, same looper) with overwrite / overdub / **smart-duck** modes —
duck smoothly lowers what was already there under your new take. Trim,
pitch, and fit-to-loop live in the sound layer; playback stays synced to
the same polymetric loop system as everything else. (Buffers currently
live in memory only — they don't survive a reload yet.)

**Presets.** Module 1 (PRST) is the first thing you see in a sound: browse
the library within the channel's type (17 types — drums are split into
kik/snr/hh/cymb/perc/tom/wood/zap, plus `kit` — see below), change type,
save, randomize with a `wild%` dial.
`enter` opens the library explorer (180 factory presets + your saves) —
browsing auditions safely: `enter` keeps, `esc` restores your sound.

The drums include hand-built machine references — `K808 K909 K606`,
`S808 S909 S606`, `RIM`, `H808 H909` — because everything generated gets
heard against something. Each is the same three decisions in different
proportions: how far the pitch falls and how fast, how long the body rings,
and how much of it is shell versus snare wire. Generated snares now always
carry two tuned shells under the noise (a snare with no pitch in it is
static), generated basses are lowpass-only (a bandpassed bass is a mid-range
buzz with the part it was written for missing), and reverb on a channel is an
insert with a dry signal rather than 100% wet.

**Filters that have a shape, not just a corner.** Past the shelves the filter
types are **banks** — several resonators in parallel with a `spread` control
for how far apart they sit: `fmnt` a throat, `vowl` a-e-i-o-u swept by spread,
`twin` two peaks an interval apart, `trip` root/fifth/octave, `comb` a harmonic
series that bends inharmonic, `rake` peaks fanning up and away. They move as a
shape — dragging the frequency takes every peak with it, and one mod route on
the cutoff modulates all of them together. Each slot also has a **slope**:
12dB is one biquad, 24dB is two with the Q split between them.

**Five noises.** `nse` is flat white; `pink` is air and cymbals, `brwn` is
wind and floor toms, `blue` is all top end, `dust` is sparse impulses —
crackle, rain, the noise floor of something old. Each is a 4-second buffer,
level-matched to white so swapping one for another changes the timbre and not
the balance. A noise operator's `rat` is a **timbre** control near 1, not a
pitch: the note is tracked by the filters, the way hardware drum machines
transpose noise.

**A selection makes everything bulk.** `shift`+digits picks several channels
out (`shift+←→` drags the selection along, `esc` clears it) and then *every*
channel gesture points at all of them: `opt+s`/`opt+m`, hold-`c` volume and pan,
hold-`v` velocity, hold-`n` pitch, hold-`` ` `` instrument, hold-`q` grid,
hold-`tab` loop, `/` to roll them, `cmd+C/X/V` as a block, `cmd+D`, and every
clear. There is no second vocabulary — the same keys, more than one subject. A
copied block pastes from wherever the cursor is rather than going home, so four
drums lifted off 2-5 land on 6-9 if that is where you are.

**Making a kit out of a bus.** With a selection, `cmd+opt+shift+K`
folds them into one kit channel — each channel's whole preset becomes a pad on
its own key, and its part moves with it onto the same beats. The channels it
absorbs keep their sound and lose only their notes, and one `cmd+Z` puts it all
back.

**Kits.** Set a channel's type to `kit` and each of the 12 notes becomes a
**complete independent instrument** — its own oscillators, filters, mod
rack, fx, everything. Octaves just transpose, so C2/C3/C4 all play pad C
at different pitches. Play a pad and it becomes the one you see and edit:
PRST shows that pad's engine/pad/sound/prst/level/pan, and every rack (OSC, FILT,
MOD, VOICE, FX) edits *that pad*. `rnd` on PRST rerolls the whole kit;
`⌫` resets the focused pad.

**The `/` button makes music.** One key, three intensities, everywhere:
`/` = musical variations of what's there · `?` (shift+`/`) = a genuinely
different style (own key, scale flavor, chord progression, groove
language, bass/lead styles, fresh presets, role-based mixing and sends) ·
`shift+option+/` = wild card. It fires on *release*, so holding it to
reach the wildness arrows doesn't spray randomizations on the way, and
overlapping LATCH arms auto-roll: a new one every time the loop comes
round. Hold a scope with it and the dice are aimed — `n+/` rolls only
the notes, ``` `+/ ``` only the sound, `v+/` only the velocities. From
SETTINGS it generates a **whole song** — intro/build/drop/break plus a
dj-automated arrangement with the classic pre-drop buildup.

**DJ pads & automation.** Select the master (`0`) and the home row
`a s d f g h j k l ;` fires ten editable fx pads (hipass, buildup macro,
lopass, synced ping-pong delay throw, verb wash, rolls, crush, tape,
gate) — hold for momentary, latch to keep one on, tap a latched pad to
unlatch. That's the one place the letters aren't notes, which is what
makes the row free. Song generation writes them into the arrangement as
timed automation windows, and the pads themselves are edited in the
master's own rack.

**Levels.** A kit pad's level is the fader for that pad and multiplies with the
kit channel's own, so pads carry the same template level their kind gets on a
channel of its own. Every voice is normalized where the signal is made rather than
patched up at the fader. Unison divides by `1/sqrt(n)`, and the operator stack
now does too — without it a six-op pad put six times the signal into the sum
that a one-op kick did, then played three of them at once because it was a
chord, which is why melodic patches used to bury a drum kit even at 10% on the
fader. With that fixed the mix templates could move to where a supporting part
actually belongs. Measured, single note, at template level: kick 0.45–0.65,
snare 0.4–0.6, hats 0.37, bass 0.26, keys/lead 0.25, a chord triad 0.5.

**Smart mix.** On by default (`smix` in SETTINGS): per-channel + master
spectrum analysers make slow, dead-banded trim decisions — harsh/bright
channels come down, buried bass gets a nudge, loud outliers move toward
the pack. It decides like a mix engineer, it never pumps like a
compressor. There's also a `duck` sidechain fx (any channel following any
other) — generated basslines ship with one following the kick.

**Global groove & scale.** Groove type/amount/humanize/switch-mode are
settings. Global scale snaps all non-drum channels; a chord-master channel
overrides the scale with whatever chord is held.

## For collaborators (and their LLMs)

Everything is in **`index.html`** — one file, vanilla JS, no build. Read it
top to bottom; each section is banner-commented in this order:

1. **Looper class** — the generic loop primitive (events in beats).
2. **Settings (CFG)**, scales, groove templates, undo helpers.
3. **Param spec system** — `MODULES` table + `SP()` specs; every parameter
   is addressed as `(rack, slot, param)` — the code still calls a rack a
   `module` (`MODULES`, `S.curMod`), which is the one place the two
   vocabularies differ; `getV/setV/adjust/fmtVal` are
   the only ways values are read/written/displayed.
4. **Presets** — `basePreset()` shape, factory presets, library
   (localStorage `ten-lib-v1`), seeded generator.
5. **Transport** — beats↔seconds, lookahead scheduler (~150ms horizon,
   25ms tick), free-running grid `G` for stopped-state quantize, pattern
   `acts` (switch modes sync/restart/wait).
6. **Engine** — Web Audio. `Voice` builds per note: unison × operator
   stacks → per-voice filter chain → vca. Per-channel bus: distortion rack
   → fx chain → gain/pan → master sum → master rack (send buses + inserts).
   `fxUnit()` builds any effect; `prepEffective()` overlays per-note preps.
   **The sequencer↔engine boundary is deliberately 3 Pd-shaped messages:**
   `trigger(at, ch, midi, vel, dur?)` → handle `.release(t)`, plus
   `applyParam(ch, module, slot, param, value)`. The plan is to swap this
   engine for a Pure Data patch (hvcc → C for hardware + WASM for web)
   without touching anything above it.
7. **Keyboard** — one keydown/keyup pair drives everything; `S.layer`
   decides meaning. All state lives in `S` (session) / `CFG` (defaults) /
   `T` (transport).
8. **Persistence** — `serialize()`/`load()` with versioned migrations
   (currently **v18** — `SAVEV` is one constant, read by both the writer and
   the reader; bumping one without the other rejects every save the app
   makes). Undo = snapshot stack of `serialize()`. Note that `load()`
   rebuilds a preset by walking `MODULES`, so anything retired from that
   table (`mix`, and `vof`) has to be copied across by hand.
9. **Render** — full-screen `<pre>`, rebuilt at ~30fps from state. No DOM
   beyond one element.

Conventions: beats everywhere (only the engine knows seconds); no
dependencies; state is plain JSON-serializable objects; destructive user
actions call `pushUndo(label)` first; mod-loop playback writes params
through a path that never touches undo.

## Running locally

```
git clone git@github.com:Gadbaruch/Ten.git && cd Ten
open index.html            # or any static server if you prefer
```
