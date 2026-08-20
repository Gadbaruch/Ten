/* TEN — the measurement library.
 *
 * Every verification in this project is "ask the running engine what its state
 * is", and until now that meant hand-writing the analyser into the browser
 * again, slightly differently, several times a session. This is that analyser,
 * written once.
 *
 * It runs INSIDE the page, through the browse CLI's `eval`, which wraps the
 * whole file in an async IIFE — so the last `return` here is what comes back on
 * stdout, as JSON. Arguments arrive as a `__PROBE__` object that tools/probe.sh
 * writes above this file; run bare (`$B eval tools/probe.js`) it prints help.
 *
 *     tools/probe.sh help
 *     tools/probe.sh preset names=SNR,S909,S808,S606 note=48
 *     tools/probe.sh matrix ch=8
 *     tools/probe.sh cursor ch=9
 *     tools/probe.sh key code=KeyA
 *     tools/probe.sh matrix --ab https://gadbaruch.github.io/Ten/
 *
 * TWO RULES IT KEEPS FOR YOU, both learned the hard way (NEXT.md):
 *   - the state is PINNED immediately before each measurement, because
 *     curPreset walked 7 -> 3 -> 2 under one probe and invented a bug;
 *   - trusted key events are SWALLOWED for the duration of the run and the
 *     listener is torn down in a finally, so Gad's typing cannot move state
 *     mid-measurement and the tab is his again the moment the probe returns.
 *
 * Numbers are the point, so: the spectral pair is a 16384-point FFT of the
 * window that starts at the note's own onset — bin*sr/N for the peak, the
 * magnitude-weighted mean frequency for the centroid. At 44.1kHz one bin is
 * 2.69Hz, which is the resolution every drum figure in the log is quoted at.
 */

const P = (typeof __PROBE__ !== 'undefined' && __PROBE__) ? __PROBE__ : {};
const NAME = P.probe || 'help';
const notes = [];

/* ---------------- args ------------------------------------------------ */
const num = (v, d) => { const n = +v; return Number.isFinite(n) ? n : d; };
const str = (v, d) => (v === undefined || v === null || v === '') ? d : String(v);
const list = (v, d) => {
  if (Array.isArray(v)) return v;
  if (v === undefined || v === null || v === '') return d;
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const r3 = v => Number.isFinite(v) ? +v.toFixed(3) : v;

const CH   = Math.max(1, Math.min(9, Math.round(num(P.ch, 8))));
const MS   = Math.max(60, num(P.ms, 500));       // how long a window is
const NOTE = Math.round(num(P.note, 48));        // KBBASE — the home key
const VEL  = num(P.vel, 0.9);
const NFFT = Math.round(num(P.fft, 16384));
const WIN  = str(P.win, 'rect');                 // rect | hann
const ONSET = num(P.onset, 1) !== 0;             // window from the hit, not from the tap

/* ---------------- the two rules --------------------------------------- */
/* SWALLOW WHAT THE HUMAN TYPES. The browse window is headed and takes focus,
   so a keystroke aimed anywhere lands in the tab being measured. Capture phase
   on document, stopImmediatePropagation, and only ever for trusted events —
   the probe's own synthetic keys go straight through. Removed in the finally
   below, so this tab is a normal tab again the moment the probe returns. */
const swallow = e => { if (e.isTrusted) { e.stopImmediatePropagation(); e.preventDefault(); } };
const guarding = num(P.guard, 1) !== 0;
if (guarding) for (const t of ['keydown', 'keyup', 'keypress'])
  document.addEventListener(t, swallow, true);

/* PIN THE STATE. Called immediately before every measurement, never once at
   the top: a probe that takes four seconds is four seconds of state moving. */
let PINLAYER = P.layer === undefined ? null : Math.round(num(P.layer, 1));
function pin(ch) {
  S.curPreset = ch;
  S.editSnd = ch;
  S.mSel = false;
  if (PINLAYER !== null) S.layer = PINLAYER;
  return { curPreset: S.curPreset, editSnd: S.editSnd, layer: S.layer };
}

/* ---------------- recording ------------------------------------------- */
function flat(chunks) {
  const n = chunks.reduce((s, x) => s + x.length, 0), o = new Float32Array(n);
  let k = 0; for (const x of chunks) { o.set(x, k); k += x.length; }
  return o;
}
/* a stereo recorder hanging off a node — the same shape exportAudio uses, kept
   local so the probe runs unchanged against an older build that has not got
   tapOf yet */
function tap(node) {
  const sp = AC.createScriptProcessor(4096, 2, 2);
  const L = [], R = []; let on = true;
  sp.onaudioprocess = e => {
    if (!on) return;
    L.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    R.push(new Float32Array(e.inputBuffer.getChannelData(1)));
  };
  const sink = AC.createGain(); sink.gain.value = 0;   // pulled, and silent
  node.connect(sp); sp.connect(sink); sink.connect(AC.destination);
  return {
    stop() {
      on = false;
      try { node.disconnect(sp); } catch (_) {}
      try { sp.disconnect(); sink.disconnect(); } catch (_) {}
      return [flat(L), flat(R)];
    }
  };
}
const busOf = ch => (engine.buses && engine.buses[ch] && engine.buses[ch].pan) || null;

/* ---------------- analysis -------------------------------------------- */
/* ONE WINDOW, MEASURED FROM THE HIT. The recorder hands back whatever the
   4096-sample blocks happened to cover, which is up to 93ms of silence in
   front of the sound and a different amount every run — measured over the
   whole recording, `plain` wandered by 40% between two identical passes and
   the matrix was useless as a regression net. Levels and spectrum now read the
   SAME window, NFFT long, starting where the sound does. */
function levels(L, R, o, n) {
  let pl = 0, pr = 0, sum = 0;
  for (let i = o; i < o + n; i++) {
    const a = Math.abs(L[i] || 0), b = Math.abs(R[i] || 0);
    if (a > pl) pl = a; if (b > pr) pr = b;
    sum += (L[i] || 0) * (L[i] || 0) + (R[i] || 0) * (R[i] || 0);
  }
  return { rms: r3(Math.sqrt(sum / Math.max(1, 2 * n))),
           peak: r3(Math.max(pl, pr)), pkL: r3(pl), pkR: r3(pr) };
}
/* WHERE THE SOUND STARTS. A window measured from the top of the recording is
   mostly the silence before the note, and silence moves a centroid. */
function onsetOf(x) {
  let pk = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > pk) pk = a; }
  const thr = Math.max(1e-5, pk * 0.02);
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) >= thr) return i;
  return 0;
}
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), h = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < h; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + h] * cr - im[i + k + h] * ci;
        const vi = re[i + k + h] * ci + im[i + k + h] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + h] = ur - vr; im[i + k + h] = ui - vi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}
