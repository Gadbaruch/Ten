#!/usr/bin/env python3
"""Generate classic-style DRUM BREAKS for TEN's audio channel with Stable Audio.

Gad, 2026-08-29: "find a bunch of classic drum breaks free to use, especially
oldschool, common, for hiphop dnb jungle etc ... im a fan of classic jungle
breaks like amen and other typical ones but also heavie old school/90s hiphop."

WHY GENERATED RATHER THAN SOURCED, and this is the whole point of the file:
the classic breaks are not free. The Amen is owned by Richard Spencer / The
Winstons and unexpired; Funky Drummer is James Brown's; Think is Lyn Collins'.
A producer sampling one is a grey area because the statute of limitations ran
out on old infringements — REDISTRIBUTING the recording is not, and TEN ships
from a public repo. The free-sample sites do not fix this: freesound's
"Jungle Breaks" pack is tagged CC0 and its own descriptions say the files are
"the 'amen' break by The Winstons" and "the 'funky drummer' break by James
Brown". A licence tag is worth exactly the uploader's right to grant it, and
that uploader had none.

So these are ORIGINAL performances in those styles, from the same
stable-audio-open-1.0 pipeline that made the phrase shelf — see gen_samples.py,
whose conventions this follows. Nobody else's recording ships.

    python3 tools/gen_breaks.py                # all of them
    python3 tools/gen_breaks.py junglechop     # just the named ones
    python3 tools/gen_breaks.py --list

Writes ten/samples/breaks/<name>.mp3 and appends to samples/manifest.json —
the PHRASE shelf, cat 'perc', so they land under the audio channel's `perc`
type filter and never in a smp op. Setup is gen_samples.py's setup.
"""
import json, sys, pathlib, subprocess

# name -> (prompt, bpm, bars, seconds asked of the model)
# Tempo is PER BREAK here, unlike gen_samples.py where the whole shelf is 100.
# A jungle break at 170 and a boom-bap at 90 are not the same grid, and the
# manifest's bpm is what lets the channel fit either to the transport.
BREAKS = {
    # ---- jungle / dnb, 170 --------------------------------------------
    "junglechop": ("chopped breakbeat, fast snare rolls, sizzling ride cymbal, "
                   "amen style jungle drums, live drummer, breakbeat science", 170, 4, 8.0),
    "jungleroll": ("rolling jungle drum break, ghost notes on the snare, tight "
                   "cracking rimshot, relentless forward drive", 170, 4, 8.0),
    "ragga":      ("ragga jungle drum break, syncopated kick pattern, timbale "
                   "accents, sparse and springy", 170, 4, 8.0),
    "stepper":    ("half time stepper drum and bass break, heavy deep kick, "
                   "sparse cracking snare on three, dark", 170, 4, 8.0),
    "darkcore":   ("darkcore rave breakbeat, roughly chopped drums, distorted "
                   "edges, 1993 hardcore jungle", 170, 4, 8.0),
    "ridebreak":  ("funk drum break heavy on the ride cymbal, open hi hat, "
                   "live kit played hard in a dry room", 170, 4, 8.0),
    # ---- boom bap / 90s hiphop ----------------------------------------
    "boombap":    ("dusty 90s boom bap hip hop drum break, fat kick, cracking "
                   "snare, vinyl crackle, swung", 90, 2, 7.0),
    "hardknock":  ("hard 90s east coast hip hop drums, punchy kick, snappy "
                   "snare, sampled from a soul record", 90, 2, 7.0),
    "dustyswing": ("swung lo fi hip hop drum break, laid back behind the beat, "
                   "brushed snare, warm and dusty", 90, 2, 7.0),
    "lofibreak":  ("lo fi sampled soul drum break, tape saturation, room mics, "
                   "loose and human", 90, 2, 7.0),
    "funkbreak":  ("1970s funk drum break, live kit, open hi hat, tight pocket, "
                   "close mic, the drummer alone", 95, 2, 7.0),
    "bongobreak": ("latin funk drum break with congas and bongos, live "
                   "percussion, hand drums, breakbeat", 100, 2, 7.0),
}

