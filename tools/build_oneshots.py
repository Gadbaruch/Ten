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
import argparse, json, pathlib, re, shutil, subprocess, sys
import numpy as np
from scipy.cluster.hierarchy import linkage, fcluster

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


# GAD'S OWN CORRECTIONS, keyed by the name the rules first produced. He
# auditioned the library and prefixed four files "this is a ...":
#   dr5-wood-01 was a cowbell · tr8-tom-25 a rim · dr5-wood-05 a snare ·
#   tr8-sub-02 a clap
# A filename rule can only ever be as good as the filename, and none of those
# four were going to be got right from theirs — so they are RECORDED rather
# than guessed at again on the next build. This is a manual list and it is
# meant to be: add to it whenever an ear beats the rules.
OVERRIDE = {
    'dr5-wood-01': 'cowbell',
    'tr8-tom-25': 'rim',
    'dr5-wood-05': 'snare',
    'tr8-sub-02': 'clap',
}


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
    """Encode every source file into samples/oneshots/<instrument>/.

    LAID OUT BY TYPE, NOT BY PACK (Gad, 2026-08-27): "we dont need to stick to
    the pack folders as they come, you can put them in type folders and have
    their names represent the kit ID so when we have kits we can put them
    together properly." The machine is the name's prefix — tr808-kick-03 — so
    every kick in the world sits in one folder and a kit can still be
    reassembled by prefix later.
    """
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
            probe = '%s-%s-%02d' % (s['key'], inst, seen.get(inst, 0) + 1)
            if probe in OVERRIDE:                 # an ear beat the rules here
                inst = OVERRIDE[probe]
            i = seen.get(inst, 0) + 1
            seen[inst] = i
            dst = OUT / inst / ('%s-%s-%02d.flac' % (s['key'], inst, i))
            if encode(f, dst):
                n += 1
        total += n
        print('  %-8s %3d  %-42s %s' % (s['key'], n, s['label'], s['lic']))
    return total


# ---- TELLING TWO SOUNDS APART -------------------------------------------
# Gad, inspecting the first build: "there seem to be a lot of duplicates or
# VERY similar sounds that we can prune." True by construction — the TR-808
# set alone is a 5x5 tone x decay grid per voice, and half of any such grid is
# a step nobody can hear.
#
# Similarity is MEASURED, on three things that are what actually make two hits
# sound alike, each normalised so the comparison is about the SOUND and not
# about how loud the file happens to be:
#   spectrum   24 log-spaced band energies in dB over the whole hit — timbre
#   envelope   16 RMS points over the first second — attack and decay shape
#   length     log duration, lightly weighted; a 0.1s and a 2s hit are not the
#              same sound however alike their spectra
# Only ever compared WITHIN one instrument folder: a kick and a tom being
# far apart is not information.
FEAT_SR = 22050


