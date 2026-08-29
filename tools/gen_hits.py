#!/usr/bin/env python3
"""ACOUSTIC drum ONE-SHOTS for TEN's kits, in numbered variations.

Gad, 2026-08-29: "you make pretty good one shots lets make more acoustic drums
for the kits? and can you think of a hack to have 3-4 variations per
snare/cymble that every hit shuffles through a variation?"

Two jobs, and the first one stands alone:

  VARIATIONS ARE USEFUL WITHOUT THE HACK. Every take here is written as its own
  one-shot on the DRUM shelf, so a kit pad or a smp op can pick any of them
  today. snare-1..5 are five different snares, whatever plays them.

  AND THEY CONCATENATE. `--rr` also writes <inst>-rr.flac, every variation of
  one drum laid end to end at equal spacing, which is the file a round-robin
  needs: start = i/N, span = 1/N. See NEXT.md — sst and sen are already `ctrl`
  modulation destinations and rnd is already a source, so the only missing
  piece is snapping a continuous random to N steps.

WHY ONE-SHOTS RATHER THAN LOOPS: the loop attempts failed on TIMING, measured —
stable-audio-open places a hit ~15-20ms off the grid and no prompt fixes that,
because it is a sound-design model. A one-shot has no grid to miss. It is the
shape of output this model is actually good at, which is why Gad liked the
first ones.

    python3 tools/gen_hits.py                # every drum, every variation
    python3 tools/gen_hits.py snare kick     # just those
    python3 tools/gen_hits.py --rr snare     # …and write snare-rr.flac too
    python3 tools/gen_hits.py --list

Writes ten/samples/oneshots/<inst>/<name>.flac and appends to
samples/oneshots/manifest.json — the DRUM shelf, so they land in a smp op and
in kits, and never in the audio channel. Setup is gen_samples.py's setup.
"""
import json, sys, pathlib

ROOM = ("acoustic drum kit recorded close with a room microphone, real skins "
        "and metal, natural decay, dry studio, no effects")

# inst -> (cat, variations, seconds, prompt core)
# Each variation is the SAME prompt on a different seed — that is the whole
# point: five snares that are recognisably the same drum, hit differently.
HITS = {
    "kick":   ("kik",  4, 2.5, "a single bass drum kick, deep round thud, felt beater"),
    "snare":  ("snr",  5, 2.5, "a single snare drum hit, wires rattling, sharp crack"),
    "rim":    ("snr",  3, 2.0, "a single rimshot on a snare drum, woody sharp click"),
    "hatcl":  ("hh",   4, 1.5, "a single closed hi hat, tight short tick, sticks on metal"),
    "hatop":  ("hh",   3, 3.0, "a single open hi hat, sizzling shimmer decaying"),
    "ride":   ("cymb", 3, 4.0, "a single ride cymbal stroke, shimmering wash decaying"),
    "bell":   ("cymb", 2, 3.5, "a single strike on a ride cymbal bell, bright ping"),
    "crash":  ("cymb", 2, 4.0, "a single crash cymbal, explosive bright wash decaying"),
    "tomhi":  ("tom",  3, 2.5, "a single rack tom hit, high pitched round drum tone"),
    "tomlo":  ("tom",  3, 3.0, "a single floor tom hit, low booming drum tone"),
    "shake":  ("perc", 3, 1.5, "a single shaker shake, dry seeds in a wooden shell"),
    "tamb":   ("perc", 3, 2.0, "a single tambourine hit, jingles ringing"),
}

