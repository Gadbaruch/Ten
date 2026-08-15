# TEN — key map

Generated from `index.html` by `tools/keymap.py`. Do not hand-edit —
regenerate it. A key table that is written by hand is wrong within a week.

196 bindings across 40 keys.

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
| `KeyB` | ⌘ + ⌃ | 9262 |  |
| `KeyB` | ⌃ | 16279 | tap tempo, on repeated taps |
| `KeyC` | ⌘ | 9331 | copy out of what you are looking at |
| `KeyC` | — | 15692 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | — | 15694 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | ⌃ + ⇧ | 16272 | ⌃o — how recording meets what is there |
| `KeyC` | hold c + hold v | 17475 |  |
| `KeyC` | hold c | 17649 | vel  |
| `KeyE` | — | 15685 | cmd+↑↓ = per-note prep tweak |
| `KeyI` | — | 15688 | cmd+↑↓ = per-note prep tweak |
| `KeyK` | ⌘ + ⌥ + ⇧ + layer 1+ | 15393 | ◎ source →  |
| `KeyL` | ⌘ | 15382 |  |
| `KeyM` | hold q + ⌥ + ⇧ + dest browser + set picker + layer 2+ | 16041 | nothing to modulate here |
| `KeyM` | hold q + ⌃ | 16265 | click  |
| `KeyM` | hold q + hold n + hold m | 17474 |  |
| `KeyM` | hold m | 17715 | the digit is no longer held |
| `KeyN` | ⌘ | 15376 | start a new set? enter confirms · esc cancels |
| `KeyN` | hold digit + ⌥ | 17004 |  |
| `KeyN` | hold q + hold n + hold m | 17474 |  |
| `KeyN` | hold n | 17653 | vel  |
| `KeyO` | ⌃ | 16274 | ⌃o — how recording meets what is there |
| `KeyP` | ⌘ + ⌃ + ⌥ + ⇧ + layer 1+ | 15407 | the way out is the key you came in on |
| `KeyQ` | hold q + ⌃ + layer 1+ | 16323 | Q — tap toggles live quantize · s snaps recorded notes · digits set the grid |
| `KeyQ` | hold q + ⌃ | 16330 | ⌃q = live-quantize toggle, everywhere |
| `KeyQ` | hold q + hold n + hold m | 17474 |  |
| `KeyQ` | hold q | 17709 | live quantize  |
| `KeyS` | ⌘ | 15369 | straight back to where it lives |
| `KeyS` | hold q + ⌃ | 16295 | …unless the q scope is open: q+s = snap |
| `KeyS` | hold q + layer 1+ | 16304 |  |
| `KeyS` | hold c + hold v | 17475 |  |
| `KeyS` | — | 17708 | live quantize  |
| `KeyT` | layer 0 | 16288 | t = timeline on/off (focus mode) |
| `KeyV` | — | 15692 | MOD learn: arm on a mod slot, map on a target param |
| `KeyV` | hold digit + ⌥ | 17008 |  |
| `KeyV` | hold c + hold v | 17475 |  |
| `KeyV` | hold v | 17654 | vel  |
| `KeyX` | — | 15692 | MOD learn: arm on a mod slot, map on a target param |
| `KeyX` | — | 15694 | MOD learn: arm on a mod slot, map on a target param |
| `KeyZ` | ⇧ | 15689 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 3339 | OFFSET the content — vertical, like the grid |
| `ArrowDown` | — | 15310 | destination cleared |
| `ArrowDown` | dest browser + set picker | 15312 | destination cleared |
| `ArrowDown` | — | 15612 |  |
| `ArrowDown` | — | 15648 | down = finer, the way the list reads |
| `ArrowDown` | — | 15649 | down = finer, the way the list reads |
| `ArrowDown` | — | 15690 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 15764 | the way in is the way out |
| `ArrowDown` | — | 15788 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowDown` | — | 16603 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16606 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16693 | bpm  |
| `ArrowDown` | ⇧ | 16711 |  |
| `ArrowDown` | — | 16862 | master — ←→ picks a channel, 0 stays here |
| `ArrowLeft` | — | 3363 | UNIT SIZE — horizontal |
| `ArrowLeft` | — | 9269 |  |
| `ArrowLeft` | — | 9280 | no backups yet |
| `ArrowLeft` | — | 9347 | inside the set: pick a channel |
| `ArrowLeft` | — | 15307 | destination cleared |
| `ArrowLeft` | — | 15617 |  |
| `ArrowLeft` | — | 15652 | ⌥a+⌫ = take it out for good |
| `ArrowLeft` | layer -1 | 15763 | the way in is the way out |
| `ArrowLeft` | — | 15768 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowLeft` | — | 16603 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowLeft` | — | 16739 |  |
| `ArrowRight` | — | 3363 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 3364 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 9269 |  |
| `ArrowRight` | set picker | 9270 |  |
| `ArrowRight` | — | 9280 | no backups yet |
| `ArrowRight` | set picker | 9281 | no backups yet |
| `ArrowRight` | — | 9347 | inside the set: pick a channel |
| `ArrowRight` | — | 9348 | inside the set: pick a channel |
| `ArrowRight` | — | 15307 | destination cleared |
| `ArrowRight` | dest browser + set picker | 15308 | destination cleared |
| `ArrowRight` | — | 15617 |  |
| `ArrowRight` | hold ⌥rack | 15619 | - = walk the rate |
| `ArrowRight` | — | 15652 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | — | 15653 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | layer -1 | 15763 | the way in is the way out |
| `ArrowRight` | — | 15768 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15769 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 16603 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16606 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16739 |  |
| `ArrowRight` | — | 16740 |  |
| `ArrowUp` | — | 3339 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 3340 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 15310 | destination cleared |
| `ArrowUp` | — | 15612 |  |
| `ArrowUp` | hold ⌥rack | 15614 |  |
| `ArrowUp` | — | 15648 | down = finer, the way the list reads |
| `ArrowUp` | — | 15690 | cmd+↑↓ = per-note prep tweak |
| `ArrowUp` | ⌥ + ⇧ + layer 2+ | 15691 | MOD learn: arm on a mod slot, map on a target param |
| `ArrowUp` | — | 15764 | the way in is the way out |
| `ArrowUp` | — | 15788 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15799 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 16603 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16606 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16606 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16693 | bpm  |
| `ArrowUp` | ⌘ + ⌥ | 16696 | bpm  |
| `ArrowUp` | ⇧ | 16711 |  |
| `ArrowUp` | — | 16715 | crop  |
| `ArrowUp` | — | 16862 | master — ←→ picks a channel, 0 stays here |
| `ArrowUp` | — | 16863 | master — ←→ picks a channel, 0 stays here |
| `Backquote` | ⌘ + ⌥ + dest browser + set picker | 16129 | caps shows the modcap first |
| `Backslash` | ⌘ + ⌥ | 16191 | DJ pads: full home row |
| `Backslash` | hold ` | 17658 | what the dice are for |
| `Backspace` | — | 3374 | ⟲ loop length cleared |
| `Backspace` | — | 3382 | nothing recorded to restore  (⇧⌫ clears the loop length) |
| `Backspace` | ⇧ | 9319 | slot  |
| `Backspace` | — | 15314 | destination cleared |
| `Backspace` | hold ⌥rack | 15598 |  |
| `Backspace` | hold ⌥rack | 15661 | ⌥a+⌫ = take it out for good |
| `Backspace` | — | 15947 | cue  |
| `Backspace` | — | 15959 | cue  |
| `Backspace` | hold n + hold digit | 16336 |  |
| `Backspace` | hold c | 16341 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab + ⇧ | 16351 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab | 16358 |  |
| `Backspace` | hold tab + hold digit + layer 2+ | 16367 | nothing loaded |
| `Backspace` | — | 16382 | no automation on  |
| `Backspace` | — | 17795 |  |
| `BracketLeft` | — | 15737 |  |
| `BracketLeft` | ⌘ + dest browser + set picker | 16002 |  |
| `BracketLeft` | — | 16004 |  |
| `BracketLeft` | — | 17723 | the digit is no longer held |
| `BracketRight` | — | 15736 |  |
| `BracketRight` | — | 15737 |  |
| `BracketRight` | ⌘ + dest browser + set picker | 16002 |  |
| `BracketRight` | — | 16018 | the pan keys dial too |
| `BracketRight` | — | 17724 | the digit is no longer held |
| `CapsLock` | — | 16173 | the state is read, not toggled |
| `Comma` | — | 15635 | , . = octaves |
| `Comma` | ⌘ + ⌥ | 16212 | keyboard vel  |
| `Comma` | — | 16251 | octave centred |
| `Comma` | — | 17725 | the digit is no longer held |
| `ControlLeft` | — | 12873 | a second ⌃ during the permission prompt must not build a second graph |
| `Enter` | — | 9272 |  |
| `Enter` | — | 9285 | no backups yet |
| `Enter` | — | 9354 | this empties all  |
| `Enter` | — | 15319 |  |
| `Enter` | layer -1 | 15763 | the way in is the way out |
| `Enter` | — | 15767 | the way in is the way out |
| `Enter` | — | 16148 |  |
| `Enter` | layer -1 | 17603 | macOS reports caps going OFF on the keyup |
| `Equal` | — | 15631 | - = walk the rate |
| `Equal` | — | 15632 | , . = octaves |
| `Equal` | hold tab + ⌘ + ⌃ | 15900 |  |
| `Equal` | ⌘ + layer 2+ | 15917 |  |
| `Equal` | — | 15919 |  |
| `Equal` | ⌘ + ⌃ + ⌥ + layer 2+ | 15930 |  |
| `Equal` | — | 15933 |  |
| `Equal` | — | 15947 | cue  |
| `Equal` | — | 15952 | cue  |
| `Equal` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15978 |  |
| `Equal` | ⇧ | 15980 |  |
| `Escape` | — | 9259 | cancelled |
| `Escape` | — | 15234 | tools key unchanged |
| `Escape` | dest browser + set picker | 15306 | destination cleared |
| `Escape` | — | 15751 |  |
| `Escape` | layer -1 | 15763 | the way in is the way out |
| `Escape` | — | 15766 | the way in is the way out |
| `Escape` | — | 16149 |  |
| `Escape` | layer -1 | 17603 | macOS reports caps going OFF on the keyup |
| `Escape` | — | 17741 | ⟳ mic latched — esc again turns it off |
| `F1` | — | 15751 |  |
| `Minus` | — | 15631 | - = walk the rate |
| `Minus` | hold tab + ⌘ + ⌃ | 15900 |  |
| `Minus` | — | 15904 |  |
| `Minus` | ⌘ + layer 2+ | 15917 |  |
| `Minus` | ⌘ + ⌃ + ⌥ + layer 2+ | 15930 |  |
| `Minus` | — | 15947 | cue  |
| `Minus` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15978 |  |
| `Period` | — | 15635 | , . = octaves |
| `Period` | — | 15636 | there is no zeroth octave |
| `Period` | — | 15736 |  |
| `Period` | ⌘ + ⌥ | 16212 | keyboard vel  |
| `Period` | — | 16213 | keyboard vel  |
| `Period` | — | 17726 | the digit is no longer held |
| `PrintScreen` | — | 12873 | a second ⌃ during the permission prompt must not build a second graph |
| `Quote` | — | 15736 |  |
| `Quote` | — | 15738 |  |
| `Semicolon` | — | 15738 |  |
| `Slash` | set picker | 9300 | slot  |
| `Slash` | ⌘ + ⌃ + ⌥ + layer 2+ | 15439 |  |
| `Slash` | — | 15764 | the way in is the way out |
| `Slash` | — | 15801 | the dice key: a whole song (⇧⌥ = wild) |
| `Slash` | ⌥ | 16193 | DJ pads: full home row |
| `Slash` | layer -1 | 17603 | macOS reports caps going OFF on the keyup |
| `Slash` | hold / | 17660 | what the dice are for |
| `Space` | — | 9330 | copy out of what you are looking at |
| `Space` | — | 15817 | rec unlatched |
| `Tab` | — | 15818 | rec unlatched |
| `Tab` | — | 17814 | latch overlapped the hold: rec stays on |
| `Tab` | — | 17845 | the hold ended and nothing latched it: rec off |