/* the pair the drum log is written in: peak fundamental and energy centre */
function spectral(L, R, sr, o, take) {
  const n = Math.max(L.length, R.length);
  if (!n) return { hz: 0, centroid: 0, bin: 0 };
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
  for (let i = 0; i < take; i++)
    re[i] = ((L[o + i] || 0) + (R[o + i] || 0)) * 0.5 *
            (WIN === 'hann' ? 0.5 - 0.5 * Math.cos(2 * Math.PI * i / NFFT) : 1);
  fft(re, im);
  const half = NFFT >> 1;
  let bm = 0, bi = 1, sw = 0, sm = 0;
  for (let k = 1; k < half; k++) {
    const m = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    if (m > bm) { bm = m; bi = k; }
    sw += m * (k * sr / NFFT); sm += m;
  }
  return { hz: +(bi * sr / NFFT).toFixed(1), centroid: sm ? Math.round(sw / sm) : 0, bin: bi };
}
/* where the window starts and how long it is, for both readings */
function windowOf(L, R) {
  const n = Math.max(L.length, R.length);
  if (!n) return { o: 0, take: 0 };
  let o = 0;
  if (ONSET) {
    const mono = new Float32Array(n);
    for (let i = 0; i < n; i++) mono[i] = ((L[i] || 0) + (R[i] || 0)) * 0.5;
    o = onsetOf(mono);
  }
  return { o, take: Math.max(0, Math.min(NFFT, n - o)) };
}

/* ---------------- the worklet's own answer ---------------------------- */
/* THE ONLY ONE WHO KNOWS WHERE THE CURSORS ARE. tv is tape cursors, g is
   grains, tpos is each cursor's place in the take, 0..1. */
async function cursor(ch) {
  let e = engine.gn && engine.gn[ch];
  /* THE NODE IS MADE ON FIRST USE, so a channel that has not sounded yet has
     none and the honest answer is not "no worklet" — it is the same answer the
     app gets by asking for one. granNode is idempotent. */
  if ((!e || !e.node) && (isAudioCh(ch) || (typeof isGranCh === 'function' && isGranCh(ch))))
    try { e = engine.granNode(ch); } catch (_) {}
  if (!e || !e.node) return { k: 'ch' + ch, err: 'no ten-grsyn node — channel is not a take' };
  const was = e.stat;
  try { e.node.port.postMessage({ t: 'ping' }); } catch (_) {}
  for (let i = 0; i < 12 && e.stat === was; i++) await sleep(20);
  const st = e.stat || {};
  return { k: 'ch' + ch, tv: st.tv | 0, g: st.g | 0, v: st.v | 0,
           spawned: st.spawned | 0,
           tpos: (st.tpos || []).map(v => +(+v).toFixed(3)).join(' '),
           cpos: r3(st.cpos), spawn_stale: e.stat === was ? 1 : 0 };
}

/* ---------------- one measured hit ------------------------------------ */
async function hit(ch, fire, ms) {
  pin(ch);
  const bus = busOf(ch);
  if (!bus) return { err: 'channel ' + ch + ' has no bus' };
  const t = tap(bus);
  await sleep(30);
  let handle = null;
  try { handle = fire(); } catch (e) { notes.push('fire threw: ' + e); }
  await sleep(ms);
  const [L, R] = t.stop();
  const cur = await cursor(ch);
  try { if (handle && handle.release) handle.release(); } catch (_) {}
  const w = windowOf(L, R);
  const lv = levels(L, R, w.o, w.take), sp = spectral(L, R, AC.sampleRate, w.o, w.take);
  return { rms: lv.rms, peak: lv.peak, pkL: lv.pkL, pkR: lv.pkR,
           hz: sp.hz, centroid: sp.centroid,
           tv: cur.tv | 0, g: cur.g | 0, win: r3(w.take / AC.sampleRate) };
}

/* ---------------- probes ---------------------------------------------- */
const setP = (typeof setPresetData === 'function') ? setPresetData : applyPresetData;

async function probeLevel() {
  const rows = [];
  for (const ch of list(P.chs, [String(CH)]).map(Number)) {
    const r = await hit(ch, () => null, MS);
    rows.push(Object.assign({ k: 'ch' + ch }, r));
  }
  return { cols: ['rms', 'peak', 'pkL', 'pkR', 'tv', 'g'], rows };
}

async function probeSpectrum() {
  const rows = [];
  for (const ch of list(P.chs, [String(CH)]).map(Number)) {
    const r = await hit(ch, () => engine.noteOn(AC.currentTime + 0.02, ch, NOTE, VEL), MS);
    rows.push(Object.assign({ k: 'ch' + ch + ' n' + NOTE }, r));
  }
  return { cols: ['hz', 'centroid', 'peak', 'rms'], rows };
}

async function probeCursor() {
  const rows = [];
  for (const ch of list(P.chs, [String(CH)]).map(Number)) { pin(ch); rows.push(await cursor(ch)); }
  return { cols: ['tv', 'g', 'v', 'spawned', 'cpos', 'tpos'], rows };
}

/* A PRESET BY LIBRARY NAME, played at a midi note and measured. noteOn and not
   trigger(): trigger applies the channel's transpose and the whole PLAY rack,
   and a tuning measurement wants the patch and nothing else. The channel's own
   preset is put back afterwards. */
async function probePreset() {
  const names = list(P.names, [str(P.name, 'SNR')]);
  const lib = libAll();
  const keep = stash(CH);
  const rows = [];
  try {
    for (const nm of names) {
      const en = lib.find(e => e && String(e.name).toLowerCase() === String(nm).toLowerCase());
      if (!en) { rows.push({ k: nm, err: 'not in library' }); continue; }
      engine.allOff();
      setP(CH, en.name, en.cat, en.data);
      await sleep(80);
      const r = await hit(CH, () => engine.noteOn(AC.currentTime + 0.02, CH, NOTE, VEL), MS);
      rows.push(Object.assign({ k: en.name + ' ' + en.cat }, r));
      await sleep(40);
    }
  } finally {
    unstash(CH, keep);
  }
  notes.push('ch ' + CH + ' at midi ' + NOTE + ' (KBBASE is ' +
             (typeof KBBASE === 'undefined' ? '?' : KBBASE) + ')');
  return { cols: ['hz', 'centroid', 'peak', 'rms'], rows };
}

