#!/usr/bin/env python3
"""Generate acoustic sample presets for TEN's audio channel with Stable Audio.

One-time setup (needs a HuggingFace account that has accepted the
stabilityai/stable-audio-open-1.0 license):

    pip install torch diffusers transformers accelerate soundfile
    huggingface-cli login

Then:

    python3 tools/gen_samples.py                 # every phrase, ~1.5 min each
    python3 tools/gen_samples.py nylonlick piano # just the named ones
    python3 tools/gen_samples.py --list          # what is on the shelf

WHAT TO ASK FOR: this channel loops, granulates and gets played back at
other speeds, so a one-shot hit or a flat sustained tone gives it nothing to
chew. Every prompt here is a PHRASE — a lick, a riff, an ostinato — played
on something acoustic, four bars at 100 bpm so the loop fit lands on the
grid and two takes can stack. Variation inside the bar is the point.

Writes ten/samples/<name>.mp3 (44.1k stereo, peak-normalized, trimmed to a
whole number of bars) and ten/samples/manifest.json, which the app loads
into the POOL at boot. Runs on Apple Silicon via MPS.
"""
import json, sys, pathlib, subprocess, math

BPM = 100.0
BARS = 4
LOOP = BARS * 4 * 60.0 / BPM          # 9.6s — four bars at 100 bpm

def phrase(desc, extra=""):
    return (f"{desc}, {BARS} bar loop at {int(BPM)} bpm, acoustic, "
            f"close mic, dry studio recording, expressive playing{extra}")

# name -> (prompt, seconds asked of the model)
TAGS = {
    "banjoroll":   ('loop', 'plk'),
    "bell":        ('one', 'plk'),
    "brushkit":    ('loop', 'perc'),
    "cellostac":   ('loop', 'plk'),
    "choirpad":    ('loop', 'pad'),
    "drone":       ('loop', 'pad'),
    "flamenco":    ('loop', 'plk'),
    "harp":        ('loop', 'plk'),
    "kalimba":     ('loop', 'plk'),
    "koto":        ('loop', 'plk'),
    "marimba":     ('loop', 'plk'),
    "nylonlick":   ('loop', 'plk'),
    "pianoriff":   ('loop', 'keys'),
    "prepiano":    ('loop', 'keys'),
    "rain":        ('loop', 'fx'),
    "rhodesvamp":  ('loop', 'keys'),
    "riser":       ('one', 'fx'),
    "steelriff":   ('loop', 'plk'),
    "sweep":       ('one', 'fx'),
    "tabla":       ('loop', 'perc'),
    "upright":     ('loop', 'bass'),
    "vowel":       ('loop', 'pad'),
}

PROMPTS = {
    # --- strings you pick ---
    "nylonlick": (phrase("fingerpicked nylon string guitar lick, folk, "
                         "melodic phrase that changes every bar"), 11.0),
    "steelriff": (phrase("steel string acoustic guitar riff, percussive "
                         "strumming with muted chops between chords"), 11.0),
    "flamenco":  (phrase("flamenco guitar phrase, rasgueado strums and "
                         "golpe taps, rhythmic and unruly"), 11.0),
    "banjoroll": (phrase("bluegrass banjo forward roll pattern, bright, "
                         "rolling eighth notes with a walking bass string"), 11.0),
    "harp":      (phrase("harp arpeggio pattern, flowing, phrase rising and "
                         "falling across the bars"), 11.0),
    "koto":      (phrase("koto phrase, plucked, bending notes, "
                         "traditional japanese"), 11.0),
    # --- keys ---
    "pianoriff": (phrase("upright piano riff, dusty jazz left hand and "
                         "answering right hand figure"), 11.0),
    "rhodesvamp":(phrase("rhodes electric piano vamp, soulful chord voicings "
                         "with a different inversion each bar", ", warm"), 11.0),
    "prepiano":  (phrase("prepared piano rhythmic pattern, muted damped "
                         "strings, felt and screws, hypnotic"), 11.0),
    # --- bowed and blown ---
    "cellostac": (phrase("solo cello staccato ostinato, short bowed notes, "
                         "driving rhythm"), 11.0),
    "upright":   (phrase("upright double bass walking line, jazz, woody, "
                         "fingers on the strings"), 11.0),
    # --- struck ---
    "marimba":   (phrase("marimba ostinato, interlocking woody pattern, "
                         "syncopated"), 11.0),
    "kalimba":   (phrase("kalimba interlocking melodic pattern, thumb piano, "
                         "intimate, buzzing tines"), 11.0),
    "tabla":     (phrase("tabla pattern, indian hand drums, tuned bass "
                         "strokes and ringing slaps"), 11.0),
    "brushkit":  (phrase("brushed jazz drum kit groove, swirling snare "
                         "brushes, soft ride"), 11.0),
}

