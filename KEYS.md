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
| `KeyB` | ⌃ | 15980 | tap tempo, on repeated taps |
| `KeyC` | ⌘ | 9163 | copy out of what you are looking at |
| `KeyC` | — | 15433 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | — | 15435 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | ⌃ | 15973 | ⌃c — this channel's patch, as JSON, on the clipboard |
| `KeyC` | hold c + hold v | 17164 |  |
| `KeyC` | hold c | 17330 | vel  |
| `KeyE` | — | 15426 | cmd+↑↓ = per-note prep tweak |
| `KeyI` | — | 15429 | cmd+↑↓ = per-note prep tweak |
| `KeyK` | ⌘ + ⌥ + ⇧ + layer 1+ | 15153 | ◎ source →  |
| `KeyL` | ⌘ | 15142 |  |
| `KeyM` | hold q + ⌥ + ⇧ + dest browser + set picker + layer 2+ | 15782 | nothing to modulate here |
| `KeyM` | hold q + ⌃ | 15969 | click  |
| `KeyM` | hold q + hold n + hold m | 17163 |  |
| `KeyM` | hold m | 17396 | the digit is no longer held |
| `KeyN` | ⌘ | 15136 | start a new set? enter confirms · esc cancels |
| `KeyN` | hold digit + ⌥ | 16699 |  |
| `KeyN` | hold q + hold n + hold m | 17163 |  |
| `KeyN` | hold n | 17334 | vel  |
| `KeyO` | ⌃ | 15975 | ⌃o — how recording meets what is there |
| `KeyP` | ⌘ + ⌃ + ⌥ + ⇧ + layer 1+ | 15167 | the way out is the key you came in on |
| `KeyQ` | hold q + ⌃ + layer 1+ | 16024 | Q — tap toggles live quantize · s snaps recorded notes · digits set the grid |
| `KeyQ` | hold q + ⌃ | 16031 | ⌃q = live-quantize toggle, everywhere |
| `KeyQ` | hold q + hold n + hold m | 17163 |  |
| `KeyQ` | hold q | 17390 | live quantize  |
| `KeyS` | ⌘ | 15129 | straight back to where it lives |
| `KeyS` | hold q + ⌃ | 15996 | …unless the q scope is open: q+s = snap |
| `KeyS` | hold q + layer 1+ | 16005 |  |
| `KeyS` | hold c + hold v | 17164 |  |
| `KeyS` | — | 17389 | live quantize  |
| `KeyT` | layer 0 | 15989 | t = timeline on/off (focus mode) |
| `KeyV` | — | 15433 | MOD learn: arm on a mod slot, map on a target param |
| `KeyV` | hold digit + ⌥ | 16703 |  |
| `KeyV` | hold c + hold v | 17164 |  |
| `KeyV` | hold v | 17335 | vel  |
| `KeyX` | — | 15433 | MOD learn: arm on a mod slot, map on a target param |
| `KeyX` | — | 15435 | MOD learn: arm on a mod slot, map on a target param |
| `KeyZ` | ⇧ | 15430 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 3156 | OFFSET the content — vertical, like the grid |
| `ArrowDown` | — | 15084 | destination cleared |
| `ArrowDown` | dest browser + set picker | 15086 | destination cleared |
| `ArrowDown` | — | 15353 |  |
| `ArrowDown` | — | 15389 | down = finer, the way the list reads |
| `ArrowDown` | — | 15390 | down = finer, the way the list reads |
| `ArrowDown` | — | 15431 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 15505 | the way in is the way out |
| `ArrowDown` | — | 15529 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowDown` | — | 16298 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16301 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16388 | bpm  |
| `ArrowDown` | ⇧ | 16406 |  |
| `ArrowDown` | — | 16557 | master — ←→ picks a channel, 0 stays here |
| `ArrowLeft` | — | 3180 | UNIT SIZE — horizontal |
| `ArrowLeft` | — | 9101 |  |
| `ArrowLeft` | — | 9112 | no backups yet |
| `ArrowLeft` | — | 9179 | inside the set: pick a channel |
| `ArrowLeft` | — | 15081 | destination cleared |
| `ArrowLeft` | — | 15358 |  |
| `ArrowLeft` | — | 15393 | ⌥a+⌫ = take it out for good |
| `ArrowLeft` | layer -1 | 15504 | the way in is the way out |
| `ArrowLeft` | — | 15509 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowLeft` | — | 16298 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowLeft` | — | 16434 |  |
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
| `ArrowRight` | — | 15358 |  |
| `ArrowRight` | hold ⌥rack | 15360 | - = walk the rate |
| `ArrowRight` | — | 15393 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | — | 15394 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | layer -1 | 15504 | the way in is the way out |
| `ArrowRight` | — | 15509 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15510 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 16298 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16301 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16434 |  |
| `ArrowRight` | — | 16435 |  |
| `ArrowUp` | — | 3156 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 3157 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 15084 | destination cleared |
| `ArrowUp` | — | 15353 |  |
| `ArrowUp` | hold ⌥rack | 15355 |  |
| `ArrowUp` | — | 15389 | down = finer, the way the list reads |
| `ArrowUp` | — | 15431 | cmd+↑↓ = per-note prep tweak |
| `ArrowUp` | ⌥ + ⇧ + layer 2+ | 15432 | MOD learn: arm on a mod slot, map on a target param |
| `ArrowUp` | — | 15505 | the way in is the way out |
| `ArrowUp` | — | 15529 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15540 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 16298 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16301 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16301 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16388 | bpm  |
| `ArrowUp` | ⌘ + ⌥ | 16391 | bpm  |
| `ArrowUp` | ⇧ | 16406 |  |
| `ArrowUp` | — | 16410 | crop  |
| `ArrowUp` | — | 16557 | master — ←→ picks a channel, 0 stays here |
| `ArrowUp` | — | 16558 | master — ←→ picks a channel, 0 stays here |
| `Backquote` | ⌘ + ⌥ + dest browser + set picker | 15870 | caps shows the modcap first |
| `Backslash` | — | 15929 | DJ pads: full home row |
| `Backslash` | hold ` | 17339 | what the dice are for |
| `Backspace` | — | 3191 | ⟲ loop length cleared |
| `Backspace` | — | 3199 | nothing recorded to restore  (⇧⌫ clears the loop length) |
| `Backspace` | ⇧ | 9151 | slot  |
| `Backspace` | — | 15088 | destination cleared |
| `Backspace` | hold ⌥rack | 15339 |  |
| `Backspace` | hold ⌥rack | 15402 | ⌥a+⌫ = take it out for good |
| `Backspace` | — | 15688 | cue  |
| `Backspace` | — | 15700 | cue  |
| `Backspace` | hold n + hold digit | 16037 |  |
| `Backspace` | hold c | 16042 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab + ⇧ | 16052 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab | 16059 |  |
| `Backspace` | hold tab + hold digit + layer 2+ | 16068 | nothing loaded |
| `Backspace` | — | 16083 | no automation on  |
| `Backspace` | — | 17453 |  |
| `BracketLeft` | — | 15334 |  |
| `BracketLeft` | — | 15478 |  |
| `BracketLeft` | ⌘ + dest browser + set picker | 15743 |  |
| `BracketLeft` | — | 15745 |  |
| `BracketLeft` | — | 17398 | the digit is no longer held |
| `BracketRight` | — | 15334 |  |
| `BracketRight` | hold ⌥rack | 15336 |  |
| `BracketRight` | — | 15477 |  |
| `BracketRight` | — | 15478 |  |
| `BracketRight` | ⌘ + dest browser + set picker | 15743 |  |
| `BracketRight` | — | 15759 | the pan keys dial too |
| `BracketRight` | — | 17399 | the digit is no longer held |
| `CapsLock` | — | 15911 | the state is read, not toggled |
| `Comma` | — | 15376 | , . = octaves |
| `Comma` | ⌘ + ⌥ | 15951 | keyboard vel  |
| `Comma` | — | 15955 | octave centred |
| `Comma` | — | 17400 | the digit is no longer held |
| `Enter` | — | 9104 |  |
| `Enter` | — | 9117 | no backups yet |
| `Enter` | — | 9186 | this empties all  |
| `Enter` | — | 15093 |  |
| `Enter` | layer -1 | 15504 | the way in is the way out |
| `Enter` | — | 15508 | the way in is the way out |
| `Enter` | — | 15889 | instrument scope closed |
| `Enter` | layer -1 | 17284 | macOS reports caps going OFF on the keyup |
| `Equal` | — | 15324 |  |
| `Equal` | hold ⌥rack | 15326 |  |
| `Equal` | — | 15372 | - = walk the rate |
| `Equal` | — | 15373 | , . = octaves |
| `Equal` | hold tab + ⌘ + ⌃ | 15641 |  |
| `Equal` | ⌘ + layer 2+ | 15658 |  |
| `Equal` | — | 15660 |  |
| `Equal` | ⌘ + ⌃ + ⌥ + layer 2+ | 15671 |  |
| `Equal` | — | 15674 |  |
| `Equal` | — | 15688 | cue  |
| `Equal` | — | 15693 | cue  |
| `Equal` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15719 |  |
| `Equal` | ⇧ | 15721 |  |
| `Escape` | — | 9091 | cancelled |
| `Escape` | dest browser + set picker | 15080 | destination cleared |
| `Escape` | — | 15492 |  |
| `Escape` | layer -1 | 15504 | the way in is the way out |
| `Escape` | — | 15507 | the way in is the way out |
| `Escape` | — | 15890 | instrument scope closed |
| `Escape` | layer -1 | 17284 | macOS reports caps going OFF on the keyup |
| `F1` | — | 15492 |  |
| `Insert` | — | 15929 | DJ pads: full home row |
| `Insert` | hold ` | 17339 | what the dice are for |
| `Minus` | — | 15324 |  |
| `Minus` | — | 15372 | - = walk the rate |
| `Minus` | hold tab + ⌘ + ⌃ | 15641 |  |
| `Minus` | — | 15645 |  |
| `Minus` | ⌘ + layer 2+ | 15658 |  |
| `Minus` | ⌘ + ⌃ + ⌥ + layer 2+ | 15671 |  |
| `Minus` | — | 15688 | cue  |
| `Minus` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15719 |  |
| `Pause` | — | 15929 | DJ pads: full home row |
| `Pause` | hold ` | 17339 | what the dice are for |
| `Period` | — | 15376 | , . = octaves |
| `Period` | — | 15377 | there is no zeroth octave |
| `Period` | — | 15477 |  |
| `Period` | ⌘ + ⌥ | 15951 | keyboard vel  |
| `Period` | — | 15952 | keyboard vel  |
| `Period` | — | 17401 | the digit is no longer held |
| `Quote` | — | 15477 |  |
| `Quote` | — | 15479 |  |
| `ScrollLock` | — | 15929 | DJ pads: full home row |
| `ScrollLock` | hold ` | 17339 | what the dice are for |
| `Semicolon` | — | 15479 |  |
| `Slash` | set picker | 9132 | slot  |
| `Slash` | ⌘ + ⌃ + ⌥ + layer 2+ | 15199 |  |
| `Slash` | — | 15505 | the way in is the way out |
| `Slash` | — | 15542 | the dice key: a whole song (⇧⌥ = wild) |
| `Slash` | ⌥ | 15932 | DJ pads: full home row |
| `Slash` | layer -1 | 17284 | macOS reports caps going OFF on the keyup |
| `Slash` | hold / | 17341 | what the dice are for |
| `Space` | — | 9162 | copy out of what you are looking at |
| `Space` | — | 15558 | rec unlatched |
| `Tab` | — | 15559 | rec unlatched |
| `Tab` | — | 17470 | latch overlapped the hold: rec stays on |
| `Tab` | — | 17501 | the hold ended and nothing latched it: rec off |