/* A KEYSTROKE, SYNTHESISED. isTrusted is false on these, which the app reads
   in exactly two places (the modifier mirror and the arrow auto-repeat) — so
   what a probe presses reaches every handler that decides anything. */
async function probeKey() {
  const code = str(P.code, 'KeyA');
  const mods = { shiftKey: !!num(P.shift, 0), altKey: !!num(P.alt, 0),
                 ctrlKey: !!num(P.ctrl, 0), metaKey: !!num(P.meta, 0) };
  const hold = num(P.hold, 120);
  pin(CH);
  const snap = () => ({ curPreset: S.curPreset, editSnd: S.editSnd, layer: S.layer,
                        curMod: S.curMod, curSlot: S.curSlot, oct: S.oct,
                        voices: (engine.act[S.curPreset] || []).filter(v => v && !v.killed).length,
                        flash: typeof flashMsg === 'undefined' ? '' : String(flashMsg || '') });
  const before = snap();
  document.dispatchEvent(new KeyboardEvent('keydown',
    Object.assign({ code, key: code, bubbles: true, cancelable: true }, mods)));
  await sleep(hold);
  const held = snap();
  document.dispatchEvent(new KeyboardEvent('keyup',
    Object.assign({ code, key: code, bubbles: true, cancelable: true }, mods)));
  await sleep(60);
  const after = snap();
  const row = k => ({ k, curPreset: before.curPreset, layer: before.layer });
  return {
    cols: ['curPreset', 'editSnd', 'layer', 'curMod', 'curSlot', 'oct', 'voices', 'flash'],
    rows: [Object.assign({ k: 'before' }, before),
           Object.assign({ k: 'down ' + code }, held),
           Object.assign({ k: 'up' }, after)]
  };
}

/* THE REGRESSION NET (NEXT.md). Seven ways of reading a take plus the four cue
   jumps, as one table — the thing to A/B against the previous build whenever
   anything touches the engine. */
/* PUT THE CHANNEL BACK. setEngine and the case loop MUTATE the preset object
   in place, so stashing the reference and reassigning it restored nothing —
   the first matrix run left channel 8 converted to audio with its cloud parked,
   and every run after that measured a channel the probe had quietly rebuilt.
   A deep copy of the data, minus the modLoop (which is a live Looper and the
   channel's own, not the patch's). */
function stash(ch) {
  const p = S.presets[ch];
  return { data: presetData(p), loop: p.modLoop };
}
function unstash(ch, s) {
  const p = S.presets[ch];
  for (const k of Object.keys(p)) if (k !== 'modLoop') delete p[k];
  Object.assign(p, JSON.parse(JSON.stringify(s.data)));
  p.modLoop = s.loop;
  try { engine.rebuildRack(ch); engine.refresh(ch); } catch (_) {}
}

async function probeMatrix() {
  const keep = stash(CH);
  const rows = [];
  try {
    pin(CH);
    if (!isAudioCh(CH)) setEngine(CH, 'audio');
    const p = S.presets[CH];
    p.au = Object.assign({}, p.au || {});
    p.au.kmode = 0; p.au.auto = 1;            // position keys, loop on: the plain case
    /* A CUE JUMP SPAWNS A CURSOR, AND ONLY IN POLY. In mono or legato cueNote
       MOVES the head that is already reading instead — which, after the stop
       that precedes each row, is no head at all, so all four cue rows read
       silence and nothing said why. Whatever patch the channel was holding
       decided that, which also means an A/B was comparing two voice modes. */
    p.vox = Object.assign({}, p.vox || {}, { mode: 0 });
    if (!engine.audBuf[CH]) {
      const want = str(P.take, 'nylonlick');
      const src = POOL.find(x => x.name === want) || POOL[0];
      if (!src) return { cols: [], rows: [], err: 'sample pool is empty — nothing to read' };
      engine.setChanBuf(CH, src.buf, src.name);
      await sleep(120);
    }
    notes.push('take: ' + (engine.audName[CH] || '—') +
               ' · position keys · loop on · poly · was ' + (keep.data.cat || '?') +
               ' "' + (keep.data.name || '?') + '"');
    /* THE SEVEN CASES ARE ABOUT THE TAPE. Left at its default the cloud is
       also reading — size below its top makes the loop cursor a carrier and
       sprays grains around it — and grains are stochastic, so `plain` swung
       40% between two identical passes. Parking size at the top gives the dry
       carrier and a row you can diff. grains=1 leaves the cloud alone. */
    if (num(P.grains, 0) === 0) {
      p.gr = Object.assign({}, p.gr || {}, { size: 1 });
      try { engine.granCfg(CH); } catch (_) {}
      notes.push('cloud parked (size at top) — pass grains=1 to measure it too');
    }
    const base = JSON.parse(JSON.stringify(p.au));
    const bmix = JSON.parse(JSON.stringify(p.mix || { lvl: 0.8, pan: 0 }));
    const len = (S.patterns[S.editPat].lanes[CH] || {}).len || 4;

    const CASES = [
      { k: 'plain',    au: {} },
      { k: 'sync +12', au: { cmode: 1, pmode: 1, semis: 12 } },
      { k: 'free +7',  au: { cmode: 0, pmode: 0, semis: 7 } },
      { k: 'chan L',   au: { chan: 1 } },
      { k: 'hard pan', au: {}, mix: { pan: 1 } },
      { k: 'crop',     au: { st: 0.25, en: 0.5 } },
      { k: 'rate 0.5', au: { spd: 0.5, fit: 0, rate: 0.5, pmode: 0 } },
    ];
    for (const c of CASES) {
      engine.audStop(CH); engine.allOff();
      S.presets[CH].au = Object.assign({}, base, c.au);
      S.presets[CH].mix = Object.assign({}, bmix, c.mix || {});
      /* mix.pan is a number on a node, not something audPlay carries — without
         refresh() the "hard pan" row measured a centred channel and read as a
         pass */
      engine.refresh(CH); engine.audLive(CH);
      await sleep(60);
      const r = await hit(CH, () => engine.audPlay(CH, AC.currentTime + 0.02, len), MS);
      rows.push(Object.assign({ k: c.k }, r));
      engine.audStop(CH);
      await sleep(40);
    }
    /* the four cue jumps: a letter in position mode is note 60+slot, which is
       the index in the letter run and not a pitch */
    S.presets[CH].au = Object.assign({}, base);
    S.presets[CH].mix = Object.assign({}, bmix);
    engine.refresh(CH);
    /* HOW MANY PLACES THERE ARE TO JUMP TO. A cue row that reads zero is
       either the jump being broken or the take having no cuts detected in it,
       and those are not the same bug — so the count goes in the header. */
    let nc = 0; try { nc = (engine.audCuts(CH) || []).length; } catch (_) {}
    notes.push('cuts detected in the take: ' + nc);
    const nCue = Math.round(num(P.cues, 4));
    for (let j = 0; j < nCue; j++) {
      engine.audStop(CH); engine.allOff();
      await sleep(30);
      const r = await hit(CH, () => engine.cueNote(AC.currentTime + 0.02, CH, 60 + j, VEL), MS);
      rows.push(Object.assign({ k: 'cue ' + j }, r));
      engine.audStop(CH);
      await sleep(40);
    }
  } finally {
    engine.audStop(CH); engine.allOff();
    unstash(CH, keep);
    try { engine.granCfg(CH); } catch (_) {}
  }
  return { cols: ['rms', 'peak', 'pkL', 'pkR', 'hz', 'tv', 'g'], rows };
}

