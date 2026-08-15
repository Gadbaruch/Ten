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
| `KeyB` | ⌘ + ⌃ | 8907 |  |
| `KeyB` | ⌃ | 15506 | tap tempo, on repeated taps |
| `KeyC` | ⌘ | 8976 | copy out of what you are looking at |
| `KeyC` | — | 15052 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | — | 15054 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | ⌃ | 15499 | ⌃c — this channel's patch, as JSON, on the clipboard |
| `KeyC` | hold c + hold v | 16658 |  |
| `KeyC` | hold c | 16824 | vel  |
| `KeyE` | — | 15045 | cmd+↑↓ = per-note prep tweak |
| `KeyI` | — | 15048 | cmd+↑↓ = per-note prep tweak |
| `KeyK` | ⌘ + ⌥ + ⇧ + layer 1+ | 14800 | ◎ source →  |
| `KeyL` | ⌘ | 14789 |  |
| `KeyM` | hold q + ⌥ + ⇧ + dest browser + set picker + layer 2+ | 15317 | nothing to modulate here |
| `KeyM` | hold q + ⌃ | 15495 | click  |
| `KeyM` | hold q + hold n + hold m | 16657 |  |
| `KeyM` | hold m | 16890 | the digit is no longer held |
| `KeyN` | ⌘ | 14783 | start a new set? enter confirms · esc cancels |
| `KeyN` | hold digit + ⌥ | 16193 |  |
| `KeyN` | hold q + hold n + hold m | 16657 |  |
| `KeyN` | hold n | 16828 | vel  |
| `KeyO` | ⌃ | 15501 | ⌃o — how recording meets what is there |
| `KeyQ` | hold q + ⌃ + layer 1+ | 15550 | Q — tap toggles live quantize · s snaps recorded notes · digits set the grid |
| `KeyQ` | hold q + ⌃ | 15557 | ⌃q = live-quantize toggle, everywhere |
| `KeyQ` | hold q + hold n + hold m | 16657 |  |
| `KeyQ` | hold q | 16884 | live quantize  |
| `KeyS` | ⌘ | 14776 | straight back to where it lives |
| `KeyS` | hold q + ⌃ | 15522 | …unless the q scope is open: q+s = snap |
| `KeyS` | hold q + layer 1+ | 15531 |  |
| `KeyS` | hold c + hold v | 16658 |  |
| `KeyS` | — | 16883 | live quantize  |
| `KeyT` | layer 0 | 15515 | t = timeline on/off (focus mode) |
| `KeyV` | — | 15052 | MOD learn: arm on a mod slot, map on a target param |
| `KeyV` | hold digit + ⌥ | 16197 |  |
| `KeyV` | hold c + hold v | 16658 |  |
| `KeyV` | hold v | 16829 | vel  |
| `KeyX` | — | 15052 | MOD learn: arm on a mod slot, map on a target param |
| `KeyX` | — | 15054 | MOD learn: arm on a mod slot, map on a target param |
| `KeyZ` | ⇧ | 15049 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 3079 | OFFSET the content — vertical, like the grid |
| `ArrowDown` | — | 14735 | destination cleared |
| `ArrowDown` | dest browser + set picker | 14737 | destination cleared |
| `ArrowDown` | — | 14971 |  |
| `ArrowDown` | — | 15008 | down = finer, the way the list reads |
| `ArrowDown` | — | 15009 | down = finer, the way the list reads |
| `ArrowDown` | — | 15050 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 15077 | the way in is the way out |
| `ArrowDown` | — | 15101 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowDown` | — | 15823 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 15826 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 15913 | bpm  |
| `ArrowDown` | — | 16051 | master — ←→ picks a channel, 0 stays here |
| `ArrowLeft` | — | 3103 | UNIT SIZE — horizontal |
| `ArrowLeft` | — | 8914 |  |
| `ArrowLeft` | — | 8925 | no backups yet |
| `ArrowLeft` | — | 8992 | inside the set: pick a channel |
| `ArrowLeft` | — | 14732 | destination cleared |
| `ArrowLeft` | — | 14976 |  |
| `ArrowLeft` | — | 15012 | ⌥a+⌫ = take it out for good |
| `ArrowLeft` | layer -1 | 15076 | the way in is the way out |
| `ArrowLeft` | — | 15081 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowLeft` | — | 15823 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowLeft` | — | 15928 |  |
| `ArrowRight` | — | 3103 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 3104 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 8914 |  |
| `ArrowRight` | set picker | 8915 |  |
| `ArrowRight` | — | 8925 | no backups yet |
| `ArrowRight` | set picker | 8926 | no backups yet |
| `ArrowRight` | — | 8992 | inside the set: pick a channel |
| `ArrowRight` | — | 8993 | inside the set: pick a channel |
| `ArrowRight` | — | 14732 | destination cleared |
| `ArrowRight` | dest browser + set picker | 14733 | destination cleared |
| `ArrowRight` | — | 14976 |  |
| `ArrowRight` | — | 14978 | - = walk the rate |
| `ArrowRight` | — | 15012 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | — | 15013 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | layer -1 | 15076 | the way in is the way out |
| `ArrowRight` | — | 15081 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15082 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15823 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 15826 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 15928 |  |
| `ArrowRight` | — | 15929 |  |
| `ArrowUp` | — | 3079 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 3080 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 14735 | destination cleared |
| `ArrowUp` | — | 14971 |  |
| `ArrowUp` | hold ⌥rack | 14973 |  |
| `ArrowUp` | — | 15008 | down = finer, the way the list reads |
| `ArrowUp` | — | 15050 | cmd+↑↓ = per-note prep tweak |
| `ArrowUp` | ⌥ + ⇧ + layer 2+ | 15051 | MOD learn: arm on a mod slot, map on a target param |
| `ArrowUp` | — | 15077 | the way in is the way out |
| `ArrowUp` | — | 15101 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15112 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15823 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 15826 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 15826 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 15913 | bpm  |
| `ArrowUp` | ⌘ + ⌥ | 15916 | bpm  |
| `ArrowUp` | — | 16051 | master — ←→ picks a channel, 0 stays here |
| `ArrowUp` | — | 16052 | master — ←→ picks a channel, 0 stays here |
| `Backquote` | — | 15464 | DJ pads: full home row |
| `Backquote` | hold ` | 16833 | what the dice are for |
| `Backslash` | ⌘ + ⌥ + dest browser + set picker | 15401 | automation hidden |
| `Backslash` | ⌘ + ⌥ + dest browser + set picker | 15413 | \\ shows the automation first |
| `Backspace` | — | 3114 | ⟲ loop length cleared |
| `Backspace` | — | 3122 | nothing recorded to restore  (⇧⌫ clears the loop length) |
| `Backspace` | ⇧ | 8964 | slot  |
| `Backspace` | — | 14739 | destination cleared |
| `Backspace` | hold ⌥rack | 14957 |  |
| `Backspace` | hold ⌥rack | 15021 | ⌥a+⌫ = take it out for good |
| `Backspace` | — | 15237 | cue  |
| `Backspace` | — | 15249 | cue  |
| `Backspace` | hold n + hold digit | 15563 |  |
| `Backspace` | hold c | 15568 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab + ⇧ | 15578 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab | 15585 | nothing loaded |
| `Backspace` | hold tab + hold digit + layer 2+ | 15593 | nothing loaded |
| `Backspace` | — | 15608 | no automation on  |
| `Backspace` | — | 16934 |  |
| `BracketLeft` | ⌘ + dest browser + set picker | 15292 | the pan keys dial too |
| `BracketRight` | ⌘ + dest browser + set picker | 15292 | the pan keys dial too |
| `BracketRight` | — | 15294 | the pan keys dial too |
| `CapsLock` | — | 15454 | the state is read, not toggled |
| `Comma` | — | 14995 | , . = octaves |
| `Comma` | ⌘ + ⌥ | 15486 | keyboard vel  |
| `Enter` | — | 8917 |  |
| `Enter` | — | 8930 | no backups yet |
| `Enter` | — | 8999 | this empties all  |
| `Enter` | — | 14744 |  |
| `Enter` | layer -1 | 15076 | the way in is the way out |
| `Enter` | — | 15080 | the way in is the way out |
| `Enter` | — | 15432 | instrument scope closed |
| `Enter` | layer -1 | 16778 | macOS reports caps going OFF on the keyup |
| `Equal` | — | 14952 |  |
| `Equal` | hold ⌥rack | 14954 |  |
| `Equal` | — | 14991 | - = walk the rate |
| `Equal` | — | 14992 | , . = octaves |
| `Equal` | hold tab + ⌘ + ⌃ | 15194 |  |
| `Equal` | ⌘ + layer 2+ | 15207 |  |
| `Equal` | — | 15209 |  |
| `Equal` | ⌘ + ⌃ + ⌥ + layer 2+ | 15220 |  |
| `Equal` | — | 15223 |  |
| `Equal` | — | 15237 | cue  |
| `Equal` | — | 15242 | cue  |
| `Equal` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15268 |  |
| `Equal` | ⇧ | 15270 |  |
| `Escape` | — | 8904 | cancelled |
| `Escape` | dest browser + set picker | 14731 | destination cleared |
| `Escape` | — | 15064 |  |
| `Escape` | layer -1 | 15076 | the way in is the way out |
| `Escape` | — | 15079 | the way in is the way out |
| `Escape` | — | 15433 | instrument scope closed |
| `Escape` | layer -1 | 16778 | macOS reports caps going OFF on the keyup |
| `F1` | — | 15064 |  |
| `Insert` | — | 15464 | DJ pads: full home row |
| `Insert` | hold ` | 16833 | what the dice are for |
| `Minus` | — | 14952 |  |
| `Minus` | — | 14991 | - = walk the rate |
| `Minus` | hold tab + ⌘ + ⌃ | 15194 |  |
| `Minus` | — | 15198 |  |
| `Minus` | ⌘ + layer 2+ | 15207 |  |
| `Minus` | ⌘ + ⌃ + ⌥ + layer 2+ | 15220 |  |
| `Minus` | — | 15237 | cue  |
| `Minus` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15268 |  |
| `Pause` | — | 15464 | DJ pads: full home row |
| `Pause` | hold ` | 16833 | what the dice are for |
| `Period` | — | 14995 | , . = octaves |
| `Period` | — | 14996 | there is no zeroth octave |
| `Period` | ⌘ + ⌥ | 15486 | keyboard vel  |
| `Period` | — | 15487 | keyboard vel  |
| `ScrollLock` | — | 15464 | DJ pads: full home row |
| `ScrollLock` | hold ` | 16833 | what the dice are for |
| `Slash` | set picker | 8945 | slot  |
| `Slash` | ⌘ + ⌃ + ⌥ + layer 2+ | 14843 | the way out is the key you came in on |
| `Slash` | — | 15077 | the way in is the way out |
| `Slash` | — | 15114 | the dice key: a whole song (⇧⌥ = wild) |
| `Slash` | ⌥ | 15467 | DJ pads: full home row |
| `Slash` | layer -1 | 16778 | macOS reports caps going OFF on the keyup |
| `Slash` | hold / | 16835 | what the dice are for |
| `Space` | — | 8975 | copy out of what you are looking at |
| `Space` | — | 15130 | rec unlatched |
| `Tab` | — | 15131 | rec unlatched |
| `Tab` | — | 16950 | latch overlapped the hold: rec stays on |
| `Tab` | — | 16981 | the hold ended and nothing latched it: rec off |
