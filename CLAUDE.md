# TEN — how to work on this

One file: `index.html`. No build step, no framework, no dependencies.
Live at gadbaruch.github.io/Ten/ · dev servers below — **3033 is Gad's, 3032 is
Claude's**, both serving this same directory (launch.json `ten-gad`,
`ten-main`).

**Read `NEXT.md` first.** It carries where the instrument stands, what is next
and in what order, and the traps that have each cost an hour. This file is the
rules; that one is the state.

## Starting a thread

Before anything else, get both environments up and hand Gad his:

1. Start BOTH servers if they are not running — `ten-gad` (3033) and `ten-main`
   (3032) — and **give him the link, `http://localhost:3033/`, in the first
   reply.** He tests in his OWN Chrome, and he should not have to go looking
   for the address or wonder whether the server is up.
   CHECK WHAT IS ACTUALLY ON THE PORT BEFORE HANDING IT OVER. Another
   session's worktree may already hold one: `lsof -nP -iTCP:<port> -sTCP:LISTEN`
   then `lsof -p <pid> | grep cwd`. A server whose cwd is not this directory is
   serving somebody else's branch, and a link to it is worse than no link —
   Gad tested a whole round against another worktree that way and every report
   from it was about code that is not here. Never kill another session's
   server; take a free port and say so.
2. Open Claude's own tab in the gstack browse window and **cut its speakers
   immediately**: `engine.comp.disconnect(AC.destination)`. Never assume a tab
   left open by a previous thread is clean — reload it, and check the build
   string is the one on disk.
3. Read `NEXT.md`. This file is the rules; that one is the state.

Localhost for him, not live: he should be testing the build that was just made,
not the last one pushed. Live is for confirming a ship.

## The loop, every time

1. Edit `index.html`.
2. Syntax-check by extracting every `<script>` block and running `node --check`
   on each. A broken template literal takes the whole page down and nothing
   else catches it.
3. Verify in the browser with a MEASUREMENT, not a look. Ask the running engine
   what its state is.
4. `tools/stamp.sh && git add -A && git commit && git push` — then poll the live
   URL until the build string matches. Not "should be live". Live.

Commit messages say WHY and what the evidence was — the numbers before and
after, not a list of files touched.

## Invariants

- **No backticks inside the worklet code strings.** They live in a template
  literal; one in a comment breaks the page.
- **TWO PORTS AND TWO BROWSERS, and this is a protocol, not a preference.**
  Gad plays on **localhost:3033** in his own Chrome. Claude tests on
  **localhost:3032**. Both serve THIS directory, so the bytes are identical and
  neither of us is ever wrong about which build the other is looking at —
  verify with `cmp` on the two fetched copies when it matters.
  The split is by ORIGIN because the session is stored by origin: the whole set
  autosaves to `localStorage['ten-v1']` on a timer whenever `dirtySave` is set,
  and a different port is a different origin. Probes set `dirtySave` constantly.
  Same port would mean Claude's scratch state and Gad's set fighting over one
  key, and the loser is the one with hours in it.

- **HIS PORT IS READ-ONLY. MINE IS DESTRUCTIVE.** Agreed 2026-08-15, and it is
  the working split:
    3033  Gad's. Read it to see a bug he is reporting. Never dial, never
          trigger, never `load()`, never clear storage. Leave his set alone.
    3032  Claude's. Be as destructive as the measurement needs — overwrite
          presets, stop the transport, wipe buffers, panic the engine.
  **His session cannot be read out of his browser.** localStorage does not
  cross browser profiles, so opening :3033 in Claude's browser gets his CODE
  and an empty set, never his state. When a bug depends on what he has set up,
  his set travels as a FILE: he exports it (`exportSet`, a `ten-set-*.json` in
  Downloads), Claude reads that path and `importSet`s it on 3032. Asking for the
  export is cheap; guessing at his state is how a session gets wasted.

- **HAND THE STATE BACK WHEN THE FIX IS IN.** His localStorage survives a plain
  reload, so once a fix is committed he reloads :3033 and keeps testing with
  everything where he left it — that is the normal path and needs nothing.
  The exception is a **save-format change**: bump SAVEV, change `serialize()`,
  or add a migration, and his stored set is now being read by code that has
  never seen it. Before shipping one of those, tell him to export first, and
  say plainly that it is a format change. `ten-v1-recover` catches a load that
  fails outright; it does not catch one that loads WRONG.

- **Say so the moment the tabs look crossed.** Trusted key events with codes
  nobody sent, S.curPreset moving between two probes, kbHeld holding a key no
  script pressed — any of those means he is typing into the tab being measured.
  Stop, tell him, and re-measure; do not reason about the numbers that came out.
  Never close the last tab in a window — the loop that closes all-but-one eats
  his when the ids have shifted.
- **TEST SILENTLY.** Cut the speakers on arrival in any test tab —
  `engine.comp.disconnect(AC.destination)` — and every measurement still works,
  because analysers are automatic pull nodes and the graph renders regardless.
  Verified: a kick measured 0.1869 audible, 0.1894 with the destination cut,
  0.1875 restored. He should not have to listen to a session's worth of test
  tones. Reconnect only if something genuinely needs to be heard, and say so.
- **Measure against the previous build, not against remembered numbers.** Open
  the live site in a second tab and run the identical script on both.
- **A preset change needs LIBV bumped and the factory half re-laid**, or the
  stored library shadows the definition in this file forever.
- **`adjust()` wants a NUMBER as its multiplier.** `audAction(1,{})` writes NaN
  into a param, which reaches the worklet, which silences that channel.
- Syntax checks pass on TDZ bugs. Exercise a keystroke before believing a page.

