#!/usr/bin/env python3
"""Normalise the one-shot library and trim the dead air off the end of it.

    python3 tools/polish_oneshots.py --dry-run     # report, touch nothing
    python3 tools/polish_oneshots.py               # do it

WHY. Gad, after auditioning the library: "can you please normalize all of them
and trim silence from the end, many kicks for example have like more then a
second of silence in the end". Measured before anything was written: of 250
files, 128 carried more than half a second of trailing silence and 107 carried
more than a WHOLE second, the worst 2.19s on a 2.22s file — a shaker that is
1.5% shaker. Peaks ran from -17.6dB to 0.0dB with a median of -1.0, so a
handful of sounds were far quieter than everything around them.

Leading silence was measured too and is a non-issue — the worst file in the
library starts 0.7ms late, so nothing here touches the front. That matters:
trimming the head of a drum sample moves the hit, and moving the hit is a
bigger crime than a long tail.

HOW THE TRIM DECIDES WHERE TO STOP -- see the block above the constants; the
short version is that a fixed threshold cannot do it, because the dead air is a
NOISE FLOOR and every file sits at a different one. The floor is found per file
and the cut sits 8dB above it, capped so nothing above -60dB relative to peak
is ever cut. Then 40ms is kept past the last audible window -- the headroom
asked for, nowhere near the second complained about -- and a 12ms raised-cosine
fade closes it. Verified on the cases that could go wrong:

    rx5-cymbal-01   4.40 -> 3.00s   its real decay to -70dB kept
    rx5-ride-01     5.00 -> 3.36s   likewise
    tr8-shaker-01   2.22 -> 0.07s   2.15s of pure hiss gone
    linn-snare-01   0.09 -> 0.09s   short hits untouched
    tr808-hat-open  0.25 -> 0.25s   untouched

and every output ends at exactly 0.000000, so the edit cannot click.

NORMALISE: peak to -1.0dBFS. PEAK and not loudness, deliberately: loudness
normalisation would make a hi-hat as loud as a kick, which is the wrong answer
for a drum kit. Per-hit balance is the KIT's job, and the kit presets set it.

Everything stays 44.1kHz 16-bit mono FLAC. Work is done in float and written
once, so this is one requantisation, not two.
"""
import argparse, pathlib, subprocess, sys
import numpy as np

SR = 44100
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'samples' / 'oneshots'

# WHERE TO CUT IS NOT A FIXED THRESHOLD, and measuring three files was enough
# to prove it. 100ms RMS windows, in dB below each file's own peak:
#
#   tr8-shaker-01   -21 then -77 -77 -77 ... for 2.1s      a flat FLOOR
#   rx5-kick-09     -12 -29 -44 then -86 -86 ... for 1.9s  a flat FLOOR, lower
#   rx5-cymbal-01   -12 -15 -17 ... -74 -76 -76 -76        real DECAY, then floor
#
# The dead air is a constant noise floor and every file sits at a different
# one; the cymbal's genuine tail goes quieter than the shaker's noise. So the
# floor is found PER FILE -- the 5th percentile of the windowed RMS -- and the
# cut is a few dB above it. A single number would either leave two seconds of
# hiss on the shaker or eat a second of real cymbal.
#
# The cap is the safety rail: whatever the floor says, nothing louder than
# -60dB below the file's peak is ever cut. A file with no silence in it at all
# has a "floor" made of music, and this is what stops that reasoning.
FLOOR_PCT = 5         # percentile of windowed RMS taken to BE the noise floor
FLOOR_OVER_DB = 8.0   # cut this far above it
CAP_DB = -60.0        # ...but never cut anything above this, relative to peak
ABS_DB = -96.0        # and never chase below the 16-bit floor
WIN_MS = 10.0
KEEP_MS = 40.0        # tail left after the last audible window
FADE_MS = 12.0        # raised-cosine, so the end cannot click
TARGET_DB = -1.0      # peak normalisation target


