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

## Scope

Ship exactly what was asked, and say plainly what it breaks. Do not widen a
request because the wider version seems better — raise it and let Gad choose.
He has corrected this twice; it is the failure mode to watch.
