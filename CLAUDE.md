# TEN — how to work on this

One file: `index.html`. No build step, no framework, no dependencies.
Live at gadbaruch.github.io/Ten/ · dev server `npx serve -l 3031 .` (launch.json
config name `ten`).

**Read `NEXT.md` first.** It carries where the instrument stands, what is next
and in what order, and the traps that have each cost an hour. This file is the
rules; that one is the state.

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
- **The gstack browse window is Claude's.** Gad plays in his own browser. That
  window is headed and takes focus, so anything typed while a probe is running
  lands in the tab being measured and moves state mid-run. Never close the last
  tab in it.
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