/* ---------------- the mod matrix ---------------------------------------
 * Gad, 2026-08-16: "have the same conventional mod method for ALL possible
 * params in ALL possible engines, i dont want to QA every single param
 * modulation by every mod type manually." So this does it instead.
 *
 * Fires REAL notes and asks four questions of every source x destination:
 *   reaches  does the modulator move the destination at all
 *   anchor   at rest, does the param sit on the DIAL (amps exempt by design —
 *            an amp envelope is the note's existence, not a modulation of a
 *            resting value)
 *   live     turning the DIAL x2 under a sounding note: does the sound follow
 *   tweak    changing the MOD ITSELF under a sounding note: anything?
 *
 * WHAT IT CANNOT SEE: AudioParam.value never reflects a CONNECTED input. Every
 * source except the envelope connects a node, so those cells read back the
 * bare dial however hard the modulator is working. They are marked 'blind'.
 * A BLIND CELL IS NOT A PASS. */
const MSRCS = { env: 1, lfo: 2, vel: 3, key: 4, rnd: 5, press: 6 };

function modDests() {
  const first = o => (Object.values(o || {})[0] || [])[0];
  return [
    { name: 'filt cutoff', dst: 3, idx: 1, amp: false,
      read: v => { const n = v.fNodes && v.fNodes[0];
                   return n ? n.frequency.value * Math.pow(2, n.detune.value / 1200) : null; },
      dialSet: (p, x) => { p.flt[0].frq = x; }, dialGet: p => p.flt[0].frq,
      live: pi => engine.cutLive(pi, 0) },

    { name: 'pitch', dst: 2, idx: 0, amp: false,
      read: v => { const t = first(v.opPitch), d = first(v.opDet);
                   if (!t) return null;
                   const c = (d && d.sc >= 1) ? d.pm.value : 0;
                   return t.pm.value * Math.pow(2, c / 1200); } },

    { name: 'amp', dst: 1, idx: 0, amp: true,
      read: v => v.vca ? v.vca.gain.value : null },

    { name: 'op level', dst: 5, idx: 1, amp: true,
      read: v => { const g = (v.opGains && v.opGains[0] || [])[0]; return g ? g.gain.value : null; } },

    { name: 'flt Q (addr)', addr: { rack: 'flt', slot: 0, key: 'q' }, amp: false,
      read: v => { const n = v.fNodes && v.fNodes[0]; return n ? n.Q.value : null; },
      dialSet: (p, x) => { p.flt[0].q = x; }, dialGet: p => p.flt[0].q,
      live: pi => engine.dialLive(pi, 'flt', 0, 'q', S.presets[pi].flt[0].q) },

    { name: 'osc pitch (addr)', addr: { rack: 'osc', slot: '*', key: 'pitch' }, amp: false,
      read: v => { const d = first(v.opDet); return d && d.sc >= 1 ? d.pm.value : null; } },

    { name: 'osc level (addr)', addr: { rack: 'osc', slot: '*', key: 'amt' }, amp: true,
      read: v => { const g = (v.opGains && v.opGains[0] || [])[0]; return g ? g.gain.value : null; } },
  ];
}

