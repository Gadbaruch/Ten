# TEN — key map

Generated from `index.html` by `tools/keymap.py`. Do not hand-edit —
regenerate it. A key table that is written by hand is wrong within a week.

185 bindings across 38 keys.

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
| `KeyB` | ⌘ + ⌃ | 8898 |  |
| `KeyB` | ⌃ | 15501 | tap tempo, on repeated taps |
| `KeyC` | ⌘ | 8967 | copy out of what you are looking at |
| `KeyC` | — | 15047 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | — | 15049 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | ⌃ | 15494 | ⌃c — this channel's patch, as JSON, on the clipboard |
| `KeyC` | hold c + hold v | 16653 |  |
| `KeyC` | hold c | 16819 | vel  |
| `KeyE` | — | 15040 | cmd+↑↓ = per-note prep tweak |
| `KeyI` | — | 15043 | cmd+↑↓ = per-note prep tweak |
| `KeyK` | ⌘ + ⌥ + ⇧ + layer 1+ | 14791 | ◎ source →  |
| `KeyL` | ⌘ | 14780 |  |
| `KeyM` | hold q + ⌥ + ⇧ + dest browser + set picker + layer 2+ | 15312 | nothing to modulate here |
| `KeyM` | hold q + ⌃ | 15490 | click  |
| `KeyM` | hold q + hold n + hold m | 16652 |  |
| `KeyM` | hold m | 16885 | the digit is no longer held |
| `KeyN` | ⌘ | 14774 | start a new set? enter confirms · esc cancels |
| `KeyN` | hold digit + ⌥ | 16188 |  |
| `KeyN` | hold q + hold n + hold m | 16652 |  |
| `KeyN` | hold n | 16823 | vel  |
| `KeyO` | ⌃ | 15496 | ⌃o — how recording meets what is there |
| `KeyQ` | hold q + ⌃ + layer 1+ | 15545 | Q — tap toggles live quantize · s snaps recorded notes · digits set the grid |
| `KeyQ` | hold q + ⌃ | 15552 | ⌃q = live-quantize toggle, everywhere |
| `KeyQ` | hold q + hold n + hold m | 16652 |  |
| `KeyQ` | hold q | 16879 | live quantize  |
| `KeyS` | ⌘ | 14767 | straight back to where it lives |
| `KeyS` | hold q + ⌃ | 15517 | …unless the q scope is open: q+s = snap |
| `KeyS` | hold q + layer 1+ | 15526 |  |
| `KeyS` | hold c + hold v | 16653 |  |
| `KeyS` | — | 16878 | live quantize  |
| `KeyT` | layer 0 | 15510 | t = timeline on/off (focus mode) |
| `KeyV` | — | 15047 | MOD learn: arm on a mod slot, map on a target param |
| `KeyV` | hold digit + ⌥ | 16192 |  |
| `KeyV` | hold c + hold v | 16653 |  |
| `KeyV` | hold v | 16824 | vel  |
| `KeyX` | — | 15047 | MOD learn: arm on a mod slot, map on a target param |
| `KeyX` | — | 15049 | MOD learn: arm on a mod slot, map on a target param |
| `KeyZ` | ⇧ | 15044 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 3070 | OFFSET the content — vertical, like the grid |
| `ArrowDown` | — | 14726 | destination cleared |
| `ArrowDown` | dest browser + set picker | 14728 | destination cleared |
| `ArrowDown` | — | 14967 |  |
| `ArrowDown` | — | 15003 | down = finer, the way the list reads |
| `ArrowDown` | — | 15004 | down = finer, the way the list reads |
| `ArrowDown` | — | 15045 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 15072 | the way in is the way out |
| `ArrowDown` | — | 15096 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowDown` | — | 15818 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 15821 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 15908 | bpm  |
| `ArrowDown` | — | 16046 | master — ←→ picks a channel, 0 stays here |
| `ArrowLeft` | — | 3094 | UNIT SIZE — horizontal |
| `ArrowLeft` | — | 8905 |  |
| `ArrowLeft` | — | 8916 | no backups yet |
| `ArrowLeft` | — | 8983 | inside the set: pick a channel |
| `ArrowLeft` | — | 14723 | destination cleared |
| `ArrowLeft` | — | 14972 |  |
| `ArrowLeft` | — | 15007 | ⌥a+⌫ = take it out for good |
| `ArrowLeft` | layer -1 | 15071 | the way in is the way out |
| `ArrowLeft` | — | 15076 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowLeft` | — | 15818 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowLeft` | — | 15923 |  |
| `ArrowRight` | — | 3094 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 3095 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 8905 |  |
| `ArrowRight` | set picker | 8906 |  |
| `ArrowRight` | — | 8916 | no backups yet |
| `ArrowRight` | set picker | 8917 | no backups yet |
| `ArrowRight` | — | 8983 | inside the set: pick a channel |
| `ArrowRight` | — | 8984 | inside the set: pick a channel |
| `ArrowRight` | — | 14723 | destination cleared |
| `ArrowRight` | dest browser + set picker | 14724 | destination cleared |
| `ArrowRight` | — | 14972 |  |
| `ArrowRight` | hold ⌥rack | 14974 | - = walk the rate |
| `ArrowRight` | — | 15007 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | — | 15008 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | layer -1 | 15071 | the way in is the way out |
| `ArrowRight` | — | 15076 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15077 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15818 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 15821 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 15923 |  |
| `ArrowRight` | — | 15924 |  |
| `ArrowUp` | — | 3070 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 3071 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 14726 | destination cleared |
| `ArrowUp` | — | 14967 |  |
| `ArrowUp` | hold ⌥rack | 14969 |  |
| `ArrowUp` | — | 15003 | down = finer, the way the list reads |
| `ArrowUp` | — | 15045 | cmd+↑↓ = per-note prep tweak |
| `ArrowUp` | ⌥ + ⇧ + layer 2+ | 15046 | MOD learn: arm on a mod slot, map on a target param |
| `ArrowUp` | — | 15072 | the way in is the way out |
| `ArrowUp` | — | 15096 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15107 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15818 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 15821 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 15821 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 15908 | bpm  |
| `ArrowUp` | ⌘ + ⌥ | 15911 | bpm  |
| `ArrowUp` | — | 16046 | master — ←→ picks a channel, 0 stays here |
| `ArrowUp` | — | 16047 | master — ←→ picks a channel, 0 stays here |
| `Backquote` | — | 15459 | DJ pads: full home row |
| `Backquote` | hold ` | 16828 | what the dice are for |
| `Backslash` | ⌘ + ⌥ + dest browser + set picker | 15396 | automation hidden |
| `Backslash` | ⌘ + ⌥ + dest browser + set picker | 15408 | \\ shows the automation first |
| `Backspace` | — | 3105 | ⟲ loop length cleared |
| `Backspace` | — | 3113 | nothing recorded to restore  (⇧⌫ clears the loop length) |
| `Backspace` | ⇧ | 8955 | slot  |
| `Backspace` | — | 14730 | destination cleared |
| `Backspace` | hold ⌥rack | 14953 |  |
| `Backspace` | hold ⌥rack | 15016 | ⌥a+⌫ = take it out for good |
| `Backspace` | — | 15232 | cue  |
| `Backspace` | — | 15244 | cue  |
| `Backspace` | hold n + hold digit | 15558 |  |
| `Backspace` | hold c | 15563 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab + ⇧ | 15573 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab | 15580 | nothing loaded |
| `Backspace` | hold tab + hold digit + layer 2+ | 15588 | nothing loaded |
| `Backspace` | — | 15603 | no automation on  |
| `Backspace` | — | 16929 |  |
| `BracketLeft` | ⌘ + dest browser + set picker | 15287 | the pan keys dial too |
| `BracketRight` | ⌘ + dest browser + set picker | 15287 | the pan keys dial too |
| `BracketRight` | — | 15289 | the pan keys dial too |
| `CapsLock` | — | 15449 | the state is read, not toggled |
| `Comma` | — | 14990 | , . = octaves |
| `Comma` | ⌘ + ⌥ | 15481 | keyboard vel  |
| `Enter` | — | 8908 |  |
| `Enter` | — | 8921 | no backups yet |
| `Enter` | — | 8990 | this empties all  |
| `Enter` | — | 14735 |  |
| `Enter` | layer -1 | 15071 | the way in is the way out |
| `Enter` | — | 15075 | the way in is the way out |
| `Enter` | — | 15427 | instrument scope closed |
| `Enter` | layer -1 | 16773 | macOS reports caps going OFF on the keyup |
| `Equal` | — | 14948 |  |
| `Equal` | hold ⌥rack | 14950 |  |
| `Equal` | — | 14986 | - = walk the rate |
| `Equal` | — | 14987 | , . = octaves |
| `Equal` | hold tab + ⌘ + ⌃ | 15189 |  |
| `Equal` | ⌘ + layer 2+ | 15202 |  |
| `Equal` | — | 15204 |  |
| `Equal` | ⌘ + ⌃ + ⌥ + layer 2+ | 15215 |  |
| `Equal` | — | 15218 |  |
| `Equal` | — | 15232 | cue  |
| `Equal` | — | 15237 | cue  |
| `Equal` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15263 |  |
| `Equal` | ⇧ | 15265 |  |
| `Escape` | — | 8895 | cancelled |
| `Escape` | dest browser + set picker | 14722 | destination cleared |
| `Escape` | — | 15059 |  |
| `Escape` | layer -1 | 15071 | the way in is the way out |
| `Escape` | — | 15074 | the way in is the way out |
| `Escape` | — | 15428 | instrument scope closed |
| `Escape` | layer -1 | 16773 | macOS reports caps going OFF on the keyup |
| `F1` | — | 15059 |  |
| `Insert` | — | 15459 | DJ pads: full home row |
| `Insert` | hold ` | 16828 | what the dice are for |
| `Minus` | — | 14948 |  |
| `Minus` | — | 14986 | - = walk the rate |
| `Minus` | hold tab + ⌘ + ⌃ | 15189 |  |
| `Minus` | — | 15193 |  |
| `Minus` | ⌘ + layer 2+ | 15202 |  |
| `Minus` | ⌘ + ⌃ + ⌥ + layer 2+ | 15215 |  |
| `Minus` | — | 15232 | cue  |
| `Minus` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15263 |  |
| `Pause` | — | 15459 | DJ pads: full home row |
| `Pause` | hold ` | 16828 | what the dice are for |
| `Period` | — | 14990 | , . = octaves |
| `Period` | — | 14991 | there is no zeroth octave |
| `Period` | ⌘ + ⌥ | 15481 | keyboard vel  |
| `Period` | — | 15482 | keyboard vel  |
| `ScrollLock` | — | 15459 | DJ pads: full home row |
| `ScrollLock` | hold ` | 16828 | what the dice are for |
| `Slash` | set picker | 8936 | slot  |
| `Slash` | ⌘ + ⌃ + ⌥ + layer 2+ | 14834 | the way out is the key you came in on |
| `Slash` | — | 15072 | the way in is the way out |
| `Slash` | — | 15109 | the dice key: a whole song (⇧⌥ = wild) |
| `Slash` | ⌥ | 15462 | DJ pads: full home row |
| `Slash` | layer -1 | 16773 | macOS reports caps going OFF on the keyup |
| `Slash` | hold / | 16830 | what the dice are for |
| `Space` | — | 8966 | copy out of what you are looking at |
| `Space` | — | 15125 | rec unlatched |
| `Tab` | — | 15126 | rec unlatched |
| `Tab` | — | 16945 | latch overlapped the hold: rec stays on |
| `Tab` | — | 16976 | the hold ended and nothing latched it: rec off |
