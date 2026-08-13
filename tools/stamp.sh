#!/bin/sh
# Stamp the visible build id. Run before every commit that ships:
#
#     tools/stamp.sh && git add -A && git commit ...
#
# The `build` row in settings shows this string, and pressing up on that row
# fetches the served copy with no-store to compare — so "am I on the latest?"
# is a question the app answers rather than one you guess at from a reload.
cd "$(dirname "$0")/.." || exit 1
STAMP=$(date -u +%Y-%m-%d.%H%M)
# anchored at the start of the line: the only line that begins `const BUILD=`
# is the declaration itself, never the matcher inside checkUpdate()
perl -pi -e "s/^const BUILD='[^']*';/const BUILD='$STAMP';/" index.html || exit 1
grep -n "^const BUILD=" index.html