async function probeModMatrix() {
  const pi = S.curPreset | 0, p = S.presets[pi];
  const only = str(P.only, '');
  const cols = ['dest', 'source', 'reaches', 'anchor', 'live', 'tweak', 'note'];
  const rows = [];
  const nap = ms => new Promise(r => setTimeout(r, ms));

  await AC.resume();
  const t0 = AC.currentTime; await nap(120);
  if (AC.currentTime - t0 < 0.05)
    return { cols, rows, err: 'AUDIO CLOCK IS DEAD (currentTime frozen) — every cell would be a flat lie. Reload the tab and re-run.' };

  const DESTS = modDests().filter(d => !only || d.name.indexOf(only) >= 0);
  const clean = () => {
    p.flt.forEach((f, i) => { f.typ = i === 0 ? 1 : 0; f.off = 0; });
    Object.assign(p.flt[0], { typ: 1, frq: 1000, q: 1, gn: 0, par: 0, pol: 0, spr: 0.4, lvl: 1 });
    p.mod.length = 0;
  };
  const mkMod = (s, dest, amt) => ({
    src: MSRCS[s], off: 0, a: 0.01, d: 0.15, s: 0.6, r: 0.2, crv: 0, tmul: 1,
    wav: 0, rate: 5, ltr: 0, ph: 0, skw: 0, pg: 0.03, pc: 1,
    routes: [Object.assign({ amt }, dest.addr ? { dst: 0, addr: dest.addr, tgt: dest.addr }
                                              : { dst: dest.dst, idx: dest.idx })]
  });
  /* NOTE 72, NOT 60. The `key` source is (midi-60)/24, which is exactly ZERO at
     middle C — so every key row read DEAD for the arithmetic reason rather than
     a wiring one. And pressure is 0 until something presses, so the note is
     pressed before anything is asked of it. Both were the harness lying. */
  const fire = async ms => {
    const h = engine.trigger(AC.currentTime + 0.03, pi, 72, 0.9);
    const v = h && h.voices && h.voices[0];
    await nap(ms == null ? 450 : ms);
    if (v && v.setPressure) { try { v.setPressure(0.7); } catch (_) {} await nap(80); }
    return { h, v };
  };
  const stop = async h => { try { h && h.release && h.release(AC.currentTime + 0.005); } catch (_) {} await nap(140); };

  for (const dest of DESTS) {
    /* THE ANCHOR IS A PROPERTY OF THE DESTINATION, NOT OF THE SOURCE: "is the
       dial the value with NOTHING modulating". Measured once, with no mod in
       the rack at all. Reading a sounding modulated note instead would just be
       reading the sustain, which is legitimately not the dial — that was this
       probe's own first bug. amps are exempt: an amp envelope IS the note. */
    clean();
    let ref = null, anchor = 'n/a amp';
    { const { h, v } = await fire(); if (v) ref = dest.read(v);
      if (!dest.amp) {
        const dl = dest.dialGet ? dest.dialGet(p) : null;
        anchor = (ref == null || dl == null) ? '?'
          : (Math.abs(ref - dl) <= Math.max(1, Math.abs(dl) * 0.02) ? 'ok'
             : 'off dial (' + Math.round(ref) + ' vs ' + Math.round(dl) + ')');
      }
      await stop(h); }

    for (const s of Object.keys(MSRCS)) {
      const row = { dest: dest.name, source: s, reaches: '', anchor: '', live: '', tweak: '', note: '' };
      try {
        clean(); p.mod.push(mkMod(s, dest, 80));
        const { h, v } = await fire();
        if (!v) { row.reaches = 'NO VOICE'; rows.push(row); continue; }
        const withMod = dest.read(v);
        const connected = s !== 'env';

        if (withMod == null || ref == null) row.reaches = '?';
        else if (Math.abs(withMod - ref) > Math.max(1e-4, Math.abs(ref) * 0.02)) row.reaches = 'yes';
        else row.reaches = connected ? 'blind' : 'NO';

        row.anchor = anchor;

        if (dest.dialSet) {
          const before = dest.read(v), d0 = dest.dialGet(p);
          dest.dialSet(p, d0 * 2);
          if (dest.live) dest.live(pi); else engine.refresh(pi);
          await nap(220);
          const after = dest.read(v), ratio = before ? after / before : null;
          row.live = ratio == null ? '?'
            : Math.abs(ratio - 2) < 0.15 ? 'tracks x2'
            : Math.abs(ratio - 1) < 0.02 ? 'DEAD' : 'x' + ratio.toFixed(2);
          dest.dialSet(p, d0);
        } else row.live = '-';

        /* TWEAK — change the MOD ITSELF under a sounding note. For a CONNECTED
           source the DESTINATION param cannot show it (see 'blind' above), so
           watch the DEPTH HANDLE the voice kept, which is precisely what
           modLive re-aims. An envelope keeps no handle — it is scheduled — so
           for those the destination param is the only place to look, and a
           pass there is marked 'sched' because it means something different. */
        {
          const hs = (v.modN || []).filter(h => h.mi === 0);
          const rd = () => hs.length ? hs.map(h => h.p.value) : [dest.read(v)];
          const before = rd();
          p.mod[0].routes[0].amt = 20;
          try { engine.lfoLive(pi); } catch (_) {}
          try { engine.envLive(pi); } catch (_) {}
          try { engine.modReaim(pi); } catch (_) {}
          try { engine.refresh(pi); } catch (_) {}
          await nap(220);
          const after = rd();
          const moved = before.some((b, i) => b != null && after[i] != null
            && Math.abs(after[i] - b) > Math.max(1e-6, Math.abs(b) * 0.02));
          row.tweak = moved ? (hs.length ? 'yes' : 'yes sched')
                    : (before[0] == null ? '?' : 'DEAD');
          row.note = hs.length ? (hs.length + ' handles') : 'no handle';
        }
        await stop(h);
      } catch (e) { row.note = String(e && e.message || e).slice(0, 50); }
      rows.push(row);
    }
  }
  notes.push('blind = AudioParam.value cannot see a connected source; not a pass');
  notes.push('anchor is n/a for amp and op level by design — an amp envelope is the note, not a modulation');
  return { cols, rows };
}


/* WHERE DOES A KEY PRESS ACTUALLY GO — the instrument three diagnoses lacked.
   Every failed key measurement this week failed the same way: the probe
   dispatched a KeyboardEvent, the app never saw it (or saw it and returned
   somewhere unexpected), and the empty result read as "the feature is broken".
   NEXT.md already says a probe driving synthetic events must assert they
   ARRIVED; this asserts that and then says which door the key went through.

   arrived  — the app called preventDefault, i.e. it CLAIMED the key. This is
              the signal that was missing: without it a zero row cannot be told
              apart from a key that never landed.
   acted    — a state fingerprint moved (kbHeld / AUD.gk / liveV / flash), so
              the handler did something rather than claiming and dropping it.
   route    — the engine entry points it reached, in order. On an audio channel
              this is the whole question: trigger means the PLAY rack saw it,
              cueNote/audBendNote mean the key handled itself, audMove/audPitch
              are the head actually moving.

   tools/probe.sh keypath code=KeyA ch=9 kmode=0 auto=1 hold=400            */
