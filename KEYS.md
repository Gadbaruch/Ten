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
| `KeyB` | ⌘ + ⌃ | 9224 |  |
| `KeyB` | ⌃ | 16215 | tap tempo, on repeated taps |
| `KeyC` | ⌘ | 9293 | copy out of what you are looking at |
| `KeyC` | — | 15628 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | — | 15630 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | ⌃ + ⇧ | 16208 | ⌃o — how recording meets what is there |
| `KeyC` | hold c + hold v | 17411 |  |
| `KeyC` | hold c | 17577 | vel  |
| `KeyE` | — | 15621 | cmd+↑↓ = per-note prep tweak |
| `KeyI` | — | 15624 | cmd+↑↓ = per-note prep tweak |
| `KeyK` | ⌘ + ⌥ + ⇧ + layer 1+ | 15329 | ◎ source →  |
| `KeyL` | ⌘ | 15318 |  |
| `KeyM` | hold q + ⌥ + ⇧ + dest browser + set picker + layer 2+ | 15977 | nothing to modulate here |
| `KeyM` | hold q + ⌃ | 16201 | click  |
| `KeyM` | hold q + hold n + hold m | 17410 |  |
| `KeyM` | hold m | 17643 | the digit is no longer held |
| `KeyN` | ⌘ | 15312 | start a new set? enter confirms · esc cancels |
| `KeyN` | hold digit + ⌥ | 16940 |  |
| `KeyN` | hold q + hold n + hold m | 17410 |  |
| `KeyN` | hold n | 17581 | vel  |
| `KeyO` | ⌃ | 16210 | ⌃o — how recording meets what is there |
| `KeyP` | ⌘ + ⌃ + ⌥ + ⇧ + layer 1+ | 15343 | the way out is the key you came in on |
| `KeyQ` | hold q + ⌃ + layer 1+ | 16259 | Q — tap toggles live quantize · s snaps recorded notes · digits set the grid |
| `KeyQ` | hold q + ⌃ | 16266 | ⌃q = live-quantize toggle, everywhere |
| `KeyQ` | hold q + hold n + hold m | 17410 |  |
| `KeyQ` | hold q | 17637 | live quantize  |
| `KeyS` | ⌘ | 15305 | straight back to where it lives |
| `KeyS` | hold q + ⌃ | 16231 | …unless the q scope is open: q+s = snap |
| `KeyS` | hold q + layer 1+ | 16240 |  |
| `KeyS` | hold c + hold v | 17411 |  |
| `KeyS` | — | 17636 | live quantize  |
| `KeyT` | layer 0 | 16224 | t = timeline on/off (focus mode) |
| `KeyV` | — | 15628 | MOD learn: arm on a mod slot, map on a target param |
| `KeyV` | hold digit + ⌥ | 16944 |  |
| `KeyV` | hold c + hold v | 17411 |  |
| `KeyV` | hold v | 17582 | vel  |
| `KeyX` | — | 15628 | MOD learn: arm on a mod slot, map on a target param |
| `KeyX` | — | 15630 | MOD learn: arm on a mod slot, map on a target param |
| `KeyZ` | ⇧ | 15625 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 3301 | OFFSET the content — vertical, like the grid |
| `ArrowDown` | — | 15253 | destination cleared |
| `ArrowDown` | dest browser + set picker | 15255 | destination cleared |
| `ArrowDown` | — | 15548 |  |
| `ArrowDown` | — | 15584 | down = finer, the way the list reads |
| `ArrowDown` | — | 15585 | down = finer, the way the list reads |
| `ArrowDown` | — | 15626 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 15700 | the way in is the way out |
| `ArrowDown` | — | 15724 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowDown` | — | 16539 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16542 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16629 | bpm  |
| `ArrowDown` | ⇧ | 16647 |  |
| `ArrowDown` | — | 16798 | master — ←→ picks a channel, 0 stays here |
| `ArrowLeft` | — | 3325 | UNIT SIZE — horizontal |
| `ArrowLeft` | — | 9231 |  |
| `ArrowLeft` | — | 9242 | no backups yet |
| `ArrowLeft` | — | 9309 | inside the set: pick a channel |
| `ArrowLeft` | — | 15250 | destination cleared |
| `ArrowLeft` | — | 15553 |  |
| `ArrowLeft` | — | 15588 | ⌥a+⌫ = take it out for good |
| `ArrowLeft` | layer -1 | 15699 | the way in is the way out |
| `ArrowLeft` | — | 15704 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowLeft` | — | 16539 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowLeft` | — | 16675 |  |
| `ArrowRight` | — | 3325 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 3326 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 9231 |  |
| `ArrowRight` | set picker | 9232 |  |
| `ArrowRight` | — | 9242 | no backups yet |
| `ArrowRight` | set picker | 9243 | no backups yet |
| `ArrowRight` | — | 9309 | inside the set: pick a channel |
| `ArrowRight` | — | 9310 | inside the set: pick a channel |
| `ArrowRight` | — | 15250 | destination cleared |
| `ArrowRight` | dest browser + set picker | 15251 | destination cleared |
| `ArrowRight` | — | 15553 |  |
| `ArrowRight` | hold ⌥rack | 15555 | - = walk the rate |
| `ArrowRight` | — | 15588 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | — | 15589 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | layer -1 | 15699 | the way in is the way out |
| `ArrowRight` | — | 15704 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15705 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 16539 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16542 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16675 |  |
| `ArrowRight` | — | 16676 |  |
| `ArrowUp` | — | 3301 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 3302 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 15253 | destination cleared |
| `ArrowUp` | — | 15548 |  |
| `ArrowUp` | hold ⌥rack | 15550 |  |
| `ArrowUp` | — | 15584 | down = finer, the way the list reads |
| `ArrowUp` | — | 15626 | cmd+↑↓ = per-note prep tweak |
| `ArrowUp` | ⌥ + ⇧ + layer 2+ | 15627 | MOD learn: arm on a mod slot, map on a target param |
| `ArrowUp` | — | 15700 | the way in is the way out |
| `ArrowUp` | — | 15724 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15735 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 16539 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16542 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16542 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16629 | bpm  |
| `ArrowUp` | ⌘ + ⌥ | 16632 | bpm  |
| `ArrowUp` | ⇧ | 16647 |  |
| `ArrowUp` | — | 16651 | crop  |
| `ArrowUp` | — | 16798 | master — ←→ picks a channel, 0 stays here |
| `ArrowUp` | — | 16799 | master — ←→ picks a channel, 0 stays here |
| `Backquote` | ⌘ + ⌥ + dest browser + set picker | 16065 | caps shows the modcap first |
| `Backslash` | ⌘ + ⌥ | 16127 | DJ pads: full home row |
| `Backslash` | hold ` | 17586 | what the dice are for |
| `Backspace` | — | 3336 | ⟲ loop length cleared |
| `Backspace` | — | 3344 | nothing recorded to restore  (⇧⌫ clears the loop length) |
| `Backspace` | ⇧ | 9281 | slot  |
| `Backspace` | — | 15257 | destination cleared |
| `Backspace` | hold ⌥rack | 15534 |  |
| `Backspace` | hold ⌥rack | 15597 | ⌥a+⌫ = take it out for good |
| `Backspace` | — | 15883 | cue  |
| `Backspace` | — | 15895 | cue  |
| `Backspace` | hold n + hold digit | 16272 |  |
| `Backspace` | hold c | 16277 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab + ⇧ | 16287 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab | 16294 |  |
| `Backspace` | hold tab + hold digit + layer 2+ | 16303 | nothing loaded |
| `Backspace` | — | 16318 | no automation on  |
| `Backspace` | — | 17717 |  |
| `BracketLeft` | — | 15673 |  |
| `BracketLeft` | ⌘ + dest browser + set picker | 15938 |  |
| `BracketLeft` | — | 15940 |  |
| `BracketLeft` | — | 17645 | the digit is no longer held |
| `BracketRight` | — | 15672 |  |
| `BracketRight` | — | 15673 |  |
| `BracketRight` | ⌘ + dest browser + set picker | 15938 |  |
| `BracketRight` | — | 15954 | the pan keys dial too |
| `BracketRight` | — | 17646 | the digit is no longer held |
| `CapsLock` | — | 16109 | the state is read, not toggled |
| `Comma` | — | 15571 | , . = octaves |
| `Comma` | ⌘ + ⌥ | 16148 | keyboard vel  |
| `Comma` | — | 16187 | octave centred |
| `Comma` | — | 17647 | the digit is no longer held |
| `Enter` | — | 9234 |  |
| `Enter` | — | 9247 | no backups yet |
| `Enter` | — | 9316 | this empties all  |
| `Enter` | — | 15262 |  |
| `Enter` | layer -1 | 15699 | the way in is the way out |
| `Enter` | — | 15703 | the way in is the way out |
| `Enter` | — | 16084 |  |
| `Enter` | layer -1 | 17531 | macOS reports caps going OFF on the keyup |
| `Equal` | — | 15567 | - = walk the rate |
| `Equal` | — | 15568 | , . = octaves |
| `Equal` | hold tab + ⌘ + ⌃ | 15836 |  |
| `Equal` | ⌘ + layer 2+ | 15853 |  |
| `Equal` | — | 15855 |  |
| `Equal` | ⌘ + ⌃ + ⌥ + layer 2+ | 15866 |  |
| `Equal` | — | 15869 |  |
| `Equal` | — | 15883 | cue  |
| `Equal` | — | 15888 | cue  |
| `Equal` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15914 |  |
| `Equal` | ⇧ | 15916 |  |
| `Escape` | — | 9221 | cancelled |
| `Escape` | dest browser + set picker | 15249 | destination cleared |
| `Escape` | — | 15687 |  |
| `Escape` | layer -1 | 15699 | the way in is the way out |
| `Escape` | — | 15702 | the way in is the way out |
| `Escape` | — | 16085 |  |
| `Escape` | layer -1 | 17531 | macOS reports caps going OFF on the keyup |
| `Escape` | — | 17663 | ⟳ mic latched — esc again turns it off |
| `F1` | — | 15687 |  |
| `Minus` | — | 15567 | - = walk the rate |
| `Minus` | hold tab + ⌘ + ⌃ | 15836 |  |
| `Minus` | — | 15840 |  |
| `Minus` | ⌘ + layer 2+ | 15853 |  |
| `Minus` | ⌘ + ⌃ + ⌥ + layer 2+ | 15866 |  |
| `Minus` | — | 15883 | cue  |
| `Minus` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15914 |  |
| `Period` | — | 15571 | , . = octaves |
| `Period` | — | 15572 | there is no zeroth octave |
| `Period` | — | 15672 |  |
| `Period` | ⌘ + ⌥ | 16148 | keyboard vel  |
| `Period` | — | 16149 | keyboard vel  |
| `Period` | — | 17648 | the digit is no longer held |
| `Quote` | — | 15672 |  |
| `Quote` | — | 15674 |  |
| `Semicolon` | — | 15674 |  |
| `Slash` | set picker | 9262 | slot  |
| `Slash` | ⌘ + ⌃ + ⌥ + layer 2+ | 15375 |  |
| `Slash` | — | 15700 | the way in is the way out |
| `Slash` | — | 15737 | the dice key: a whole song (⇧⌥ = wild) |
| `Slash` | ⌥ | 16129 | DJ pads: full home row |
| `Slash` | layer -1 | 17531 | macOS reports caps going OFF on the keyup |
| `Slash` | hold / | 17588 | what the dice are for |
| `Space` | — | 9292 | copy out of what you are looking at |
| `Space` | — | 15753 | rec unlatched |
| `Tab` | — | 15754 | rec unlatched |
| `Tab` | — | 17736 | latch overlapped the hold: rec stays on |
| `Tab` | — | 17767 | the hold ended and nothing latched it: rec off |
