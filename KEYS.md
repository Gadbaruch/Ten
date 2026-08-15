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
| `KeyB` | ⌘ + ⌃ | 9094 |  |
| `KeyB` | ⌃ | 15991 | tap tempo, on repeated taps |
| `KeyC` | ⌘ | 9163 | copy out of what you are looking at |
| `KeyC` | — | 15444 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | — | 15446 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | ⌃ | 15984 | ⌃c — this channel's patch, as JSON, on the clipboard |
| `KeyC` | hold c + hold v | 17175 |  |
| `KeyC` | hold c | 17341 | vel  |
| `KeyE` | — | 15437 | cmd+↑↓ = per-note prep tweak |
| `KeyI` | — | 15440 | cmd+↑↓ = per-note prep tweak |
| `KeyK` | ⌘ + ⌥ + ⇧ + layer 1+ | 15153 | ◎ source →  |
| `KeyL` | ⌘ | 15142 |  |
| `KeyM` | hold q + ⌥ + ⇧ + dest browser + set picker + layer 2+ | 15793 | nothing to modulate here |
| `KeyM` | hold q + ⌃ | 15980 | click  |
| `KeyM` | hold q + hold n + hold m | 17174 |  |
| `KeyM` | hold m | 17407 | the digit is no longer held |
| `KeyN` | ⌘ | 15136 | start a new set? enter confirms · esc cancels |
| `KeyN` | hold digit + ⌥ | 16710 |  |
| `KeyN` | hold q + hold n + hold m | 17174 |  |
| `KeyN` | hold n | 17345 | vel  |
| `KeyO` | ⌃ | 15986 | ⌃o — how recording meets what is there |
| `KeyP` | ⌘ + ⌃ + ⌥ + ⇧ + layer 1+ | 15167 | the way out is the key you came in on |
| `KeyQ` | hold q + ⌃ + layer 1+ | 16035 | Q — tap toggles live quantize · s snaps recorded notes · digits set the grid |
| `KeyQ` | hold q + ⌃ | 16042 | ⌃q = live-quantize toggle, everywhere |
| `KeyQ` | hold q + hold n + hold m | 17174 |  |
| `KeyQ` | hold q | 17401 | live quantize  |
| `KeyS` | ⌘ | 15129 | straight back to where it lives |
| `KeyS` | hold q + ⌃ | 16007 | …unless the q scope is open: q+s = snap |
| `KeyS` | hold q + layer 1+ | 16016 |  |
| `KeyS` | hold c + hold v | 17175 |  |
| `KeyS` | — | 17400 | live quantize  |
| `KeyT` | layer 0 | 16000 | t = timeline on/off (focus mode) |
| `KeyV` | — | 15444 | MOD learn: arm on a mod slot, map on a target param |
| `KeyV` | hold digit + ⌥ | 16714 |  |
| `KeyV` | hold c + hold v | 17175 |  |
| `KeyV` | hold v | 17346 | vel  |
| `KeyX` | — | 15444 | MOD learn: arm on a mod slot, map on a target param |
| `KeyX` | — | 15446 | MOD learn: arm on a mod slot, map on a target param |
| `KeyZ` | ⇧ | 15441 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 3156 | OFFSET the content — vertical, like the grid |
| `ArrowDown` | — | 15084 | destination cleared |
| `ArrowDown` | dest browser + set picker | 15086 | destination cleared |
| `ArrowDown` | — | 15364 |  |
| `ArrowDown` | — | 15400 | down = finer, the way the list reads |
| `ArrowDown` | — | 15401 | down = finer, the way the list reads |
| `ArrowDown` | — | 15442 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 15516 | the way in is the way out |
| `ArrowDown` | — | 15540 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowDown` | — | 16309 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16312 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16399 | bpm  |
| `ArrowDown` | ⇧ | 16417 |  |
| `ArrowDown` | — | 16568 | master — ←→ picks a channel, 0 stays here |
| `ArrowLeft` | — | 3180 | UNIT SIZE — horizontal |
| `ArrowLeft` | — | 9101 |  |
| `ArrowLeft` | — | 9112 | no backups yet |
| `ArrowLeft` | — | 9179 | inside the set: pick a channel |
| `ArrowLeft` | — | 15081 | destination cleared |
| `ArrowLeft` | — | 15369 |  |
| `ArrowLeft` | — | 15404 | ⌥a+⌫ = take it out for good |
| `ArrowLeft` | layer -1 | 15515 | the way in is the way out |
| `ArrowLeft` | — | 15520 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowLeft` | — | 16309 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowLeft` | — | 16445 |  |
| `ArrowRight` | — | 3180 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 3181 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 9101 |  |
| `ArrowRight` | set picker | 9102 |  |
| `ArrowRight` | — | 9112 | no backups yet |
| `ArrowRight` | set picker | 9113 | no backups yet |
| `ArrowRight` | — | 9179 | inside the set: pick a channel |
| `ArrowRight` | — | 9180 | inside the set: pick a channel |
| `ArrowRight` | — | 15081 | destination cleared |
| `ArrowRight` | dest browser + set picker | 15082 | destination cleared |
| `ArrowRight` | — | 15369 |  |
| `ArrowRight` | hold ⌥rack | 15371 | - = walk the rate |
| `ArrowRight` | — | 15404 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | — | 15405 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | layer -1 | 15515 | the way in is the way out |
| `ArrowRight` | — | 15520 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15521 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 16309 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16312 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16445 |  |
| `ArrowRight` | — | 16446 |  |
| `ArrowUp` | — | 3156 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 3157 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 15084 | destination cleared |
| `ArrowUp` | — | 15364 |  |
| `ArrowUp` | hold ⌥rack | 15366 |  |
| `ArrowUp` | — | 15400 | down = finer, the way the list reads |
| `ArrowUp` | — | 15442 | cmd+↑↓ = per-note prep tweak |
| `ArrowUp` | ⌥ + ⇧ + layer 2+ | 15443 | MOD learn: arm on a mod slot, map on a target param |
| `ArrowUp` | — | 15516 | the way in is the way out |
| `ArrowUp` | — | 15540 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15551 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 16309 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16312 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16312 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16399 | bpm  |
| `ArrowUp` | ⌘ + ⌥ | 16402 | bpm  |
| `ArrowUp` | ⇧ | 16417 |  |
| `ArrowUp` | — | 16421 | crop  |
| `ArrowUp` | — | 16568 | master — ←→ picks a channel, 0 stays here |
| `ArrowUp` | — | 16569 | master — ←→ picks a channel, 0 stays here |
| `Backquote` | ⌘ + ⌥ + dest browser + set picker | 15881 | caps shows the modcap first |
| `Backslash` | — | 15940 | DJ pads: full home row |
| `Backslash` | hold ` | 17350 | what the dice are for |
| `Backspace` | — | 3191 | ⟲ loop length cleared |
| `Backspace` | — | 3199 | nothing recorded to restore  (⇧⌫ clears the loop length) |
| `Backspace` | ⇧ | 9151 | slot  |
| `Backspace` | — | 15088 | destination cleared |
| `Backspace` | hold ⌥rack | 15350 |  |
| `Backspace` | hold ⌥rack | 15413 | ⌥a+⌫ = take it out for good |
| `Backspace` | — | 15699 | cue  |
| `Backspace` | — | 15711 | cue  |
| `Backspace` | hold n + hold digit | 16048 |  |
| `Backspace` | hold c | 16053 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab + ⇧ | 16063 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab | 16070 |  |
| `Backspace` | hold tab + hold digit + layer 2+ | 16079 | nothing loaded |
| `Backspace` | — | 16094 | no automation on  |
| `Backspace` | — | 17464 |  |
| `BracketLeft` | — | 15345 |  |
| `BracketLeft` | — | 15489 |  |
| `BracketLeft` | ⌘ + dest browser + set picker | 15754 |  |
| `BracketLeft` | — | 15756 |  |
| `BracketLeft` | — | 17409 | the digit is no longer held |
| `BracketRight` | — | 15345 |  |
| `BracketRight` | hold ⌥rack | 15347 |  |
| `BracketRight` | — | 15488 |  |
| `BracketRight` | — | 15489 |  |
| `BracketRight` | ⌘ + dest browser + set picker | 15754 |  |
| `BracketRight` | — | 15770 | the pan keys dial too |
| `BracketRight` | — | 17410 | the digit is no longer held |
| `CapsLock` | — | 15922 | the state is read, not toggled |
| `Comma` | — | 15387 | , . = octaves |
| `Comma` | ⌘ + ⌥ | 15962 | keyboard vel  |
| `Comma` | — | 15966 | octave centred |
| `Comma` | — | 17411 | the digit is no longer held |
| `Enter` | — | 9104 |  |
| `Enter` | — | 9117 | no backups yet |
| `Enter` | — | 9186 | this empties all  |
| `Enter` | — | 15093 |  |
| `Enter` | layer -1 | 15515 | the way in is the way out |
| `Enter` | — | 15519 | the way in is the way out |
| `Enter` | — | 15900 | instrument scope closed |
| `Enter` | layer -1 | 17295 | macOS reports caps going OFF on the keyup |
| `Equal` | — | 15335 |  |
| `Equal` | hold ⌥rack | 15337 |  |
| `Equal` | — | 15383 | - = walk the rate |
| `Equal` | — | 15384 | , . = octaves |
| `Equal` | hold tab + ⌘ + ⌃ | 15652 |  |
| `Equal` | ⌘ + layer 2+ | 15669 |  |
| `Equal` | — | 15671 |  |
| `Equal` | ⌘ + ⌃ + ⌥ + layer 2+ | 15682 |  |
| `Equal` | — | 15685 |  |
| `Equal` | — | 15699 | cue  |
| `Equal` | — | 15704 | cue  |
| `Equal` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15730 |  |
| `Equal` | ⇧ | 15732 |  |
| `Escape` | — | 9091 | cancelled |
| `Escape` | dest browser + set picker | 15080 | destination cleared |
| `Escape` | — | 15503 |  |
| `Escape` | layer -1 | 15515 | the way in is the way out |
| `Escape` | — | 15518 | the way in is the way out |
| `Escape` | — | 15901 | instrument scope closed |
| `Escape` | layer -1 | 17295 | macOS reports caps going OFF on the keyup |
| `F1` | — | 15503 |  |
| `Insert` | — | 15940 | DJ pads: full home row |
| `Insert` | hold ` | 17350 | what the dice are for |
| `Minus` | — | 15335 |  |
| `Minus` | — | 15383 | - = walk the rate |
| `Minus` | hold tab + ⌘ + ⌃ | 15652 |  |
| `Minus` | — | 15656 |  |
| `Minus` | ⌘ + layer 2+ | 15669 |  |
| `Minus` | ⌘ + ⌃ + ⌥ + layer 2+ | 15682 |  |
| `Minus` | — | 15699 | cue  |
| `Minus` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15730 |  |
| `Pause` | — | 15940 | DJ pads: full home row |
| `Pause` | hold ` | 17350 | what the dice are for |
| `Period` | — | 15387 | , . = octaves |
| `Period` | — | 15388 | there is no zeroth octave |
| `Period` | — | 15488 |  |
| `Period` | ⌘ + ⌥ | 15962 | keyboard vel  |
| `Period` | — | 15963 | keyboard vel  |
| `Period` | — | 17412 | the digit is no longer held |
| `Quote` | — | 15488 |  |
| `Quote` | — | 15490 |  |
| `ScrollLock` | — | 15940 | DJ pads: full home row |
| `ScrollLock` | hold ` | 17350 | what the dice are for |
| `Semicolon` | — | 15490 |  |
| `Slash` | set picker | 9132 | slot  |
| `Slash` | ⌘ + ⌃ + ⌥ + layer 2+ | 15199 |  |
| `Slash` | — | 15516 | the way in is the way out |
| `Slash` | — | 15553 | the dice key: a whole song (⇧⌥ = wild) |
| `Slash` | ⌥ | 15943 | DJ pads: full home row |
| `Slash` | layer -1 | 17295 | macOS reports caps going OFF on the keyup |
| `Slash` | hold / | 17352 | what the dice are for |
| `Space` | — | 9162 | copy out of what you are looking at |
| `Space` | — | 15569 | rec unlatched |
| `Tab` | — | 15570 | rec unlatched |
| `Tab` | — | 17481 | latch overlapped the hold: rec stays on |
| `Tab` | — | 17512 | the hold ended and nothing latched it: rec off |
