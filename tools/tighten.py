#!/usr/bin/env python3
"""Pull a generated drum loop onto the grid, without changing how it sounds.

Gad, 2026-08-29: "sound is good and they are patterns, but the groove is shit
… make them better grooving and tighter".

He is right, and no amount of prompting fixes it: stable-audio-open is a SOUND
DESIGN model — Stability's own framing — so it renders a convincing kit playing
approximately. Timing is the one thing a generator is worst at and the one
thing arithmetic is best at, so this does not ask the model again. It measures
where every hit actually landed and moves it to where it belongs.

    python3 tools/tighten.py samples/drums/*.flac        # in place, reports
    python3 tools/tighten.py --dry samples/drums/x.flac  # measure only

HOW: onsets are detected on the mono sum, each is snapped to the nearest
subdivision of the loop's own tempo, and the audio is TIME-WARPED between
those anchors — the segment before a hit stretches or squeezes so the hit
lands on the beat. The endpoints are pinned, so the file stays exactly the bar
length it was and still loops. Warps are small (tens of ms), which is well
inside what a transient survives; this is what a DAW's audio quantize does.

WHAT IT WILL NOT FIX: a take with no groove in it. If the hits are not roughly
in the right places to begin with, snapping them to a grid gives you a tidy
version of the wrong pattern. The before/after grid error it prints is the
honest measure — a take that starts at 40ms average error and lands at 3ms was
loose, one that starts at 90ms was never playing the pattern.
"""
import sys, json, pathlib
import numpy as np
import soundfile as sf


def onsets_of(mono, sr, hop=0.005, sens=1.5):
    h = int(hop * sr)
    fr = np.array([np.sqrt((mono[i:i + h] ** 2).mean())
                   for i in range(0, len(mono) - h, h)])
    d = np.diff(fr)
    thr = max(d.std() * sens, 1e-5)
    idx = np.where((d[1:] > thr) & (d[:-1] <= thr))[0] + 1
    return idx * h


def grid_error(ons, step):
    """mean |distance to nearest grid slot|, in samples"""
    if not len(ons):
        return 0.0
    return float(np.abs(ons - np.round(ons / step) * step).mean())


def tighten(wav, sr, bpm, bars, div=4):
    """div=4 -> sixteenth notes. Returns (out, before_samples, after_samples)."""
    mono = wav.mean(axis=1)
    n = len(mono)
    step = 60.0 / bpm / div * sr
    ons = onsets_of(mono, sr)
    before = grid_error(ons, step)
    if len(ons) < 2:
        return wav, before, before

    # each onset -> its nearest slot, keeping the sequence strictly increasing.
    # Two hits fighting for one slot means the detector split one transient;
    # the first wins and the second is left where it is rather than dragged
    # backwards through the one before it.
    tgt = np.round(ons / step) * step
    src_a, dst_a, last = [0.0], [0.0], 0.0
    for s0, t0 in zip(ons.astype(float), tgt):
        if t0 <= last or s0 <= src_a[-1]:
            continue
        src_a.append(s0); dst_a.append(t0); last = t0
    # THE ENDPOINT HAS TO BE PAST THE LAST ANCHOR, and it often is not: a hit
    # near the end snaps to a slot at or beyond the final sample, which made
    # diff(dst) non-positive and bailed the whole warp. Measured — two of the
    # first three takes silently did nothing because of this. Drop trailing
    # anchors until the endpoint is genuinely last.
    while len(src_a) > 1 and (dst_a[-1] >= n - 1 or src_a[-1] >= n - 1):
        src_a.pop(); dst_a.pop()
    src_a.append(float(n - 1)); dst_a.append(float(n - 1))
    src_a = np.array(src_a); dst_a = np.array(dst_a)
    if len(src_a) < 3 or not np.all(np.diff(dst_a) > 0) \
                      or not np.all(np.diff(src_a) > 0):
        return wav, before, before

    # for every OUTPUT sample, which SOURCE sample to read — piecewise linear
    # between the anchors, so the stretch is spread over the gap before a hit
    out_i = np.arange(n, dtype=float)
    read = np.interp(out_i, dst_a, src_a)
    out = np.empty_like(wav)
    grid = np.arange(n, dtype=float)
    for c in range(wav.shape[1]):
        out[:, c] = np.interp(read, grid, wav[:, c])

    after = grid_error(onsets_of(out.mean(axis=1), sr), step)
    return out, before, after


def main():
    dry = "--dry" in sys.argv
    # SWUNG MATERIAL NEEDS A TRIPLET GRID. Quantizing a jazz brush pattern to
    # straight sixteenths does not tighten it, it destroys the feel — the
    # whole point of the pattern is that it is NOT on the straight grid.
    # --div 3 gives eighth triplets, 6 gives sixteenth triplets.
    div = None                      # None = try them all, see CAND below
    for i, a in enumerate(sys.argv):
        if a == "--div" and i + 1 < len(sys.argv):
            div = int(sys.argv[i + 1])
    files = [a for a in sys.argv[1:]
             if not a.startswith("-") and not a.isdigit()]
    if not files:
        print(__doc__); return
    here = pathlib.Path(__file__).resolve().parent.parent
    man = json.loads((here / "samples" / "manifest.json").read_text())
    by_name = {e["name"]: e for e in man}

    # THE GRID IS A PROPERTY OF THE TAKE, NOT A FLAG. Straight sixteenths fixed
    # funkkit and did almost nothing for rockkit; jazzbrush only came good on
    # sixteenth TRIPLETS, because it is swung. Guessing per file by hand is how
    # one of them quietly gets quantized onto the wrong feel — so try them all
    # and let the audio say which it is.
    #
    # Picking the lowest error outright would always choose the FINEST grid: a
    # 1/64 grid fits anything and tightens nothing. So take the COARSEST grid
    # that lands under 10ms, which is roughly where timing stops being audible
    # as sloppiness, and fall back to the best available if none does.
    CAND = [2, 3, 4, 6, 8] if div is None else [div]
    for f in files:
        p = pathlib.Path(f)
        e = by_name.get(p.stem)
        if not e:
            print(f"{p.stem:12s} not in manifest — skipped"); continue
        wav, sr = sf.read(p, always_2d=True)
        ms = lambda x: x / sr * 1000
        tried = []
        for d in CAND:
            o, b, a = tighten(wav, sr, e["bpm"], e["bars"], d)
            tried.append((d, o, b, a))
        good = [t for t in tried if ms(t[3]) <= 10.0 and t[3] < t[2]]
        d, out, b, a = good[0] if good else min(tried, key=lambda t: t[3])
        swing = "  (swung)" if d in (3, 6) else ""
        tag = "" if a < b else "   ⚠ no improvement — left alone"
        if a >= b:
            out = wav
        print(f"{p.stem:12s} {e['bpm']:5.0f}bpm  best grid 1/{d*4:<2d}{swing:9s} "
              f"{ms(b):5.1f}ms -> {ms(a):4.1f}ms{tag}")
        if not dry and a < b:
            sf.write(p, out, sr, format="FLAC", subtype="PCM_24")


if __name__ == "__main__":
    main()
