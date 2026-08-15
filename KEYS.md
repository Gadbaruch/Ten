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
| `KeyB` | ⌘ + ⌃ | 9250 |  |
| `KeyB` | ⌃ | 16248 | tap tempo, on repeated taps |
| `KeyC` | ⌘ | 9319 | copy out of what you are looking at |
| `KeyC` | — | 15661 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | — | 15663 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | ⌃ + ⇧ | 16241 | ⌃o — how recording meets what is there |
| `KeyC` | hold c + hold v | 17444 |  |
| `KeyC` | hold c | 17610 | vel  |
| `KeyE` | — | 15654 | cmd+↑↓ = per-note prep tweak |
| `KeyI` | — | 15657 | cmd+↑↓ = per-note prep tweak |
| `KeyK` | ⌘ + ⌥ + ⇧ + layer 1+ | 15362 | ◎ source →  |
| `KeyL` | ⌘ | 15351 |  |
| `KeyM` | hold q + ⌥ + ⇧ + dest browser + set picker + layer 2+ | 16010 | nothing to modulate here |
| `KeyM` | hold q + ⌃ | 16234 | click  |
| `KeyM` | hold q + hold n + hold m | 17443 |  |
| `KeyM` | hold m | 17676 | the digit is no longer held |
| `KeyN` | ⌘ | 15345 | start a new set? enter confirms · esc cancels |
| `KeyN` | hold digit + ⌥ | 16973 |  |
| `KeyN` | hold q + hold n + hold m | 17443 |  |
| `KeyN` | hold n | 17614 | vel  |
| `KeyO` | ⌃ | 16243 | ⌃o — how recording meets what is there |
| `KeyP` | ⌘ + ⌃ + ⌥ + ⇧ + layer 1+ | 15376 | the way out is the key you came in on |
| `KeyQ` | hold q + ⌃ + layer 1+ | 16292 | Q — tap toggles live quantize · s snaps recorded notes · digits set the grid |
| `KeyQ` | hold q + ⌃ | 16299 | ⌃q = live-quantize toggle, everywhere |
| `KeyQ` | hold q + hold n + hold m | 17443 |  |
| `KeyQ` | hold q | 17670 | live quantize  |
| `KeyS` | ⌘ | 15338 | straight back to where it lives |
| `KeyS` | hold q + ⌃ | 16264 | …unless the q scope is open: q+s = snap |
| `KeyS` | hold q + layer 1+ | 16273 |  |
| `KeyS` | hold c + hold v | 17444 |  |
| `KeyS` | — | 17669 | live quantize  |
| `KeyT` | layer 0 | 16257 | t = timeline on/off (focus mode) |
| `KeyV` | — | 15661 | MOD learn: arm on a mod slot, map on a target param |
| `KeyV` | hold digit + ⌥ | 16977 |  |
| `KeyV` | hold c + hold v | 17444 |  |
| `KeyV` | hold v | 17615 | vel  |
| `KeyX` | — | 15661 | MOD learn: arm on a mod slot, map on a target param |
| `KeyX` | — | 15663 | MOD learn: arm on a mod slot, map on a target param |
| `KeyZ` | ⇧ | 15658 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 3327 | OFFSET the content — vertical, like the grid |
| `ArrowDown` | — | 15279 | destination cleared |
| `ArrowDown` | dest browser + set picker | 15281 | destination cleared |
| `ArrowDown` | — | 15581 |  |
| `ArrowDown` | — | 15617 | down = finer, the way the list reads |
| `ArrowDown` | — | 15618 | down = finer, the way the list reads |
| `ArrowDown` | — | 15659 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 15733 | the way in is the way out |
| `ArrowDown` | — | 15757 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowDown` | — | 16572 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16575 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16662 | bpm  |
| `ArrowDown` | ⇧ | 16680 |  |
| `ArrowDown` | — | 16831 | master — ←→ picks a channel, 0 stays here |
| `ArrowLeft` | — | 3351 | UNIT SIZE — horizontal |
| `ArrowLeft` | — | 9257 |  |
| `ArrowLeft` | — | 9268 | no backups yet |
| `ArrowLeft` | — | 9335 | inside the set: pick a channel |
| `ArrowLeft` | — | 15276 | destination cleared |
| `ArrowLeft` | — | 15586 |  |
| `ArrowLeft` | — | 15621 | ⌥a+⌫ = take it out for good |
| `ArrowLeft` | layer -1 | 15732 | the way in is the way out |
| `ArrowLeft` | — | 15737 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowLeft` | — | 16572 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowLeft` | — | 16708 |  |
| `ArrowRight` | — | 3351 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 3352 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 9257 |  |
| `ArrowRight` | set picker | 9258 |  |
| `ArrowRight` | — | 9268 | no backups yet |
| `ArrowRight` | set picker | 9269 | no backups yet |
| `ArrowRight` | — | 9335 | inside the set: pick a channel |
| `ArrowRight` | — | 9336 | inside the set: pick a channel |
| `ArrowRight` | — | 15276 | destination cleared |
| `ArrowRight` | dest browser + set picker | 15277 | destination cleared |
| `ArrowRight` | — | 15586 |  |
| `ArrowRight` | hold ⌥rack | 15588 | - = walk the rate |
| `ArrowRight` | — | 15621 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | — | 15622 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | layer -1 | 15732 | the way in is the way out |
| `ArrowRight` | — | 15737 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15738 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 16572 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16575 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16708 |  |
| `ArrowRight` | — | 16709 |  |
| `ArrowUp` | — | 3327 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 3328 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 15279 | destination cleared |
| `ArrowUp` | — | 15581 |  |
| `ArrowUp` | hold ⌥rack | 15583 |  |
| `ArrowUp` | — | 15617 | down = finer, the way the list reads |
| `ArrowUp` | — | 15659 | cmd+↑↓ = per-note prep tweak |
| `ArrowUp` | ⌥ + ⇧ + layer 2+ | 15660 | MOD learn: arm on a mod slot, map on a target param |
| `ArrowUp` | — | 15733 | the way in is the way out |
| `ArrowUp` | — | 15757 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15768 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 16572 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16575 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16575 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16662 | bpm  |
| `ArrowUp` | ⌘ + ⌥ | 16665 | bpm  |
| `ArrowUp` | ⇧ | 16680 |  |
| `ArrowUp` | — | 16684 | crop  |
| `ArrowUp` | — | 16831 | master — ←→ picks a channel, 0 stays here |
| `ArrowUp` | — | 16832 | master — ←→ picks a channel, 0 stays here |
| `Backquote` | ⌘ + ⌥ + dest browser + set picker | 16098 | caps shows the modcap first |
| `Backslash` | ⌘ + ⌥ | 16160 | DJ pads: full home row |
| `Backslash` | hold ` | 17619 | what the dice are for |
| `Backspace` | — | 3362 | ⟲ loop length cleared |
| `Backspace` | — | 3370 | nothing recorded to restore  (⇧⌫ clears the loop length) |
| `Backspace` | ⇧ | 9307 | slot  |
| `Backspace` | — | 15283 | destination cleared |
| `Backspace` | hold ⌥rack | 15567 |  |
| `Backspace` | hold ⌥rack | 15630 | ⌥a+⌫ = take it out for good |
| `Backspace` | — | 15916 | cue  |
| `Backspace` | — | 15928 | cue  |
| `Backspace` | hold n + hold digit | 16305 |  |
| `Backspace` | hold c | 16310 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab + ⇧ | 16320 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab | 16327 |  |
| `Backspace` | hold tab + hold digit + layer 2+ | 16336 | nothing loaded |
| `Backspace` | — | 16351 | no automation on  |
| `Backspace` | — | 17752 |  |
| `BracketLeft` | — | 15706 |  |
| `BracketLeft` | ⌘ + dest browser + set picker | 15971 |  |
| `BracketLeft` | — | 15973 |  |
| `BracketLeft` | — | 17680 | the digit is no longer held |
| `BracketRight` | — | 15705 |  |
| `BracketRight` | — | 15706 |  |
| `BracketRight` | ⌘ + dest browser + set picker | 15971 |  |
| `BracketRight` | — | 15987 | the pan keys dial too |
| `BracketRight` | — | 17681 | the digit is no longer held |
| `CapsLock` | — | 16142 | the state is read, not toggled |
| `Comma` | — | 15604 | , . = octaves |
| `Comma` | ⌘ + ⌥ | 16181 | keyboard vel  |
| `Comma` | — | 16220 | octave centred |
| `Comma` | — | 17682 | the digit is no longer held |
| `Enter` | — | 9260 |  |
| `Enter` | — | 9273 | no backups yet |
| `Enter` | — | 9342 | this empties all  |
| `Enter` | — | 15288 |  |
| `Enter` | layer -1 | 15732 | the way in is the way out |
| `Enter` | — | 15736 | the way in is the way out |
| `Enter` | — | 16117 |  |
| `Enter` | layer -1 | 17564 | macOS reports caps going OFF on the keyup |
| `Equal` | — | 15600 | - = walk the rate |
| `Equal` | — | 15601 | , . = octaves |
| `Equal` | hold tab + ⌘ + ⌃ | 15869 |  |
| `Equal` | ⌘ + layer 2+ | 15886 |  |
| `Equal` | — | 15888 |  |
| `Equal` | ⌘ + ⌃ + ⌥ + layer 2+ | 15899 |  |
| `Equal` | — | 15902 |  |
| `Equal` | — | 15916 | cue  |
| `Equal` | — | 15921 | cue  |
| `Equal` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15947 |  |
| `Equal` | ⇧ | 15949 |  |
| `Escape` | — | 9247 | cancelled |
| `Escape` | dest browser + set picker | 15275 | destination cleared |
| `Escape` | — | 15720 |  |
| `Escape` | layer -1 | 15732 | the way in is the way out |
| `Escape` | — | 15735 | the way in is the way out |
| `Escape` | — | 16118 |  |
| `Escape` | layer -1 | 17564 | macOS reports caps going OFF on the keyup |
| `Escape` | — | 17698 | ⟳ mic latched — esc again turns it off |
| `F1` | — | 15720 |  |
| `Minus` | — | 15600 | - = walk the rate |
| `Minus` | hold tab + ⌘ + ⌃ | 15869 |  |
| `Minus` | — | 15873 |  |
| `Minus` | ⌘ + layer 2+ | 15886 |  |
| `Minus` | ⌘ + ⌃ + ⌥ + layer 2+ | 15899 |  |
| `Minus` | — | 15916 | cue  |
| `Minus` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15947 |  |
| `Period` | — | 15604 | , . = octaves |
| `Period` | — | 15605 | there is no zeroth octave |
| `Period` | — | 15705 |  |
| `Period` | ⌘ + ⌥ | 16181 | keyboard vel  |
| `Period` | — | 16182 | keyboard vel  |
| `Period` | — | 17683 | the digit is no longer held |
| `Quote` | — | 15705 |  |
| `Quote` | — | 15707 |  |
| `Semicolon` | — | 15707 |  |
| `Slash` | set picker | 9288 | slot  |
| `Slash` | ⌘ + ⌃ + ⌥ + layer 2+ | 15408 |  |
| `Slash` | — | 15733 | the way in is the way out |
| `Slash` | — | 15770 | the dice key: a whole song (⇧⌥ = wild) |
| `Slash` | ⌥ | 16162 | DJ pads: full home row |
| `Slash` | layer -1 | 17564 | macOS reports caps going OFF on the keyup |
| `Slash` | hold / | 17621 | what the dice are for |
| `Space` | — | 9318 | copy out of what you are looking at |
| `Space` | — | 15786 | rec unlatched |
| `Tab` | — | 15787 | rec unlatched |
| `Tab` | — | 17771 | latch overlapped the hold: rec stays on |
| `Tab` | — | 17802 | the hold ended and nothing latched it: rec off |
