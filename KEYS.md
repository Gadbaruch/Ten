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
| `KeyB` | ⌘ + ⌃ | 9192 |  |
| `KeyB` | ⌃ | 16171 | tap tempo, on repeated taps |
| `KeyC` | ⌘ | 9261 | copy out of what you are looking at |
| `KeyC` | — | 15587 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | — | 15589 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | ⌃ | 16164 | ⌃c — this channel's patch, as JSON, on the clipboard |
| `KeyC` | hold c + hold v | 17361 |  |
| `KeyC` | hold c | 17527 | vel  |
| `KeyE` | — | 15580 | cmd+↑↓ = per-note prep tweak |
| `KeyI` | — | 15583 | cmd+↑↓ = per-note prep tweak |
| `KeyK` | ⌘ + ⌥ + ⇧ + layer 1+ | 15292 | ◎ source →  |
| `KeyL` | ⌘ | 15281 |  |
| `KeyM` | hold q + ⌥ + ⇧ + dest browser + set picker + layer 2+ | 15936 | nothing to modulate here |
| `KeyM` | hold q + ⌃ | 16160 | click  |
| `KeyM` | hold q + hold n + hold m | 17360 |  |
| `KeyM` | hold m | 17593 | the digit is no longer held |
| `KeyN` | ⌘ | 15275 | start a new set? enter confirms · esc cancels |
| `KeyN` | hold digit + ⌥ | 16890 |  |
| `KeyN` | hold q + hold n + hold m | 17360 |  |
| `KeyN` | hold n | 17531 | vel  |
| `KeyO` | ⌃ | 16166 | ⌃o — how recording meets what is there |
| `KeyP` | ⌘ + ⌃ + ⌥ + ⇧ + layer 1+ | 15306 | the way out is the key you came in on |
| `KeyQ` | hold q + ⌃ + layer 1+ | 16215 | Q — tap toggles live quantize · s snaps recorded notes · digits set the grid |
| `KeyQ` | hold q + ⌃ | 16222 | ⌃q = live-quantize toggle, everywhere |
| `KeyQ` | hold q + hold n + hold m | 17360 |  |
| `KeyQ` | hold q | 17587 | live quantize  |
| `KeyS` | ⌘ | 15268 | straight back to where it lives |
| `KeyS` | hold q + ⌃ | 16187 | …unless the q scope is open: q+s = snap |
| `KeyS` | hold q + layer 1+ | 16196 |  |
| `KeyS` | hold c + hold v | 17361 |  |
| `KeyS` | — | 17586 | live quantize  |
| `KeyT` | layer 0 | 16180 | t = timeline on/off (focus mode) |
| `KeyV` | — | 15587 | MOD learn: arm on a mod slot, map on a target param |
| `KeyV` | hold digit + ⌥ | 16894 |  |
| `KeyV` | hold c + hold v | 17361 |  |
| `KeyV` | hold v | 17532 | vel  |
| `KeyX` | — | 15587 | MOD learn: arm on a mod slot, map on a target param |
| `KeyX` | — | 15589 | MOD learn: arm on a mod slot, map on a target param |
| `KeyZ` | ⇧ | 15584 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 3254 | OFFSET the content — vertical, like the grid |
| `ArrowDown` | — | 15216 | destination cleared |
| `ArrowDown` | dest browser + set picker | 15218 | destination cleared |
| `ArrowDown` | — | 15507 |  |
| `ArrowDown` | — | 15543 | down = finer, the way the list reads |
| `ArrowDown` | — | 15544 | down = finer, the way the list reads |
| `ArrowDown` | — | 15585 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 15659 | the way in is the way out |
| `ArrowDown` | — | 15683 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowDown` | — | 16489 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16492 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16579 | bpm  |
| `ArrowDown` | ⇧ | 16597 |  |
| `ArrowDown` | — | 16748 | master — ←→ picks a channel, 0 stays here |
| `ArrowLeft` | — | 3278 | UNIT SIZE — horizontal |
| `ArrowLeft` | — | 9199 |  |
| `ArrowLeft` | — | 9210 | no backups yet |
| `ArrowLeft` | — | 9277 | inside the set: pick a channel |
| `ArrowLeft` | — | 15213 | destination cleared |
| `ArrowLeft` | — | 15512 |  |
| `ArrowLeft` | — | 15547 | ⌥a+⌫ = take it out for good |
| `ArrowLeft` | layer -1 | 15658 | the way in is the way out |
| `ArrowLeft` | — | 15663 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowLeft` | — | 16489 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowLeft` | — | 16625 |  |
| `ArrowRight` | — | 3278 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 3279 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 9199 |  |
| `ArrowRight` | set picker | 9200 |  |
| `ArrowRight` | — | 9210 | no backups yet |
| `ArrowRight` | set picker | 9211 | no backups yet |
| `ArrowRight` | — | 9277 | inside the set: pick a channel |
| `ArrowRight` | — | 9278 | inside the set: pick a channel |
| `ArrowRight` | — | 15213 | destination cleared |
| `ArrowRight` | dest browser + set picker | 15214 | destination cleared |
| `ArrowRight` | — | 15512 |  |
| `ArrowRight` | hold ⌥rack | 15514 | - = walk the rate |
| `ArrowRight` | — | 15547 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | — | 15548 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | layer -1 | 15658 | the way in is the way out |
| `ArrowRight` | — | 15663 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15664 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 16489 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16492 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16625 |  |
| `ArrowRight` | — | 16626 |  |
| `ArrowUp` | — | 3254 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 3255 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 15216 | destination cleared |
| `ArrowUp` | — | 15507 |  |
| `ArrowUp` | hold ⌥rack | 15509 |  |
| `ArrowUp` | — | 15543 | down = finer, the way the list reads |
| `ArrowUp` | — | 15585 | cmd+↑↓ = per-note prep tweak |
| `ArrowUp` | ⌥ + ⇧ + layer 2+ | 15586 | MOD learn: arm on a mod slot, map on a target param |
| `ArrowUp` | — | 15659 | the way in is the way out |
| `ArrowUp` | — | 15683 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15694 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 16489 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16492 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16492 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16579 | bpm  |
| `ArrowUp` | ⌘ + ⌥ | 16582 | bpm  |
| `ArrowUp` | ⇧ | 16597 |  |
| `ArrowUp` | — | 16601 | crop  |
| `ArrowUp` | — | 16748 | master — ←→ picks a channel, 0 stays here |
| `ArrowUp` | — | 16749 | master — ←→ picks a channel, 0 stays here |
| `Backquote` | ⌘ + ⌥ + dest browser + set picker | 16024 | caps shows the modcap first |
| `Backslash` | ⌘ + ⌥ | 16086 | DJ pads: full home row |
| `Backslash` | hold ` | 17536 | what the dice are for |
| `Backspace` | — | 3289 | ⟲ loop length cleared |
| `Backspace` | — | 3297 | nothing recorded to restore  (⇧⌫ clears the loop length) |
| `Backspace` | ⇧ | 9249 | slot  |
| `Backspace` | — | 15220 | destination cleared |
| `Backspace` | hold ⌥rack | 15493 |  |
| `Backspace` | hold ⌥rack | 15556 | ⌥a+⌫ = take it out for good |
| `Backspace` | — | 15842 | cue  |
| `Backspace` | — | 15854 | cue  |
| `Backspace` | hold n + hold digit | 16228 |  |
| `Backspace` | hold c | 16233 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab + ⇧ | 16243 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab | 16250 |  |
| `Backspace` | hold tab + hold digit + layer 2+ | 16259 | nothing loaded |
| `Backspace` | — | 16274 | no automation on  |
| `Backspace` | — | 17667 |  |
| `BracketLeft` | — | 15632 |  |
| `BracketLeft` | ⌘ + dest browser + set picker | 15897 |  |
| `BracketLeft` | — | 15899 |  |
| `BracketLeft` | — | 17595 | the digit is no longer held |
| `BracketRight` | — | 15631 |  |
| `BracketRight` | — | 15632 |  |
| `BracketRight` | ⌘ + dest browser + set picker | 15897 |  |
| `BracketRight` | — | 15913 | the pan keys dial too |
| `BracketRight` | — | 17596 | the digit is no longer held |
| `CapsLock` | — | 16068 | the state is read, not toggled |
| `Comma` | — | 15530 | , . = octaves |
| `Comma` | ⌘ + ⌥ | 16107 | keyboard vel  |
| `Comma` | — | 16146 | octave centred |
| `Comma` | — | 17597 | the digit is no longer held |
| `Enter` | — | 9202 |  |
| `Enter` | — | 9215 | no backups yet |
| `Enter` | — | 9284 | this empties all  |
| `Enter` | — | 15225 |  |
| `Enter` | layer -1 | 15658 | the way in is the way out |
| `Enter` | — | 15662 | the way in is the way out |
| `Enter` | — | 16043 |  |
| `Enter` | layer -1 | 17481 | macOS reports caps going OFF on the keyup |
| `Equal` | — | 15526 | - = walk the rate |
| `Equal` | — | 15527 | , . = octaves |
| `Equal` | hold tab + ⌘ + ⌃ | 15795 |  |
| `Equal` | ⌘ + layer 2+ | 15812 |  |
| `Equal` | — | 15814 |  |
| `Equal` | ⌘ + ⌃ + ⌥ + layer 2+ | 15825 |  |
| `Equal` | — | 15828 |  |
| `Equal` | — | 15842 | cue  |
| `Equal` | — | 15847 | cue  |
| `Equal` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15873 |  |
| `Equal` | ⇧ | 15875 |  |
| `Escape` | — | 9189 | cancelled |
| `Escape` | dest browser + set picker | 15212 | destination cleared |
| `Escape` | — | 15646 |  |
| `Escape` | layer -1 | 15658 | the way in is the way out |
| `Escape` | — | 15661 | the way in is the way out |
| `Escape` | — | 16044 |  |
| `Escape` | layer -1 | 17481 | macOS reports caps going OFF on the keyup |
| `Escape` | — | 17613 | ⟳ mic latched — esc again turns it off |
| `F1` | — | 15646 |  |
| `Minus` | — | 15526 | - = walk the rate |
| `Minus` | hold tab + ⌘ + ⌃ | 15795 |  |
| `Minus` | — | 15799 |  |
| `Minus` | ⌘ + layer 2+ | 15812 |  |
| `Minus` | ⌘ + ⌃ + ⌥ + layer 2+ | 15825 |  |
| `Minus` | — | 15842 | cue  |
| `Minus` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15873 |  |
| `Period` | — | 15530 | , . = octaves |
| `Period` | — | 15531 | there is no zeroth octave |
| `Period` | — | 15631 |  |
| `Period` | ⌘ + ⌥ | 16107 | keyboard vel  |
| `Period` | — | 16108 | keyboard vel  |
| `Period` | — | 17598 | the digit is no longer held |
| `Quote` | — | 15631 |  |
| `Quote` | — | 15633 |  |
| `Semicolon` | — | 15633 |  |
| `Slash` | set picker | 9230 | slot  |
| `Slash` | ⌘ + ⌃ + ⌥ + layer 2+ | 15338 |  |
| `Slash` | — | 15659 | the way in is the way out |
| `Slash` | — | 15696 | the dice key: a whole song (⇧⌥ = wild) |
| `Slash` | ⌥ | 16088 | DJ pads: full home row |
| `Slash` | layer -1 | 17481 | macOS reports caps going OFF on the keyup |
| `Slash` | hold / | 17538 | what the dice are for |
| `Space` | — | 9260 | copy out of what you are looking at |
| `Space` | — | 15712 | rec unlatched |
| `Tab` | — | 15713 | rec unlatched |
| `Tab` | — | 17686 | latch overlapped the hold: rec stays on |
| `Tab` | — | 17717 | the hold ended and nothing latched it: rec off |
