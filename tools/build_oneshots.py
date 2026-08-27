#!/usr/bin/env python3
"""Build TEN's one-shot library from free, redistributable sample sources.

WHY THIS EXISTS
---------------
The audio channel wants LOOPS and a synth op's smp slot wants ONE-SHOTS (see
poolKindOf in index.html). tools/gen_samples.py fills the loop half with Stable
Audio phrases; this fills the one-shot half from sample sets that are actually
free to redistribute — because a real TR-808 is a RECORDING and no amount of
modelling gets you the recording. What can be properly synthesised is
synthesised, in the engine; what is better as a sample lives here.

    python3 tools/build_oneshots.py --src <dir>      # build everything
    python3 tools/build_oneshots.py --manifest-only  # after pruning by hand

THE SECOND FORM IS THE POINT. The tree under samples/oneshots/ is arranged so a
folder can be deleted with the Finder — drop tr808/cymbal/ if you hate 808
cymbals, drop dr5/ if the whole machine bores you — and then --manifest-only
rebuilds the index from WHAT IS ACTUALLY THERE. The manifest is never
hand-edited, so it can never disagree with the disk.

FORMAT: 44.1kHz 16-bit mono FLAC. MEASURED, not assumed — a TR-808 kick fetched
and decoded through Chrome's own decodeAudioData came back from FLAC
bit-identical to its WAV: same length 11026, first audible sample 5, peak at
sample 47, peak 0.4824. Opus moved that attack peak to sample 175 (2.9ms late)
and AAC put audible energy BEFORE the transient, at sample 0. On a drum machine
those are the two artefacts you would notice first. FLAC costs ~57% of WAV,
which at this budget is nothing worth having.
44.1k because that is what the AudioContext runs at, so nothing resamples on the
way in. Mono because every source here is mono. 16-bit because a drum hit has
no use for the 24th bit.

TWO AXES, and together they ARE the categorisation system:
    STYLE       the folder a sound lives in — the MACHINE it came out of
    INSTRUMENT  the sub-folder — one vocabulary shared across every machine
Both travel in the manifest, so browsing can move along either one.
"""
import argparse, json, pathlib, re, shutil, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'samples' / 'oneshots'

# ---- THE INSTRUMENT AXIS -------------------------------------------------
# One vocabulary for every machine, so "find me a clap" is one question no
# matter which box it came out of. `cat` is TEN's own DRUMCATS spelling, which
# is what lets a generated drum channel pull from the right shelf.
INSTR = {
    'kick': 'kik', 'sub': 'kik',
    'snare': 'snr', 'clap': 'snr', 'rim': 'snr',
    'hat-closed': 'hh', 'hat-open': 'hh',
    'cymbal': 'cymb', 'ride': 'cymb',
    'tom': 'tom',
    'conga': 'perc', 'bongo': 'perc', 'cowbell': 'perc',
    'shaker': 'perc', 'perc': 'perc', 'timbale': 'perc',
    'clave': 'wood', 'wood': 'wood',
    'fx': 'zap',
}

# ---- naming a sound from its filename ------------------------------------
# Order matters: the first rule that matches wins. Two orderings here were
# WRONG and the machine x instrument cross-tab caught both:
#   - every TR-8 and DR5 open hat was filed as CLOSED, because the name reads
#     "808_Open_HiHat" and `open.?hat` wants the two words adjacent. Hats are
#     decided in one place now -- is it a hat at all, then is it open -- which
#     is also the only way "Acoustic_Pedal_Hi-hat" lands anywhere sensible.
#   - "808_Bass_Drum" matched the 808-sub rule before the kick rule, so five
#     TR-8 bass drums became sub-basses. Every file in that machine is named
#     "808_...", so `808` can only ever be the LAST question asked.
RULES = [
    (r'\bride\b|\brd\b', 'ride'),                  # before cymbal: "Ride_Bell_Cymbal"
    (r'crash|cymbal|cymball|splash|\bcy\d*\b', 'cymbal'),
    (r'clap|hand.?clap|\bcp\d*\b', 'clap'),
    (r'rim|side.?stick|\bstick\b|\brs\d*\b', 'rim'),
    (r'clave|\bcl\d*\b', 'clave'),
    (r'block|wood|guiro', 'wood'),
    (r'cowb|cow.?bell|\bcb\d*\b', 'cowbell'),
    (r'conga|\bhc\d*\b|\bmc\d*\b|\blc\d*\b', 'conga'),
    (r'bongo', 'bongo'),
    (r'cabasa|maraca|shaker|tamb|\bma\d*\b', 'shaker'),
    (r'timbal', 'timbale'),
    (r'\btom\b|tom.|\bht\d*\b|\bmt\d*\b|\blt\d*\b|floor', 'tom'),
    (r'snare|\bsd\d*\b|\bsn\b|snr', 'snare'),
    (r'kick|bass.?drum|\bbd\d*\b|\bkik\b', 'kick'),
    (r'\bfx\b|noise|zap|laser|sweep|rise', 'fx'),
    (r'\b808s?\b|\bsub\b', 'sub'),                 # LAST -- see above
]
# A hat is asked about before anything else, and once, because open/closed is a
# property of the same instrument rather than two different ones.
HATISH = re.compile(r'hihat|hi hat|\bhats?\b|\bhh\b|\bch\d*\b|\boh\d*\b')
NOTHAT = re.compile(r'crash|cymbal|cymball|ride|splash')
OPENISH = re.compile(r'\bopen\b|\boh\d*\b')


