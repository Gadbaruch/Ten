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

const HELP = {
  cols: ['args'],
  rows: [
    { k: 'level',    args: 'chs=8,9 ms=500 — rms/peak of a channel bus over a window' },
    { k: 'spectrum', args: 'chs=4 note=48 ms=500 fft=16384 win=rect|hann' },
    { k: 'cursor',   args: 'chs=9 — ping ten-grsyn: tv/g/tpos/cpos' },
    { k: 'preset',   args: 'names=SNR,S909 note=48 ch=8 — library name, played and measured' },
    { k: 'key',      args: 'code=KeyA hold=120 shift=0 alt=0 ctrl=0 meta=0' },
    { k: 'matrix',   args: 'ch=8 take=nylonlick cues=4 — the seven cases + the cue jumps' },
    { k: '(any)',    args: '--ab <url> runs the same probe on a second build and diffs it' },
  ]
};

/* ---------------- run -------------------------------------------------- */
let out;
try {
  if (AC.state !== 'running') { try { await AC.resume(); } catch (_) {} }
  if (AC.state !== 'running') notes.push('AudioContext is ' + AC.state + ' — every level will read 0');
  const PROBES = { level: probeLevel, spectrum: probeSpectrum, cursor: probeCursor,
                   preset: probePreset, key: probeKey, matrix: probeMatrix };
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
