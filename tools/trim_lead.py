#!/usr/bin/env python3
"""Cut dead air off the front of the acoustic one-shots.

Gad, 2026-08-30: "a couple of the kits actually have too much empty space
before the sample starts which fucks up the kit making them sloppy and delayed
… trim any dead space before the main transient point? you can keep probably
2-5 ms before peak where there is a bit of air before the hit."

He is right and it was mine: gen_kits.py found the start with

    first = argmax(|x| > peak * 0.002)          # -54 dB

which is a FORWARD search at a threshold so low that room tone, a breath, or
the model's own noise floor trips it. Measured across the 90: 60 files with
more than 10ms of lead, 37 over 25ms, and jazz/shaker sitting 810ms late on a
1500ms file. On a kit that reads as sloppy timing, because it IS sloppy timing.

WHAT THIS WILL NOT DO IS TRIM A SLOW ATTACK. That is the whole difficulty, and
the profiles say why — measured in 20ms blocks, as dB below the file's peak:

    jazz/kick    -44  -8   0            silence, then a hit        TRIM
    orch/kick    -42 -39 -41 -33  0     silence, then a hit        TRIM
    brsh/snare   -41 -42 -42 -43 … -1   silence, then a hit        TRIM
    jazz/shaker  -23 -18 -20 -17 -15    quiet SHAKING throughout   KEEP
    big/ride     -9  -9  -9  -5  -6     a swell                    KEEP

A shaker's quiet lead is the instrument, not dead space, and cutting to its
loudest grain would destroy it. -30 dBFS-relative separates all five correctly:
silence sits below it, a real quiet sound sits above.

    python3 tools/trim_lead.py            # trim, report every change
    python3 tools/trim_lead.py --dry      # report only

Peak is untouched — only leading quiet is removed — so the bank stays exactly
peak-normalised at 0.8900 and padLoud's LUFS reading is unaffected except for
the silence it was averaging over.
"""
import sys, glob, pathlib
import numpy as np
import soundfile as sf

FLOOR_DB = -30.0     # below this, relative to the file's own peak, is silence
KEEP_MS = 3.0        # the air Gad asked for: 2-5ms before the hit
FADE_MS = 0.5        # against a click at the new start; lands in quiet air


def lead_of(m, pk, sr):
    """samples of true silence before the sound starts, or 0"""
    thr = pk * (10 ** (FLOOR_DB / 20))
    above = np.nonzero(m >= thr)[0]
    if not len(above):
        return 0
    return int(above[0])


def main():
    dry = "--dry" in sys.argv
    here = pathlib.Path(__file__).resolve().parent.parent
    files = sorted(glob.glob(str(here / "samples/oneshots/acoustic/*/*.flac")))
    cut = kept = 0
    for f in files:
        w, sr = sf.read(f, always_2d=True)
        m = np.abs(w).max(axis=1)
        pk = float(m.max())
        if pk <= 0:
            continue
        start = lead_of(m, pk, sr)
        keep = int(KEEP_MS / 1000 * sr)
        new = max(0, start - keep)
        name = "/".join(f.split("/")[-2:])[:-5]
        if new < int(0.001 * sr):                    # nothing worth cutting
            kept += 1
            continue
        out = w[new:].copy()
        e = int(FADE_MS / 1000 * sr)
        if len(out) > 2 * e:
            out[:e] *= np.linspace(0, 1, e)[:, None]
        print("  %-18s cut %6.1f ms   %5.2fs -> %5.2fs" %
              (name, new / sr * 1000, len(w) / sr, len(out) / sr))
        cut += 1
        if not dry:
            sf.write(f, out, sr, format="FLAC", subtype="PCM_24")
    print("\n%d trimmed, %d left alone%s" % (cut, kept, "  (--dry)" if dry else ""))


if __name__ == "__main__":
    main()