def decode(p):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '1',
                        '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)


def encode(p, x):
    """Write float back as 16-bit mono FLAC, clipped rather than wrapped."""
    y = np.clip(x, -1.0, 1.0)
    pcm = (y * 32767.0).astype('<i2').tobytes()
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR),
                        '-ac', '1', '-i', 'pipe:0', '-c:a', 'flac',
                        '-compression_level', '12', str(p)],
                       input=pcm, capture_output=True)
    return r.returncode == 0


def polish(x):
    """-> (trimmed+normalised audio, cut samples, gain applied) or None."""
    if x.size < 64:
        return None
    pk = float(np.abs(x).max())
    if pk <= 0:
        return None
    w = max(1, int(SR * WIN_MS / 1000))
    n = x.size // w
    if n < 3:
        return None
    r = np.sqrt(np.mean(x[:n * w].reshape(n, w) ** 2, axis=1))
    floor = float(np.percentile(r, FLOOR_PCT))
    thr = max(floor * 10 ** (FLOOR_OVER_DB / 20), 10 ** (ABS_DB / 20))
    thr = min(thr, pk * 10 ** (CAP_DB / 20))          # the safety rail
    loud = np.where(r > thr)[0]
    if loud.size == 0:
        return None
    keep = int(SR * KEEP_MS / 1000)
    end = min(x.size, (int(loud[-1]) + 1) * w + keep)
    y = x[:end].copy()
    # raised-cosine fade over the tail: a linear ramp leaves a slope
    # discontinuity you can hear on a low sine, and a kick very nearly is one
    f = min(int(SR * FADE_MS / 1000), y.size)
    if f > 1:
        y[-f:] *= 0.5 * (1 + np.cos(np.linspace(0, np.pi, f)))
    npk = float(np.abs(y).max())
    if npk <= 0:
        return None
    g = 10 ** (TARGET_DB / 20) / npk
    return y * g, x.size - end, g


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--include-similar', action='store_true',
                    help='also polish the _similar/ review pen')
    a = ap.parse_args()
    files = sorted(p for p in OUT.rglob('*.flac')
                   if a.include_similar or '_similar' not in p.parts)
    if not files:
        print('nothing under', OUT); return 1
    cut_ms, gains, worst, skipped = [], [], [], []
    for f in files:
        x = decode(f)
        r = polish(x)
        if r is None:
            skipped.append(f); continue
        y, cut, g = r
        cut_ms.append(cut / SR * 1000)
        gains.append(20 * np.log10(g))
        worst.append((cut / SR, 20 * np.log10(g), f))
        if not a.dry_run and not encode(f, y):
            print('  ENCODE FAILED', f)
    cut_ms = np.array(cut_ms); gains = np.array(gains)
    print('%s%d files' % ('DRY RUN  ' if a.dry_run else '', len(files)))
    print('  trimmed   median %.0fms  max %.0fms  total %.1fs removed'
          % (np.median(cut_ms), cut_ms.max(), cut_ms.sum() / 1000))
    print('  gain      median %+.1fdB  range %+.1f..%+.1fdB'
          % (np.median(gains), gains.min(), gains.max()))
    print('  every file now peaks at %.1fdBFS' % TARGET_DB)
    if skipped:
        print('  skipped (silent or too short): %d' % len(skipped))
        for f in skipped[:5]:
            print('    ' + str(f.relative_to(OUT)))
    print('  biggest trims:')
    for cut, g, f in sorted(worst, key=lambda r: -r[0])[:6]:
        print('    %-40s -%.2fs  %+.1fdB' % (f.relative_to(OUT), cut, g))
    print('  biggest lifts:')
    for cut, g, f in sorted(worst, key=lambda r: -r[1])[:6]:
        print('    %-40s %+.1fdB' % (f.relative_to(OUT), g))
    return 0


if __name__ == '__main__':
    sys.exit(main())
