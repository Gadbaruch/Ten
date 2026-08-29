#!/usr/bin/env python3
"""ACOUSTIC drum loops for TEN's audio channel — kits, patterns, articulations.

Gad, 2026-08-29, on the first attempt: "i dont like them... they all sound like
generated on a drum machine but the point of samples is to give acoustic vibe,
thats why i wanted you to find breaks, also its all mp3 and sounds bad."

Both faults are fixed here and both were mine:

  THE SOUND. gen_breaks.py asked for "drum break" and got what that phrase is
  full of in the training data — chopped, electronic, breakcore. Every prompt
  below names an ACOUSTIC KIT, a PLAYER and a ROOM instead, and NEG spends its
  whole budget pushing away from drum machines rather than on generic "low
  quality" words. A break is what a drummer PLAYED; that is the thing to ask
  for.

  THE FORMAT. Those shipped as 192k mp3 next to a one-shot shelf that is
  already FLAC. These are 24-bit stereo FLAC, written straight from the float
  array by soundfile — no ffmpeg, no lossy stage at all.

    python3 tools/gen_drums.py                 # all of them
    python3 tools/gen_drums.py jazzbrush       # just the named ones
    python3 tools/gen_drums.py --list

Writes ten/samples/drums/<name>.flac and appends to samples/manifest.json —
the PHRASE shelf, cat 'perc', so they land under the audio channel's `perc`
type filter and never in a sample op. Setup is gen_samples.py's setup.

WHY GENERATED AT ALL: the classic breaks are not free and the free-sample sites
do not make them free — see samples/drums/LICENSES.md, which carries the
vetting of freesound, creazilla and selekt that led here.
"""
import json, sys, pathlib

# name -> (prompt, bpm, bars, seconds asked of the model)
# Two families: whole GROOVES a drummer plays, and single ELEMENTS to layer.
KIT = ("acoustic drum kit, real drummer, studio recording with room "
       "microphones, natural cymbals and skins")
# ASK FOR A PERFORMANCE, NOT A SOUND. Gad on the first acoustic pass: "only the
# fun kit is actually playing a rhythm, but the rhythm is very loose, and it's
# only a high hat. And the Jazz brush rock kit, both of them are just one shot."
# The kit words were right and the PLAYING words were missing entirely, so the
# model rendered a drum rather than a drummer. This suffix is on every prompt.
GRV = ("playing a steady repeating groove all the way through, the same "
       "pattern every bar, locked to the beat, no fill, no intro, no ending")

# ONE OR TWO BARS, never more (Gad: "Each one can also be just one bar. You
# know? or two bars max"). A short loop is also the easier ask: the model has
# to hold a pattern for three seconds instead of six.
DRUMS = {
    # ---- grooves, by genre --------------------------------------------
    "jazzbrush":  (f"jazz drums played with brushes, swirling on the snare, "
                   f"swung ride, {GRV}, {KIT}", 120, 2, 14.0),
    "jazzride":   (f"swing jazz ride cymbal with sticks, hi hat on two and "
                   f"four, walking swing, {GRV}, {KIT}", 140, 2, 14.0),
    "funkkit":    (f"funk drum groove, tight backbeat, ghost notes on the "
                   f"snare, sixteenth hi hats, {GRV}, {KIT}", 100, 2, 16.0),
    "discokit":   (f"disco drum groove, four on the floor kick every beat, "
                   f"open hi hat offbeats, {GRV}, {KIT}", 120, 2, 14.0),
    "rockkit":    (f"rock drum groove hit hard, backbeat snare on two and "
                   f"four, eighth note hi hats, {GRV}, {KIT}", 120, 2, 14.0),
    "dubdrop":    (f"reggae one drop groove, rim click on beat three, deep "
                   f"soft kick, {GRV}, {KIT}", 75, 1, 14.0),
    "dubstepper": (f"reggae steppers groove, kick on every beat, timbale rim, "
                   f"{GRV}, {KIT}", 75, 1, 14.0),
    "dnbacoustic":(f"fast drum and bass groove played live on an acoustic kit, "
                   f"broken beat, real cymbals, {GRV}, {KIT}", 174, 2, 14.0),
    "junglelive": (f"jungle breakbeat played live on an acoustic kit, "
                   f"syncopated snares, ride bell, {GRV}, {KIT}", 174, 2, 14.0),
    "boombapkit": (f"nineties hip hop drum groove played live, fat lazy kick, "
                   f"cracking rimshot snare, {GRV}, {KIT}", 90, 2, 16.0),
    # ---- single elements, to layer or to sit under a groove ------------
    "hatsixteen": (f"closed hi hat alone, steady sixteenth notes, sticks on a "
                   f"real cymbal, dry, {GRV}, {KIT}", 100, 2, 14.0),
    "hatopen":    (f"hi hat alone opening and closing on the foot pedal, "
                   f"sizzling offbeat accents, {GRV}, {KIT}", 100, 2, 14.0),
    "ridepattern":(f"ride cymbal alone played with sticks, steady shimmering "
                   f"rhythm, {GRV}, {KIT}", 100, 2, 14.0),
    "ridebell":   (f"ride cymbal bell alone, bright pinging accents, {GRV}, "
                   f"{KIT}", 100, 2, 14.0),
    "snareghost": (f"snare drum alone, backbeat with quiet ghost notes "
                   f"between and rimshots, {GRV}, {KIT}", 100, 2, 14.0),
    "snarepress": (f"snare drum alone, press rolls buzz rolls and flams, "
                   f"marching technique, {GRV}, {KIT}", 100, 2, 14.0),
    "tomgroove":  (f"tom tom groove around the kit, floor tom and rack toms, "
                   f"{GRV}, {KIT}", 100, 2, 14.0),
    "kicksnare":  (f"kick and snare backbeat alone, no cymbals, dry close "
                   f"miked, {GRV}, {KIT}", 100, 2, 14.0),
}

