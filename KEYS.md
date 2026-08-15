# TEN — key map

Generated from `index.html` by `tools/keymap.py`. Do not hand-edit —
regenerate it. A key table that is written by hand is wrong within a week.

199 bindings across 38 keys.

## What is still free

**Letters:** none — in the full keyboard every letter is a note, so a BARE letter is never available. A new letter binding has to ride a modifier layer: ⌘, ⌃ or ⌥. Check the table below for what that layer already holds, and confirm with `tools/probe.sh key code=KeyX ctrl=1` that nothing moves.

**Note keys** (cannot be reused): KeyA KeyB KeyC KeyD KeyE KeyF KeyG KeyH KeyI KeyJ KeyK KeyL KeyM KeyN KeyO KeyP KeyQ KeyR KeyS KeyT KeyU KeyV KeyW KeyX KeyY KeyZ Quote Semicolon

**DJ pads** (master, cannot be reused): KeyA KeyD KeyF KeyG KeyH KeyJ KeyK KeyL KeyS Semicolon

**Punctuation free:** none

Spend these carefully. New bindings should otherwise go on a modifier or
inside an existing held scope.

## Every binding

| Key | Context | Line | Does |
|---|---|---|---|
| `KeyB` | ⌘ + ⌃ | 9116 |  |
| `KeyB` | ⌃ | 16049 | tap tempo, on repeated taps |
| `KeyC` | ⌘ | 9185 | copy out of what you are looking at |
| `KeyC` | — | 15500 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | — | 15502 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | ⌃ | 16042 | ⌃c — this channel's patch, as JSON, on the clipboard |
| `KeyC` | hold c + hold v | 17233 |  |
| `KeyC` | hold c | 17399 | vel  |
| `KeyE` | — | 15493 | cmd+↑↓ = per-note prep tweak |
| `KeyI` | — | 15496 | cmd+↑↓ = per-note prep tweak |
| `KeyK` | ⌘ + ⌥ + ⇧ + layer 1+ | 15209 | ◎ source →  |
| `KeyL` | ⌘ | 15198 |  |
| `KeyM` | hold q + ⌥ + ⇧ + dest browser + set picker + layer 2+ | 15849 | nothing to modulate here |
| `KeyM` | hold q + ⌃ | 16038 | click  |
| `KeyM` | hold q + hold n + hold m | 17232 |  |
| `KeyM` | hold m | 17465 | the digit is no longer held |
| `KeyN` | ⌘ | 15192 | start a new set? enter confirms · esc cancels |
| `KeyN` | hold digit + ⌥ | 16768 |  |
| `KeyN` | hold q + hold n + hold m | 17232 |  |
| `KeyN` | hold n | 17403 | vel  |
| `KeyO` | ⌃ | 16044 | ⌃o — how recording meets what is there |
| `KeyP` | ⌘ + ⌃ + ⌥ + ⇧ + layer 1+ | 15223 | the way out is the key you came in on |
| `KeyQ` | hold q + ⌃ + layer 1+ | 16093 | Q — tap toggles live quantize · s snaps recorded notes · digits set the grid |
| `KeyQ` | hold q + ⌃ | 16100 | ⌃q = live-quantize toggle, everywhere |
| `KeyQ` | hold q + hold n + hold m | 17232 |  |
| `KeyQ` | hold q | 17459 | live quantize  |
| `KeyS` | ⌘ | 15185 | straight back to where it lives |
| `KeyS` | hold q + ⌃ | 16065 | …unless the q scope is open: q+s = snap |
| `KeyS` | hold q + layer 1+ | 16074 |  |
| `KeyS` | hold c + hold v | 17233 |  |
| `KeyS` | — | 17458 | live quantize  |
| `KeyT` | layer 0 | 16058 | t = timeline on/off (focus mode) |
| `KeyV` | — | 15500 | MOD learn: arm on a mod slot, map on a target param |
| `KeyV` | hold digit + ⌥ | 16772 |  |
| `KeyV` | hold c + hold v | 17233 |  |
| `KeyV` | hold v | 17404 | vel  |
| `KeyX` | — | 15500 | MOD learn: arm on a mod slot, map on a target param |
| `KeyX` | — | 15502 | MOD learn: arm on a mod slot, map on a target param |
| `KeyZ` | ⇧ | 15497 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 3178 | OFFSET the content — vertical, like the grid |
| `ArrowDown` | — | 15134 | destination cleared |
| `ArrowDown` | dest browser + set picker | 15136 | destination cleared |
| `ArrowDown` | — | 15420 |  |
| `ArrowDown` | — | 15456 | down = finer, the way the list reads |
| `ArrowDown` | — | 15457 | down = finer, the way the list reads |
| `ArrowDown` | — | 15498 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 15572 | the way in is the way out |
| `ArrowDown` | — | 15596 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowDown` | — | 16367 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16370 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16457 | bpm  |
| `ArrowDown` | ⇧ | 16475 |  |
| `ArrowDown` | — | 16626 | master — ←→ picks a channel, 0 stays here |
| `ArrowLeft` | — | 3202 | UNIT SIZE — horizontal |
| `ArrowLeft` | — | 9123 |  |
| `ArrowLeft` | — | 9134 | no backups yet |
| `ArrowLeft` | — | 9201 | inside the set: pick a channel |
| `ArrowLeft` | — | 15131 | destination cleared |
| `ArrowLeft` | — | 15425 |  |
| `ArrowLeft` | — | 15460 | ⌥a+⌫ = take it out for good |
| `ArrowLeft` | layer -1 | 15571 | the way in is the way out |
| `ArrowLeft` | — | 15576 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowLeft` | — | 16367 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowLeft` | — | 16503 |  |
| `ArrowRight` | — | 3202 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 3203 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 9123 |  |
| `ArrowRight` | set picker | 9124 |  |
| `ArrowRight` | — | 9134 | no backups yet |
| `ArrowRight` | set picker | 9135 | no backups yet |
| `ArrowRight` | — | 9201 | inside the set: pick a channel |
| `ArrowRight` | — | 9202 | inside the set: pick a channel |
| `ArrowRight` | — | 15131 | destination cleared |
| `ArrowRight` | dest browser + set picker | 15132 | destination cleared |
| `ArrowRight` | — | 15425 |  |
| `ArrowRight` | hold ⌥rack | 15427 | - = walk the rate |
| `ArrowRight` | — | 15460 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | — | 15461 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | layer -1 | 15571 | the way in is the way out |
| `ArrowRight` | — | 15576 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15577 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 16367 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16370 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16503 |  |
| `ArrowRight` | — | 16504 |  |
| `ArrowUp` | — | 3178 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 3179 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 15134 | destination cleared |
| `ArrowUp` | — | 15420 |  |
| `ArrowUp` | hold ⌥rack | 15422 |  |
| `ArrowUp` | — | 15456 | down = finer, the way the list reads |
| `ArrowUp` | — | 15498 | cmd+↑↓ = per-note prep tweak |
| `ArrowUp` | ⌥ + ⇧ + layer 2+ | 15499 | MOD learn: arm on a mod slot, map on a target param |
| `ArrowUp` | — | 15572 | the way in is the way out |
| `ArrowUp` | — | 15596 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15607 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 16367 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16370 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16370 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16457 | bpm  |
| `ArrowUp` | ⌘ + ⌥ | 16460 | bpm  |
| `ArrowUp` | ⇧ | 16475 |  |
| `ArrowUp` | — | 16479 | crop  |
| `ArrowUp` | — | 16626 | master — ←→ picks a channel, 0 stays here |
| `ArrowUp` | — | 16627 | master — ←→ picks a channel, 0 stays here |
| `Backquote` | ⌘ + ⌥ + dest browser + set picker | 15937 | caps shows the modcap first |
| `Backslash` | ⌘ + ⌥ | 15999 | DJ pads: full home row |
| `Backslash` | hold ` | 17408 | what the dice are for |
| `Backspace` | — | 3213 | ⟲ loop length cleared |
| `Backspace` | — | 3221 | nothing recorded to restore  (⇧⌫ clears the loop length) |
| `Backspace` | ⇧ | 9173 | slot  |
| `Backspace` | — | 15138 | destination cleared |
| `Backspace` | hold ⌥rack | 15406 |  |
| `Backspace` | hold ⌥rack | 15469 | ⌥a+⌫ = take it out for good |
| `Backspace` | — | 15755 | cue  |
| `Backspace` | — | 15767 | cue  |
| `Backspace` | hold n + hold digit | 16106 |  |
| `Backspace` | hold c | 16111 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab + ⇧ | 16121 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab | 16128 |  |
| `Backspace` | hold tab + hold digit + layer 2+ | 16137 | nothing loaded |
| `Backspace` | — | 16152 | no automation on  |
| `Backspace` | — | 17539 |  |
| `BracketLeft` | — | 15401 |  |
| `BracketLeft` | — | 15545 |  |
| `BracketLeft` | ⌘ + dest browser + set picker | 15810 |  |
| `BracketLeft` | — | 15812 |  |
| `BracketLeft` | — | 17467 | the digit is no longer held |
| `BracketRight` | — | 15401 |  |
| `BracketRight` | hold ⌥rack | 15403 |  |
| `BracketRight` | — | 15544 |  |
| `BracketRight` | — | 15545 |  |
| `BracketRight` | ⌘ + dest browser + set picker | 15810 |  |
| `BracketRight` | — | 15826 | the pan keys dial too |
| `BracketRight` | — | 17468 | the digit is no longer held |
| `CapsLock` | — | 15981 | the state is read, not toggled |
| `Comma` | — | 15443 | , . = octaves |
| `Comma` | ⌘ + ⌥ | 16020 | keyboard vel  |
| `Comma` | — | 16024 | octave centred |
| `Comma` | — | 17469 | the digit is no longer held |
| `Enter` | — | 9126 |  |
| `Enter` | — | 9139 | no backups yet |
| `Enter` | — | 9208 | this empties all  |
| `Enter` | — | 15143 |  |
| `Enter` | layer -1 | 15571 | the way in is the way out |
| `Enter` | — | 15575 | the way in is the way out |
| `Enter` | — | 15956 |  |
| `Enter` | layer -1 | 17353 | macOS reports caps going OFF on the keyup |
| `Equal` | — | 15391 |  |
| `Equal` | hold ⌥rack | 15393 |  |
| `Equal` | — | 15439 | - = walk the rate |
| `Equal` | — | 15440 | , . = octaves |
| `Equal` | hold tab + ⌘ + ⌃ | 15708 |  |
| `Equal` | ⌘ + layer 2+ | 15725 |  |
| `Equal` | — | 15727 |  |
| `Equal` | ⌘ + ⌃ + ⌥ + layer 2+ | 15738 |  |
| `Equal` | — | 15741 |  |
| `Equal` | — | 15755 | cue  |
| `Equal` | — | 15760 | cue  |
| `Equal` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15786 |  |
| `Equal` | ⇧ | 15788 |  |
| `Escape` | — | 9113 | cancelled |
| `Escape` | dest browser + set picker | 15130 | destination cleared |
| `Escape` | — | 15559 |  |
| `Escape` | layer -1 | 15571 | the way in is the way out |
| `Escape` | — | 15574 | the way in is the way out |
| `Escape` | — | 15957 |  |
| `Escape` | layer -1 | 17353 | macOS reports caps going OFF on the keyup |
| `Escape` | — | 17485 | ⟳ mic latched — esc again turns it off |
| `F1` | — | 15559 |  |
| `Minus` | — | 15391 |  |
| `Minus` | — | 15439 | - = walk the rate |
| `Minus` | hold tab + ⌘ + ⌃ | 15708 |  |
| `Minus` | — | 15712 |  |
| `Minus` | ⌘ + layer 2+ | 15725 |  |
| `Minus` | ⌘ + ⌃ + ⌥ + layer 2+ | 15738 |  |
| `Minus` | — | 15755 | cue  |
| `Minus` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15786 |  |
| `Period` | — | 15443 | , . = octaves |
| `Period` | — | 15444 | there is no zeroth octave |
| `Period` | — | 15544 |  |
| `Period` | ⌘ + ⌥ | 16020 | keyboard vel  |
| `Period` | — | 16021 | keyboard vel  |
| `Period` | — | 17470 | the digit is no longer held |
| `Quote` | — | 15544 |  |
| `Quote` | — | 15546 |  |
| `Semicolon` | — | 15546 |  |
| `Slash` | set picker | 9154 | slot  |
| `Slash` | ⌘ + ⌃ + ⌥ + layer 2+ | 15255 |  |
| `Slash` | — | 15572 | the way in is the way out |
| `Slash` | — | 15609 | the dice key: a whole song (⇧⌥ = wild) |
| `Slash` | ⌥ | 16001 | DJ pads: full home row |
| `Slash` | layer -1 | 17353 | macOS reports caps going OFF on the keyup |
| `Slash` | hold / | 17410 | what the dice are for |
| `Space` | — | 9184 | copy out of what you are looking at |
| `Space` | — | 15625 | rec unlatched |
| `Tab` | — | 15626 | rec unlatched |
| `Tab` | — | 17558 | latch overlapped the hold: rec stays on |
| `Tab` | — | 17589 | the hold ended and nothing latched it: rec off |
