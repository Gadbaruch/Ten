#!/usr/bin/env python3
"""Turn AKWF single-cycle waveforms into TEN wavetable recipes.

TEN's WTBL entries are HARMONIC RECIPES, not sample data — `[name, [frame,
frame, ...]]` where a frame is a list of harmonic amplitudes and `wtHarm`
interpolates neighbouring frames in the harmonic domain. So an imported
waveform becomes its magnitude spectrum: 600-sample single cycles, rfft, the
first HARM harmonics, normalised so the loudest is 1.

Source: AKWF-FREE (Kristoffer Ekstrand), CC0 1.0 — public domain, per the
repository's own LICENSE.md. https://github.com/KristofferKarlAxelEkstrand/AKWF-FREE

WHAT IS LOST: phase. wtWave sums sines with zero phase and hands the recipe
straight to createPeriodicWave, so the waveform SHAPE differs from the source
while the spectrum is exact. For a steady tone that is where nearly all the
character lives, and the harshness these tables are wanted for is spectral.

FRAMES ARE ORDERED BY SPECTRAL CENTROID, dark to bright, so `pos` means the
same thing — brighter — in every table on the shelf. A dial that means one
thing everywhere is the whole point of a dial you can find without looking.

    tools/gen_wavetables.py            # prints the WTBL rows to paste
"""
import io, json, sys, urllib.request
import numpy as np
import soundfile as sf

RAW = "https://raw.githubusercontent.com/KristofferKarlAxelEkstrand/AKWF-FREE/master/AKWF"
API = "https://api.github.com/repos/KristofferKarlAxelEkstrand/AKWF-FREE/contents/AKWF"

HARM = 256         # a C2 carries 337 harmonics under Nyquist; 48 was throwing
                   # away two and a half octaves of every one of these waves,
                   # which is what "cheap on the lower octaves" was. The source
                   # cycles are 600 samples, so 300 is all there is to take.
FLOOR = 0.006      # drop a harmonic under this — inaudible, and it is bytes.
                   # Halved with the ceiling raised: at -44dB a harmonic still
                   # carries air on a bright table and the trim still bites.
FRAMES = 5         # per table, evenly spread across the folder's brightness range
POOL = 24          # how many of the folder's waves to audition

# name, folder — chosen for the digital end of the shelf
TABLES = [
    ("crush",  "AKWF_bitreduced"),
    ("chip",   "AKWF_oscchip"),
    ("vgame",  "AKWF_vgame"),
    ("fm",     "AKWF_fmsynth"),
    ("dist",   "AKWF_distorted"),
    ("gap",    "AKWF_bw_sawgap"),
    ("raw",    "AKWF_raw"),
    ("drawn",  "AKWF_hdrawn"),
    ("grain",  "AKWF_granular"),
    ("sym",    "AKWF_symetric"),
]


def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def listing(folder):
    d = json.loads(get("%s/%s" % (API, folder)))
    return sorted(t["name"] for t in d if t["name"].endswith(".wav"))


def spectrum(wav):
    x, _ = sf.read(io.BytesIO(wav), dtype="float64")
    if x.ndim > 1:
        x = x.mean(axis=1)
    m = np.abs(np.fft.rfft(x))[1:HARM + 1]
    if m.max() <= 0:
        return None, None
    m = m / m.max()
    k = np.arange(1, len(m) + 1)
    centroid = float((m * k).sum() / max(1e-9, m.sum()))
    return m, centroid


def trim(m):
    m = np.where(m < FLOOR, 0.0, m)
    last = int(np.max(np.nonzero(m))) if np.any(m) else 0
    return [round(float(v), 3) for v in m[:last + 1]]


def js(vals):
    return "[" + ",".join(("%g" % v) for v in vals) + "]"


def main():
    out = []
    for name, folder in TABLES:
        names = listing(folder)
        step = max(1, len(names) // POOL)
        picks = names[::step][:POOL]
        got = []
        for fn in picks:
            try:
                m, c = spectrum(get("%s/%s/%s" % (RAW, folder, fn)))
            except Exception as e:
                print("  ! %s %s" % (fn, e), file=sys.stderr)
                continue
            if m is not None:
                got.append((c, fn, m))
        if len(got) < FRAMES:
            print("  ! %s only %d usable" % (folder, len(got)), file=sys.stderr)
            continue
        got.sort(key=lambda t: t[0])                     # dark -> bright
        idx = np.linspace(0, len(got) - 1, FRAMES).round().astype(int)
        frames = [trim(got[i][2]) for i in idx]
        src = [got[i][1] for i in idx]
        cen = [round(got[i][0], 1) for i in idx]
        print(" ['%s',[ %s ]],   // %s  centroid %s" %
              (name, ",".join(js(f) for f in frames), folder, "->".join(map(str, cen))))
        out.append((name, folder, src, cen, frames))
    tot = sum(len(f) for _, _, _, _, fr in out for f in fr)
    print("// %d tables, %d harmonics total, sources: %s" %
          (len(out), tot, "; ".join("%s=%s" % (n, ",".join(s)) for n, _, s, _, _ in out)),
          file=sys.stderr)


if __name__ == "__main__":
    main()