async function probeKeyPath() {
  const code = str(P.code, 'KeyA');
  const ch   = num(P.ch, CH);
  const hold = num(P.hold, 400);
  const mods = { shiftKey: !!num(P.shift, 0), altKey: !!num(P.alt, 0),
                 ctrlKey: !!num(P.ctrl, 0), metaKey: !!num(P.meta, 0) };
  pin(ch);
  const p = S.presets[ch];
  /* set the channel up only when asked, so the probe can also read a channel
     exactly as it stands */
  if (p && p.au) {
    if (P.kmode !== undefined) p.au.kmode = num(P.kmode, 0);
    if (P.auto  !== undefined) p.au.auto  = num(P.auto, 1);
    if (P.cmode !== undefined) { p.au.cmode = num(P.cmode, 0);
      if (typeof applyCmode === 'function') applyCmode(ch); }
    if (P.arp !== undefined && p.ply) p.ply[0] = num(P.arp, 0)
      ? { typ: PTYPES.indexOf('arp'), p1: num(P.div, 0.25), p2: 0, p3: 1, p4: 60, p5: 0, p6: 0, p7: 0, p8: 0 }
      : (typeof mkPly === 'function' ? mkPly() : p.ply[0]);
    if (typeof engine.granCfg === 'function') { try { engine.granCfg(ch); } catch (_) {} }
    if (typeof engine.audLive === 'function') { try { engine.audLive(ch); } catch (_) {} }
  }
  /* every door a key can reach on the way to a sound, wrapped in one place */
  const route = [], undo = [];
  const spy = (obj, name, tag, argIdx) => {
    const fn = obj[name]; if (typeof fn !== 'function') return;
    obj[name] = function (...a) {
      if (a[argIdx] === ch) route.push(tag + (a[argIdx + 1] !== undefined
        ? ':' + (typeof a[argIdx + 1] === 'number' ? +a[argIdx + 1].toFixed(3) : a[argIdx + 1]) : ''));
      return fn.apply(this, a);
    };
    undo.push(() => { obj[name] = fn; });
  };
  spy(engine, 'trigger', 'trigger', 1);
  spy(engine, 'noteOn', 'noteOn', 1);
  spy(engine, 'cueNote', 'cueNote', 1);
  spy(engine, 'audBendNote', 'bend', 1);
  spy(engine, 'granNote', 'granNote', 1);
  spy(engine, 'audMove', 'audMove', 0);
  spy(engine, 'audPitch', 'audPitch', 0);
  spy(engine, 'audPlay', 'audPlay', 0);

  const fp = () => [Object.keys((typeof kbHeld !== 'undefined' && kbHeld) || {}).length,
                    Object.keys((typeof AUD !== 'undefined' && AUD.gk) || {}).length,
                    (typeof liveV !== 'undefined' && liveV) ? Object.keys(liveV).length : 0,
                    typeof flashMsg === 'undefined' ? '' : String(flashMsg || '')].join('|');
  let rows = [];
  try {
    const before = fp();
    const dn = new KeyboardEvent('keydown',
      Object.assign({ code, key: code, bubbles: true, cancelable: true }, mods));
    document.dispatchEvent(dn);
    await sleep(Math.min(120, hold));
    const heldFp = fp(), downRoute = route.slice();
    await sleep(Math.max(0, hold - 120));
    const up = new KeyboardEvent('keyup',
      Object.assign({ code, key: code, bubbles: true, cancelable: true }, mods));
    document.dispatchEvent(up);
    await sleep(120);
    const cfg = p && p.au
      ? ['cat=' + p.cat, 'kmode=' + (p.au.kmode | 0), 'auto=' + (p.au.auto | 0),
         'cmode=' + (p.au.cmode | 0), 'vox=' + ((p.vox && p.vox.mode) | 0),
         'ply0=' + ((p.ply && p.ply[0] && p.ply[0].typ) | 0)].join(' ')
      : 'ch ' + ch;
    rows = [
      { k: 'ch' + ch, arrived: dn.defaultPrevented ? 'yes' : 'NO — app never claimed it',
        acted: heldFp !== before ? 'yes' : 'no', route: downRoute.join(' → ') || '(none)', cfg },
      /* KEY-UP DOES NOT HAVE TO CLAIM. Most key-up handlers here do their work
         without preventDefault, so 'no' in this row is normal and says nothing
         — `acted` and `route` are what to read. It cost a false "stale hold"
         diagnosis before this note existed. */
      { k: 'on key-up', arrived: up.defaultPrevented ? 'yes' : 'n/a',
        acted: fp() !== heldFp ? 'yes' : 'no',
        route: route.slice(downRoute.length).join(' → ') || '(none)', cfg: '' }
    ];
    /* AND A ROUTE CAN ARRIVE LATE. Quantize defers the sound to the next grid
       line, so a door reached after the key-up shows in the SECOND row, not
       the first — reading only row one is how a working quantized key looked
       dead. */
    if (!dn.defaultPrevented)
      notes.push('the app did not claim this key — check layer/curPreset, and that no earlier '
               + 'branch returned. A zero route here says nothing about the feature.');
    if (dn.defaultPrevented && !downRoute.length)
      notes.push('claimed but reached no engine door: the handler consumed it and returned '
               + 'before making a sound — that is the branch to find.');
  } finally { for (const u of undo) u(); }
  return { cols: ['arrived', 'acted', 'route', 'cfg'], rows };
}

/* ROUND TRIP — the only question that matters about recording, and the one
   every earlier check here got wrong. Reading the lane tells you what was
   WRITTEN; it does not tell you whether playing it back does what your hands
   did. So: record a phrase, then play it with the generator switched off, and
   compare what the PLAYHEAD did in each pass.
     nLive / nReplay   moves made, live and on replay. Equal is the goal; more
                       on replay means something wrote twice.
     recorded          what actually landed in the lane, by kind. With an arp
                       running this must be the arp's steps (many); `cue x2`
                       for a two-key phrase means the held keys were recorded
                       and the arp's output was not.
     medOff/worstOff   how far each live move sits from the nearest replay
                       move, in BEATS. Groove applied twice showed as ~0.1.
     cueMiss           replay moves that went somewhere else entirely.
   THE TRANSPORT RUNS, so this one is audible at 5% — a silent tab has its
   timers clamped to 1/s and the scheduler misses by up to 800ms (CLAUDE.md).

   tools/probe.sh roundtrip ch=9 kmode=0 auto=1 div=0.25 keys=KeyA,KeyS      */
