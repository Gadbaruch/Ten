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
| `KeyB` | ⌘ + ⌃ | 9179 |  |
| `KeyB` | ⌃ | 16116 | tap tempo, on repeated taps |
| `KeyC` | ⌘ | 9248 | copy out of what you are looking at |
| `KeyC` | — | 15567 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | — | 15569 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | ⌃ | 16109 | ⌃c — this channel's patch, as JSON, on the clipboard |
| `KeyC` | hold c + hold v | 17300 |  |
| `KeyC` | hold c | 17466 | vel  |
| `KeyE` | — | 15560 | cmd+↑↓ = per-note prep tweak |
| `KeyI` | — | 15563 | cmd+↑↓ = per-note prep tweak |
| `KeyK` | ⌘ + ⌥ + ⇧ + layer 1+ | 15272 | ◎ source →  |
| `KeyL` | ⌘ | 15261 |  |
| `KeyM` | hold q + ⌥ + ⇧ + dest browser + set picker + layer 2+ | 15916 | nothing to modulate here |
| `KeyM` | hold q + ⌃ | 16105 | click  |
| `KeyM` | hold q + hold n + hold m | 17299 |  |
| `KeyM` | hold m | 17532 | the digit is no longer held |
| `KeyN` | ⌘ | 15255 | start a new set? enter confirms · esc cancels |
| `KeyN` | hold digit + ⌥ | 16835 |  |
| `KeyN` | hold q + hold n + hold m | 17299 |  |
| `KeyN` | hold n | 17470 | vel  |
| `KeyO` | ⌃ | 16111 | ⌃o — how recording meets what is there |
| `KeyP` | ⌘ + ⌃ + ⌥ + ⇧ + layer 1+ | 15286 | the way out is the key you came in on |
| `KeyQ` | hold q + ⌃ + layer 1+ | 16160 | Q — tap toggles live quantize · s snaps recorded notes · digits set the grid |
| `KeyQ` | hold q + ⌃ | 16167 | ⌃q = live-quantize toggle, everywhere |
| `KeyQ` | hold q + hold n + hold m | 17299 |  |
| `KeyQ` | hold q | 17526 | live quantize  |
| `KeyS` | ⌘ | 15248 | straight back to where it lives |
| `KeyS` | hold q + ⌃ | 16132 | …unless the q scope is open: q+s = snap |
| `KeyS` | hold q + layer 1+ | 16141 |  |
| `KeyS` | hold c + hold v | 17300 |  |
| `KeyS` | — | 17525 | live quantize  |
| `KeyT` | layer 0 | 16125 | t = timeline on/off (focus mode) |
| `KeyV` | — | 15567 | MOD learn: arm on a mod slot, map on a target param |
| `KeyV` | hold digit + ⌥ | 16839 |  |
| `KeyV` | hold c + hold v | 17300 |  |
| `KeyV` | hold v | 17471 | vel  |
| `KeyX` | — | 15567 | MOD learn: arm on a mod slot, map on a target param |
| `KeyX` | — | 15569 | MOD learn: arm on a mod slot, map on a target param |
| `KeyZ` | ⇧ | 15564 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 3241 | OFFSET the content — vertical, like the grid |
| `ArrowDown` | — | 15197 | destination cleared |
| `ArrowDown` | dest browser + set picker | 15199 | destination cleared |
| `ArrowDown` | — | 15487 |  |
| `ArrowDown` | — | 15523 | down = finer, the way the list reads |
| `ArrowDown` | — | 15524 | down = finer, the way the list reads |
| `ArrowDown` | — | 15565 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 15639 | the way in is the way out |
| `ArrowDown` | — | 15663 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowDown` | — | 16434 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16437 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16524 | bpm  |
| `ArrowDown` | ⇧ | 16542 |  |
| `ArrowDown` | — | 16693 | master — ←→ picks a channel, 0 stays here |
| `ArrowLeft` | — | 3265 | UNIT SIZE — horizontal |
| `ArrowLeft` | — | 9186 |  |
| `ArrowLeft` | — | 9197 | no backups yet |
| `ArrowLeft` | — | 9264 | inside the set: pick a channel |
| `ArrowLeft` | — | 15194 | destination cleared |
| `ArrowLeft` | — | 15492 |  |
| `ArrowLeft` | — | 15527 | ⌥a+⌫ = take it out for good |
| `ArrowLeft` | layer -1 | 15638 | the way in is the way out |
| `ArrowLeft` | — | 15643 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowLeft` | — | 16434 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowLeft` | — | 16570 |  |
| `ArrowRight` | — | 3265 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 3266 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 9186 |  |
| `ArrowRight` | set picker | 9187 |  |
| `ArrowRight` | — | 9197 | no backups yet |
| `ArrowRight` | set picker | 9198 | no backups yet |
| `ArrowRight` | — | 9264 | inside the set: pick a channel |
| `ArrowRight` | — | 9265 | inside the set: pick a channel |
| `ArrowRight` | — | 15194 | destination cleared |
| `ArrowRight` | dest browser + set picker | 15195 | destination cleared |
| `ArrowRight` | — | 15492 |  |
| `ArrowRight` | hold ⌥rack | 15494 | - = walk the rate |
| `ArrowRight` | — | 15527 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | — | 15528 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | layer -1 | 15638 | the way in is the way out |
| `ArrowRight` | — | 15643 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15644 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 16434 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16437 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16570 |  |
| `ArrowRight` | — | 16571 |  |
| `ArrowUp` | — | 3241 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 3242 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 15197 | destination cleared |
| `ArrowUp` | — | 15487 |  |
| `ArrowUp` | hold ⌥rack | 15489 |  |
| `ArrowUp` | — | 15523 | down = finer, the way the list reads |
| `ArrowUp` | — | 15565 | cmd+↑↓ = per-note prep tweak |
| `ArrowUp` | ⌥ + ⇧ + layer 2+ | 15566 | MOD learn: arm on a mod slot, map on a target param |
| `ArrowUp` | — | 15639 | the way in is the way out |
| `ArrowUp` | — | 15663 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15674 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 16434 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16437 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16437 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16524 | bpm  |
| `ArrowUp` | ⌘ + ⌥ | 16527 | bpm  |
| `ArrowUp` | ⇧ | 16542 |  |
| `ArrowUp` | — | 16546 | crop  |
| `ArrowUp` | — | 16693 | master — ←→ picks a channel, 0 stays here |
| `ArrowUp` | — | 16694 | master — ←→ picks a channel, 0 stays here |
| `Backquote` | ⌘ + ⌥ + dest browser + set picker | 16004 | caps shows the modcap first |
| `Backslash` | ⌘ + ⌥ | 16066 | DJ pads: full home row |
| `Backslash` | hold ` | 17475 | what the dice are for |
| `Backspace` | — | 3276 | ⟲ loop length cleared |
| `Backspace` | — | 3284 | nothing recorded to restore  (⇧⌫ clears the loop length) |
| `Backspace` | ⇧ | 9236 | slot  |
| `Backspace` | — | 15201 | destination cleared |
| `Backspace` | hold ⌥rack | 15473 |  |
| `Backspace` | hold ⌥rack | 15536 | ⌥a+⌫ = take it out for good |
| `Backspace` | — | 15822 | cue  |
| `Backspace` | — | 15834 | cue  |
| `Backspace` | hold n + hold digit | 16173 |  |
| `Backspace` | hold c | 16178 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab + ⇧ | 16188 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab | 16195 |  |
| `Backspace` | hold tab + hold digit + layer 2+ | 16204 | nothing loaded |
| `Backspace` | — | 16219 | no automation on  |
| `Backspace` | — | 17606 |  |
| `BracketLeft` | — | 15612 |  |
| `BracketLeft` | ⌘ + dest browser + set picker | 15877 |  |
| `BracketLeft` | — | 15879 |  |
| `BracketLeft` | — | 17534 | the digit is no longer held |
| `BracketRight` | — | 15611 |  |
| `BracketRight` | — | 15612 |  |
| `BracketRight` | ⌘ + dest browser + set picker | 15877 |  |
| `BracketRight` | — | 15893 | the pan keys dial too |
| `BracketRight` | — | 17535 | the digit is no longer held |
| `CapsLock` | — | 16048 | the state is read, not toggled |
| `Comma` | — | 15510 | , . = octaves |
| `Comma` | ⌘ + ⌥ | 16087 | keyboard vel  |
| `Comma` | — | 16091 | octave centred |
| `Comma` | — | 17536 | the digit is no longer held |
| `Enter` | — | 9189 |  |
| `Enter` | — | 9202 | no backups yet |
| `Enter` | — | 9271 | this empties all  |
| `Enter` | — | 15206 |  |
| `Enter` | layer -1 | 15638 | the way in is the way out |
| `Enter` | — | 15642 | the way in is the way out |
| `Enter` | — | 16023 |  |
| `Enter` | layer -1 | 17420 | macOS reports caps going OFF on the keyup |
| `Equal` | — | 15506 | - = walk the rate |
| `Equal` | — | 15507 | , . = octaves |
| `Equal` | hold tab + ⌘ + ⌃ | 15775 |  |
| `Equal` | ⌘ + layer 2+ | 15792 |  |
| `Equal` | — | 15794 |  |
| `Equal` | ⌘ + ⌃ + ⌥ + layer 2+ | 15805 |  |
| `Equal` | — | 15808 |  |
| `Equal` | — | 15822 | cue  |
| `Equal` | — | 15827 | cue  |
| `Equal` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15853 |  |
| `Equal` | ⇧ | 15855 |  |
| `Escape` | — | 9176 | cancelled |
| `Escape` | dest browser + set picker | 15193 | destination cleared |
| `Escape` | — | 15626 |  |
| `Escape` | layer -1 | 15638 | the way in is the way out |
| `Escape` | — | 15641 | the way in is the way out |
| `Escape` | — | 16024 |  |
| `Escape` | layer -1 | 17420 | macOS reports caps going OFF on the keyup |
| `Escape` | — | 17552 | ⟳ mic latched — esc again turns it off |
| `F1` | — | 15626 |  |
| `Minus` | — | 15506 | - = walk the rate |
| `Minus` | hold tab + ⌘ + ⌃ | 15775 |  |
| `Minus` | — | 15779 |  |
| `Minus` | ⌘ + layer 2+ | 15792 |  |
| `Minus` | ⌘ + ⌃ + ⌥ + layer 2+ | 15805 |  |
| `Minus` | — | 15822 | cue  |
| `Minus` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15853 |  |
| `Period` | — | 15510 | , . = octaves |
| `Period` | — | 15511 | there is no zeroth octave |
| `Period` | — | 15611 |  |
| `Period` | ⌘ + ⌥ | 16087 | keyboard vel  |
| `Period` | — | 16088 | keyboard vel  |
| `Period` | — | 17537 | the digit is no longer held |
| `Quote` | — | 15611 |  |
| `Quote` | — | 15613 |  |
| `Semicolon` | — | 15613 |  |
| `Slash` | set picker | 9217 | slot  |
| `Slash` | ⌘ + ⌃ + ⌥ + layer 2+ | 15318 |  |
| `Slash` | — | 15639 | the way in is the way out |
| `Slash` | — | 15676 | the dice key: a whole song (⇧⌥ = wild) |
| `Slash` | ⌥ | 16068 | DJ pads: full home row |
| `Slash` | layer -1 | 17420 | macOS reports caps going OFF on the keyup |
| `Slash` | hold / | 17477 | what the dice are for |
| `Space` | — | 9247 | copy out of what you are looking at |
| `Space` | — | 15692 | rec unlatched |
| `Tab` | — | 15693 | rec unlatched |
| `Tab` | — | 17625 | latch overlapped the hold: rec stays on |
| `Tab` | — | 17656 | the hold ended and nothing latched it: rec off |
