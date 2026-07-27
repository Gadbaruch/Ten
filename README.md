# TEN — keyboard-only groovebox

An OP-1-inspired music instrument that lives entirely on a computer keyboard.
Ten of everything: patterns, channels, module slots, rack slots — all on the
`0-9` keys, with meaning depending on which **layer** you're in.

**Play it:** https://gadbaruch.github.io/Ten/ — or just open `index.html`
(double-click works; no server, no build, no dependencies, one file).

Sessions autosave to the browser. `cmd+E` exports a session JSON; drop a JSON
onto the page to load it. `cmd+Z` / `cmd+shift+Z` undo/redo almost everything.

## Layers

```
SESSION       esc from arrange — 10 song slots (select + enter loads) + defaults
ARRANGE       digits select parts · slots ARE song sections (0 intro … 9 outro)
  │           the home row a s d f g h j k l ; = DJ pads (hold / shift-latch)
  │           0,0 selects MASTER — the unique channel on the far right
  ├─ MASTER 0   fx rack (sends + mix inserts, limiter stock) + dj pad editor
  └─ PATTERN  digits pick channel (again=mute, shift=solo) · letters play notes
      └─ SOUND    digits pick module — 1 PRST 2 OSC 3 FILT 4 MOD
          └─ RACK     │       5 FX 6 VOICE 7 MIX 0 PLAY
                      └─ every module is a 10-slot rack; digits pick a slot,
                        the same digit again BYPASSES it
```

The full ladder is always visible up top — you are the lit rung; `enter`
goes deeper, `esc` goes up. `←→` walk every focusable field (`shift+←→`
jumps modules/parts). `↑↓` adjust values (shift ×10, option ×0.1);
`cmd+↑↓` tweaks the **last-played note only** (prepared-piano on any
channel — `•` marks prepped params, `⌫` removes). `-`/`=` resize loops,
`shift+-/=` nudge a loop's content. `q` toggles live quantize anywhere
(`shift+Q` snaps a lane after the fact). `t` toggles the arrangement
timeline (focus mode). `⌫` clears in context; **holding shift+⌫**
re-initializes the whole layer you're on. `cmd+C/X/V` copy/cut/paste
parts, channels, and rack slots. `b` taps tempo. `F1` shows the full
keymap — that is the authoritative reference.

## Core ideas

**One generic Looper everywhere.** Arrangement, every pattern lane, and every
sound's mod loop are the same primitive: `unit × count` (fractional counts cut
early), a flat event list, REC (`tab`, momentary by default — hold to record)
and EDIT (`/`, tracker-style step cursor). Pattern lanes are polymetric —
each lane has its own independent length.

**Recording feels like tape.** What you hear is exactly what gets stored
and played back (live quantize pushes notes to the next 16th — toggle it
with `q`, snap a loose take later with `shift+Q`). Held notes
replace what's under them audibly and immediately; while recording, hold
`⌫` to record silence. The default looper mode is **retro capture**: TEN
is always listening, so just play — then hit `tab` once and it grabs what
you just played (forgetting anything before a long pause) and loops it at
a sensible power-of-two length, wrapped from your entry point. Classic
momentary/latch REC modes are in settings. An empty pattern's first hit
**sets the One** (transport retriggers on it).

**Sound = racks.** Every module is 10 slots: operators (add/fm/ring/**sync**
with free dest routing, phase + rtrg/free trig, incl. an `smp` sampler wave —
drop an audio file on an op), filters incl. EQ bands, a **MOD** rack, an
**FX** chain, and **PLAY**. The MOD rack unifies modulation — each slot
picks a *source* (env / lfo / velocity / key-track / random-S&H /
**pressure**) and fans
it out to one or more *routes*, each with its own *target* (amp / pitch /
filter / pan / op level; slot# targets one, 0 = all), *amount* and
*range*. So a single LFO can sweep the filter, wobble pan and bend pitch
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
over WebHID — `↓` for Keychron/AnalogSense (raw-HID matrix, request/response),
`↑` for MonsGeek FUN60 / Attack Shark (RongYuan, event-driven push, no firmware
mod needed). TEN never reads the board's keystrokes: the analog stream is the
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
which matrix slot moved. Key IDs are matrix positions and differ per model, so
there is no table to ship — but the mapping is saved once you've done it.

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

The rest of the rack applies on top: FX, MIX and PLAY come free (the worklet
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
`enter` opens the library explorer (170 factory presets + your saves) —
browsing auditions safely: `enter` keeps, `esc` restores your sound.

**Kits.** Set a channel's type to `kit` and each of the 12 notes becomes a
**complete independent instrument** — its own oscillators, filters, mod
rack, fx, everything. Octaves just transpose, so C2/C3/C4 all play pad C
at different pitches. Play a pad and it becomes the one you see and edit:
PRST shows that pad's type/sound/level/pan, and every module (OSC, FILT,
MOD, VOICE, FX) edits *that pad*. `rnd` on PRST rerolls the whole kit;
`⌫` resets the focused pad.

**The `/` button makes music.** One key, three intensities, everywhere:
`/` = musical variations of what's there · `shift+/` = a genuinely
different style (own key, scale flavor, chord progression, groove
language, bass/lead styles, fresh presets, role-based mixing and sends) ·
`shift+option+/` = wild card. In ARRANGE it writes the section the slot
stands for; in SESSION it generates a **whole song** — intro/build/drop/
break patterns plus a dj-automated arrangement with the classic
pre-drop buildup.

**DJ pads & automation.** The home row in arrange fires ten editable fx
pads (hipass, buildup macro, lopass, synced ping-pong delay throw, verb
wash, rolls, crush, tape, gate) — hold for momentary, shift to latch,
tap a latched pad to unlatch. With arrangement REC on, held pads record
as timed automation windows (`≈` on the timeline); in EDIT they toggle at
the cursor. Edit the pads inside MASTER 0 with the same letters.

**Smart mix.** On by default (`smix` in SESSION): per-channel + master
spectrum analysers make slow, dead-banded trim decisions — harsh/bright
channels come down, buried bass gets a nudge, loud outliers move toward
the pack. It decides like a mix engineer, it never pumps like a
compressor. There's also a `duck` sidechain fx (any channel following any
other) — generated basslines ship with one following the kick.

**Global groove & scale.** Groove type/amount/humanize/switch-mode live
on the arrange arrows as params. Settings: global scale snaps all
non-drum channels; a chord-master channel overrides the scale with
whatever chord is held.

## For collaborators (and their LLMs)

Everything is in **`index.html`** — one file, vanilla JS, no build. Read it
top to bottom; each section is banner-commented in this order:

1. **Looper class** — the generic loop primitive (events in beats).
2. **Settings (CFG)**, scales, groove templates, undo helpers.
3. **Param spec system** — `MODULES` table + `SP()` specs; every parameter
   is addressed as `(module, slot, param)`; `getV/setV/adjust/fmtVal` are
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
   (currently v17). Undo = snapshot stack of `serialize()`.
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
