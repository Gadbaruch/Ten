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
SETTINGS      esc from arrange — session defaults (persist across sessions)
MASTER FX     f from arrange — 10 fx slots: send buses + mix inserts
              (dj fx; a limiter guards slot 0 by default)
ARRANGE       digits recall patterns · record/place pattern transitions
  └─ PATTERN  digits pick channel (again=mute, shift=solo) · letters play notes
      └─ SOUND    digits pick module — 1 PRST 2 OSC 3 AMP 4 FILT 5 ENV
          └─ SLOTS    │       6 LFO 7 FX 8 VOICE 9 MIX 0 PLAY
                      └─ every module is a 10-slot rack; digits pick a slot
```

`enter`/`esc` move between layers. `←→` walk every focusable field in a
sound — fields, params, and occupied slots flow into each other
(`shift+←→` jumps a whole module). `↑↓` adjust values (shift ×10, option
×0.1), `-`/`=` resize loops, `⌫` resets/clears/deletes whatever is
focused; in a pattern, **holding** `⌫` momentarily silences the channel
(`shift+⌫` actually clears it). `b` taps tempo. `?` shows the full keymap
in the app — that is the authoritative reference.

## Core ideas

**One generic Looper everywhere.** Arrangement, every pattern lane, and every
sound's mod loop are the same primitive: `unit × count` (fractional counts cut
early), a flat event list, REC (`tab`, momentary by default — hold to record)
and EDIT (`/`, tracker-style step cursor). Pattern lanes are polymetric —
each lane has its own independent length.

**Recording feels like tape.** What you hear is what gets stored (live
quantize pushes notes to the next 16th — per lane, works even when stopped,
with a separate non-destructive POST quantize for playback). Held notes
replace what's under them audibly and immediately; while recording, hold
`⌫` to record silence. The default looper mode is **retro capture**: TEN
is always listening, so just play — then hit `tab` once and it grabs what
you just played (forgetting anything before a long pause) and loops it at
a sensible power-of-two length, wrapped from your entry point. Classic
momentary/latch REC modes are in settings. An empty pattern's first hit
**sets the One** (transport retriggers on it).

**Sound = racks.** Every module is 10 slots: operators (add/fm/ring with
free dest routing, phase + rtrg/free trig, incl. an `smp` sampler wave —
drop an audio file on an op), distortions (serial/parallel), filters incl.
EQ bands, routable envelopes (amp is just env slot 1; pitch drops, filter
sweeps, op-level FM motion — slot# targets one op, 0 = all), routable
LFOs, an fx chain (delay/chorus/flanger/phaser/trem/drive/crush/verb/comp/
gate/roll/tape/grs8/send), and PLAY: chord (with strum ±, or `mstr` role =
its held chord live-retunes all other channels), arp (slot order matters:
arp→chord chords every step), groove (follow global or own), prep/kit
(below).

**Audio channels.** Set a channel's type to `audio` and it becomes a
looping audio track: drag a file onto it, or record straight in from the
mic (`tab`, same looper) with overwrite / overdub / **smart-duck** modes —
duck smoothly lowers what was already there under your new take. Trim,
pitch, and fit-to-loop live in the sound layer; playback stays synced to
the same polymetric loop system as everything else. (Buffers currently
live in memory only — they don't survive a reload yet.)

**Presets.** Module 1 (PRST) is the first thing you see in a sound: browse
the library within the channel's type, change type, save, randomize.
`enter` opens the library explorer (90 seeded factory presets, 10 per
category, + your saves). In the pattern layer `shift+↑↓` swaps the channel's
sound without leaving the groove.

**Prep / Kit (per-note sounds).** Add a `prep` slot in PLAY: the last note
you play in the sound layers becomes the *focus* — in `prep` mode your
tweaks apply to that note only (prepared piano for synths); in `kit` mode
the PRST field assigns a whole library preset to that note (drum kits).
No prep slot = completely normal channel.

**Global groove & scale.** `g`/`shift+G` in arrange: swing amount + type
(sw16/sw8, reverse, push, drag, mpc, drunk). Settings layer: global scale
(key + mode) snaps all non-drum channels; a chord-master channel overrides
the scale with whatever chord is held.

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
   (currently v9). Undo = snapshot stack of `serialize()`.
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
