#!/usr/bin/env python3
"""Generate KEYS.md from index.html.

Hand-written key documentation drifts from the code the moment a binding
moves. This reads the handlers instead, so the table is wrong only if the
extraction is wrong — and that is visible.  Run: python3 tools/keymap.py
"""
import re, sys, pathlib

SRC = pathlib.Path(__file__).resolve().parent.parent / 'index.html'
OUT = pathlib.Path(__file__).resolve().parent.parent / 'KEYS.md'
lines = SRC.read_text().split('\n')

KEY = re.compile(r"""(?:c|c0|e\.code)\s*===\s*'([A-Za-z0-9]+)'""")
GUARDS = [
    (r'HOLD\.tab', 'hold tab'), (r'HOLD\.q\b', 'hold q'), (r'HOLD\.c\b', 'hold c'),
    (r'HOLD\.n\b', 'hold n'), (r'HOLD\.v\b', 'hold v'), (r'HOLD\.i\b', 'hold `'),
    (r'HOLD\.m\b', 'hold m'), (r'HOLD\.r\b', 'hold /'), (r'HOLD\.opt', 'hold ⌥rack'),
    (r'HOLD\.dig', 'hold digit'),
    (r'e\.metaKey|e\.ctrlKey', '⌘'), (r'rs\(e\)|e\.shiftKey', '⇧'),
    (r'altOf\(e\)|e\.altKey', '⌥'),
    (r'DPICK', 'dest browser'), (r'PICK', 'set picker'),
    (r'S\.mSel', 'master'), (r'inEdit\(\)', 'edit mode'),
    (r'S\.layer\s*===\s*(-?\d)', 'layer %s'),
    (r'S\.layer\s*>=\s*(\d)', 'layer %s+'),
    (r'S\.layer\s*<\s*(\d)', 'layer <%s'),
]

def guards_of(line):
    out = []
    for pat, label in GUARDS:
        m = re.search(pat, line)
        if m:
            out.append(label % m.group(1) if '%s' in label else label)
    return out

def meaning(i):
    """the flash() text or trailing comment nearest this binding"""
    for j in range(i, min(i + 14, len(lines))):
        m = re.search(r"flash\(\s*'([^']{4,90})", lines[j])
        if m: return m.group(1)
        m = re.search(r"//\s*(.{6,80})", lines[j])
        if m: return m.group(1).strip()
    return ''

rows = []
for i, l in enumerate(lines):
    if not any(t in l for t in ('Key', 'Digit', 'Arrow', 'Space', 'Enter', 'Escape',
                                'Tab', 'Backspace', 'Slash', 'Minus', 'Equal',
                                'Backquote', 'Bracket', 'Quote', 'Comma', 'Period',
                                'Semicolon', 'Backslash', 'CapsLock')):
        continue
    for m in KEY.finditer(l):
        rows.append((m.group(1), i + 1, guards_of(l), meaning(i)))

note = set()
m = re.search(r'const NOTEKEYS\s*=\s*\{([^}]*)\}', SRC.read_text(), re.S)
if m:
    note = {k[3:] for k in re.findall(r'(\w+)\s*:', m.group(1)) if k.startswith('Key')}

bound = {k[3:] for k, *_ in rows if k.startswith('Key')}
free = [chr(c) for c in range(65, 91) if chr(c) not in note and chr(c) not in bound]

PUNCT = ['Backquote','Minus','Equal','BracketLeft','BracketRight','Backslash',
         'Semicolon','Quote','Comma','Period','Slash','Tab','Space','Enter',
         'Escape','Backspace','CapsLock']
punct_free = [p for p in PUNCT if not any(k == p for k, *_ in rows)]

doc = ["# TEN — key map",
       "",
       "Generated from `index.html` by `tools/keymap.py`. Do not hand-edit —",
       "regenerate it. A key table that is written by hand is wrong within a week.",
       "",
       f"{len(rows)} bindings across {len({r[0] for r in rows})} keys.",
       "",
       "## What is still free",
       "",
       f"**Letters:** {' '.join(free) if free else 'none'} — every other letter either plays a note or is bound.",
       "",
       f"**Note keys** (cannot be reused): {' '.join(sorted(note))}",
       "",
       f"**Punctuation free:** {' '.join(punct_free) if punct_free else 'none'}",
       "",
       "Spend these carefully. New bindings should otherwise go on a modifier or",
       "inside an existing held scope.",
       "",
       "## Every binding",
       "",
       "| Key | Context | Line | Does |",
       "|---|---|---|---|"]
for k, ln, g, why in sorted(rows, key=lambda r: (not r[0].startswith('Key'), r[0], r[1])):
    ctx = ' + '.join(g) if g else '—'
    doc.append(f"| `{k}` | {ctx} | {ln} | {why.replace('|','/')} |")
OUT.write_text('\n'.join(doc) + '\n')
print(f"{OUT.name}: {len(rows)} bindings, free letters: {' '.join(free) or 'none'}")
