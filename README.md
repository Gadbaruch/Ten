# TEN — keyboard groovebox prototype

A keyboard-only, OP-1-style music system. Ten of everything: ten patterns, ten
sound presets, ten sound modules — all living on the `0-9` keys, with meaning
depending on which **layer** you're in.

**Play it:** https://gadbaruch.github.io/Ten/ — or open `index.html` locally
(any static server, no build step, zero dependencies).

Everything autosaves to your browser; `ctrl/cmd+E` exports a session JSON and
dropping a JSON on the page loads it — that's how we trade ideas for now.

```
git clone git@github.com:Gadbaruch/Ten.git && cd Ten
npx serve -l 3031 .        # then open http://localhost:3031
```

## The four layers

```
ARRANGE            digits = recall/record/place pattern transitions
  └─ PATTERN       digits = pick sound preset, letters = play/record/place notes
       └─ SOUND    digits = pick module — every module is a 10-slot rack
            └─ SLOTS       digits = pick 1 of 10 slots inside that module
```

`enter`/`esc` navigate layers. `shift+esc` jumps to top. `←→` move focus,
`↑↓` or `-`/`=` adjust the focused value (shift = fine), `backspace` resets
it to default.

## The one generic Looper

Every layer has the *same* loop primitive: `unit (16th|beat|bar) × count`, a
flat event list, and two switches: `tab` = **REC** on/off, `/` = **EDIT**
mode. Loop playback itself never stops.

- **REC** — input is recorded. Playing is *quantize-monitored*: what you hear
  is the note at its recorded timing — exactly what will loop back.
  Quantize is **per lane and split in two**: `q` cycles the lane's LIVE
  quantize (applied to your hands as you record), `shift+q` its POST quantize
  (applied non-destructively at playback — raw timing stays stored). So a
  performance lane can run live 0% / post 100%. `h` (in arrange) adds global
  humanize jitter. Value keys everywhere: `↑↓`/`-`/`=`, `shift` = ×10 jumps,
  `option` = ×0.1 fine.
  Held notes **replace** whatever was on the lane underneath them (chords
  you're holding don't erase each other). Holding `backspace` records
  silence — erases the lane as the playhead passes.
- **EDIT** — tracker-style cursor. `←→` move, letters place a note and
  auto-advance (same pitch again removes it), `↑↓` switch lane, `backspace`
  clears the cell. In ARRANGE, digits place pattern transitions at the
  cursor; in SOUND, `-`/`=` create/adjust modulation points at the cursor.

**First-take length suggestion**: an *empty* lane in REC has no fixed length —
it listens. Play something; after a bar of silence (or REC off / stop) the
loop sets itself to the smallest power-of-two bar count containing the take
(1/2/4/8/16 bars) and starts looping. After that (or any manual resize) the
lane behaves normally. And if the *whole pattern* is empty, your first hit
**sets the one**: the transport retriggers on it, so grid, metronome and loop
all align to your downbeat.

Loop lengths: `-`/`=` ±1 unit (arrange/pattern layers), `[` halve, `]` double
**and duplicate** (shift+`]` doubles only), `\` cycles the counting unit
(16th → beat → bar). Fractional counts cut early; hidden events return if you
re-expand. **Per-lane lengths**: every preset lane in a pattern is its own
looper — a 3-beat bassline rides over a 4-beat drum lane (polymetric).

## Pattern switching

Default is **sync** (pickup): switching patterns lands at the current phase
of the timeline, not at beat 1. Press `s` in ARRANGE to set a per-pattern
switch mode: `sync` / `rstrt` (pattern restarts from its own beat 1) /
`wait` (current pattern finishes its cycle first, then the next starts clean).

## Sound modules — every module is a 10-slot rack

`1 OSC · 2 AMP · 3 FILT · 4 ENV · 5 LFO · 6 FX · 7 PLAY · 9 VOICE · 0 MIX`
(8 reserved). `enter` on a module opens its slots; digits pick a slot,
`←→` picks a param, `↑↓`/`-`/`=` turn it, `⌫` resets it.

- **OSC** — 10 operators: wave (4 classic + noise + 4 spectra), mode
  `add`/`fm`/`ring`, **dest** (route at any op; `prev` cascades), ratio,
  level, fine, **phase** (real waveform phase via rebuilt harmonic tables)
  and **trig**: `rtrg` locks every note to the set phase (punchy, digital),
  `free` starts each note — and each unison clone — at a random phase like a
  free-running analog VCO.
- **AMP** — 10-slot distortion rack: soft/hard/fold/tube/fuzz/crush/sat/
  asym/rect, each with drive + mix, run **serial or parallel**.
- **FILT** — 10 filters in series: lp/hp/bp/notch plus **EQ types**
  (peaking, low/high shelf with gain) — stack bands like an EQ.
- **ENV** — 10 routable envelopes: dest (`amp`/`pitch`/`filt N`/`op N`) +
  slot# + amount + ADSR. The amp envelope is just slot 1; a fast pitch env
  is the old pdrop; filter envs point at any filter slot; op-level envs
  make FM evolve.
- **LFO** — 10 routable LFOs: dest (`pitch`/`filt N`/`amp`/`pan`/`op N`).
- **FX** — per-preset serial chain: delay, chorus, flanger, phaser,
  tremolo, drive, crush, reverb-send (shared verb).
- **PLAY** — playability: **chord** (type + strum) fans out your notes;
  **arp** (division, up/down/updn/random, octaves) steps held notes on the
  grid (transport must run).
- **VOICE** — poly/mono/glide + unison (`uni` 1–7 full-stack clones,
  `sprd` detune, `wide` pan, `slop` micro-delay).

Per-preset modulation: with the SOUND looper in REC, value moves while
playing are recorded into the preset's mod loop (slot params included);
EDIT places points by hand.

## Architecture notes (for the Pd / hardware port)

The sequencing/UI layer talks to the sound engine through exactly three
messages — deliberately Pd-shaped:

```
noteOn  <preset> <midi> <vel> @time
release <voice>              @time
param   <preset> <module> <param> <value>
```

- Clocking is a lookahead scheduler (~150ms horizon, 25ms tick) against the
  sample-accurate `AudioContext` clock — solid timing, no setTimeout jitter.
- Everything musical is stored in **beats**, tempo-independent; the engine is
  the only thing that knows about seconds.
- The plan: keep this UI/state machine, replace `Engine` with a Pd patch —
  either **hvcc** (Heavy) compiling Pd-vanilla → C (Daisy/Teensy/embedded) and
  → WASM for the browser, or libpd/pd4web. The `Looper` + layer state machine
  is the product; the synth is a placeholder.

## Full keymap

Press `?` in the app.
