#!/bin/bash
# Front a chosen TEN tab and eval a file in it. The browse window holds a dozen
# tabs and `eval` uses whichever is fronted — running a check against the wrong
# build has cost this session two rounds of wrong conclusions already.
#   tools/wev.sh <file.js> [url]
set -euo pipefail
B="$HOME/.claude/skills/gstack/browse/dist/browse"
HF=""; case "$("$B" url 2>&1)" in *"headed mismatch"*) HF="--headed";; esac
F="$1"; WANT="${2:-http://localhost:3034/}"
TID=$("$B" $HF tabs | python3 -c '
import sys, re
want = sys.argv[1].rstrip("/")
for line in sys.stdin:
    m = re.search(r"\[(\d+)\].*?(https?://\S+)\s*$", line)
    if m and m.group(2).split("?")[0].rstrip("/") == want: print(m.group(1)); break
' "${WANT%/}" || true)
if [ -z "$TID" ]; then
  TID=$("$B" $HF newtab "$WANT" --json | python3 -c 'import sys,json;print(json.load(sys.stdin)["tabId"])')
  sleep 8
fi
"$B" $HF tab "$TID" >/dev/null
"$B" $HF eval "$F"
