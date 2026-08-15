# TEN — key map

Generated from `index.html` by `tools/keymap.py`. Do not hand-edit —
regenerate it. A key table that is written by hand is wrong within a week.

193 bindings across 38 keys.

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
| `KeyB` | ⌘ + ⌃ | 9182 |  |
| `KeyB` | ⌃ | 16126 | tap tempo, on repeated taps |
| `KeyC` | ⌘ | 9251 | copy out of what you are looking at |
| `KeyC` | — | 15577 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | — | 15579 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | ⌃ | 16119 | ⌃c — this channel's patch, as JSON, on the clipboard |
| `KeyC` | hold c + hold v | 17316 |  |
| `KeyC` | hold c | 17482 | vel  |
| `KeyE` | — | 15570 | cmd+↑↓ = per-note prep tweak |
| `KeyI` | — | 15573 | cmd+↑↓ = per-note prep tweak |
| `KeyK` | ⌘ + ⌥ + ⇧ + layer 1+ | 15282 | ◎ source →  |
| `KeyL` | ⌘ | 15271 |  |
| `KeyM` | hold q + ⌥ + ⇧ + dest browser + set picker + layer 2+ | 15926 | nothing to modulate here |
| `KeyM` | hold q + ⌃ | 16115 | click  |
| `KeyM` | hold q + hold n + hold m | 17315 |  |
| `KeyM` | hold m | 17548 | the digit is no longer held |
| `KeyN` | ⌘ | 15265 | start a new set? enter confirms · esc cancels |
| `KeyN` | hold digit + ⌥ | 16845 |  |
| `KeyN` | hold q + hold n + hold m | 17315 |  |
| `KeyN` | hold n | 17486 | vel  |
| `KeyO` | ⌃ | 16121 | ⌃o — how recording meets what is there |
| `KeyP` | ⌘ + ⌃ + ⌥ + ⇧ + layer 1+ | 15296 | the way out is the key you came in on |
| `KeyQ` | hold q + ⌃ + layer 1+ | 16170 | Q — tap toggles live quantize · s snaps recorded notes · digits set the grid |
| `KeyQ` | hold q + ⌃ | 16177 | ⌃q = live-quantize toggle, everywhere |
| `KeyQ` | hold q + hold n + hold m | 17315 |  |
| `KeyQ` | hold q | 17542 | live quantize  |
| `KeyS` | ⌘ | 15258 | straight back to where it lives |
| `KeyS` | hold q + ⌃ | 16142 | …unless the q scope is open: q+s = snap |
| `KeyS` | hold q + layer 1+ | 16151 |  |
| `KeyS` | hold c + hold v | 17316 |  |
| `KeyS` | — | 17541 | live quantize  |
| `KeyT` | layer 0 | 16135 | t = timeline on/off (focus mode) |
| `KeyV` | — | 15577 | MOD learn: arm on a mod slot, map on a target param |
| `KeyV` | hold digit + ⌥ | 16849 |  |
| `KeyV` | hold c + hold v | 17316 |  |
| `KeyV` | hold v | 17487 | vel  |
| `KeyX` | — | 15577 | MOD learn: arm on a mod slot, map on a target param |
| `KeyX` | — | 15579 | MOD learn: arm on a mod slot, map on a target param |
| `KeyZ` | ⇧ | 15574 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 3244 | OFFSET the content — vertical, like the grid |
| `ArrowDown` | — | 15206 | destination cleared |
| `ArrowDown` | dest browser + set picker | 15208 | destination cleared |
| `ArrowDown` | — | 15497 |  |
| `ArrowDown` | — | 15533 | down = finer, the way the list reads |
| `ArrowDown` | — | 15534 | down = finer, the way the list reads |
| `ArrowDown` | — | 15575 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 15649 | the way in is the way out |
| `ArrowDown` | — | 15673 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowDown` | — | 16444 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16447 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16534 | bpm  |
| `ArrowDown` | ⇧ | 16552 |  |
| `ArrowDown` | — | 16703 | master — ←→ picks a channel, 0 stays here |
| `ArrowLeft` | — | 3268 | UNIT SIZE — horizontal |
| `ArrowLeft` | — | 9189 |  |
| `ArrowLeft` | — | 9200 | no backups yet |
| `ArrowLeft` | — | 9267 | inside the set: pick a channel |
| `ArrowLeft` | — | 15203 | destination cleared |
| `ArrowLeft` | — | 15502 |  |
| `ArrowLeft` | — | 15537 | ⌥a+⌫ = take it out for good |
| `ArrowLeft` | layer -1 | 15648 | the way in is the way out |
| `ArrowLeft` | — | 15653 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowLeft` | — | 16444 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowLeft` | — | 16580 |  |
| `ArrowRight` | — | 3268 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 3269 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 9189 |  |
| `ArrowRight` | set picker | 9190 |  |
| `ArrowRight` | — | 9200 | no backups yet |
| `ArrowRight` | set picker | 9201 | no backups yet |
| `ArrowRight` | — | 9267 | inside the set: pick a channel |
| `ArrowRight` | — | 9268 | inside the set: pick a channel |
| `ArrowRight` | — | 15203 | destination cleared |
| `ArrowRight` | dest browser + set picker | 15204 | destination cleared |
| `ArrowRight` | — | 15502 |  |
| `ArrowRight` | hold ⌥rack | 15504 | - = walk the rate |
| `ArrowRight` | — | 15537 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | — | 15538 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | layer -1 | 15648 | the way in is the way out |
| `ArrowRight` | — | 15653 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15654 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 16444 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16447 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16580 |  |
| `ArrowRight` | — | 16581 |  |
| `ArrowUp` | — | 3244 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 3245 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 15206 | destination cleared |
| `ArrowUp` | — | 15497 |  |
| `ArrowUp` | hold ⌥rack | 15499 |  |
| `ArrowUp` | — | 15533 | down = finer, the way the list reads |
| `ArrowUp` | — | 15575 | cmd+↑↓ = per-note prep tweak |
| `ArrowUp` | ⌥ + ⇧ + layer 2+ | 15576 | MOD learn: arm on a mod slot, map on a target param |
| `ArrowUp` | — | 15649 | the way in is the way out |
| `ArrowUp` | — | 15673 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15684 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 16444 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16447 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16447 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16534 | bpm  |
| `ArrowUp` | ⌘ + ⌥ | 16537 | bpm  |
| `ArrowUp` | ⇧ | 16552 |  |
| `ArrowUp` | — | 16556 | crop  |
| `ArrowUp` | — | 16703 | master — ←→ picks a channel, 0 stays here |
| `ArrowUp` | — | 16704 | master — ←→ picks a channel, 0 stays here |
| `Backquote` | ⌘ + ⌥ + dest browser + set picker | 16014 | caps shows the modcap first |
| `Backslash` | ⌘ + ⌥ | 16076 | DJ pads: full home row |
| `Backslash` | hold ` | 17491 | what the dice are for |
| `Backspace` | — | 3279 | ⟲ loop length cleared |
| `Backspace` | — | 3287 | nothing recorded to restore  (⇧⌫ clears the loop length) |
| `Backspace` | ⇧ | 9239 | slot  |
| `Backspace` | — | 15210 | destination cleared |
| `Backspace` | hold ⌥rack | 15483 |  |
| `Backspace` | hold ⌥rack | 15546 | ⌥a+⌫ = take it out for good |
| `Backspace` | — | 15832 | cue  |
| `Backspace` | — | 15844 | cue  |
| `Backspace` | hold n + hold digit | 16183 |  |
| `Backspace` | hold c | 16188 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab + ⇧ | 16198 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab | 16205 |  |
| `Backspace` | hold tab + hold digit + layer 2+ | 16214 | nothing loaded |
| `Backspace` | — | 16229 | no automation on  |
| `Backspace` | — | 17622 |  |
| `BracketLeft` | — | 15622 |  |
| `BracketLeft` | ⌘ + dest browser + set picker | 15887 |  |
| `BracketLeft` | — | 15889 |  |
| `BracketLeft` | — | 17550 | the digit is no longer held |
| `BracketRight` | — | 15621 |  |
| `BracketRight` | — | 15622 |  |
| `BracketRight` | ⌘ + dest browser + set picker | 15887 |  |
| `BracketRight` | — | 15903 | the pan keys dial too |
| `BracketRight` | — | 17551 | the digit is no longer held |
| `CapsLock` | — | 16058 | the state is read, not toggled |
| `Comma` | — | 15520 | , . = octaves |
| `Comma` | ⌘ + ⌥ | 16097 | keyboard vel  |
| `Comma` | — | 16101 | octave centred |
| `Comma` | — | 17552 | the digit is no longer held |
| `Enter` | — | 9192 |  |
| `Enter` | — | 9205 | no backups yet |
| `Enter` | — | 9274 | this empties all  |
| `Enter` | — | 15215 |  |
| `Enter` | layer -1 | 15648 | the way in is the way out |
| `Enter` | — | 15652 | the way in is the way out |
| `Enter` | — | 16033 |  |
| `Enter` | layer -1 | 17436 | macOS reports caps going OFF on the keyup |
| `Equal` | — | 15516 | - = walk the rate |
| `Equal` | — | 15517 | , . = octaves |
| `Equal` | hold tab + ⌘ + ⌃ | 15785 |  |
| `Equal` | ⌘ + layer 2+ | 15802 |  |
| `Equal` | — | 15804 |  |
| `Equal` | ⌘ + ⌃ + ⌥ + layer 2+ | 15815 |  |
| `Equal` | — | 15818 |  |
| `Equal` | — | 15832 | cue  |
| `Equal` | — | 15837 | cue  |
| `Equal` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15863 |  |
| `Equal` | ⇧ | 15865 |  |
| `Escape` | — | 9179 | cancelled |
| `Escape` | dest browser + set picker | 15202 | destination cleared |
| `Escape` | — | 15636 |  |
| `Escape` | layer -1 | 15648 | the way in is the way out |
| `Escape` | — | 15651 | the way in is the way out |
| `Escape` | — | 16034 |  |
| `Escape` | layer -1 | 17436 | macOS reports caps going OFF on the keyup |
| `Escape` | — | 17568 | ⟳ mic latched — esc again turns it off |
| `F1` | — | 15636 |  |
| `Minus` | — | 15516 | - = walk the rate |
| `Minus` | hold tab + ⌘ + ⌃ | 15785 |  |
| `Minus` | — | 15789 |  |
| `Minus` | ⌘ + layer 2+ | 15802 |  |
| `Minus` | ⌘ + ⌃ + ⌥ + layer 2+ | 15815 |  |
| `Minus` | — | 15832 | cue  |
| `Minus` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15863 |  |
| `Period` | — | 15520 | , . = octaves |
| `Period` | — | 15521 | there is no zeroth octave |
| `Period` | — | 15621 |  |
| `Period` | ⌘ + ⌥ | 16097 | keyboard vel  |
| `Period` | — | 16098 | keyboard vel  |
| `Period` | — | 17553 | the digit is no longer held |
| `Quote` | — | 15621 |  |
| `Quote` | — | 15623 |  |
| `Semicolon` | — | 15623 |  |
| `Slash` | set picker | 9220 | slot  |
| `Slash` | ⌘ + ⌃ + ⌥ + layer 2+ | 15328 |  |
| `Slash` | — | 15649 | the way in is the way out |
| `Slash` | — | 15686 | the dice key: a whole song (⇧⌥ = wild) |
| `Slash` | ⌥ | 16078 | DJ pads: full home row |
| `Slash` | layer -1 | 17436 | macOS reports caps going OFF on the keyup |
| `Slash` | hold / | 17493 | what the dice are for |
| `Space` | — | 9250 | copy out of what you are looking at |
| `Space` | — | 15702 | rec unlatched |
| `Tab` | — | 15703 | rec unlatched |
| `Tab` | — | 17641 | latch overlapped the hold: rec stays on |
| `Tab` | — | 17672 | the hold ended and nothing latched it: rec off |
