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

DRUMS = {
    # ---- grooves, by genre --------------------------------------------
    "jazzbrush":  (f"jazz drums played with brushes, swirling on the snare, "
                   f"swung ride, brushed, {KIT}", 120, 2, 6.5),
    "jazzride":   (f"swing jazz ride cymbal pattern with sticks, hi hat on two "
                   f"and four, walking swing feel, {KIT}", 140, 2, 6.5),
    "funkkit":    (f"funk drum groove, tight backbeat, ghost notes on the "
                   f"snare, crisp hi hat sixteenths, {KIT}", 100, 2, 6.5),
    "discokit":   (f"disco drum groove, four on the floor kick, open hi hat on "
                   f"the offbeat, live seventies drummer, {KIT}", 120, 2, 6.5),
    "rockkit":    (f"rock drum groove hit hard, big backbeat snare, crash "
                   f"accents, large live room, {KIT}", 120, 2, 6.5),
    "dubdrop":    (f"reggae one drop drum groove, rim click on three, deep "
                   f"soft kick, laid back, {KIT}", 75, 2, 8.0),
    "dubstepper": (f"reggae steppers drum groove, kick on every beat, timbale "
                   f"rim, spacious dub, {KIT}", 75, 2, 8.0),
    "dnbacoustic":(f"drum and bass groove played live on an acoustic kit, fast "
                   f"broken beat, real cymbals, no electronics, {KIT}", 174, 4, 8.5),
    "junglelive": (f"jungle breakbeat played by a live drummer on an acoustic "
                   f"kit, syncopated snares, ride bell, {KIT}", 174, 4, 8.5),
    "boombapkit": (f"nineties hip hop drum groove played live, fat lazy kick, "
                   f"cracking rimshot snare, dusty room, {KIT}", 90, 2, 7.5),
    # ---- single elements, to layer or to sit under a groove ------------
    "hatsixteen": (f"closed hi hat playing steady sixteenth notes, sticks on a "
                   f"real cymbal, dry and close miked, {KIT}", 100, 2, 6.5),
    "hatopen":    (f"hi hat pattern opening and closing with the foot pedal, "
                   f"sizzling open accents, {KIT}", 100, 2, 6.5),
    "ridepattern":(f"ride cymbal pattern played with sticks, shimmering wash, "
                   f"steady rhythm, {KIT}", 100, 2, 6.5),
    "ridebell":   (f"ride cymbal bell pattern, bright pinging accents on the "
                   f"bell, {KIT}", 100, 2, 6.5),
    "snareghost": (f"snare drum alone playing a backbeat with quiet ghost notes "
                   f"between, rimshots, brushless sticks, {KIT}", 100, 2, 6.5),
    "snarepress": (f"snare drum articulations, press roll, buzz roll and flams, "
                   f"marching snare technique, {KIT}", 100, 2, 6.5),
    "tomgroove":  (f"tribal tom tom groove around the kit, floor tom and rack "
                   f"toms, mallets and sticks, {KIT}", 100, 2, 6.5),
    "kicksnare":  (f"plain kick and snare backbeat, no cymbals, dry close "
                   f"miked, {KIT}", 100, 2, 6.5),
}

# THE WHOLE BUDGET SPENT ON ONE FIGHT. The first pass used generic quality
# words and got drum machines anyway; what actually has to be pushed away is
# every synonym for a programmed drum.
NEG = ("drum machine, electronic drums, drum computer, 808, 909, linndrum, "
       "sampled drums, synthetic, sequenced, quantized, midi, programmed, "
       "breakcore, edm, synth, bass guitar, melody, vocals, low quality, "
       "clipping, silence, fade out")


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

        # start on the first hit, then keep EXACTLY the bar count so the loop
        # lands on the grid — a groove that does not loop cleanly is not a loop
        env = np.abs(wav).max(axis=1)
        thr = max(1e-4, env.max() * 0.003)
        on = int(np.argmax(env > thr))
        keep = int(round(loop * 44100))
        wav = wav[on:on + keep]
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
        print(f"  → samples/{fn}  ({len(wav)/44100:.2f}s, {sz//1024}kB)", flush=True)

    print(f"\ndone — {len(manifest)} entries in samples/manifest.json; "
          "reload TEN, audio channel, type 'perc'.")


if __name__ == "__main__":
    main()
