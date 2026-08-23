#!/bin/bash
# TEN — run one named measurement from tools/probe.js, in one call.
#
#     tools/probe.sh help
#     tools/probe.sh preset names=SNR,S909,S808,S606 note=48
#     tools/probe.sh matrix ch=8
#     tools/probe.sh cursor chs=9
#     tools/probe.sh key code=KeyA
#     tools/probe.sh matrix --ab https://gadbaruch.github.io/Ten/
#     tools/probe.sh level --json          # the raw result, for a script
#
# What it does that a hand-written `$B js` cannot: it carries the arguments in
# (probe.js reads them off __PROBE__), it prints a table instead of a wall of
# JSON, and with --ab it runs the IDENTICAL script against a second build and
# prints the delta — which is the rule in CLAUDE.md, made cheap enough to obey.
#
# It NEVER closes a tab. The browse window is Claude's and closing the last one
# eats it; --ab reuses a tab already on that URL and otherwise opens one more.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIB="$ROOT/tools/probe.js"

B=""
[ -x "$ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"
[ -x "$B" ] || { echo "browse CLI not found at $B" >&2; exit 1; }
# A DAEMON STARTED WITH --headed REFUSES A PLAIN CALL ("headed mismatch"), and
# the window is the same either way — so ask once and follow it everywhere.
HFLAG=""
case "$("$B" url 2>&1)" in *"headed mismatch"*) HFLAG="--headed" ;; esac

PROBE=""; AB=""; RAW=0; ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --ab)   AB="${2:-}"; shift 2 ;;
    --json) RAW=1; shift ;;
    -h|--help) PROBE="help"; shift ;;
    *) if [ -z "$PROBE" ] && [[ "$1" != *=* ]]; then PROBE="$1"; else ARGS+=("$1"); fi; shift ;;
  esac
done
[ -z "$PROBE" ] && PROBE="help"

# k=v pairs -> the __PROBE__ object probe.js reads. Numbers stay numbers so
# `ch=8` is 8 and not "8"; everything else is a string.
SPEC=$(PROBE="$PROBE" python3 -c '
import json, os, sys
o = {"probe": os.environ["PROBE"]}
for a in sys.argv[1:]:
    k, _, v = a.partition("=")
    try: o[k] = int(v)
    except ValueError:
        try: o[k] = float(v)
        except ValueError: o[k] = v
print(json.dumps(o))' "${ARGS[@]+"${ARGS[@]}"}")

run_here() {                      # compose args + library, eval in the fronted tab
  local f out; f=$(mktemp /tmp/ten-probe-XXXXXX.js)
  { printf 'const __PROBE__ = %s;\n' "$SPEC"; cat "$LIB"; } > "$f"
  # a daemon started with --headed refuses a plain call ("headed mismatch"):
  # follow it rather than fail — the window is the same either way
  out=$("$B" $HFLAG eval "$f" 2>&1) || true
  case "$out" in "{"*) printf '%s\n' "$out" ;; *) printf '{"err":"eval failed: %s"}\n' "$(printf '%s' "$out" | head -c 200 | tr -d '"\n')" ;; esac
  rm -f "$f"
}

HERE=$(run_here)

THERE=""
if [ -n "$AB" ]; then
  # the tab we are standing in, so we can put the window back exactly as it was
  BACK=$("$B" $HFLAG tabs | sed -n 's/^→ *\[\([0-9]*\)\].*/\1/p' | head -1)
  HOST=${AB%%\?*}
  # REUSE THE TAB THAT IS ALREADY THERE. `tabs` prints "[3] Title — URL" and the
  # TITLE of this app contains an em dash too, so matching the first one read
  # the word "keyboard" as the URL, never matched, and every --ab run opened
  # another tab. Anchor on the trailing http(s) URL instead.
  TID=$("$B" $HFLAG tabs | python3 -c '
import sys, re
want = sys.argv[1].rstrip("/")
for line in sys.stdin:
    m = re.search(r"\[(\d+)\].*?(https?://\S+)\s*$", line)
    if m and m.group(2).split("?")[0].rstrip("/") == want: print(m.group(1)); break
' "${HOST%/}" || true)
  if [ -z "$TID" ]; then
    TID=$("$B" $HFLAG newtab "$AB" --json | python3 -c 'import sys,json;print(json.load(sys.stdin)["tabId"])')
    sleep 5                        # boot, worklets, the sample pool
  fi
  "$B" $HFLAG tab "$TID" >/dev/null
  THERE=$(run_here)
  [ -n "$BACK" ] && "$B" $HFLAG tab "$BACK" >/dev/null || true
fi

HERE="$HERE" THERE="$THERE" RAW="$RAW" python3 - <<'PY'
import json, os, sys

def load(s):
    try: return json.loads(s) if s else None
    except Exception: return {"err": "not JSON: " + (s or "")[:400]}

a, b = load(os.environ["HERE"]), load(os.environ["THERE"])
if os.environ["RAW"] == "1":
    print(json.dumps({"a": a, "b": b} if b else a, indent=2)); sys.exit(0)

def head(r, tag):
    if not r: return
    print("%s  %s  build %s  %dHz  fft %s  pinned %s" %
          (tag, r.get("probe"), r.get("build"), r.get("sr", 0), r.get("fft"),
           r.get("pinned")))
    print("     %s" % r.get("url", ""))
    for n in r.get("notes") or []: print("     · %s" % n)
    if r.get("err"): print("     !! %s" % r["err"])

def fmt(v):
    if v is None: return "—"
    if isinstance(v, float): return ("%g" % v)
    return str(v)

def table(rows, cols, extra=None):
    cols = ["k"] + [c for c in cols if any(c in r for r in rows)]
    if extra: cols += extra
    w = {c: max(len(c), *(len(fmt(r.get(c))) for r in rows)) for c in cols}
    print("  " + "  ".join(c.ljust(w[c]) for c in cols))
    print("  " + "  ".join("-" * w[c] for c in cols))
    for r in rows:
        line = "  " + "  ".join(fmt(r.get(c)).ljust(w[c]) for c in cols)
        if r.get("err"): line += "   !! " + str(r["err"])
        print(line.rstrip())

head(a, "A")
if a and a.get("rows"): table(a["rows"], a.get("cols") or [])

if b:
    print()
    head(b, "B")
    if b.get("rows"): table(b["rows"], b.get("cols") or [])
    print()
    print("DELTA  A - B   (* = more than 2% apart)")
    byk = {r.get("k"): r for r in b.get("rows") or []}
    cols = [c for c in (a.get("cols") or []) if c in (b.get("cols") or [])]
    out = []
    for r in a.get("rows") or []:
        o = {"k": r.get("k")}
        s = byk.get(r.get("k"))
        for c in cols:
            x, y = r.get(c), s.get(c) if s else None
            if isinstance(x, (int, float)) and isinstance(y, (int, float)):
                d = x - y
                far = abs(d) > 0.02 * max(abs(x), abs(y), 1e-9)
                o[c] = ("%+g*" if far else "%+g") % d
            else:
                o[c] = "—" if s else "(absent)"
        out.append(o)
    if out: table(out, cols)
PY
