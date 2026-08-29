#!/usr/bin/env python3
"""TEN acoustic drum kits, each its own recording session.

Gad, 2026-08-29: "ten acoustic kits each one sounding different, um, different
genres, different styles ... without any variations inside of each kit per
sample. And every single sample should be just a single one shot, not a
collection of one shots with variations. This concept, we're dropping
completely."

So: no variations, no round-robin files, no reshaping one bank ten ways. Each
kit is rendered separately with its own room and its own drummer, which is the
only thing that actually makes two acoustic kits sound different — the same
distinction the machine kits already have, where a TR-808 and an RX5 differ
because their SAMPLES do.

    python3 tools/gen_kits.py               # all ten kits
    python3 tools/gen_kits.py jazz rock     # just those
    python3 tools/gen_kits.py --list

Nine drums per kit, chosen to fill all twelve KITMAP slots through its `alt`
chains: kick, snare, rim, hat-closed, hat-open, cymbal, tom, cowbell, shaker.
clap falls back to snare/rim, conga to tom, clave to rim.

Writes samples/oneshots/acoustic/<kit>/<inst>.flac and appends to
samples/oneshots/manifest.json with style `ac-<kit>`, which is what SMPKITS
names and what kitPick matches on. 24-bit stereo FLAC. Setup is
gen_samples.py's setup.
"""
import json, sys, pathlib

# kit -> (style suffix, room/character line)
# The character sits in the ROOM and the PLAYER, not in post-processing.
KITS = {
    "jazz": ("ac-jazz", "small bebop jazz kit, light touch with sticks, warm "
                        "resonant shells, intimate club room, vintage ludwig"),
    "rock": ("ac-rock", "big rock drum kit hit hard with heavy sticks, deep "
                        "shells, large live room with natural ambience"),
    "funk": ("ac-funk", "tight seventies funk kit, crisp and punchy, dead "
                        "shells, close miked dry studio, no ring"),
    "vint": ("ac-vint", "dusty nineteen sixties drum kit, dark and muffled, "
                        "calfskin heads, tape saturated mono recording"),
    "regg": ("ac-regg", "reggae drum kit, deep soft tuning, heavily damped "
                        "with cloth, warm and round, spacious dub studio"),
    "latn": ("ac-latn", "latin percussion kit, bright hand drums and timbales, "
                        "lively wooden room, crisp attack"),
    "orch": ("ac-orch", "orchestral concert percussion, large resonant "
                        "instruments, concert hall, long natural decay"),
    "brsh": ("ac-brsh", "jazz kit played with wire brushes, soft swirling "
                        "texture, quiet and close, brushed heads"),
    "dry":  ("ac-dry",  "tightly close miked studio kit, completely dead room, "
                        "gated and dry, no ambience at all"),
    "big":  ("ac-big",  "enormous stadium drum kit, huge ambient room, long "
                        "reverberant tails, eighties gated drums"),
}

# inst -> (cat, seconds, what the drum IS)
# Nine drums, and the names are KITMAP's vocabulary so kitPick can find them —
# the acoustic bank was briefly invisible to the kit builder for exactly this.
INSTS = [
    ("kick",       "kik",  2.5, "a single bass drum kick"),
    ("snare",      "snr",  2.5, "a single snare drum hit"),
    ("rim",        "snr",  2.0, "a single rimshot on a snare drum"),
    ("hat-closed", "hh",   1.5, "a single closed hi hat tick"),
    ("hat-open",   "hh",   3.0, "a single open hi hat, sizzling"),
    ("cymbal",     "cymb", 4.0, "a single crash cymbal"),
    ("tom",        "tom",  3.0, "a single floor tom hit"),
    ("cowbell",    "perc", 2.0, "a single cowbell strike"),
    ("shaker",     "perc", 1.5, "a single shaker shake"),
    # added after Gad heard the first kit: "missing a ride sizzle there". It
    # has its own KITMAP pad now, displacing clave. Longer than the crash
    # because a ride's whole character is the sustain.
    ("ride",       "cymb", 4.5, "a single ride cymbal stroke, shimmering sizzle"),
]

NEG = ("drum machine, electronic drums, 808, 909, synthetic, sampled, midi, "
       "programmed, loop, groove, pattern, rhythm, beat, sequence, multiple "
       "hits, roll, fill, music, melody, vocals, silence, low quality, clipping")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    # --insts lets a drum be added to kits that are already rendered, without
    # re-rendering the eight that are fine. That is how `ride` got in.
    only = None
    for i, a in enumerate(sys.argv):
        if a == "--insts" and i + 1 < len(sys.argv):
            only = set(sys.argv[i + 1].split(","))
    if "--list" in sys.argv:
        for k, (st, room) in KITS.items():
            print(f"{k:5s} {st:8s} {room}")
        print(f"\n{len(KITS)} kits x {len(INSTS)} drums = {len(KITS)*len(INSTS)} renders")
        return

    import torch, soundfile as sf, numpy as np
    from diffusers import StableAudioPipeline

    here = pathlib.Path(__file__).resolve().parent.parent
    want = args or list(KITS)

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

    mpath = here / "samples" / "oneshots" / "manifest.json"
    manifest = json.loads(mpath.read_text()) if mpath.exists() else []

    for kit in want:
        style, room = KITS[kit]
        out = here / "samples" / "oneshots" / "acoustic" / kit
        out.mkdir(parents=True, exist_ok=True)
        print(f"\n=== {kit} ({style}) — {room[:52]}…", flush=True)
        for inst, cat, secs, what in INSTS:
            if only and inst not in only: continue
            name = f"{kit}-{inst}"
            fn = f"oneshots/acoustic/{kit}/{inst}.flac"
            print(f"● {name}", flush=True)
            audio = pipe(f"{what}, one hit only, {room}", negative_prompt=NEG,
                         audio_end_in_s=secs, num_inference_steps=100,
                         generator=torch.Generator(device="cpu").manual_seed(
                             sum(map(ord, kit)) * 131 + sum(map(ord, inst)) * 17)
                         ).audios[0]
            w = audio.T.float().cpu().numpy()
            if w.ndim == 1: w = w[:, None]

            # TRIM TO THE HIT: start where the sound does, end where it stops
            # mattering, so no pad drags silence into a kit.
            mono = np.abs(w).max(axis=1)
            if not mono.max():
                print("   ⚠ silent — skipped", flush=True); continue
            first = int(np.argmax(mono > mono.max() * 0.002))
            tail = np.where(mono > mono.max() * 0.001)[0]
            last = int(tail[-1]) if len(tail) else len(mono) - 1
            w = w[first:min(last + int(0.05 * 44100), len(w))]
            e = int(0.004 * 44100)
            if len(w) > 2 * e:
                w[-e:] *= np.linspace(1, 0, e)[:, None]
            pk = float(np.abs(w).max()) or 1.0
            w = w * (0.89 / pk)

            sf.write(here / "samples" / fn, w, 44100,
                     format="FLAC", subtype="PCM_24")
            manifest = [m for m in manifest if m.get("name") != name]
            manifest.append({"name": name, "file": fn, "kind": "one",
                             "inst": inst, "style": style, "cat": cat})
            mpath.write_text(json.dumps(manifest, indent=1))
            print(f"  → samples/{fn}  ({len(w)/44100:.2f}s)", flush=True)

    print(f"\ndone — {len(manifest)} rows on the drum shelf.")


if __name__ == "__main__":
    main()