async function probeRoundTrip() {
  const ch    = num(P.ch, CH);
  const keys  = list(P.keys, ['KeyA', 'KeyS']);
  const div   = num(P.div, 0.25);
  const holdB = num(P.holdb, 2);            // beats to hold the keys
  pin(ch);
  const p = S.presets[ch], lane = S.patterns[S.editPat].lanes[ch];
  if (!p || !p.au) return { cols: ['err'], rows: [{ err: 'ch ' + ch + ' is not an audio channel' }] };
  p.au.kmode = num(P.kmode, 0);
  p.au.auto  = num(P.auto, 1);
  if (P.cmode !== undefined) { p.au.cmode = num(P.cmode, 0); try { applyCmode(ch); } catch (_) {} }
  if (P.q !== undefined) CFG.qOn = num(P.q, 1);
  try { engine.granCfg(ch); engine.audLive(ch); } catch (_) {}
  p.ply[0] = num(P.arp, 1)
    ? { typ: PTYPES.indexOf('arp'), p1: div, p2: 0, p3: 1, p4: 60, p5: 0, p6: 0, p7: 0, p8: 0 }
    : mkPly();

  /* audible at 5%: see above */
  let trim = null;
  try { trim = AC.createGain(); trim.gain.value = 0.05;
        engine.comp.disconnect(AC.destination); engine.comp.connect(trim);
        trim.connect(AC.destination); } catch (_) {}

  const moves = [], undo = [];
  const at = () => +fmod(posNow() - editAnchor(), lane.len).toFixed(3);
  const spy = (name, val) => { const fn = engine[name]; if (typeof fn !== 'function') return;
    engine[name] = function (pi, ...a) { if (pi === ch) moves.push([at(), val(a)]); return fn.call(this, pi, ...a); };
    undo.push(() => { engine[name] = fn; }); };
  spy('audMove',  a => +(+a[0]).toFixed(3));
  spy('audPitch', a => 'p' + (+(+a[0]).toFixed(2)));

  const wb = async x => { let g = 0; while (gridNow() < x && g++ < 4000) await sleep(5); };
  const ev = (ty, code) => document.dispatchEvent(
    new KeyboardEvent(ty, { code, key: code, bubbles: true, cancelable: true }));

  let live = [], rep = [], recd = {};
  try {
    S.patterns[S.editPat].state = 'rec';
    lane.events = [];
    if (!T.playing) play();
    await wb(Math.ceil(gridNow()) + 2);
    const t0 = Math.ceil(gridNow()) + 1;
    await wb(t0);
    moves.length = 0;
    keys.forEach(k => ev('keydown', k));
    await wb(t0 + holdB);
    keys.forEach(k => ev('keyup', k));
    await sleep(120);
    live = moves.slice();

    for (const e of lane.events) {
      const k = e.cue !== undefined ? 'cue' : e.pk !== undefined ? 'pk'
              : e.midi !== undefined ? 'midi' : e.fz !== undefined ? 'fz' : '?';
      recd[k] = (recd[k] || 0) + 1;
    }
    S.patterns[S.editPat].state = 'on';
    p.ply[0] = mkPly();                       // generator OFF: the lane is on its own now
    await wb(Math.ceil(gridNow() / lane.len) * lane.len + lane.len);
    moves.length = 0;
    await wb(gridNow() + lane.len);
    rep = moves.slice();
  } finally {
    for (const u of undo) u();
    try { stop(); } catch (_) {}
    try { if (trim) { engine.comp.disconnect(trim); trim.disconnect();
                      engine.comp.connect(AC.destination); } } catch (_) {}
  }

  /* PITCH MODE CANNOT BE PAIRED THIS WAY, and reading it as if it could cost a
     false "not fixed" in a commit message. A release and a step whose interval
     happens to be 0 semitones BOTH call audPitch(pi, 0), so nearest-match
     pairing has nothing to tell them apart, and live legitimately makes calls
     the replay does not need (its own first and last release). nReplay against
     the event count is the number that means something here; medOff/worstOff/
     cueMiss are reported as n/a rather than as a wrong answer. */
  const pitchMode = (p.au.kmode | 0) === 1;
  const offs = live.map(L => { let b = 9, v = null;
    for (const R of rep) { const d = Math.abs(R[0] - L[0]); if (d < b) { b = d; v = R[1]; } }
    return { off: +b.toFixed(3), same: v === L[1] }; });
  const srt = offs.map(o => o.off).sort((a, b) => a - b);
  if (!live.length) notes.push('no live moves — the keys never reached the head; run keypath first');
  if (pitchMode)
    notes.push('pitch mode: compare nReplay with the event count — a release and a 0-semitone '
             + 'step are the same call, so the offsets cannot be paired. Onsets in the audio '
             + 'are the ground truth if the timing is what is in question.');
  if (rep.length > live.length)
    notes.push('replay makes MORE moves than the hands did: something is writing the lane twice '
             + '(the held key on top of the generator is the usual one)');
  return { cols: ['nLive', 'nReplay', 'recorded', 'medOff', 'worstOff', 'cueMiss', 'cfg'],
    rows: [{ nLive: live.length, nReplay: rep.length,
      recorded: Object.entries(recd).map(([k, n]) => k + ' x' + n).join(' ') || '(empty)',
      medOff: pitchMode ? 'n/a' : (srt.length ? srt[srt.length >> 1] : ''),
      worstOff: pitchMode ? 'n/a' : (srt.length ? srt[srt.length - 1] : ''),
      cueMiss: pitchMode ? 'n/a' : offs.filter(o => !o.same).length,
      cfg: 'kmode=' + p.au.kmode + ' auto=' + p.au.auto + ' cmode=' + (p.au.cmode | 0)
         + ' q=' + (CFG.qOn | 0) + ' div=' + div + ' len=' + lane.len }] };
}

/* TRIG — does an operator's rtrg/free actually reach the sound, in BOTH
   engines. rtrg means "start at the phase you dialled, every note", so two
   identical notes must come out sample-identical; free means "don't", so they
   must not. One number says which: the correlation between the first
   milliseconds of two identical notes.
     same=1.000  the two notes start identically -> rtrg behaviour
     same<1      they start differently          -> free behaviour
   A row where rtrg and free give the SAME correlation is a toggle that does
   nothing in that engine.

   ONE CONFOUND, and it only bites the phase engine: a worklet voice starts on
   the next 128-sample render block, not at the sample you asked for, so two
   notes begin up to 2.9ms apart on the sample grid — most of a cycle at 261Hz.
   That shows here as a strong ANTI-correlation on rows that are otherwise
   fine, so read `same=1.000` as the reliable signal (nothing but a genuinely
   identical start produces it) and treat a negative number in the phase rows
   as "not identical", not as "random phase". Measured 2026-08-20: with `ph`
   plumbed through, the cfg message carries 0.25 twice at 90 degrees and 0.75
   at 270, while the audio still correlates -0.82 — the phase is right and the
   ONSET is what moved.

   tools/probe.sh trig ch=1 note=60 ph=90                                    */
async function probeTrig() {
  const ch = num(P.ch, CH), note = num(P.note, NOTE), ph = num(P.ph, 90);
  const keep = stash(ch);
  const p = S.presets[ch];
  const rows = [];
  try {
    const VX = modHolder(p, 'vox').vox || (p.vox = {});
    const grab = async () => {
      engine.allOff(); await sleep(60);
      const bus = busOf(ch); if (!bus) return null;
      const t = tap(bus); await sleep(20);
      engine.noteOn(AC.currentTime + 0.02, ch, note, 0.9);
      await sleep(160);
      const [L] = t.stop();
      engine.allOff();
      const w = windowOf(L, L);
      return L.slice(w.o, w.o + 1500);
    };
    const corr = (a, b) => { if (!a || !b) return null;
      let n = 0, d1 = 0, d2 = 0, m = Math.min(a.length, b.length);
      for (let i = 0; i < m; i++) { n += a[i] * b[i]; d1 += a[i] * a[i]; d2 += b[i] * b[i]; }
      return +(n / Math.max(1e-12, Math.sqrt(d1 * d2))).toFixed(3); };
    for (const eng of [0, 1]) {
      VX.fmw = eng;
      for (const phm of [0, 1]) {
        (modHolder(p, 'osc').osc || []).forEach(o => { if (o) { o.phm = phm; o.ph = ph; } });
        const A = await grab(), B = await grab();
        rows.push({ k: (eng ? 'phase' : 'native') + ' / ' + (phm ? 'free' : 'rtrg'),
          same: corr(A, B),
          peak: A ? +Math.max.apply(null, Array.from(A, Math.abs)).toFixed(4) : 0 });
      }
    }
  } finally { unstash(ch, keep); }
  if (rows.every(r => !r.peak)) notes.push('no sound on ch ' + ch + ' — is a preset loaded there?');
  notes.push('rtrg and free showing the same correlation in one engine = the toggle is dead there');
  return { cols: ['same', 'peak'], rows };
}

