#!/bin/bash
# Front the worktree's own tab, then probe it. probe.sh runs in whatever tab is
# fronted, and the window has a dozen of them — landing on :3032 by accident
# measured the wrong build twice, so the front and the probe are ONE call.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
B="$HOME/.claude/skills/gstack/browse/dist/browse"
HF=""; case "$("$B" url 2>&1)" in *"headed mismatch"*) HF="--headed";; esac
WANT="${PWURL:-http://localhost:3034/}"
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
F=/private/tmp/ten-pwmute.js
printf 'await 0;\ntry{engine.comp.disconnect(AC.destination);}catch(e){}\nreturn {build:BUILD,url:location.href};\n' > "$F"
echo "--- tab $TID ---"; "$B" $HF eval "$F" | tr -d '\n '; echo; rm -f "$F"
exec "$ROOT/tools/probe.sh" "$@"