def instr_of(name, folder_hint=''):
    s = (folder_hint + ' ' + name).lower().replace('_', ' ').replace('-', ' ')
    if HATISH.search(s) and not NOTHAT.search(s):
        return 'hat-open' if OPENISH.search(s) else 'hat-closed'
    for pat, inst in RULES:
        if re.search(pat, s):
            return inst
    return 'perc'


# THE ORDER A HAND REACHES IN. Alphabetical put clap and clave ahead of the
# kick, which is the one sound nobody should have to turn past nineteen others
# to find. This is the order the pool dial inherits, inside each machine.
SHELF = ['kick', 'sub', 'snare', 'clap', 'rim', 'hat-closed', 'hat-open',
         'cymbal', 'ride', 'tom', 'conga', 'bongo', 'cowbell', 'clave', 'wood',
         'shaker', 'timbale', 'perc', 'fx']

# ---- THE SOURCES ---------------------------------------------------------
# Each entry names the machine, the licence AS THE SOURCE ITSELF STATES IT, and
# where it came from. LICENSES.md is generated from these, so the provenance of
# every sound that ships is written down next to it.
SOURCES = [
    dict(key='tr808', label='Roland TR-808', repo='tidalcycles/sounds-tr808-fischer',
         lic='CC0-1.0', url='https://github.com/tidalcycles/sounds-tr808-fischer',
         note='Michael Fischer / Edward Loveall recordings of a real TR-808, every '
              'voice across its tone and decay grid',
         dirname='sounds-tr808-fischer'),
    dict(key='cr78', label='Roland CompuRhythm CR-78', repo='oramics/sampled',
         lic='Public Domain', url='https://oramics.github.io/sampled/DM/CR-78/',
         note='declared Public Domain by oramics; source boxedear.com',
         dirname='oramics/DM/CR-78/samples'),
    dict(key='linn', label='LinnDrum LM-2', repo='oramics/sampled',
         lic='Public Domain', url='https://oramics.github.io/sampled/DM/LM-2/',
         note='declared Public Domain by oramics; source machines.hyperreal.org',
         dirname='oramics/DM/LM-2/samples'),
    dict(key='mrk2', label='Maestro Rhythm King MRK-2', repo='oramics/sampled',
         lic='Public Domain', url='https://oramics.github.io/sampled/DM/MRK-2/',
         note='declared Public Domain by oramics',
         dirname='oramics/DM/MRK-2/samples'),
    dict(key='tr505', label='Roland TR-505', repo='oramics/sampled',
         lic='Public Domain', url='https://oramics.github.io/sampled/DM/TR-505/',
         note='declared Public Domain by oramics; source progsounds.com',
         dirname='oramics/DM/TR-505/samples'),
    dict(key='rx5', label='Yamaha RX5', repo='MckAudio/MckSamplePacks',
         lic='CC0-1.0', url='https://github.com/MckAudio/MckSamplePacks',
         note="the repo owner's own recordings of their own hardware",
         dirname='mck/RX5'),
    dict(key='tr8', label='Roland TR-8 (ACB models of the 808 and 909)',
         repo='MckAudio/MckSamplePacks', lic='CC0-1.0',
         url='https://github.com/MckAudio/MckSamplePacks',
         note="the repo owner's own recordings; Roland's own model of the 808 and 909, "
              'which is why there is a 909 here and no scraped 909 pack',
         dirname='mck/TR8'),
    dict(key='dr5', label='Alesis DR5', repo='MckAudio/MckSamplePacks',
         lic='CC0-1.0', url='https://github.com/MckAudio/MckSamplePacks',
         note="the repo owner's own recordings of their own hardware",
         dirname='mck/DR5'),
    dict(key='trap', label='hard trap kit', repo='Boochi44/free-drum-samples',
         lic='CC0-1.0', url='https://github.com/Boochi44/free-drum-samples',
         note='derived from the CC0 TR-808 recordings above',
         dirname='free-drum-samples/drum-samples/01-hard-trap'),
    dict(key='bounce', label='bounce kit', repo='Boochi44/free-drum-samples',
         lic='CC0-1.0', url='https://github.com/Boochi44/free-drum-samples',
         note='derived from the CC0 TR-808 recordings above',
         dirname='free-drum-samples/drum-samples/02-bounce'),
    dict(key='lofi', label='soulful vintage kit', repo='Boochi44/free-drum-samples',
         lic='CC0-1.0', url='https://github.com/Boochi44/free-drum-samples',
         note='derived from the CC0 TR-808 recordings above, down-sampled and crushed',
         dirname='free-drum-samples/drum-samples/03-soulful-vintage'),
]

