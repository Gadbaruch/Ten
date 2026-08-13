#!/usr/bin/env python3
"""Generate acoustic sample presets for TEN's audio channel with Stable Audio.

One-time setup (needs a HuggingFace account that has accepted the
stabilityai/stable-audio-open-1.0 license):

    pip install torch diffusers transformers accelerate soundfile
    huggingface-cli login

Then:

    python3 tools/gen_samples.py            # all prompts, ~5s each
    python3 tools/gen_samples.py piano kick # just the named ones

Writes ten/samples/<name>.wav (44.1k mono-summed, peak-normalized) and
ten/samples/manifest.json, which the app loads into the POOL at boot.
Runs on Apple Silicon via MPS (first run downloads ~5GB of weights).
"""
import json, sys, pathlib

PROMPTS = {
    "piano":     ("solo grand piano, single sustained note, clean studio recording, C3", 4.0),
    "epiano":    ("vintage electric piano single chord, warm, mellow", 4.0),
    "guitar":    ("acoustic guitar single strummed chord, close mic, dry", 4.0),
    "nylon":     ("nylon string guitar arpeggio, intimate, fingerpicked", 5.0),
    "kick":      ("acoustic kick drum single hit, punchy, dry studio", 1.5),
    "snare":     ("acoustic snare drum single hit, crisp, room mic", 1.5),
    "hats":      ("closed hi-hat pattern, acoustic drum kit, tight", 2.0),
    "drumloop":  ("acoustic drum break, 120 bpm, four bars, funky, dry kit", 8.0),
    "voice-ah":  ("female voice singing a sustained ah vowel, single note, pure", 4.0),
    "choir":     ("small choir sustained chord, warm cathedral, soft", 6.0),
    "strings":   ("string section sustained chord, warm, legato, studio", 6.0),
    "cello":     ("solo cello sustained note, expressive, close mic", 4.0),
    "flute":     ("solo flute sustained note, breathy, intimate", 4.0),
    "brass":     ("brass section short stab, tight, punchy, funk", 2.0),
    "vibes":     ("vibraphone single struck note with motor vibrato, jazzy", 4.0),
    "kalimba":   ("kalimba short melodic phrase, close, plucky", 4.0),
}

def main():
    import torch, soundfile as sf
    from diffusers import StableAudioPipeline

    here = pathlib.Path(__file__).resolve().parent.parent
    out = here / "samples"; out.mkdir(exist_ok=True)
    want = sys.argv[1:] or list(PROMPTS)

    device = "mps" if torch.backends.mps.is_available() else \
             ("cuda" if torch.cuda.is_available() else "cpu")
    dtype = torch.float16 if device != "cpu" else torch.float32
    print(f"loading stable-audio-open-1.0 on {device}…")
    pipe = StableAudioPipeline.from_pretrained(
        "stabilityai/stable-audio-open-1.0", torch_dtype=dtype).to(device)

    manifest = []
    mpath = out / "manifest.json"
    if mpath.exists():
        manifest = json.loads(mpath.read_text())
    have = {m["file"] for m in manifest}

    for name in want:
        prompt, secs = PROMPTS[name]
        fn = f"{name}.wav"
        print(f"● {name}: {prompt!r} ({secs}s)")
        audio = pipe(prompt,
                     negative_prompt="low quality, distorted, noisy",
                     audio_end_in_s=secs,
                     num_inference_steps=100,
                     generator=torch.Generator(device="cpu").manual_seed(
                         sum(map(ord, name)))).audios[0]
        wav = audio.T.float().cpu().numpy()          # (n, ch)
        wav = wav.mean(axis=1)                        # mono keeps the pool light
        peak = max(1e-9, abs(wav).max()); wav = wav / peak * 0.9
        sf.write(out / fn, wav, 44100)
        if fn not in have:
            manifest.append({"name": name, "file": fn})
        mpath.write_text(json.dumps(manifest, indent=1))
        print(f"  → samples/{fn}")

    print(f"\ndone — {len(manifest)} entries in samples/manifest.json; "
          "reload TEN and they are in the pool.")

if __name__ == "__main__":
    main()