def vary(w, sr, i, eps, rng):
    """One take -> the i-th subtle variation of it. i=0 returns it untouched.

    WHY NOT THE LATENT. The obvious idea is to start every variation from the
    same diffusion latent with a small nudge, and it was built and MEASURED:
    at eps 0.12 the five snares came back with pairwise waveform correlations
    of +0.003, -0.055, -0.093 and spectral distances around 0.9 — no more
    related than five different seeds. Diffusion's noise->audio map is chaotic;
    a 12% nudge lands in a different mode entirely, and each attempt at a
    smaller eps costs twelve minutes of render to find out.

    So variations are made the way a sampler fakes round-robin, because that is
    what a round-robin is FOR — masking machine-gun repetition, not supplying
    five different drums. Same recording, retuned and re-struck slightly:

      pitch   +/-30 cents, by resampling — which shortens or lengthens the hit
              exactly as a differently-tuned drum would
      decay   +/-7%, an envelope tilt over the tail only, so the attack is
              untouched and the drum still reads as the same drum
      tone    +/-1.2dB of spectral tilt, a harder or softer stroke
      level   +/-1dB

    Deterministic in `i`, so a rebuild produces the same set.
    """
    import numpy as np
    if i == 0:
        return w
    r = np.random.default_rng(rng + i * 977)
    cents = (r.random() * 2 - 1) * 30 * eps / 0.12
    ratio = 2 ** (cents / 1200.0)
    n = len(w)
    src = np.arange(n) * ratio
    src = src[src < n - 1]
    out = np.empty((len(src), w.shape[1]), dtype=w.dtype)
    grid = np.arange(n)
    for c in range(w.shape[1]):
        out[:, c] = np.interp(src, grid, w[:, c])
    # decay: a gentle ramp applied to the TAIL only, attack left alone
    m = len(out)
    a = int(0.02 * sr)
    if m > a + 32:
        k = 1.0 + (r.random() * 2 - 1) * 0.07 * eps / 0.12
        t = np.linspace(0, 1, m - a)[:, None]
        out[a:] *= (k ** t)
    # tone: one-pole tilt, bright or dull
    tilt = (r.random() * 2 - 1) * 1.2 * eps / 0.12
    if abs(tilt) > 0.05:
        g = 10 ** (tilt / 20.0)
        lp = np.empty_like(out)
        acc = out[0].copy()
        for j in range(m):
            acc = acc * 0.72 + out[j] * 0.28
            lp[j] = acc
        out = lp + (out - lp) * g
    out *= 10 ** (((r.random() * 2 - 1) * 1.0 * eps / 0.12) / 20.0)
    pk = float(np.abs(out).max()) or 1.0
    return out * (0.89 / pk)


# The one-shot's own failure mode is the opposite of the loop's: a loop came
# back as one hit, so a one-shot comes back as a groove. Say no to the pattern.
NEG = ("drum machine, electronic drums, 808, 909, synthetic, sampled, midi, "
       "programmed, loop, groove, pattern, rhythm, beat, sequence, multiple "
       "hits, roll, fill, music, melody, reverb tail, room ambience, silence")


