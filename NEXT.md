# TEN — where the audio channel stands, and what is next

Written 2026-08-15. Live at gadbaruch.github.io/Ten/ · dev server: `preview_start
name "ten"` → localhost:3031 · one file, `index.html`, no build step.

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

## What is next, in order

1. **THREE MODES ON THE CLIP RACK**, replacing the `sync` field:
   - `tape` — resample; pitch rides speed
   - `stretch` — dual-tap; pitch held; `window` shapes it
   - `grain` — the cloud
   The page shows only what the mode uses. Today `window` sits visible and
   inert in tape, and the cloud dials sit visible and inert at size ∞.

2. **`fit` → `sync`**, staying the centre detent of the speed dial. Gad's
   framing, and it is right: fitting a take to the loop IS syncing it, and
   tape/stretch/grain are three MEANS to that one end — tape syncs by
   pitching, stretch by stretching, grain by setting the carrier's travel.
   The two words were on the wrong controls.

3. **Level across the size dial.** Granulating the loop drops it from ~0.38
   to ~0.07 because the cloud bus pays the normalize and its own gain. The
   same tax the cloud always paid, but now it reads as a jump when you turn
   size down. Match them.

4. **Width as a stereo spread** rather than random placement per cursor.
   Whole notes are centred now (they keep the take's own stereo); grains
   still scatter, which is right for grains and wrong as a "width" control.

5. **More factory phrases** — `python3 tools/gen_samples.py <name>` re-rolls
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
- **Measure, do not model.** Every real bug this week was found by asking
  the running engine what its state was: audPlay's arguments logged from
  both builds, cursor positions sampled over time, the seven-case matrix
  A/B'd against the previous commit served side by side at /head-check.

## The measurement kit

`tools/stamp.sh` writes the build string; the `build` settings row fetches
the served copy to compare. The seven-case matrix (plain, sync +12, free +7,
channel select, hard pan, crop, rate 0.5) plus four cue jumps is the
regression net for anything touching the engine — run it against the
previous commit served alongside, not against remembered numbers.
