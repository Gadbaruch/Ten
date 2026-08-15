# TEN — key map

Generated from `index.html` by `tools/keymap.py`. Do not hand-edit —
regenerate it. A key table that is written by hand is wrong within a week.

202 bindings across 45 keys.

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
| `KeyB` | ⌘ + ⌃ | 9288 |  |
| `KeyB` | ⌃ | 16308 | tap tempo, on repeated taps |
| `KeyC` | ⌘ | 9357 | copy out of what you are looking at |
| `KeyC` | — | 15721 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | — | 15723 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | ⌃ + ⇧ | 16301 | ⌃o — how recording meets what is there |
| `KeyC` | hold c + hold v | 17507 |  |
| `KeyC` | hold c | 17677 | vel  |
| `KeyE` | — | 15714 | cmd+↑↓ = per-note prep tweak |
| `KeyI` | — | 15717 | cmd+↑↓ = per-note prep tweak |
| `KeyK` | ⌘ + ⌥ + ⇧ + layer 1+ | 15422 | ◎ source →  |
| `KeyL` | ⌘ | 15411 |  |
| `KeyM` | hold q + ⌥ + ⇧ + dest browser + set picker + layer 2+ | 16070 | nothing to modulate here |
| `KeyM` | hold q + ⌃ | 16294 | click  |
| `KeyM` | hold q + hold n + hold m | 17506 |  |
| `KeyM` | hold m | 17743 |  |
| `KeyN` | ⌘ | 15405 | start a new set? enter confirms · esc cancels |
| `KeyN` | hold digit + ⌥ | 17033 |  |
| `KeyN` | hold q + hold n + hold m | 17506 |  |
| `KeyN` | hold n | 17681 | vel  |
| `KeyO` | ⌃ | 16303 | ⌃o — how recording meets what is there |
| `KeyP` | ⌘ + ⌃ + ⌥ + ⇧ + layer 1+ | 15436 | the way out is the key you came in on |
| `KeyQ` | hold q + ⌃ + layer 1+ | 16352 | Q — tap toggles live quantize · s snaps recorded notes · digits set the grid |
| `KeyQ` | hold q + ⌃ | 16359 | ⌃q = live-quantize toggle, everywhere |
| `KeyQ` | hold q + hold n + hold m | 17506 |  |
| `KeyQ` | hold q | 17737 | live quantize  |
| `KeyS` | ⌘ | 15398 | straight back to where it lives |
| `KeyS` | hold q + ⌃ | 16324 | …unless the q scope is open: q+s = snap |
| `KeyS` | hold q + layer 1+ | 16333 |  |
| `KeyS` | hold c + hold v | 17507 |  |
| `KeyS` | — | 17736 | live quantize  |
| `KeyT` | layer 0 | 16317 | t = timeline on/off (focus mode) |
| `KeyV` | — | 15721 | MOD learn: arm on a mod slot, map on a target param |
| `KeyV` | hold digit + ⌥ | 17037 |  |
| `KeyV` | hold c + hold v | 17507 |  |
| `KeyV` | hold v | 17682 | vel  |
| `KeyX` | — | 15721 | MOD learn: arm on a mod slot, map on a target param |
| `KeyX` | — | 15723 | MOD learn: arm on a mod slot, map on a target param |
| `KeyZ` | ⇧ | 15718 | cmd+↑↓ = per-note prep tweak |
| `AltLeft` | — | 12899 | a second ⌃ during the permission prompt must not build a second graph |
| `AltRight` | — | 12899 | a second ⌃ during the permission prompt must not build a second graph |
| `ArrowDown` | — | 3355 | OFFSET the content — vertical, like the grid |
| `ArrowDown` | — | 15338 | destination cleared |
| `ArrowDown` | dest browser + set picker | 15340 | destination cleared |
| `ArrowDown` | — | 15641 |  |
| `ArrowDown` | — | 15677 | down = finer, the way the list reads |
| `ArrowDown` | — | 15678 | down = finer, the way the list reads |
| `ArrowDown` | — | 15719 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 15793 | the way in is the way out |
| `ArrowDown` | — | 15817 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowDown` | — | 16632 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16635 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16722 | bpm  |
| `ArrowDown` | ⇧ | 16740 |  |
| `ArrowDown` | — | 16891 | master — ←→ picks a channel, 0 stays here |
| `ArrowLeft` | — | 3379 | UNIT SIZE — horizontal |
| `ArrowLeft` | — | 9295 |  |
| `ArrowLeft` | — | 9306 | no backups yet |
| `ArrowLeft` | — | 9373 | inside the set: pick a channel |
| `ArrowLeft` | — | 15335 | destination cleared |
| `ArrowLeft` | — | 15646 |  |
| `ArrowLeft` | — | 15681 | ⌥a+⌫ = take it out for good |
| `ArrowLeft` | layer -1 | 15792 | the way in is the way out |
| `ArrowLeft` | — | 15797 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowLeft` | — | 16632 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowLeft` | — | 16768 |  |
| `ArrowRight` | — | 3379 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 3380 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 9295 |  |
| `ArrowRight` | set picker | 9296 |  |
| `ArrowRight` | — | 9306 | no backups yet |
| `ArrowRight` | set picker | 9307 | no backups yet |
| `ArrowRight` | — | 9373 | inside the set: pick a channel |
| `ArrowRight` | — | 9374 | inside the set: pick a channel |
| `ArrowRight` | — | 15335 | destination cleared |
| `ArrowRight` | dest browser + set picker | 15336 | destination cleared |
| `ArrowRight` | — | 15646 |  |
| `ArrowRight` | hold ⌥rack | 15648 | - = walk the rate |
| `ArrowRight` | — | 15681 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | — | 15682 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | layer -1 | 15792 | the way in is the way out |
| `ArrowRight` | — | 15797 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15798 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 16632 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16635 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16768 |  |
| `ArrowRight` | — | 16769 |  |
| `ArrowUp` | — | 3355 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 3356 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 15338 | destination cleared |
| `ArrowUp` | — | 15641 |  |
| `ArrowUp` | hold ⌥rack | 15643 |  |
| `ArrowUp` | — | 15677 | down = finer, the way the list reads |
| `ArrowUp` | — | 15719 | cmd+↑↓ = per-note prep tweak |
| `ArrowUp` | ⌥ + ⇧ + layer 2+ | 15720 | MOD learn: arm on a mod slot, map on a target param |
| `ArrowUp` | — | 15793 | the way in is the way out |
| `ArrowUp` | — | 15817 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15828 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 16632 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16635 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16635 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16722 | bpm  |
| `ArrowUp` | ⌘ + ⌥ | 16725 | bpm  |
| `ArrowUp` | ⇧ | 16740 |  |
| `ArrowUp` | — | 16744 | crop  |
| `ArrowUp` | — | 16891 | master — ←→ picks a channel, 0 stays here |
| `ArrowUp` | — | 16892 | master — ←→ picks a channel, 0 stays here |
| `Backquote` | — | 2563 |  |
| `Backquote` | ⌘ + ⌥ + dest browser + set picker | 16158 | caps shows the modcap first |
| `Backslash` | ⌘ + ⌥ | 16220 | DJ pads: full home row |
| `Backslash` | hold ` | 17686 | what the dice are for |
| `Backspace` | — | 3390 | ⟲ loop length cleared |
| `Backspace` | — | 3398 | nothing recorded to restore  (⇧⌫ clears the loop length) |
| `Backspace` | ⇧ | 9345 | slot  |
| `Backspace` | — | 15342 | destination cleared |
| `Backspace` | hold ⌥rack | 15627 |  |
| `Backspace` | hold ⌥rack | 15690 | ⌥a+⌫ = take it out for good |
| `Backspace` | — | 15976 | cue  |
| `Backspace` | — | 15988 | cue  |
| `Backspace` | hold n + hold digit | 16365 |  |
| `Backspace` | hold c | 16370 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab + ⇧ | 16380 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab | 16387 |  |
| `Backspace` | hold tab + hold digit + layer 2+ | 16396 | nothing loaded |
| `Backspace` | — | 16411 | no automation on  |
| `Backspace` | — | 17827 |  |
| `BracketLeft` | — | 15766 |  |
| `BracketLeft` | ⌘ + dest browser + set picker | 16031 |  |
| `BracketLeft` | — | 16033 |  |
| `BracketLeft` | — | 17755 | the digit is no longer held |
| `BracketRight` | — | 15765 |  |
| `BracketRight` | — | 15766 |  |
| `BracketRight` | ⌘ + dest browser + set picker | 16031 |  |
| `BracketRight` | — | 16047 | the pan keys dial too |
| `BracketRight` | — | 17756 | the digit is no longer held |
| `CapsLock` | — | 16202 | the state is read, not toggled |
| `Comma` | — | 15664 | , . = octaves |
| `Comma` | ⌘ + ⌥ | 16241 | keyboard vel  |
| `Comma` | — | 16280 | octave centred |
| `Comma` | — | 17757 | the digit is no longer held |
| `ControlLeft` | — | 2577 |  |
| `Enter` | — | 9298 |  |
| `Enter` | — | 9311 | no backups yet |
| `Enter` | — | 9380 | this empties all  |
| `Enter` | — | 15347 |  |
| `Enter` | layer -1 | 15792 | the way in is the way out |
| `Enter` | — | 15796 | the way in is the way out |
| `Enter` | — | 16177 |  |
| `Enter` | layer -1 | 17636 | macOS reports caps going OFF on the keyup |
| `Equal` | — | 15660 | - = walk the rate |
| `Equal` | — | 15661 | , . = octaves |
| `Equal` | hold tab + ⌘ + ⌃ | 15929 |  |
| `Equal` | ⌘ + layer 2+ | 15946 |  |
| `Equal` | — | 15948 |  |
| `Equal` | ⌘ + ⌥ + layer 2+ | 15959 |  |
| `Equal` | — | 15962 |  |
| `Equal` | — | 15976 | cue  |
| `Equal` | — | 15981 | cue  |
| `Equal` | hold tab + ⌘ + ⌥ + dest browser + set picker | 16007 |  |
| `Equal` | ⇧ | 16009 |  |
| `Escape` | — | 9285 | cancelled |
| `Escape` | — | 15261 |  |
| `Escape` | dest browser + set picker | 15334 | destination cleared |
| `Escape` | — | 15780 |  |
| `Escape` | layer -1 | 15792 | the way in is the way out |
| `Escape` | — | 15795 | the way in is the way out |
| `Escape` | — | 16178 |  |
| `Escape` | layer -1 | 17636 | macOS reports caps going OFF on the keyup |
| `Escape` | — | 17773 | ⟳ mic latched — esc again turns it off |
| `F1` | — | 15780 |  |
| `Insert` | — | 2563 |  |
| `Minus` | — | 15660 | - = walk the rate |
| `Minus` | hold tab + ⌘ + ⌃ | 15929 |  |
| `Minus` | — | 15933 |  |
| `Minus` | ⌘ + layer 2+ | 15946 |  |
| `Minus` | ⌘ + ⌥ + layer 2+ | 15959 |  |
| `Minus` | — | 15976 | cue  |
| `Minus` | hold tab + ⌘ + ⌥ + dest browser + set picker | 16007 |  |
| `NumLock` | — | 2577 |  |
| `Pause` | — | 2563 |  |
| `Period` | — | 15664 | , . = octaves |
| `Period` | — | 15665 | there is no zeroth octave |
| `Period` | — | 15765 |  |
| `Period` | ⌘ + ⌥ | 16241 | keyboard vel  |
| `Period` | — | 16242 | keyboard vel  |
| `Period` | — | 17758 | the digit is no longer held |
| `Quote` | — | 15765 |  |
| `Quote` | — | 15767 |  |
| `ScrollLock` | — | 2563 |  |
| `Semicolon` | — | 15767 |  |
| `Slash` | set picker | 9326 | slot  |
| `Slash` | ⌘ + ⌥ + layer 2+ | 15468 |  |
| `Slash` | — | 15793 | the way in is the way out |
| `Slash` | — | 15830 | the dice key: a whole song (⇧⌥ = wild) |
| `Slash` | ⌥ | 16222 | DJ pads: full home row |
| `Slash` | layer -1 | 17636 | macOS reports caps going OFF on the keyup |
| `Slash` | hold / | 17688 | what the dice are for |
| `Space` | — | 9356 | copy out of what you are looking at |
| `Space` | — | 15846 | rec unlatched |
| `Tab` | — | 15847 | rec unlatched |
| `Tab` | — | 17846 | latch overlapped the hold: rec stays on |
| `Tab` | — | 17877 | the hold ended and nothing latched it: rec off |
