# TEN — key map

Generated from `index.html` by `tools/keymap.py`. Do not hand-edit —
regenerate it. A key table that is written by hand is wrong within a week.

204 bindings across 41 keys.

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
| `KeyB` | ⌘ + ⌃ | 9091 |  |
| `KeyB` | ⌃ | 15950 | tap tempo, on repeated taps |
| `KeyC` | ⌘ | 9160 | copy out of what you are looking at |
| `KeyC` | — | 15429 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | — | 15431 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | ⌃ | 15943 | ⌃c — this channel's patch, as JSON, on the clipboard |
| `KeyC` | hold c + hold v | 17134 |  |
| `KeyC` | hold c | 17300 | vel  |
| `KeyE` | — | 15422 | cmd+↑↓ = per-note prep tweak |
| `KeyI` | — | 15425 | cmd+↑↓ = per-note prep tweak |
| `KeyK` | ⌘ + ⌥ + ⇧ + layer 1+ | 15149 | ◎ source →  |
| `KeyL` | ⌘ | 15138 |  |
| `KeyM` | hold q + ⌥ + ⇧ + dest browser + set picker + layer 2+ | 15752 | nothing to modulate here |
| `KeyM` | hold q + ⌃ | 15939 | click  |
| `KeyM` | hold q + hold n + hold m | 17133 |  |
| `KeyM` | hold m | 17366 | the digit is no longer held |
| `KeyN` | ⌘ | 15132 | start a new set? enter confirms · esc cancels |
| `KeyN` | hold digit + ⌥ | 16669 |  |
| `KeyN` | hold q + hold n + hold m | 17133 |  |
| `KeyN` | hold n | 17304 | vel  |
| `KeyO` | ⌃ | 15945 | ⌃o — how recording meets what is there |
| `KeyP` | ⌘ + ⌃ + ⌥ + ⇧ + layer 1+ | 15163 | the way out is the key you came in on |
| `KeyQ` | hold q + ⌃ + layer 1+ | 15994 | Q — tap toggles live quantize · s snaps recorded notes · digits set the grid |
| `KeyQ` | hold q + ⌃ | 16001 | ⌃q = live-quantize toggle, everywhere |
| `KeyQ` | hold q + hold n + hold m | 17133 |  |
| `KeyQ` | hold q | 17360 | live quantize  |
| `KeyS` | ⌘ | 15125 | straight back to where it lives |
| `KeyS` | hold q + ⌃ | 15966 | …unless the q scope is open: q+s = snap |
| `KeyS` | hold q + layer 1+ | 15975 |  |
| `KeyS` | hold c + hold v | 17134 |  |
| `KeyS` | — | 17359 | live quantize  |
| `KeyT` | layer 0 | 15959 | t = timeline on/off (focus mode) |
| `KeyV` | — | 15429 | MOD learn: arm on a mod slot, map on a target param |
| `KeyV` | hold digit + ⌥ | 16673 |  |
| `KeyV` | hold c + hold v | 17134 |  |
| `KeyV` | hold v | 17305 | vel  |
| `KeyX` | — | 15429 | MOD learn: arm on a mod slot, map on a target param |
| `KeyX` | — | 15431 | MOD learn: arm on a mod slot, map on a target param |
| `KeyZ` | ⇧ | 15426 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 3153 | OFFSET the content — vertical, like the grid |
| `ArrowDown` | — | 15081 | destination cleared |
| `ArrowDown` | dest browser + set picker | 15083 | destination cleared |
| `ArrowDown` | — | 15349 |  |
| `ArrowDown` | — | 15385 | down = finer, the way the list reads |
| `ArrowDown` | — | 15386 | down = finer, the way the list reads |
| `ArrowDown` | — | 15427 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 15475 | the way in is the way out |
| `ArrowDown` | — | 15499 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowDown` | — | 16268 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16271 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16358 | bpm  |
| `ArrowDown` | ⇧ | 16376 |  |
| `ArrowDown` | — | 16527 | master — ←→ picks a channel, 0 stays here |
| `ArrowLeft` | — | 3177 | UNIT SIZE — horizontal |
| `ArrowLeft` | — | 9098 |  |
| `ArrowLeft` | — | 9109 | no backups yet |
| `ArrowLeft` | — | 9176 | inside the set: pick a channel |
| `ArrowLeft` | — | 15078 | destination cleared |
| `ArrowLeft` | — | 15354 |  |
| `ArrowLeft` | — | 15389 | ⌥a+⌫ = take it out for good |
| `ArrowLeft` | layer -1 | 15474 | the way in is the way out |
| `ArrowLeft` | — | 15479 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowLeft` | — | 16268 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowLeft` | — | 16404 |  |
| `ArrowRight` | — | 3177 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 3178 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 9098 |  |
| `ArrowRight` | set picker | 9099 |  |
| `ArrowRight` | — | 9109 | no backups yet |
| `ArrowRight` | set picker | 9110 | no backups yet |
| `ArrowRight` | — | 9176 | inside the set: pick a channel |
| `ArrowRight` | — | 9177 | inside the set: pick a channel |
| `ArrowRight` | — | 15078 | destination cleared |
| `ArrowRight` | dest browser + set picker | 15079 | destination cleared |
| `ArrowRight` | — | 15354 |  |
| `ArrowRight` | hold ⌥rack | 15356 | - = walk the rate |
| `ArrowRight` | — | 15389 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | — | 15390 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | layer -1 | 15474 | the way in is the way out |
| `ArrowRight` | — | 15479 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15480 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 16268 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16271 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16404 |  |
| `ArrowRight` | — | 16405 |  |
| `ArrowUp` | — | 3153 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 3154 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 15081 | destination cleared |
| `ArrowUp` | — | 15349 |  |
| `ArrowUp` | hold ⌥rack | 15351 |  |
| `ArrowUp` | — | 15385 | down = finer, the way the list reads |
| `ArrowUp` | — | 15427 | cmd+↑↓ = per-note prep tweak |
| `ArrowUp` | ⌥ + ⇧ + layer 2+ | 15428 | MOD learn: arm on a mod slot, map on a target param |
| `ArrowUp` | — | 15475 | the way in is the way out |
| `ArrowUp` | — | 15499 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15510 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 16268 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16271 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16271 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16358 | bpm  |
| `ArrowUp` | ⌘ + ⌥ | 16361 | bpm  |
| `ArrowUp` | ⇧ | 16376 |  |
| `ArrowUp` | — | 16380 | crop  |
| `ArrowUp` | — | 16527 | master — ←→ picks a channel, 0 stays here |
| `ArrowUp` | — | 16528 | master — ←→ picks a channel, 0 stays here |
| `Backquote` | ⌘ + ⌥ + dest browser + set picker | 15840 | caps shows the modcap first |
| `Backslash` | — | 15899 | DJ pads: full home row |
| `Backslash` | hold ` | 17309 | what the dice are for |
| `Backspace` | — | 3188 | ⟲ loop length cleared |
| `Backspace` | — | 3196 | nothing recorded to restore  (⇧⌫ clears the loop length) |
| `Backspace` | ⇧ | 9148 | slot  |
| `Backspace` | — | 15085 | destination cleared |
| `Backspace` | hold ⌥rack | 15335 |  |
| `Backspace` | hold ⌥rack | 15398 | ⌥a+⌫ = take it out for good |
| `Backspace` | — | 15658 | cue  |
| `Backspace` | — | 15670 | cue  |
| `Backspace` | hold n + hold digit | 16007 |  |
| `Backspace` | hold c | 16012 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab + ⇧ | 16022 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab | 16029 |  |
| `Backspace` | hold tab + hold digit + layer 2+ | 16038 | nothing loaded |
| `Backspace` | — | 16053 | no automation on  |
| `Backspace` | — | 17423 |  |
| `BracketLeft` | — | 15330 |  |
| `BracketLeft` | — | 15448 |  |
| `BracketLeft` | ⌘ + dest browser + set picker | 15713 |  |
| `BracketLeft` | — | 15715 |  |
| `BracketLeft` | — | 17368 | the digit is no longer held |
| `BracketRight` | — | 15330 |  |
| `BracketRight` | hold ⌥rack | 15332 |  |
| `BracketRight` | — | 15447 |  |
| `BracketRight` | — | 15448 |  |
| `BracketRight` | ⌘ + dest browser + set picker | 15713 |  |
| `BracketRight` | — | 15729 | the pan keys dial too |
| `BracketRight` | — | 17369 | the digit is no longer held |
| `CapsLock` | — | 15881 | the state is read, not toggled |
| `Comma` | — | 15372 | , . = octaves |
| `Comma` | ⌘ + ⌥ | 15921 | keyboard vel  |
| `Comma` | — | 15925 | octave centred |
| `Comma` | — | 17370 | the digit is no longer held |
| `Enter` | — | 9101 |  |
| `Enter` | — | 9114 | no backups yet |
| `Enter` | — | 9183 | this empties all  |
| `Enter` | — | 15090 |  |
| `Enter` | layer -1 | 15474 | the way in is the way out |
| `Enter` | — | 15478 | the way in is the way out |
| `Enter` | — | 15859 | instrument scope closed |
| `Enter` | layer -1 | 17254 | macOS reports caps going OFF on the keyup |
| `Equal` | — | 15320 |  |
| `Equal` | hold ⌥rack | 15322 |  |
| `Equal` | — | 15368 | - = walk the rate |
| `Equal` | — | 15369 | , . = octaves |
| `Equal` | hold tab + ⌘ + ⌃ | 15611 |  |
| `Equal` | ⌘ + layer 2+ | 15628 |  |
| `Equal` | — | 15630 |  |
| `Equal` | ⌘ + ⌃ + ⌥ + layer 2+ | 15641 |  |
| `Equal` | — | 15644 |  |
| `Equal` | — | 15658 | cue  |
| `Equal` | — | 15663 | cue  |
| `Equal` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15689 |  |
| `Equal` | ⇧ | 15691 |  |
| `Escape` | — | 9088 | cancelled |
| `Escape` | dest browser + set picker | 15077 | destination cleared |
| `Escape` | — | 15462 |  |
| `Escape` | layer -1 | 15474 | the way in is the way out |
| `Escape` | — | 15477 | the way in is the way out |
| `Escape` | — | 15860 | instrument scope closed |
| `Escape` | layer -1 | 17254 | macOS reports caps going OFF on the keyup |
| `F1` | — | 15462 |  |
| `Insert` | — | 15899 | DJ pads: full home row |
| `Insert` | hold ` | 17309 | what the dice are for |
| `Minus` | — | 15320 |  |
| `Minus` | — | 15368 | - = walk the rate |
| `Minus` | hold tab + ⌘ + ⌃ | 15611 |  |
| `Minus` | — | 15615 |  |
| `Minus` | ⌘ + layer 2+ | 15628 |  |
| `Minus` | ⌘ + ⌃ + ⌥ + layer 2+ | 15641 |  |
| `Minus` | — | 15658 | cue  |
| `Minus` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15689 |  |
| `Pause` | — | 15899 | DJ pads: full home row |
| `Pause` | hold ` | 17309 | what the dice are for |
| `Period` | — | 15372 | , . = octaves |
| `Period` | — | 15373 | there is no zeroth octave |
| `Period` | — | 15447 |  |
| `Period` | ⌘ + ⌥ | 15921 | keyboard vel  |
| `Period` | — | 15922 | keyboard vel  |
| `Period` | — | 17371 | the digit is no longer held |
| `Quote` | — | 15447 |  |
| `Quote` | — | 15449 |  |
| `ScrollLock` | — | 15899 | DJ pads: full home row |
| `ScrollLock` | hold ` | 17309 | what the dice are for |
| `Semicolon` | — | 15449 |  |
| `Slash` | set picker | 9129 | slot  |
| `Slash` | ⌘ + ⌃ + ⌥ + layer 2+ | 15195 |  |
| `Slash` | — | 15475 | the way in is the way out |
| `Slash` | — | 15512 | the dice key: a whole song (⇧⌥ = wild) |
| `Slash` | ⌥ | 15902 | DJ pads: full home row |
| `Slash` | layer -1 | 17254 | macOS reports caps going OFF on the keyup |
| `Slash` | hold / | 17311 | what the dice are for |
| `Space` | — | 9159 | copy out of what you are looking at |
| `Space` | — | 15528 | rec unlatched |
| `Tab` | — | 15529 | rec unlatched |
| `Tab` | — | 17440 | latch overlapped the hold: rec stays on |
| `Tab` | — | 17471 | the hold ended and nothing latched it: rec off |