def main():
    args = [a for a in sys.argv[1:]
            if not a.startswith("-") and not a.replace(".", "").isdigit()]
    rr = "--rr" in sys.argv
    # HOW FAR A VARIATION MAY WANDER. 0 = the same hit twice, 1 = a different
    # drum (which is what the first pass shipped by accident).
    EPS = 0.14
    for i, a in enumerate(sys.argv):
        if a == "--eps" and i + 1 < len(sys.argv):
            EPS = float(sys.argv[i + 1])
    if "--list" in sys.argv:
        tot = 0
        for k, (cat, n, s, p) in HITS.items():
            print(f"{k:7s} cat={cat:5s} x{n}  {s:3.1f}s  {p}")
            tot += n
        print(f"\n{tot} renders total")
        return

    import torch, soundfile as sf, numpy as np
    from diffusers import StableAudioPipeline

    here = pathlib.Path(__file__).resolve().parent.parent
    want = args or list(HITS)

    device = "mps" if torch.backends.mps.is_available() else \
             ("cuda" if torch.cuda.is_available() else "cpu")
    dtype = torch.float16 if device != "cpu" else torch.float32
    print(f"loading stable-audio-open-1.0 on {device}…", flush=True)
    pipe = StableAudioPipeline.from_pretrained(
        "stabilityai/stable-audio-open-1.0", torch_dtype=dtype).to(device)

    import diffusers.schedulers.scheduling_cosine_dpmsolver_multistep as cos_mod

    class _PlainNoise:
        def __init__(self, x, *a, **k): self.x = x
        def __call__(self, s0, s1): return torch.randn_like(self.x)

    cos_mod.BrownianTreeNoiseSampler = _PlainNoise

    # ---- SUBTLE VARIATIONS: ONE LATENT, NUDGED -------------------------
    # Gad, 2026-08-29: "these sound awesome but the variations are too big can
    # you try more subtle". Measured on the first five snares — pairwise
    # waveform correlation -0.005 and centroids from 1809Hz to 4833Hz. Those
    # were not variations, they were five unrelated drums, because a different
    # SEED randomises the whole starting latent. Diffusion has no "near seed":
    # seed+1 is as far away as seed+9000.
    #
    # So every variation of one drum starts from the SAME latent, with a small
    # gaussian nudge — z = (z0 + eps*n) / sqrt(1+eps^2), the divisor keeping
    # unit variance so the model still sees a well-formed starting point. eps
    # is the whole dial: 0 is the same hit twice, 1.0 is a different drum.
    base_z = {}
    cur = {"eps": 0.0, "seed": 0, "fresh": False}
    _orig_pl = pipe.prepare_latents

    # *a, **kw and never a named signature: diffusers calls this with NINE
    # positional arguments and pins none of them, so spelling them out here
    # binds us to one library version. Let the original build a latent either
    # way — it is one randn and costs nothing — then keep it or replace it.
    def _pl(*a, **kw):
        z = _orig_pl(*a, **kw)
        key = tuple(z.shape)
        if cur["fresh"] or key not in base_z:
            base_z[key] = z.detach().clone()
            cur["fresh"] = False
            return z
        z0 = base_z[key]
        g = torch.Generator(device="cpu").manual_seed(cur["seed"])
        n = torch.randn(tuple(z0.shape), generator=g,
                        dtype=torch.float32).to(z0.device).to(z0.dtype)
        e = cur["eps"]
        return (z0 + e * n) / ((1.0 + e * e) ** 0.5)

    # (left defined, NOT installed: the measurement above is why. Set
    #  pipe.prepare_latents = _pl to try a latent eps again.)

    mpath = here / "samples" / "oneshots" / "manifest.json"
    manifest = json.loads(mpath.read_text()) if mpath.exists() else []

    for inst in want:
        cat, nvar, secs, core = HITS[inst]
        out = here / "samples" / "oneshots" / inst
        out.mkdir(parents=True, exist_ok=True)
        takes = []
        # ONE RENDER PER DRUM, then vary() makes the rest. The model is asked
        # for a snare once; five snares that are the SAME snare cannot come
        # from five separate asks, which is the whole thing the measurement
        # above established. It also drops the batch from 38 renders to 12.
        print(f"● {inst}  — 1 render, {nvar} variations at eps {EPS:.2f}",
              flush=True)
        audio = pipe(f"{core}, one hit only, {ROOM}", negative_prompt=NEG,
                     audio_end_in_s=secs, num_inference_steps=100,
                     generator=torch.Generator(device="cpu").manual_seed(
                         sum(map(ord, inst)) * 101)).audios[0]
        w0 = audio.T.float().cpu().numpy()
        if w0.ndim == 1: w0 = w0[:, None]

        # TRIM TO THE HIT. A one-shot is an attack and a decay: start where the
        # sound does, end where it stops mattering, so no pad carries silence
        # into a kit.
        mono = np.abs(w0).max(axis=1)
        thr = max(1e-5, mono.max() * 0.002)
        first = int(np.argmax(mono > thr))
        tail = np.where(mono > mono.max() * 0.001)[0]
        last = int(tail[-1]) if len(tail) else len(mono) - 1
        w0 = w0[first:min(last + int(0.05 * 44100), len(w0))]
        e = int(0.004 * 44100)
        if len(w0) > 2 * e:
            w0[-e:] *= np.linspace(1, 0, e)[:, None]
        pk = float(np.abs(w0).max()) or 1.0
        w0 = w0 * (0.89 / pk)

        for v in range(1, nvar + 1):
            name = f"{inst}-{v}"
            fn = f"oneshots/{inst}/{name}.flac"
            w = vary(w0, 44100, v - 1, EPS, sum(map(ord, inst)) * 101)
            sf.write(here / "samples" / fn, w, 44100,
                     format="FLAC", subtype="PCM_24")
            takes.append(w)
            manifest = [m for m in manifest if m.get("name") != name]
            manifest.append({"name": name, "file": fn, "kind": "one",
                             "inst": inst, "style": "acoustic", "cat": cat})
            mpath.write_text(json.dumps(manifest, indent=1))
            print(f"  → samples/{fn}  ({len(w)/44100:.2f}s)", flush=True)

        if rr and len(takes) > 1:
            # EQUAL SLOTS, or the arithmetic on the other end does not work:
            # a round-robin reads slice i as start=i/N span=1/N, which is only
            # true if every slot is the same length. Pad each take to the
            # longest and lay them end to end.
            L = max(len(t) for t in takes)
            buf = np.zeros((L * len(takes), takes[0].shape[1]), dtype=takes[0].dtype)
            for i, t in enumerate(takes):
                buf[i * L:i * L + len(t)] = t
            name = f"{inst}-rr"
            fn = f"oneshots/{inst}/{name}.flac"
            sf.write(here / "samples" / fn, buf, 44100,
                     format="FLAC", subtype="PCM_24")
            manifest = [m for m in manifest if m.get("name") != name]
            manifest.append({"name": name, "file": fn, "kind": "one",
                             "inst": inst, "style": "acoustic-rr", "cat": cat,
                             "slots": len(takes)})
            mpath.write_text(json.dumps(manifest, indent=1))
            print(f"  → samples/{fn}  ({len(takes)} slots of "
                  f"{L/44100:.2f}s each)", flush=True)

    print(f"\ndone — {len(manifest)} entries on the drum shelf.")


if __name__ == "__main__":
    main()