# THE WHOLE BUDGET SPENT ON ONE FIGHT. The first pass used generic quality
# words and got drum machines anyway; what actually has to be pushed away is
# every synonym for a programmed drum.
NEG = ("drum machine, electronic drums, drum computer, 808, 909, linndrum, "
       "sampled drums, synthetic, sequenced, quantized, midi, programmed, "
       "breakcore, edm, synth, bass guitar, melody, vocals, low quality, "
       "clipping, "
       # …and against the OTHER failure: a single hit ringing out, which is
       # what jazzbrush and rockkit came back as.
       "single hit, one shot, isolated drum hit, sparse, silence, empty, "
       "ambient, cymbal swell, drum solo, fill, applause")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    if "--list" in sys.argv:
        for k, (p, bpm, bars, s) in DRUMS.items():
            print(f"{k:12s} {bpm:5.0f}bpm {bars}bar {s:4.1f}s  {p[:70]}…")
        return

    import torch, soundfile as sf, numpy as np
    from diffusers import StableAudioPipeline

    here = pathlib.Path(__file__).resolve().parent.parent
    out = here / "samples" / "drums"; out.mkdir(parents=True, exist_ok=True)
    want = args or list(DRUMS)

    device = "mps" if torch.backends.mps.is_available() else \
             ("cuda" if torch.cuda.is_available() else "cpu")
    dtype = torch.float16 if device != "cpu" else torch.float32
    print(f"loading stable-audio-open-1.0 on {device}…", flush=True)
    pipe = StableAudioPipeline.from_pretrained(
        "stabilityai/stable-audio-open-1.0", torch_dtype=dtype).to(device)

    # same last-step crash and the same fix as gen_samples.py — the brownian
    # tree bisects to a stack overflow on step 99 of 100.
    import diffusers.schedulers.scheduling_cosine_dpmsolver_multistep as cos_mod

    class _PlainNoise:
        def __init__(self, x, *a, **k): self.x = x
        def __call__(self, s0, s1): return torch.randn_like(self.x)

    cos_mod.BrownianTreeNoiseSampler = _PlainNoise

    mpath = here / "samples" / "manifest.json"
    manifest = json.loads(mpath.read_text()) if mpath.exists() else []

    for name in want:
        prompt, bpm, bars, secs = DRUMS[name]
        loop = bars * 4 * 60.0 / bpm
        fn = f"drums/{name}.flac"
        print(f"● {name}: {bpm:.0f}bpm {bars}bar -> {loop:.2f}s", flush=True)
        audio = pipe(prompt, negative_prompt=NEG,
                     audio_end_in_s=secs,
                     num_inference_steps=100,
                     generator=torch.Generator(device="cpu").manual_seed(
                         sum(map(ord, name)) * 13 + 29)).audios[0]
        wav = audio.T.float().cpu().numpy()
        if wav.ndim == 1: wav = wav[:, None]

        # CUT THE BUSIEST BAR, NOT THE FIRST ONE. Starting at the first onset
        # and keeping N bars is what turned a stray hit into a four-second
        # "loop": if the model plays one crash and then noodles, the first
        # onset is the crash. So render THREE loops' worth, find every onset,
        # and take the window — starting ON an onset, so the loop begins on a
        # hit — that contains the most of them. The groove is in there; the
        # job is to find it rather than to hope it starts at the top.
        mono = wav.mean(axis=1)
        h = int(0.01 * 44100)                       # 10ms frames
        fr = np.array([np.sqrt((mono[i:i + h] ** 2).mean())
                       for i in range(0, len(mono) - h, h)])
        dfr = np.diff(fr)
        thr = max(dfr.std() * 1.5, 1e-4)
        ons = (np.where((dfr[1:] > thr) & (dfr[:-1] <= thr))[0] + 1) * h
        keep = int(round(loop * 44100))
        start, dens = 0, -1
        for o in ons:
            if o + keep > len(mono):
                break
            n = int(((ons >= o) & (ons < o + keep)).sum())
            if n > dens:
                start, dens = int(o), n
        if dens < 0:                                 # no onsets at all
            start, dens = 0, 0
        wav = wav[start:start + keep]
        per_bar = dens / max(bars, 1)
        note = "" if per_bar >= 4 else "   ⚠ THIN — %.1f hits/bar" % per_bar
        e = int(0.005 * 44100)
        if len(wav) > 2 * e:
            ramp = np.linspace(0, 1, e)[:, None]
            wav[:e] *= ramp; wav[-e:] *= ramp[::-1]
        pk = float(np.abs(wav).max()) or 1.0
        wav = wav * (0.89 / pk)

        # 24-BIT FLAC, STRAIGHT FROM THE FLOATS. No ffmpeg and no lossy stage:
        # the one-shot shelf has always been FLAC and the phrase shelf's mp3s
        # are the odd ones out.
        sf.write(here / "samples" / fn, wav, 44100,
                 format="FLAC", subtype="PCM_24")

        manifest = [m for m in manifest if m.get("name") != name]
        manifest.append({"name": name, "file": fn, "bpm": float(bpm),
                         "bars": bars, "kind": "loop", "cat": "perc"})
        mpath.write_text(json.dumps(manifest, indent=1))
        sz = (here / "samples" / fn).stat().st_size
        print(f"  → samples/{fn}  ({len(wav)/44100:.2f}s, {sz//1024}kB, "
              f"{dens} hits in {bars} bar = {per_bar:.1f}/bar){note}", flush=True)

    print(f"\ndone — {len(manifest)} entries in samples/manifest.json; "
          "reload TEN, audio channel, type 'perc'.")


if __name__ == "__main__":
    main()
