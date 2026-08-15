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
| `KeyB` | ⌘ + ⌃ | 9205 |  |
| `KeyB` | ⌃ | 16196 | tap tempo, on repeated taps |
| `KeyC` | ⌘ | 9274 | copy out of what you are looking at |
| `KeyC` | — | 15609 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | — | 15611 | MOD learn: arm on a mod slot, map on a target param |
| `KeyC` | ⌃ + ⇧ | 16189 | ⌃o — how recording meets what is there |
| `KeyC` | hold c + hold v | 17392 |  |
| `KeyC` | hold c | 17558 | vel  |
| `KeyE` | — | 15602 | cmd+↑↓ = per-note prep tweak |
| `KeyI` | — | 15605 | cmd+↑↓ = per-note prep tweak |
| `KeyK` | ⌘ + ⌥ + ⇧ + layer 1+ | 15310 | ◎ source →  |
| `KeyL` | ⌘ | 15299 |  |
| `KeyM` | hold q + ⌥ + ⇧ + dest browser + set picker + layer 2+ | 15958 | nothing to modulate here |
| `KeyM` | hold q + ⌃ | 16182 | click  |
| `KeyM` | hold q + hold n + hold m | 17391 |  |
| `KeyM` | hold m | 17624 | the digit is no longer held |
| `KeyN` | ⌘ | 15293 | start a new set? enter confirms · esc cancels |
| `KeyN` | hold digit + ⌥ | 16921 |  |
| `KeyN` | hold q + hold n + hold m | 17391 |  |
| `KeyN` | hold n | 17562 | vel  |
| `KeyO` | ⌃ | 16191 | ⌃o — how recording meets what is there |
| `KeyP` | ⌘ + ⌃ + ⌥ + ⇧ + layer 1+ | 15324 | the way out is the key you came in on |
| `KeyQ` | hold q + ⌃ + layer 1+ | 16240 | Q — tap toggles live quantize · s snaps recorded notes · digits set the grid |
| `KeyQ` | hold q + ⌃ | 16247 | ⌃q = live-quantize toggle, everywhere |
| `KeyQ` | hold q + hold n + hold m | 17391 |  |
| `KeyQ` | hold q | 17618 | live quantize  |
| `KeyS` | ⌘ | 15286 | straight back to where it lives |
| `KeyS` | hold q + ⌃ | 16212 | …unless the q scope is open: q+s = snap |
| `KeyS` | hold q + layer 1+ | 16221 |  |
| `KeyS` | hold c + hold v | 17392 |  |
| `KeyS` | — | 17617 | live quantize  |
| `KeyT` | layer 0 | 16205 | t = timeline on/off (focus mode) |
| `KeyV` | — | 15609 | MOD learn: arm on a mod slot, map on a target param |
| `KeyV` | hold digit + ⌥ | 16925 |  |
| `KeyV` | hold c + hold v | 17392 |  |
| `KeyV` | hold v | 17563 | vel  |
| `KeyX` | — | 15609 | MOD learn: arm on a mod slot, map on a target param |
| `KeyX` | — | 15611 | MOD learn: arm on a mod slot, map on a target param |
| `KeyZ` | ⇧ | 15606 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 3267 | OFFSET the content — vertical, like the grid |
| `ArrowDown` | — | 15234 | destination cleared |
| `ArrowDown` | dest browser + set picker | 15236 | destination cleared |
| `ArrowDown` | — | 15529 |  |
| `ArrowDown` | — | 15565 | down = finer, the way the list reads |
| `ArrowDown` | — | 15566 | down = finer, the way the list reads |
| `ArrowDown` | — | 15607 | cmd+↑↓ = per-note prep tweak |
| `ArrowDown` | — | 15681 | the way in is the way out |
| `ArrowDown` | — | 15705 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowDown` | — | 16520 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16523 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowDown` | — | 16610 | bpm  |
| `ArrowDown` | ⇧ | 16628 |  |
| `ArrowDown` | — | 16779 | master — ←→ picks a channel, 0 stays here |
| `ArrowLeft` | — | 3291 | UNIT SIZE — horizontal |
| `ArrowLeft` | — | 9212 |  |
| `ArrowLeft` | — | 9223 | no backups yet |
| `ArrowLeft` | — | 9290 | inside the set: pick a channel |
| `ArrowLeft` | — | 15231 | destination cleared |
| `ArrowLeft` | — | 15534 |  |
| `ArrowLeft` | — | 15569 | ⌥a+⌫ = take it out for good |
| `ArrowLeft` | layer -1 | 15680 | the way in is the way out |
| `ArrowLeft` | — | 15685 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowLeft` | — | 16520 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowLeft` | — | 16656 |  |
| `ArrowRight` | — | 3291 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 3292 | UNIT SIZE — horizontal |
| `ArrowRight` | — | 9212 |  |
| `ArrowRight` | set picker | 9213 |  |
| `ArrowRight` | — | 9223 | no backups yet |
| `ArrowRight` | set picker | 9224 | no backups yet |
| `ArrowRight` | — | 9290 | inside the set: pick a channel |
| `ArrowRight` | — | 9291 | inside the set: pick a channel |
| `ArrowRight` | — | 15231 | destination cleared |
| `ArrowRight` | dest browser + set picker | 15232 | destination cleared |
| `ArrowRight` | — | 15534 |  |
| `ArrowRight` | hold ⌥rack | 15536 | - = walk the rate |
| `ArrowRight` | — | 15569 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | — | 15570 | ⌥a+⌫ = take it out for good |
| `ArrowRight` | layer -1 | 15680 | the way in is the way out |
| `ArrowRight` | — | 15685 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 15686 | ⇧←→ jumps section, like ⇧←→ jumps rack |
| `ArrowRight` | — | 16520 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16523 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowRight` | — | 16656 |  |
| `ArrowRight` | — | 16657 |  |
| `ArrowUp` | — | 3267 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 3268 | OFFSET the content — vertical, like the grid |
| `ArrowUp` | — | 15234 | destination cleared |
| `ArrowUp` | — | 15529 |  |
| `ArrowUp` | hold ⌥rack | 15531 |  |
| `ArrowUp` | — | 15565 | down = finer, the way the list reads |
| `ArrowUp` | — | 15607 | cmd+↑↓ = per-note prep tweak |
| `ArrowUp` | ⌥ + ⇧ + layer 2+ | 15608 | MOD learn: arm on a mod slot, map on a target param |
| `ArrowUp` | — | 15681 | the way in is the way out |
| `ArrowUp` | — | 15705 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 15716 | the dice key: a whole song (⇧⌥ = wild) |
| `ArrowUp` | — | 16520 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16523 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16523 | THE SCALE: ←→ scale · ↑↓ key |
| `ArrowUp` | — | 16610 | bpm  |
| `ArrowUp` | ⌘ + ⌥ | 16613 | bpm  |
| `ArrowUp` | ⇧ | 16628 |  |
| `ArrowUp` | — | 16632 | crop  |
| `ArrowUp` | — | 16779 | master — ←→ picks a channel, 0 stays here |
| `ArrowUp` | — | 16780 | master — ←→ picks a channel, 0 stays here |
| `Backquote` | ⌘ + ⌥ + dest browser + set picker | 16046 | caps shows the modcap first |
| `Backslash` | ⌘ + ⌥ | 16108 | DJ pads: full home row |
| `Backslash` | hold ` | 17567 | what the dice are for |
| `Backspace` | — | 3302 | ⟲ loop length cleared |
| `Backspace` | — | 3310 | nothing recorded to restore  (⇧⌫ clears the loop length) |
| `Backspace` | ⇧ | 9262 | slot  |
| `Backspace` | — | 15238 | destination cleared |
| `Backspace` | hold ⌥rack | 15515 |  |
| `Backspace` | hold ⌥rack | 15578 | ⌥a+⌫ = take it out for good |
| `Backspace` | — | 15864 | cue  |
| `Backspace` | — | 15876 | cue  |
| `Backspace` | hold n + hold digit | 16253 |  |
| `Backspace` | hold c | 16258 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab + ⇧ | 16268 | press space — erase happens as the playhead passes |
| `Backspace` | hold tab | 16275 |  |
| `Backspace` | hold tab + hold digit + layer 2+ | 16284 | nothing loaded |
| `Backspace` | — | 16299 | no automation on  |
| `Backspace` | — | 17698 |  |
| `BracketLeft` | — | 15654 |  |
| `BracketLeft` | ⌘ + dest browser + set picker | 15919 |  |
| `BracketLeft` | — | 15921 |  |
| `BracketLeft` | — | 17626 | the digit is no longer held |
| `BracketRight` | — | 15653 |  |
| `BracketRight` | — | 15654 |  |
| `BracketRight` | ⌘ + dest browser + set picker | 15919 |  |
| `BracketRight` | — | 15935 | the pan keys dial too |
| `BracketRight` | — | 17627 | the digit is no longer held |
| `CapsLock` | — | 16090 | the state is read, not toggled |
| `Comma` | — | 15552 | , . = octaves |
| `Comma` | ⌘ + ⌥ | 16129 | keyboard vel  |
| `Comma` | — | 16168 | octave centred |
| `Comma` | — | 17628 | the digit is no longer held |
| `Enter` | — | 9215 |  |
| `Enter` | — | 9228 | no backups yet |
| `Enter` | — | 9297 | this empties all  |
| `Enter` | — | 15243 |  |
| `Enter` | layer -1 | 15680 | the way in is the way out |
| `Enter` | — | 15684 | the way in is the way out |
| `Enter` | — | 16065 |  |
| `Enter` | layer -1 | 17512 | macOS reports caps going OFF on the keyup |
| `Equal` | — | 15548 | - = walk the rate |
| `Equal` | — | 15549 | , . = octaves |
| `Equal` | hold tab + ⌘ + ⌃ | 15817 |  |
| `Equal` | ⌘ + layer 2+ | 15834 |  |
| `Equal` | — | 15836 |  |
| `Equal` | ⌘ + ⌃ + ⌥ + layer 2+ | 15847 |  |
| `Equal` | — | 15850 |  |
| `Equal` | — | 15864 | cue  |
| `Equal` | — | 15869 | cue  |
| `Equal` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15895 |  |
| `Equal` | ⇧ | 15897 |  |
| `Escape` | — | 9202 | cancelled |
| `Escape` | dest browser + set picker | 15230 | destination cleared |
| `Escape` | — | 15668 |  |
| `Escape` | layer -1 | 15680 | the way in is the way out |
| `Escape` | — | 15683 | the way in is the way out |
| `Escape` | — | 16066 |  |
| `Escape` | layer -1 | 17512 | macOS reports caps going OFF on the keyup |
| `Escape` | — | 17644 | ⟳ mic latched — esc again turns it off |
| `F1` | — | 15668 |  |
| `Minus` | — | 15548 | - = walk the rate |
| `Minus` | hold tab + ⌘ + ⌃ | 15817 |  |
| `Minus` | — | 15821 |  |
| `Minus` | ⌘ + layer 2+ | 15834 |  |
| `Minus` | ⌘ + ⌃ + ⌥ + layer 2+ | 15847 |  |
| `Minus` | — | 15864 | cue  |
| `Minus` | hold tab + ⌘ + ⌥ + dest browser + set picker | 15895 |  |
| `Period` | — | 15552 | , . = octaves |
| `Period` | — | 15553 | there is no zeroth octave |
| `Period` | — | 15653 |  |
| `Period` | ⌘ + ⌥ | 16129 | keyboard vel  |
| `Period` | — | 16130 | keyboard vel  |
| `Period` | — | 17629 | the digit is no longer held |
| `Quote` | — | 15653 |  |
| `Quote` | — | 15655 |  |
| `Semicolon` | — | 15655 |  |
| `Slash` | set picker | 9243 | slot  |
| `Slash` | ⌘ + ⌃ + ⌥ + layer 2+ | 15356 |  |
| `Slash` | — | 15681 | the way in is the way out |
| `Slash` | — | 15718 | the dice key: a whole song (⇧⌥ = wild) |
| `Slash` | ⌥ | 16110 | DJ pads: full home row |
| `Slash` | layer -1 | 17512 | macOS reports caps going OFF on the keyup |
| `Slash` | hold / | 17569 | what the dice are for |
| `Space` | — | 9273 | copy out of what you are looking at |
| `Space` | — | 15734 | rec unlatched |
| `Tab` | — | 15735 | rec unlatched |
| `Tab` | — | 17717 | latch overlapped the hold: rec stays on |
| `Tab` | — | 17748 | the hold ended and nothing latched it: rec off |