def feats(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1',
                          '-ar', str(FEAT_SR), '-f', 'f32le', '-'],
                         capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    if x.size < 256:
        return None
    x = x / (np.abs(x).max() + 1e-9)
    seg = x[:FEAT_SR]                                  # the first second decides it
    env = np.array([np.sqrt(np.mean(c.astype(np.float64) ** 2))
                    for c in np.array_split(seg, 16)])
    env = env / (env.max() + 1e-9)
    # Spectrum averaged over frames across up to a second, not one window at
    # the head: a cymbal and a hat share an attack and differ in the tail, and
    # a single 186ms frame cannot see that. Short files get a Hann of their own
    # length -- windowing a 3000-sample hit with the first 3000 points of a
    # 4096-point Hann attenuates the attack, which is the one part that matters.
    N = 4096
    acc = np.zeros(N // 2 + 1)
    frames = 0
    for st in range(0, min(x.size, FEAT_SR), N // 2):
        c = x[st:st + N]
        if c.size < 256:
            break
        acc += np.abs(np.fft.rfft(c * np.hanning(c.size), N))
        frames += 1
    mag = acc / max(frames, 1)
    edges = np.geomspace(40, 10000, 25) * N / FEAT_SR
    bands = np.array([mag[int(edges[i]):max(int(edges[i]) + 1, int(edges[i + 1]))].mean()
                      for i in range(24)])
    bands = 20 * np.log10(bands / (bands.max() + 1e-12) + 1e-6)
    bands = (bands + 120) / 120                        # 0..1
    dur = np.log2(max(x.size / FEAT_SR, 1e-3))
    return np.concatenate([bands * 1.0, env * 0.6, [dur * 0.5]])


def dedupe(tight, loose):
    """Prune the certain duplicates; park the uncertain groups for a human ear.

    Two bands, because "is this the same sound" has a middle:
      below `tight`   the same sound. One is kept and the rest are DELETED.
      below `loose`   probably the same sound. One is kept in the library and
                      EVERY member of the group is also copied to _similar/,
                      named gNN-... so a group sorts together and can be
                      auditioned side by side.
    _similar/ is deliberately NOT in the manifest — it is a review pen, not
    part of the library, so nothing there is loaded or browsed.
    Which member is kept: the machine earliest in SOURCES (a curatorial order,
    most famous first), then the longest take.
    """
    rank = {s['key']: i for i, s in enumerate(SOURCES)}
    pen = OUT / '_similar'
    if pen.exists():
        shutil.rmtree(pen)
    dropped, parked, groups = 0, 0, 0
    report = []
    for instdir in sorted(p for p in OUT.iterdir() if p.is_dir()):
        files = sorted(instdir.glob('*.flac'))
        if len(files) < 2:
            continue
        F, keep = [], []
        for f in files:
            v = feats(f)
            if v is not None:
                F.append(v); keep.append(f)
        if len(keep) < 2:
            continue
        F = np.array(F)
        Z = linkage(F, method='average', metric='euclidean')
        for thr, kill in ((tight, True), (loose, False)):
            lab = fcluster(Z, t=thr, criterion='distance')
            for c in set(lab):
                idx = [i for i in range(len(keep)) if lab[i] == c and keep[i].exists()]
                if len(idx) < 2:
                    continue
                idx.sort(key=lambda i: (rank.get(keep[i].name.split('-')[0], 99),
                                        -keep[i].stat().st_size))
                best, rest = idx[0], idx[1:]
                if kill:
                    for i in rest:
                        keep[i].unlink(); dropped += 1
                    report.append('%-11s kept %-22s dropped %d identical'
                                  % (instdir.name, keep[best].name, len(rest)))
                else:
                    groups += 1
                    gd = pen / instdir.name
                    gd.mkdir(parents=True, exist_ok=True)
                    for i in idx:
                        shutil.copy2(keep[i], gd / ('g%02d-%s' % (groups, keep[i].name)))
                        parked += 1
                    for i in rest:
                        keep[i].unlink()
                    report.append('%-11s kept %-22s parked %d for your ear (g%02d)'
                                  % (instdir.name, keep[best].name, len(rest), groups))
    (OUT / 'PRUNED.md').write_text(
        '# What the dedupe pass did\n\n'
        'Measured with `tools/build_oneshots.py` — 24 log spectral bands, a 16-point\n'
        'RMS envelope and log duration, compared only WITHIN an instrument folder,\n'
        'every file peak-normalised first so this is about timbre and not level.\n\n'
        '- **%d deleted** as the same sound (distance < %.2f)\n'
        '- **%d copied into `_similar/`** as probably-the-same (distance < %.2f),\n'
        '  grouped by a `gNN-` prefix so a group sorts together. Nothing in\n'
        '  `_similar/` is in the manifest, so nothing there loads — audition it,\n'
        '  keep what you want by moving it back up into its instrument folder,\n'
        '  and delete the rest.\n\n```\n%s\n```\n'
        % (dropped, tight, parked, loose, '\n'.join(report)))
    return dropped, parked, groups


def manifest():
    """Read the tree back off disk. Pruning a folder IS the edit.

    Layout is samples/oneshots/<instrument>/<machine>-<instrument>-NN.flac, so
    the STYLE axis is recovered from the name's prefix — one fact, stored once,
    and a file moved by hand between instrument folders still says which
    machine it came from.
    `_similar/` is skipped: it is the review pen, not the library.
    """
    by = {s['key']: s for s in SOURCES}
    out = []
    order = {k: i for i, k in enumerate(SHELF)}
    for instdir in sorted((p for p in OUT.iterdir() if p.is_dir() and not p.name.startswith('_')),
                          key=lambda d: (order.get(d.name, len(SHELF)), d.name)):
        rows = []
        for f in sorted(instdir.glob('*.flac')):
            style = f.stem.split('-')[0]
            if style not in by:
                continue
            rows.append((by[style]['rank'], f.stem, style, f))
        rows.sort(key=lambda r: (r[0], r[1]))
        for _, stem, style, f in rows:
            out.append({
                'name': stem,
                'file': 'oneshots/%s/%s' % (instdir.name, f.name),
                'kind': 'one',              # the whole shelf is one-shots, by construction
                'inst': instdir.name,       # the INSTRUMENT axis
                'style': style,             # the STYLE axis — which machine
                'cat': INSTR.get(instdir.name, 'perc'),   # TEN's own DRUMCATS
            })
    (OUT / 'manifest.json').write_text(json.dumps(out, indent=1) + '\n')

    have = {x['style'] for x in out}
    lic = ['# Where every one-shot here came from, and under what licence', '',
           'Generated by `tools/build_oneshots.py`. Sounds are filed by INSTRUMENT;',
           'the machine is the name prefix (`tr808-kick-03`), so a kit can be',
           'reassembled by prefix. Delete anything you do not want, then run',
           '`python3 tools/build_oneshots.py --manifest-only` to re-index.',
           '', 'Everything ships as 44.1kHz 16-bit mono FLAC — lossless, and measured',
           'bit-identical through decodeAudioData where Opus arrives 2.9ms late and',
           'AAC pre-echoes ahead of the transient.', '',
           'See `PRUNED.md` for what the dedupe pass removed and what is parked in',
           '`_similar/` waiting on your ear.', '']
    for s2 in SOURCES:
        if s2['key'] not in have:
            continue
        n = sum(1 for x in out if x['style'] == s2['key'])
        lic += ['## %s — `%s-*` (%d sounds)' % (s2['label'], s2['key'], n),
                '', '- licence: **%s**' % s2['lic'],
                '- source: %s' % s2['url'],
                '- repo: `%s`' % s2['repo'],
                '- %s' % s2['note'], '']
    lic += ['## Deliberately NOT included', '',
            'These read `"license": "None"` and trace to a blog post of "free kits" —',
            'unspecified provenance, so they are not in the repo:', '']
    lic += ['- `%s`' % r for r in REJECTED]
    lic += ['', 'The 909 voices in this library come from the TR-8 instead, which is',
            "Roland's own model of the 808 and 909 and was recorded by the MckAudio",
            'repo owner from their own hardware and released CC0.', '']
    (OUT / 'LICENSES.md').write_text('\n'.join(lic))
    return out


for _i, _s in enumerate(SOURCES):
    _s['rank'] = _i                       # curatorial order: most famous machine first

def check():
    """Does every manifest name a file that is actually there, and is every
    file named? A manifest that lists a deleted take is how mystery silence
    starts: the app fetches it, gets a 404, and degrades to a named hole with
    nothing said. Gad pruned three one-shot mp3s out of the LOOP shelf by hand
    and its manifest went on naming them for a day."""
    bad = 0
    for rel in ('manifest.json', 'oneshots/manifest.json'):
        f = ROOT / 'samples' / rel
        if not f.exists():
            continue
        m = json.loads(f.read_text())
        missing = [x for x in m if not (ROOT / 'samples' / x['file']).exists()]
        print('  %-22s %3d entries  %d missing' % (rel, len(m), len(missing)))
        for x in missing:
            print('      MISSING ' + x['file'])
        bad += len(missing)
    named = {x['file'] for x in json.loads((OUT / 'manifest.json').read_text())}
    disk = {str(f.relative_to(ROOT / 'samples')) for f in OUT.rglob('*.flac')
            if '_similar' not in f.parts}
    for f in sorted(disk - named):
        print('      ORPHAN  ' + f)
        bad += 1
    print('  ' + ('OK' if not bad else '%d problems' % bad))
    return bad


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=str(ROOT / '_dl'),
                    help='where the source repos were cloned')
    ap.add_argument('--manifest-only', action='store_true',
                    help='re-index the tree as it stands on disk; encode nothing')
    ap.add_argument('--tight', type=float, default=0.9,
                    help='below this distance two sounds are the same and one is deleted')
    ap.add_argument('--loose', type=float, default=1.5,
                    help='below this they are probably the same and go to _similar/')
    ap.add_argument('--no-dedupe', action='store_true')
    ap.add_argument('--check', action='store_true',
                    help='verify both manifests against the disk and stop')
    a = ap.parse_args()
    if a.check:
        sys.exit(1 if check() else 0)
    if not a.manifest_only:
        print('encoding to 44.1k/16-bit mono FLAC …')
        build(pathlib.Path(a.src))
        if not a.no_dedupe:
            print('measuring similarity …')
            d, pk, g = dedupe(a.tight, a.loose)
            print('  %d deleted as identical · %d parked in _similar/ across %d groups'
                  % (d, pk, g))
    m = manifest()
    mb = sum(f.stat().st_size for f in OUT.rglob('*.flac')) / 1048576
    print('%d sounds  %.1f MB  %d machines  %d instruments'
          % (len(m), mb, len({x['style'] for x in m}), len({x['inst'] for x in m})))
    check()
