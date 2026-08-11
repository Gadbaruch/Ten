# TEN — instrument engine build notes

## Grainferno research (Baby Audio, 2026) — spec targets for the granular
Two-layer granular, morphs between two source samples in real time, 7 morph modes.
Grain engine params: size · density/rate · position/scan · shape (incl exponential
window) · direction/reverse · stereo · freeze · auto-pitch tune of source ·
key-mapped pitch/octave modes. Audio-rate modulation; 3 env + 3 LFO (grid-sync,
retrigger) + 2 randomizers + env follower; drag-drop mod routing incl
cross-modulation; per-grain fx; reorderable fx chain (6 modules); Play View
(4 macros). TEN mapping: our mod rack already covers env/lfo/rnd/follower —
the granular needs: pos, spray, size, dens, pitch, jitter, shape, rev-prob,
width, freeze as params, with pos/size/dens/pitch as ctrl destinations.

## Audio channel v2 (task 18) — decisions
- pitch modes: free = varispeed (rate×2^(semis/12)); sync = rate locked to loop
  fit, pitch via 'ten-psh' granular shifter worklet (timing retained).
- slices: lane length in 16ths (1 bar=16, 2 bars=32…); letters in KBSEQ order
  map slice 0..25; held = momentary jump, release = resume cycle in phase.
- cues: au.cues[i] = {o (offset nudge in 16ths), semis, vol, pan} — while a
  slice key is held: ←→ nudge position · ↑↓ pitch · ⇧↑↓ volume · ⌥←→ pan.
- rec honors ⇧O: overwrite replaces the clip; overdub sums onto it in place.
- stereo param: stereo | left | right (au.chan).
- au.semis is a ctrl mod/automation destination (rack 'aud').
- transient slicing mode: follow-up.

## Wavetable (task 20)
10 starter tables to audition, then verdict. Editor question open —
see chat 2026-08-11.