NEG = ("low quality, distorted, clipping, hiss, midi, synthetic, sequenced, "
       "quantized, silence, fade out, music, melody, bass guitar, vocals")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    if "--list" in sys.argv:
        for k, (p, bpm, bars, s) in BREAKS.items():
            print(f"{k:11s} {bpm:5.0f}bpm {bars}bar {s:4.1f}s  {p}")
        return

    import torch, soundfile as sf, numpy as np
    from diffusers import StableAudioPipeline

    here = pathlib.Path(__file__).resolve().parent.parent
    out = here / "samples" / "breaks"; out.mkdir(parents=True, exist_ok=True)
    want = args or list(BREAKS)

    device = "mps" if torch.backends.mps.is_available() else \
             ("cuda" if torch.cuda.is_available() else "cpu")
    dtype = torch.float16 if device != "cpu" else torch.float32
    print(f"loading stable-audio-open-1.0 on {device}…", flush=True)
    pipe = StableAudioPipeline.from_pretrained(
        "stabilityai/stable-audio-open-1.0", torch_dtype=dtype).to(device)

    # same last-step crash and the same fix as gen_samples.py — see the comment
    # there; the brownian tree bisects to a stack overflow on step 99 of 100.
    import diffusers.schedulers.scheduling_cosine_dpmsolver_multistep as cos_mod

    class _PlainNoise:
        def __init__(self, x, *a, **k): self.x = x
        def __call__(self, s0, s1): return torch.randn_like(self.x)

    cos_mod.BrownianTreeNoiseSampler = _PlainNoise

    mpath = here / "samples" / "manifest.json"
    manifest = json.loads(mpath.read_text()) if mpath.exists() else []

    for name in want:
        prompt, bpm, bars, secs = BREAKS[name]
        loop = bars * 4 * 60.0 / bpm
        fn = f"breaks/{name}.mp3"
        print(f"● {name}: {bpm:.0f}bpm {bars}bar -> {loop:.2f}s  {prompt!r}", flush=True)
        audio = pipe(prompt, negative_prompt=NEG,
                     audio_end_in_s=secs,
                     num_inference_steps=100,
                     generator=torch.Generator(device="cpu").manual_seed(
                         sum(map(ord, name)) * 7 + 11)).audios[0]
        wav = audio.T.float().cpu().numpy()
        if wav.ndim == 1: wav = wav[:, None]

        # start on the first hit, then keep EXACTLY the bar count so the loop
        # lands on the grid — a break that does not loop cleanly is not a break
        env = np.abs(wav).max(axis=1)
        thr = max(1e-4, env.max() * 0.003)
        on = int(np.argmax(env > thr))
        keep = int(round(loop * 44100))
        wav = wav[on:on + keep]
        if len(wav) < keep:
            keep = len(wav)
        e = int(0.005 * 44100)
        if len(wav) > 2 * e:
            ramp = np.linspace(0, 1, e)[:, None]
            wav[:e] *= ramp; wav[-e:] *= ramp[::-1]
        pk = float(np.abs(wav).max()) or 1.0
        wav = wav * (0.89 / pk)

        tmp = out / f".{name}.wav"
        sf.write(tmp, wav, 44100)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp),
                        "-codec:a", "libmp3lame", "-b:a", "192k", str(here / "samples" / fn)],
                       check=True)
        tmp.unlink()

        manifest = [m for m in manifest if m.get("name") != name]
        manifest.append({"name": name, "file": fn, "bpm": float(bpm),
                         "bars": bars, "kind": "loop", "cat": "perc"})
        mpath.write_text(json.dumps(manifest, indent=1))
        print(f"  → samples/{fn}  ({len(wav)/44100:.2f}s)", flush=True)

    print(f"\ndone — {len(manifest)} entries in samples/manifest.json; "
          "reload TEN and they are on the phrase shelf under type 'perc'.")


if __name__ == "__main__":
    main()
