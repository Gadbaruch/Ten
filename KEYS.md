# TEN — key map

Generated from `index.html` by `tools/keymap.py`. Do not hand-edit —
regenerate it. A key table that is written by hand is wrong within a week.

200 bindings across 41 keys.

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
| `KeyB` | ⌘ + ⌃ | 9083 |  |
| `KeyB` | ⌃ | 15914 | tap tempo, on repeated taps |
| `KeyC` | ⌘ | 9152 | copy out of what you are looking at |
| `KeyC` | — | 15388 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | — | 15390 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | ⌃ | 15907 | ⌃c — this channel's patch, as JSON, on the clipboard |
| `KeyC` | hold c + hold v | 17098 |  |
| `KeyC` | hold c | 17264 | vel  |
| `KeyE` | — | 15381 | cmd+↑↓ = per-note prep tweak |
| `KeyI` | — | 15384 | cmd+↑↓ = per-note prep tweak |
| `KeyK` | ⌘ + ⌥ + ⇧ + layer 1+ | 15118 | ◎ source →  |
| `KeyL` | ⌘ | 15107 |  |
| `KeyM` | hold q + ⌥ + ⇧ + dest browser + set picker + layer 2+ | 15711 | nothing to modulate here |
| `KeyM` | hold q + ⌃ | 15903 | click  |
| `KeyM` | hold q + hold n + hold m | 17097 |  |
| `KeyM` | hold m | 17330 | the digit is no longer held |
| `KeyN` | ⌘ | 15101 | start a new set? enter confirms · esc cancels |
| `KeyN` | hold digit + ⌥ | 16633 |  |
| `KeyN` | hold q + hold n + hold m | 17097 |  |
| `KeyN` | hold n | 17268 | vel  |
| `KeyO` | ⌃ | 15909 | ⌃o — how recording meets what is there |
| `KeyP` | ⌘ + ⌃ + ⌥ + ⇧ + layer 1+ | 15132 | the way out is the key you came in on |
| `KeyQ` | hold q + ⌃ + layer 1+ | 15958 | Q — tap toggles live quantize · s snaps recorded notes · digits set the grid |
| `KeyQ` | hold q + ⌃ | 15965 | ⌃q = live-quantize toggle, everywhere |
| `KeyQ` | hold q + hold n + hold m | 17097 |  |
| `KeyQ` | hold q | 17324 | live quantize  |
| `KeyS` | ⌘ | 15094 | straight back to where it lives |
| `KeyS` | hold q + ⌃ | 15930 | …unless the q scope is open: q+s = snap |
| `KeyS` | hold q + layer 1+ | 15939 |  |
| `KeyS` | hold c + hold v | 17098 |  |
| `KeyS` | — | 17323 | live quantize  |
| `KeyT` | layer 0 | 15923 | t = timeline on/off (focus mode) |
| `KeyV` | — | 15388 | MOD learn: arm on a mod slot, map on a target param |
| `KeyV` | hold digit + ⌥ | 16637 |  |
| `KeyV` | hold c + hold v | 17098 |  |
| `KeyV` | hold v | 17269 | vel  |
| `KeyX` | — | 15388 | MOD learn: arm on a mod slot, map on a target param |
| `KeyX` | — | 15390 | MOD learn: arm on a mod slot, map on a target param |
| `KeyZ` | ⇧ | 15385 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 3145 | OFFSET the content — vertical, like the grid |
| `ArrowDown` | — | 15053 | destination cleared |
| `ArrowDown` | dest browser + set picker | 15055 | destination cleared |
| `ArrowDown` | — | 15308 |  |
| `ArrowDown` | — | 15344 | down = finer, the way the list reads |
| `ArrowDown` | — | 15345 | down = finer, the way the list reads |
| `ArrowDown` | — | 15386 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 15434 | the way in is the way out |
| `ArrowDown` | — | 15458 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowDown` | — | 16232 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16235 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16322 | bpm  |
| `ArrowDown` | ⇧ | 16340 |  |
| `ArrowDown` | — | 16491 | master — ←→ picks a channel, 0 stays here |
| `ArrowLeft` | — | 3169 | UNIT SIZE — horizontal |
| `ArrowLeft` | — | 9090 |  |
| `ArrowLeft` | — | 9101 | no backups yet |
| `ArrowLeft` | — | 9168 | inside the set: pick a channel |
| `ArrowLeft` | — | 15050 | destination cleared |
| `ArrowLeft` | — | 15313 |  |
| `ArrowLeft` | — | 15348 | ⌥a+⌫ = take it out for good |
| `ArrowLeft` | layer -1 | 15433 | the way in is the way out |
| `ArrowLeft` | — | 15438 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowLeft` | — | 16232 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowLeft` | — | 16368 |  |
| `ArrowRight` | — | 3169 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 3170 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 9090 |  |
| `ArrowRight` | set picker | 9091 |  |
| `ArrowRight` | — | 9101 | no backups yet |
| `ArrowRight` | set picker | 9102 | no backups yet |
| `ArrowRight` | — | 9168 | inside the set: pick a channel |
| `ArrowRight` | — | 9169 | inside the set: pick a channel |
| `ArrowRight` | — | 15050 | destination cleared |
| `ArrowRight` | dest browser + set picker | 15051 | destination cleared |
| `ArrowRight` | — | 15313 |  |
| `ArrowRight` | hold ⌥rack | 15315 | - = walk the rate |
| `ArrowRight` | — | 15348 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | — | 15349 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | layer -1 | 15433 | the way in is the way out |
| `ArrowRight` | — | 15438 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15439 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 16232 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16235 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16368 |  |
| `ArrowRight` | — | 16369 |  |
| `ArrowUp` | — | 3145 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 3146 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 15053 | destination cleared |
| `ArrowUp` | — | 15308 |  |
| `ArrowUp` | hold ⌥rack | 15310 |  |
| `ArrowUp` | — | 15344 | down = finer, the way the list reads |
| `ArrowUp` | — | 15386 | cmd+↑↓ = per-note prep tweak |
| `ArrowUp` | ⌥ + ⇧ + layer 2+ | 15387 | MOD learn: arm on a mod slot, map on a target param |
| `ArrowUp` | — | 15434 | the way in is the way out |
| `ArrowUp` | — | 15458 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15469 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 16232 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16235 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16235 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16322 | bpm  |
| `ArrowUp` | ⌘ + ⌥ | 16325 | bpm  |
| `ArrowUp` | ⇧ | 16340 |  |
| `ArrowUp` | — | 16344 | crop  |
| `ArrowUp` | — | 16491 | master — ←→ picks a channel, 0 stays here |
| `ArrowUp` | — | 16492 | master — ←→ picks a channel, 0 stays here |
| `Backquote` | ⌘ + ⌥ + dest browser + set picker | 15795 | modcap hidden |
| `Backquote` | ⌘ + ⌥ + dest browser + set picker | 15813 | ` shows the modcap first |
| `Backquote` | — | 17331 | the digit is no longer held |
| `Backslash` | — | 15872 | DJ pads: full home row |
| `Backslash` | hold ` | 17273 | what the dice are for |
| `Backspace` | — | 3180 | ⟲ loop length cleared |
| `Backspace` | — | 3188 | nothing recorded to restore  (⇧⌫ clears the loop length) |
| `Backspace` | ⇧ | 9140 | slot  |
| `Backspace` | — | 15057 | destination cleared |
| `Backspace` | hold ⌥rack | 15294 |  |
| `Backspace` | hold ⌥rack | 15357 | ⌥a+⌫ = take it out for good |
| `Backspace` | — | 15617 | cue  |
| `Backspace` | — | 15629 | cue  |
| `Backspace` | hold n + hold digit | 15971 |  |
| `Backspace` | hold c | 15976 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab + ⇧ | 15986 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab | 15993 |  |
| `Backspace` | hold tab + hold digit + layer 2+ | 16002 | nothing loaded |
| `Backspace` | — | 16017 | no automation on  |
| `Backspace` | — | 17385 |  |
| `BracketLeft` | — | 15407 |  |
| `BracketLeft` | ⌘ + dest browser + set picker | 15672 |  |
| `BracketLeft` | — | 15674 |  |
| `BracketLeft` | — | 17332 | the digit is no longer held |
| `BracketRight` | — | 15406 |  |
| `BracketRight` | — | 15407 |  |
| `BracketRight` | ⌘ + dest browser + set picker | 15672 |  |
| `BracketRight` | — | 15688 | the pan keys dial too |
| `BracketRight` | — | 17333 | the digit is no longer held |
| `CapsLock` | — | 15854 | the state is read, not toggled |
| `Comma` | — | 15331 | , . = octaves |
| `Comma` | ⌘ + ⌥ | 15894 | keyboard vel  |
| `Enter` | — | 9093 |  |
| `Enter` | — | 9106 | no backups yet |
| `Enter` | — | 9175 | this empties all  |
| `Enter` | — | 15062 |  |
| `Enter` | layer -1 | 15433 | the way in is the way out |
| `Enter` | — | 15437 | the way in is the way out |
| `Enter` | — | 15832 | instrument scope closed |
| `Enter` | layer -1 | 17218 | macOS reports caps going OFF on the keyup |
| `Equal` | — | 15289 |  |
| `Equal` | hold ⌥rack | 15291 |  |
| `Equal` | — | 15327 | - = walk the rate |
| `Equal` | — | 15328 | , . = octaves |
| `Equal` | hold tab + ⌘ + ⌃ | 15570 |  |
| `Equal` | ⌘ + layer 2+ | 15587 |  |
| `Equal` | — | 15589 |  |
| `Equal` | ⌘ + ⌃ + ⌥ + layer 2+ | 15600 |  |
| `Equal` | — | 15603 |  |
| `Equal` | — | 15617 | cue  |
| `Equal` | — | 15622 | cue  |
| `Equal` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15648 |  |
| `Equal` | ⇧ | 15650 |  |
| `Escape` | — | 9080 | cancelled |
| `Escape` | dest browser + set picker | 15049 | destination cleared |
| `Escape` | — | 15421 |  |
| `Escape` | layer -1 | 15433 | the way in is the way out |
| `Escape` | — | 15436 | the way in is the way out |
| `Escape` | — | 15833 | instrument scope closed |
| `Escape` | layer -1 | 17218 | macOS reports caps going OFF on the keyup |
| `F1` | — | 15421 |  |
| `Insert` | — | 15872 | DJ pads: full home row |
| `Insert` | hold ` | 17273 | what the dice are for |
| `Minus` | — | 15289 |  |
| `Minus` | — | 15327 | - = walk the rate |
| `Minus` | hold tab + ⌘ + ⌃ | 15570 |  |
| `Minus` | — | 15574 |  |
| `Minus` | ⌘ + layer 2+ | 15587 |  |
| `Minus` | ⌘ + ⌃ + ⌥ + layer 2+ | 15600 |  |
| `Minus` | — | 15617 | cue  |
| `Minus` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15648 |  |
| `Pause` | — | 15872 | DJ pads: full home row |
| `Pause` | hold ` | 17273 | what the dice are for |
| `Period` | — | 15331 | , . = octaves |
| `Period` | — | 15332 | there is no zeroth octave |
| `Period` | — | 15406 |  |
| `Period` | ⌘ + ⌥ | 15894 | keyboard vel  |
| `Period` | — | 15895 | keyboard vel  |
| `Quote` | — | 15406 |  |
| `Quote` | — | 15408 |  |
| `ScrollLock` | — | 15872 | DJ pads: full home row |
| `ScrollLock` | hold ` | 17273 | what the dice are for |
| `Semicolon` | — | 15408 |  |
| `Slash` | set picker | 9121 | slot  |
| `Slash` | ⌘ + ⌃ + ⌥ + layer 2+ | 15164 |  |
| `Slash` | — | 15434 | the way in is the way out |
| `Slash` | — | 15471 | the dice key: a whole song (⇧⌥ = wild) |
| `Slash` | ⌥ | 15875 | DJ pads: full home row |
| `Slash` | layer -1 | 17218 | macOS reports caps going OFF on the keyup |
| `Slash` | hold / | 17275 | what the dice are for |
| `Space` | — | 9151 | copy out of what you are looking at |
| `Space` | — | 15487 | rec unlatched |
| `Tab` | — | 15488 | rec unlatched |
| `Tab` | — | 17401 | latch overlapped the hold: rec stays on |
| `Tab` | — | 17432 | the hold ended and nothing latched it: rec off |