/* MONO — one playhead per audio channel, which is the whole model. Two keys
   down with the loop on must leave ONE cursor and reach audMove, never
   audPlay: a cue JUMPS the head, it does not add one. And a pitch key must
   pitch and STAY pitched while it is held — a second audPitch straight after
   the first is the head returning to baseline under your finger.
     cursors   worklet cursor count after key 1, after key 2, after release
     doors     every engine door the two keys reached, in order
   audPlay in the list with auto on, or cursors going 1 -> 2, is the bug.

   tools/probe.sh mono ch=9 kmode=0                                          */
async function probeMono() {
  const ch = num(P.ch, CH), kmode = num(P.kmode, 0);
  pin(ch);
  const p = S.presets[ch], lane = S.patterns[S.editPat].lanes[ch];
  if (!p || !p.au) return { cols: ['err'], rows: [{ err: 'ch ' + ch + ' is not audio' }] };
  p.au.kmode = kmode; p.au.auto = num(P.auto, 1);
  try { engine.granCfg(ch); engine.audLive(ch); } catch (_) {}
  (p.ply || []).forEach((_, i) => p.ply[i] = mkPly());
  S.patterns[S.editPat].state = 'on'; lane.events = [];
  if (P.q !== undefined) CFG.qOn = num(P.q, 0); else CFG.qOn = 0;
  let trim = null;
  try { trim = AC.createGain(); trim.gain.value = 0.05;
        engine.comp.disconnect(AC.destination); engine.comp.connect(trim);
        trim.connect(AC.destination); } catch (_) {}
  if (!T.playing) play();
  await sleep(900);
  const doors = [], undo = [];
  for (const nm of ['audPlay', 'audMove', 'audPitch', 'audStop', 'cueNote', 'audBendNote']) {
    const fn = engine[nm]; if (typeof fn !== 'function') continue;
    engine[nm] = function (...a) { if (a[0] === ch) doors.push(nm); return fn.apply(this, a); };
    undo.push(() => { engine[nm] = fn; });
  }
  const cur = () => { try { const st = engine.gn[ch] && engine.gn[ch].stat; return st ? (st.tv | 0) : -1; }
                      catch (_) { return -1; } };
  const K = (t, c) => document.dispatchEvent(
    new KeyboardEvent(t, { code: c, key: c, bubbles: true, cancelable: true }));
  K('keydown', 'KeyA'); await sleep(180); const c1 = cur();
  K('keydown', 'KeyS'); await sleep(180); const c2 = cur();
  K('keyup', 'KeyA'); K('keyup', 'KeyS'); await sleep(320); const c3 = cur();
  for (const u of undo) u();
  try { stop(); } catch (_) {}
  try { if (trim) { engine.comp.disconnect(trim); trim.disconnect();
                    engine.comp.connect(AC.destination); } } catch (_) {}
  const bad = doors.indexOf('audPlay') >= 0 || c2 > 1;
  if (bad) notes.push('POLYPHONIC: a second cursor or an audPlay with the loop on — '
                    + 'a cue must move the one head, not make another');
  return { cols: ['cursors', 'doors', 'verdict'],
    rows: [{ k: (kmode ? 'pitch' : 'position') + ' ch' + ch,
      cursors: c1 + ' / ' + c2 + ' / ' + c3, doors: doors.join(' ') || '(none)',
      verdict: bad ? 'POLY — bug' : 'mono' }] };
}

const HELP = {
  cols: ['args'],
  rows: [
    { k: 'level',    args: 'chs=8,9 ms=500 — rms/peak of a channel bus over a window' },
    { k: 'spectrum', args: 'chs=4 note=48 ms=500 fft=16384 win=rect|hann' },
    { k: 'cursor',   args: 'chs=9 — ping ten-grsyn: tv/g/tpos/cpos' },
    { k: 'preset',   args: 'names=SNR,S909 note=48 ch=8 — library name, played and measured' },
    { k: 'key',      args: 'code=KeyA hold=120 shift=0 alt=0 ctrl=0 meta=0' },
    { k: 'keypath',  args: 'code=KeyA ch=9 kmode=0 auto=1 arp=0 hold=400 — did the app CLAIM the key, and which engine door did it reach' },
    { k: 'roundtrip',args: 'ch=9 kmode=0 auto=1 arp=1 div=0.25 keys=KeyA,KeyS — record a phrase and replay it: did the head do the same thing twice' },
    { k: 'mono',     args: 'ch=9 kmode=0 auto=1 — one playhead? a cue must MOVE the head, never add one' },
    { k: 'trig',     args: 'ch=1 note=60 ph=90 — does an operator rtrg/free reach the sound, in both fm engines' },
    { k: 'matrix',   args: 'ch=8 take=nylonlick cues=4 — the seven cases + the cue jumps' },
    { k: 'modmatrix',args: 'only=filt — every mod SOURCE x every DESTINATION: reaches/anchor/live/tweak' },
    { k: '(any)',    args: '--ab <url> runs the same probe on a second build and diffs it' },
  ]
};

/* ---------------- run -------------------------------------------------- */
let out;
try {
  if (AC.state !== 'running') { try { await AC.resume(); } catch (_) {} }
  if (AC.state !== 'running') notes.push('AudioContext is ' + AC.state + ' — every level will read 0');
  const PROBES = { level: probeLevel, spectrum: probeSpectrum, cursor: probeCursor,
                   preset: probePreset, key: probeKey, keypath: probeKeyPath,
                   roundtrip: probeRoundTrip,
                   mono: probeMono,
                   trig: probeTrig,
                   matrix: probeMatrix,
                   modmatrix: probeModMatrix };
  const fn = PROBES[NAME];
  out = fn ? await fn() : (NAME === 'help' ? HELP : { cols: [], rows: [], err: 'no probe named ' + NAME });
} catch (e) {
  out = { cols: [], rows: [], err: String(e && e.stack || e) };
} finally {
  if (guarding) for (const t of ['keydown', 'keyup', 'keypress'])
    document.removeEventListener(t, swallow, true);
}

return Object.assign({
  probe: NAME,
  build: typeof BUILD === 'undefined' ? '?' : BUILD,
  url: location.href.split('?')[0],
  sr: AC.sampleRate,
  fft: NFFT,
  pinned: { curPreset: S.curPreset, editSnd: S.editSnd, layer: S.layer },
  notes
}, out);
