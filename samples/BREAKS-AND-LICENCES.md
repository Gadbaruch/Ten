# Drum loops: why there are none, and what was checked

**Nothing in this file describes shipping audio.** It is the record of a loop
experiment that was ABANDONED, kept because the licence vetting in it is the
expensive part and is still true.

## The outcome

Three attempts at generated drum loops, all rejected by Gad and all for
different reasons worth remembering:

1. **mp3 breaks** — *"they all sound like generated on a drum machine ... also
   its all mp3 and sounds bad."* The prompts asked for a "drum break", which in
   the training data means chopped electronic breakcore, and the negative
   prompt never once pushed away from a drum computer.
2. **acoustic FLAC loops** — the sound was right, the playing was not:
   *"only the fun kit is actually playing a rhythm ... the Jazz brush rock kit,
   both of them are just one shot."* Fixed by asking for a PERFORMANCE and by
   cutting the busiest bar-window rather than from the first onset.
3. **tightened loops** — *"they sound way worse now haha, cause the pitch is
   all over the place."* `tools/tighten.py` warps by resampling, which shifts
   pitch. See NEXT.md; the correct mechanism is slice-and-place.

**And then the measurement that ended it.** Grid error across everything
stable-audio-open has made here — including the guitar and kalimba loops Gad
calls tight:

      nylonlick 18.0ms   kalimba 16.3ms   banjoroll 19.6ms   marimba 11.7ms
      pianoriff 15.5ms   rockkit 15.0ms   jazzbrush 20.8ms   tabla   14.2ms

Uniformly 12-20ms out. **The melodic loops are not tighter — a plucked string
hides 18ms and a snare exposes it.** The model cannot place a hit, because it
is a sound-design model. So drums moved to ONE-SHOTS, which have no grid to
miss: `tools/gen_hits.py`.

The loop work is not lost — `tools/gen_drums.py` still holds the prompts and
the busiest-window trim, and would be the starting point if a music model
(ACE-Step 1.5, parked in NEXT.md) is ever installed.

## Why generated, and not sourced from a free-sample site

The classic breaks are not free, and the free-sample sites do not make them
free:

- The **Amen** break is owned by Richard Spencer / The Winstons and is
  unexpired. A producer sampling it sits in a grey area only because the
  statute of limitations ran out on old infringements; **redistributing the
  recording is a different act**, and TEN ships from a public repo.
  *Funky Drummer* is James Brown's, *Think* is Lyn Collins'.

- **Freesound is case by case**, and proves the problem inside one site.
  DigitalUnderglow's are *"classic acoustic drum breaks, run through a
  reel-to-reel tape recorder"* — the uploader's own playing, genuinely
  licensable. OaSyntax's "Jungle Breaks" are `170_amen_A_.wav` and
  `170_funky_drummer.wav`, and its own descriptions say *"the 'amen' break by
  The Winstons"*. Same badge, opposite legality.

- **Creazilla was checked and rejected.** It stamps every item *"Public Domain
  (CC0) … No attribution required"*, but its stated Source is Freesound.org —
  it is a mirror and inherits the mislabelling. The item inspected was itself
  derived from *BandLab's* breakbeat pack, and its own "more like this" rail is
  a wall of Amen rips under that same badge, one reading *"The famous 'amen
  break' by 'the winstons' cutted."*

- **Selekt Audio could not be verified.** Behind a Vercel bot checkpoint in the
  browser and 403 to plain fetch, and bot detection is not something to work
  around. Their claims — CC0/public domain, screened against a commercial
  recording database, a licence certificate per download — are the most
  credible of the three *as claims*, but claims are not terms. **A downloaded
  certificate would settle it**, and cleared material can sit beside these with
  its licence named on its own line here.

**The rule this folder is built on: a CC0 tag is a claim by an uploader, not a
verified fact.** For the most-sampled recordings in history that claim is wrong
more often than it is right.