NEG = ("low quality, distorted, clipping, noisy, hiss, midi, synthetic, "
       "sequenced, quantized, silence, fade out")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    if "--list" in sys.argv:
        for k, (p, s) in PROMPTS.items():
            print(f"{k:11s} {s:4.1f}s  {p}")
        return

    import torch, soundfile as sf, numpy as np
    from diffusers import StableAudioPipeline

    here = pathlib.Path(__file__).resolve().parent.parent
    out = here / "samples"; out.mkdir(exist_ok=True)
    want = args or list(PROMPTS)

    device = "mps" if torch.backends.mps.is_available() else \
             ("cuda" if torch.cuda.is_available() else "cpu")
    dtype = torch.float16 if device != "cpu" else torch.float32
    print(f"loading stable-audio-open-1.0 on {device}…", flush=True)
    pipe = StableAudioPipeline.from_pretrained(
        "stabilityai/stable-audio-open-1.0", torch_dtype=dtype).to(device)
    # STEP 99 OF 100 USED TO THROW THE WHOLE TAKE AWAY. This scheduler is
    # hardwired to sde-dpmsolver++, and its torchsde brownian tree is asked
    # for noise on an interval that has collapsed to nothing by the last
    # step — it then bisects until python runs out of stack. The tree buys
    # reproducible noise across resolutions, which a one-off render does not
    # need, so it is replaced by plain gaussian noise of the same shape.
    import diffusers.schedulers.scheduling_cosine_dpmsolver_multistep as cos_mod

    class _PlainNoise:
        def __init__(self, x, *a, **k): self.x = x
        def __call__(self, s0, s1): return torch.randn_like(self.x)

    cos_mod.BrownianTreeNoiseSampler = _PlainNoise

    mpath = out / "manifest.json"
    manifest = json.loads(mpath.read_text()) if mpath.exists() else []

    for name in want:
        prompt, secs = PROMPTS[name]
        fn = f"{name}.mp3"
        print(f"● {name}: {prompt!r} ({secs}s)", flush=True)
        audio = pipe(prompt, negative_prompt=NEG,
                     audio_end_in_s=secs,
                     num_inference_steps=100,
                     generator=torch.Generator(device="cpu").manual_seed(
                         sum(map(ord, name)) * 7 + 11)).audios[0]
        wav = audio.T.float().cpu().numpy()          # (n, ch) at 44.1k
        if wav.ndim == 1: wav = wav[:, None]

        # the model likes to breathe in before it plays: start the loop at the
        # first sample that clears -50 dBFS, then keep exactly four bars so
        # the loop fit lands on the grid

        env = np.abs(wav).max(axis=1)
        thr = max(1e-4, env.max() * 0.003)
        on = int(np.argmax(env > thr))
        keep = int(round(LOOP * 44100))
        wav = wav[on:on + keep]
        if len(wav) < keep:                       # short take: let it be short
            keep = len(wav)
        # a 5 ms edge on both ends: the loop point must not click
        e = int(0.005 * 44100)
        if len(wav) > 2 * e:
            ramp = np.linspace(0, 1, e)[:, None]
            wav[:e] *= ramp; wav[-e:] *= ramp[::-1]
        peak = max(1e-9, float(np.abs(wav).max()))
        wav = wav / peak * 0.9

        tmp = out / f".{name}.wav"
        sf.write(tmp, wav, 44100)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp),
                        "-codec:a", "libmp3lame", "-b:a", "192k", str(out / fn)],
                       check=True)
        tmp.unlink()

        manifest = [m for m in manifest if m.get("name") != name]
        # kind and cat were HAND-ADDED to the manifest and this line never
        # wrote them, so every regen silently dropped both. TAGS is the
        # authority now; an untagged name defaults to a plain loop.
        ent = {"name": name, "file": fn, "bpm": BPM, "bars": BARS}
        ent["kind"], ent["cat"] = TAGS.get(name, ("loop", "fx"))
        manifest.append(ent)
        mpath.write_text(json.dumps(manifest, indent=1))
        print(f"  → samples/{fn}  ({len(wav)/44100:.2f}s)", flush=True)

    print(f"\ndone — {len(manifest)} entries in samples/manifest.json; "
          "reload TEN and they are in the pool.")

if __name__ == "__main__":
    main()