## PARAM FOCUS — the modifiers inside a held scope

Gad's name for it, and worth having one. While a magnetized scope is open the
arrows, `-/=` and the letters belong to THAT param, and so do the modifiers:

- `⇧`  coarse step. Both shifts, and it is ONLY a step here — it must not arm
       the scope's latch, because reaching for a bigger bite out of a decay is
       not a request to leave the scope open.
- `⌥`  fine step — but ONLY when the scope is held by its LETTER. Tap the
       letter and let go and the scope rides on ⌥ through ALTSUS, at which
       point ⌥ is STRUCTURE, not a modifier: it is down for every arrow you
       press, so reading it as "fine" pins the step at 0.1 forever and makes ⇧
       unreachable. `magMult(e,H)` asks which case it is in.
- Neither shift may close a scope ⌥ is still holding. ⇧R can hold one open by
  itself, so its release closes the ones IT holds — check ⌥ first.

The row a held scope owns is the two arrow pairs plus a TABLE of key pairs,
`MAGPAIR`, so adding one to a scope is one entry in its `mag` object:

    ↑↓  pri     ←→  sec     -/= amt     [ ] typ     , . wid     ; ' mde

Each cell may be a function of the slot. `⇧` (the global modifier) on ANY pair
grows or shrinks the family through `magGrow`, which calls the scope's own
`make`/`unmake` — never the page's `addSlotHere`, which works on the strip's
cursor and knows nothing about which rack the letter opened.

**WHO OWNS A SCOPE LETTER — one rule, and it decides the whole gesture:**

    HELD scope   (its letter is still down)   its letters are SUB-FIELDS
    RIDING scope (letter up, ⌥ still down)    its letters SWITCH scope

So `⌥`+hold `e` reaches a/d/s/r, and `⌥`+tap `e` then tap `f` walks from the
env to the filter without ever letting go of `⌥`. `ALTSUS.has(HOLD.opt.c)` is
the test for which case you are in.

The digits, the arrows, `-/=` and `[ ]` are deliberately OUTSIDE this — they
work whether the letter is down or not, because holding a letter to change
slot is the one thing Gad ruled out. Switching out of a riding scope must
`ALTSUS.delete` the old letter: its key-up has already happened, so nothing
else will ever take it out.

The cost, and it is real: while a scope rides, the ~15 OPTRACK letters no
longer play notes — they switch. Every other letter still plays.

The rule behind all three: **a key that is holding something open is not also a
modifier of it.** Any new modifier in a scope gets asked that question.

## THE FOUR MODIFIERS, and which is which

Rearranged 2026-08-15 (Gad). Each one now means exactly one thing:

    ` (and ScrollLock/Pause/Insert)  LATCH — notes, scopes, rec, mute/solo.
                                   `KM.sl`, and every reader of it is
                                   unchanged: only who SETS it moved.
    left shift   `KM.shl`          GLOBAL — and it SILENCES the keyboard while
                                   it is down, the way ⌃ and ⌘ do, because
                                   every letter under it is a candidate for an
                                   instrument-wide setting. The
                                   instrument-wide settings:
                                   ⇧q quantize · ⇧o overdub · ⇧b tap tempo ·
                                   ⇧m click · ⇧esc settings. `gblOf()`.
    right shift  `KM.sr`           NAVIGATION and DIALS only — loop lengths,
                                   the coarse step, walking a rack. `rs()`.
    left ⌥       `HOLD.t`          TOOLS — c/x/v, z (⇧z redo), s. A second ⌘.
    left ctrl    `KM.scp`          THE CHANNEL'S SCOPES (what ⌥ used to be).
                 `SCOPEKEY`        Defaults ControlLeft + NumLock; learnable.
       ⌥ and ctrl SWAPPED (Gad, 2026-08-15). Everything still calls altOf() —
       only what it asks changed, which is what makes a swap this wide safe.
       Every scope handler had a `!e.ctrlKey` guard meaning "a modified letter
       is not a note"; control IS the scope modifier now, so those guards were
       refusing the scope its own key and had to go. gblOf dropped ctrl for the
       same reason — ctrl+q would have been the quality scope AND quantize.
                 `TOOLKEY`         Defaults AltLeft/AltRight; learnable.
       **TOOLS IS ARMED, NOT HELD.** PrintScreen does not deliver a normal
       press: the OS treats it as a ONE-SHOT and sends keydown and keyup
       together, or only the keyup. It worked as the mic because mic on/off is
       a TOGGLE and a toggle needs one edge; a hold needs the key still down
       when the letter lands, and it never is. So either edge ARMS the layer,
       the next c/x/v/z/s spends it, a second tap cancels, and it lapses after
       2.5s so one edge can never leave it stuck. Edges inside 250ms are ONE
       tap — the pair belonging to a single press must not read as two, in
       either direction. A real control key still behaves as a hold.
    ⌥                              the CHANNEL's scopes, unchanged.

Latch was on left shift and that is what forced the compromise where ⇧ inside
a held scope could not arm a latch (it had to be the coarse step). With latch
on its own key both are true again and the exemption is gone.

**Escape is the mic AND the way out**, told apart by the clock: a TAP escapes,
a HOLD past 200ms opens the mic while you lean on it. The order matters —
the mic must not open on the key going DOWN, because getUserMedia prompts for
permission the first time and every escape you ever pressed would have gone
through a browser dialog to get there. So escape's own work runs from the
key-UP, where it can still see whether anything else was pressed.
Right ctrl is still a mic key as a fallback.

## Scope

Ship exactly what was asked, and say plainly what it breaks. Do not widen a
request because the wider version seems better — raise it and let Gad choose.
He has corrected this twice; it is the failure mode to watch.