# Machines whose licence is NOT clean enough to redistribute, recorded here so
# nobody re-adds them by accident: oramics DM/TR-909/Detroit and DM/TR-909/SP
# both read `"license": "None"` and trace to an flstudiomusic.com post of "free
# 909 kits". The 909 in this library comes from the TR-8 instead.
REJECTED = ['oramics DM/TR-909/Detroit', 'oramics DM/TR-909/SP']


def encode(src, dst):
    dst.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src),
                        '-ac', '1', '-ar', '44100', '-sample_fmt', 's16',
                        '-c:a', 'flac', '-compression_level', '12', str(dst)],
                       capture_output=True, text=True)
    return r.returncode == 0 and dst.exists()


def build(srcroot):
    if OUT.exists():
        shutil.rmtree(OUT)
    total = 0
    for s in SOURCES:
        base = srcroot / s['dirname']
        if not base.exists():
            print('  MISSING  %-8s %s' % (s['key'], base))
            continue
        files = sorted(p for p in base.rglob('*')
                       if p.suffix.lower() in ('.wav', '.aif', '.aiff'))
        seen, n = {}, 0
        for f in files:
            hint = f.parent.name if f.parent != base else ''
            inst = instr_of(f.stem, hint)
            i = seen.get(inst, 0) + 1
            seen[inst] = i
            dst = OUT / s['key'] / inst / ('%s-%s-%02d.flac' % (s['key'], inst, i))
            if encode(f, dst):
                n += 1
        total += n
        print('  %-8s %3d  %-42s %s' % (s['key'], n, s['label'], s['lic']))
    return total


def manifest():
    """Read the tree back off disk. Pruning a folder IS the edit."""
    out = []
    for s in SOURCES:                     # SOURCES order IS the shelf order
        mach = OUT / s['key']
        if not mach.is_dir():
            continue
        for instdir in sorted((p for p in mach.iterdir() if p.is_dir()),
                              key=lambda d: (SHELF.index(d.name)
                                             if d.name in SHELF else len(SHELF), d.name)):
            for f in sorted(instdir.glob('*.flac')):
                out.append({
                    'name': f.stem,
                    'file': 'oneshots/%s/%s/%s' % (mach.name, instdir.name, f.name),
                    'kind': 'one',          # the whole shelf is one-shots, by construction
                    'inst': instdir.name,   # the INSTRUMENT axis
                    'style': mach.name,     # the STYLE axis — which machine
                    'cat': INSTR.get(instdir.name, 'perc'),   # TEN's own DRUMCATS
                })
    (OUT / 'manifest.json').write_text(json.dumps(out, indent=1) + '\n')

    lic = ['# Where every one-shot here came from, and under what licence', '',
           'Generated by `tools/build_oneshots.py`. Delete any folder you do not want,',
           'then run `python3 tools/build_oneshots.py --manifest-only` to re-index.',
           '', 'Everything ships as 44.1kHz 16-bit mono FLAC — lossless, and measured',
           'bit-identical through decodeAudioData where Opus arrives 2.9ms late and',
           'AAC pre-echoes ahead of the transient.', '']
    for s in SOURCES:
        d = OUT / s['key']
        if not d.exists():
            continue
        lic += ['## %s — `%s/` (%d sounds)' % (s['label'], s['key'],
                                               len(list(d.rglob('*.flac')))),
                '', '- licence: **%s**' % s['lic'],
                '- source: %s' % s['url'],
                '- repo: `%s`' % s['repo'],
                '- %s' % s['note'], '']
    lic += ['## Deliberately NOT included', '',
            'These read `"license": "None"` and trace to a blog post of "free kits" —',
            'unspecified provenance, so they are not in the repo:', '']
    lic += ['- `%s`' % r for r in REJECTED]
    lic += ['', 'The 909 voices in this library come from the TR-8 instead, which is',
            "Roland's own model of the 808 and 909 and was recorded by the MckAudio",
            'repo owner from their own hardware and released CC0.', '']
    (OUT / 'LICENSES.md').write_text('\n'.join(lic))
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=str(ROOT / '_dl'),
                    help='where the source repos were cloned')
    ap.add_argument('--manifest-only', action='store_true',
                    help='re-index the tree as it stands on disk; encode nothing')
    a = ap.parse_args()
    if not a.manifest_only:
        print('encoding to 44.1k/16-bit mono FLAC …')
        build(pathlib.Path(a.src))
    m = manifest()
    mb = sum(f.stat().st_size for f in OUT.rglob('*.flac')) / 1048576
    print('%d sounds  %.1f MB  %d machines  %d instruments'
          % (len(m), mb, len({x['style'] for x in m}), len({x['inst'] for x in m})))
