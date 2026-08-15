# TEN — how to work on this

One file: `index.html`. No build step, no framework, no dependencies.
Live at gadbaruch.github.io/Ten/ · dev server `npx serve -l 3031 .` (launch.json
config name `ten`).

**Read `NEXT.md` first.** It carries where the instrument stands, what is next
and in what order, and the traps that have each cost an hour. This file is the
rules; that one is the state.

## Starting a thread

Before anything else, get both environments up and hand Gad his:

1. Start the dev server if it is not running (`launch.json` name `ten`, port
   3031) and **give him the link — `http://localhost:3031/` — in the first
   reply.** He tests in his OWN Chrome, and he should not have to go looking
   for the address or wonder whether the server is up.
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
- **THE TWO BROWSERS ARE SEPARATE, and this is a protocol, not a preference.**
  The gstack browse window ("Google Chrome for Testing", its own profile) is
  Claude's. Gad plays in his own Chrome, on localhost:3031 — localhost so he is
  testing the build that was just made rather than the last one pushed, and live
  only to confirm. The browse window is headed and takes focus, so anything
  typed while a probe runs lands in the tab being measured and moves state under
  it: this produced a whole reported bug that did not exist (see the rebuildRack
  commit). Never close the last tab in that window — the loop that closes
  all-but-one eats his when the ids have shifted.
  **Say so the moment it looks crossed.** Trusted key events with codes nobody
  sent, S.curPreset moving between two probes, kbHeld holding a key no script
  pressed — any of those means he is typing into the test tab. Stop, tell him,
  and re-measure; do not reason about the numbers that came out.
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
