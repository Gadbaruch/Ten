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

/* ISOLATION MUTES THAT SURVIVE A RELOAD. Three rows drop every other fader to
   0 so one channel can be measured alone, and all three restore in a finally —
   but a reload or a killed run in the middle skips the finally, the autosave
   keeps the zeros, and the NEXT probe measures silence and blames the app.
   That cost two rounds in one session (trig read all-zero peaks, grainflt read
   0Hz, both with nothing wrong). The levels are parked in sessionStorage now
   and any orphan is put back before the next run mutes anything. */
const MUTEKEY = 'ten-probe-mutes';
function muteRestoreOrphans() {
  let rec = null;
  try { rec = JSON.parse(sessionStorage.getItem(MUTEKEY) || 'null'); } catch (_) {}
  if (!Array.isArray(rec)) return 0;
  for (const [c, v] of rec) {
    const mx = S.presets[c] && S.presets[c].mix;
    if (mx) mx.lvl = v;
    try { engine.refresh(c); } catch (_) {}
  }
  try { sessionStorage.removeItem(MUTEKEY); } catch (_) {}
  notes.push('restored ' + rec.length + ' fader(s) an interrupted probe had left muted');
  return rec.length;
}
function muteOthers(keep) {
  muteRestoreOrphans();
  const rec = [];
  for (let c = 0; c < S.presets.length; c++) {
    if (keep.indexOf(c) >= 0) continue;
    const mx = S.presets[c] && S.presets[c].mix;
    if (!mx) continue;
    rec.push([c, mx.lvl]); mx.lvl = 0;
    try { engine.refresh(c); } catch (_) {}
  }
  try { sessionStorage.setItem(MUTEKEY, JSON.stringify(rec)); } catch (_) {}
  return rec;
}
function muteRestore(rec) {
  for (const [c, v] of rec || []) {
    const mx = S.presets[c] && S.presets[c].mix;
    if (mx) mx.lvl = v;
    try { engine.refresh(c); } catch (_) {}
  }
  try { sessionStorage.removeItem(MUTEKEY); } catch (_) {}
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
      const [L, R] = t.stop();
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
  /* ASK THE WORKLET, DO NOT READ THE CACHE. `gn[ch].stat` is the last stat that
     happened to arrive and is up to a frame stale — read during a jump's 3ms
     splice it reports TWO cursors, and this probe called that polyphony and
     said "POLY — bug" on a build that was fine. A ping is a round trip and the
     answer is the truth. Verified 2026-08-20: cached said 1/2/1 where the ping
     said 1/1/1 through the same gesture. */
  const node = engine.gn[ch] && engine.gn[ch].node;
  const cur = () => new Promise(res => {
    if (!node) return res(-1);
    const to = setTimeout(() => res(-1), 400);
    const h = e => { if (e.data && e.data.t === 'stat') {
      clearTimeout(to); node.port.removeEventListener('message', h); res(e.data.tv | 0); } };
    node.port.addEventListener('message', h);
    if (node.port.start) node.port.start();
    node.port.postMessage({ t: 'ping', want: 'stat' });
  });
  const K = (t, c) => document.dispatchEvent(
    new KeyboardEvent(t, { code: c, key: c, bubbles: true, cancelable: true }));
  K('keydown', 'KeyA'); await sleep(180); const c1 = await cur();
  K('keydown', 'KeyS'); await sleep(180); const c2 = await cur();
  K('keyup', 'KeyA'); K('keyup', 'KeyS'); await sleep(320); const c3 = await cur();
  for (const u of undo) u();
  try { stop(); } catch (_) {}
  try { if (trim) { engine.comp.disconnect(trim); trim.disconnect();
                    engine.comp.connect(AC.destination); } } catch (_) {}
  /* audPlay ALONE IS NOT THE BUG. The cycle scheduler respawns the loop cursor
     with it every bar, so it appears in a perfectly mono run; and with auto
     OFF a cursor per key is the documented model, not a fault. The bug is a
     SECOND CURSOR while the loop is on. */
  const bad = p.au.auto && c2 > 1;
  if (bad) notes.push('POLYPHONIC: a second cursor with the loop on — a cue must move '
                    + 'the one head, not make another');
  if (!p.au.auto) notes.push('auto is OFF, so a cursor per key IS the model here — '
                           + 'that is the polyphonic sampler, not a bug');
  return { cols: ['cursors', 'doors', 'verdict'],
    rows: [{ k: (kmode ? 'pitch' : 'position') + ' ch' + ch,
      cursors: c1 + ' / ' + c2 + ' / ' + c3, doors: doors.join(' ') || '(none)',
      verdict: bad ? 'POLY — bug' : (p.au.auto ? 'mono' : 'auto off — per-key cursors expected') }] };
}

/* SWEEP — Gad's idea, verbatim: "test with a sin sweep so you can measure and
   know exactly which pitch to expect when". A 4s sine sweep, 200->2000Hz
   linear in POSITION, becomes the take — so at speed x1 the dominant frequency
   of the bus IS the playhead position: pos = (f-200)/1800. A 6ms notch every
   250ms gives detectCuts real onsets, so the position keys get real cues.
   The probe then plays scripted quantized taps, records them, replays the
   lane, and compares WHAT SOUNDED both times — not what was written, not
   which calls fired: the audible position trajectory, decoded from pitch.
     live/replay rows: one per sounded note — startB (mod loop), pos (0..1),
                       length in beats
     match:            live note k vs its replay twin — pos diff, len ratio
     twoHeads:         windows where a SECOND spectral peak sits within 12dB
                       of the first, >=150Hz away — two simultaneous sweep
                       pitches is two playheads, heard, not inferred.
   tools/probe.sh sweep ch=9 taps=6                                          */
async function probeSweep() {
  const ch = num(P.ch, CH), taps = clampN(num(P.taps, 6), 2, 10);
  function clampN(v, a, b) { return v < a ? a : v > b ? b : v; }
  pin(ch);
  const p = S.presets[ch];
  if (!p || !p.au) return { cols: ['err'], rows: [{ err: 'ch ' + ch + ' is not audio' }] };
  /* the sweep take */
  const sr = AC.sampleRate, N = Math.round(sr * 4), pcm = new Float32Array(N);
  let ph = 0;
  for (let i = 0; i < N; i++) {
    const f = 200 + 1800 * (i / N);
    ph += 2 * Math.PI * f / sr;
    const inNotch = ((i / sr) % 0.25) < 0.006;
    pcm[i] = inNotch ? 0 : Math.sin(ph) * 0.6;
  }
  audPlace(ch, pcm, 0, 'sweep');
  await sleep(400);
  /* known ground: tape, position keys, autoloop off, no cloud, no sync, x1 */
  p.au.kmode = 0; p.au.auto = 0; p.au.cmode = 0; p.au.pmode = 0;
  p.au.spd = 1; p.au.semis = 0; p.au.st = 0; p.au.en = 1;
  /* wnd=N lets the release-fade window ride the comparison — Gad's set runs
     180 and the live-vs-replay length delta scales with it */
  if (P.wnd) { p.au.wnd = clamp(num(P.wnd, 50), 5, 300); engine.audWnd(ch); }
  if (p.gr) p.gr.size = 1;
  (p.ply || []).forEach((_, i) => p.ply[i] = mkPly());
  try { applyCmode(ch); } catch (_) {}
  try { engine.granCfg(ch); engine.audLive(ch); } catch (_) {}
  const cuts = engine.audCuts(ch) || [];
  if (cuts.length < 4) return { cols: ['err'], rows: [{ err: 'only ' + cuts.length + ' cues detected on the sweep' }] };
  const lane = S.patterns[S.editPat].lanes[ch];
  S.patterns[S.editPat].lanes.forEach(l => { l.events = []; });
  lane.auto = false; lane.unit = 'B'; lane.count = 1; lane.grid = 0.25;
  CFG.qOn = 1;
  /* quiet but not silent — the scheduler must keep its clock */
  let trim = null;
  try { trim = AC.createGain(); trim.gain.value = 0.05;
        engine.comp.disconnect(AC.destination); engine.comp.connect(trim);
        trim.connect(AC.destination); } catch (_) {}
  /* the ear: an analyser on the channel bus, polled */
  const an = AC.createAnalyser(); an.fftSize = 4096; an.smoothingTimeConstant = 0;
  engine.buses[ch].pan.connect(an);
  const bins = new Float32Array(an.frequencyBinCount);
  const hz = i => i * sr / an.fftSize;
  const lo = Math.ceil(150 / (sr / an.fftSize)), hi = Math.floor(2300 / (sr / an.fftSize));
  const samples = [];
  let polling = null;
  const poll = () => {
    an.getFloatFrequencyData(bins);
    let b1 = -1, v1 = -Infinity;
    for (let i = lo; i <= hi; i++) if (bins[i] > v1) { v1 = bins[i]; b1 = i; }
    if (v1 < -58) { samples.push({ b: gridNow(), f: 0 }); return; }
    let v2 = -Infinity;
    for (let i = lo; i <= hi; i++) {
      if (Math.abs(hz(i) - hz(b1)) < 150) continue;
      /* a local peak, not a skirt: taller than both neighbours */
      if (bins[i] > v2 && bins[i] >= bins[i - 1] && bins[i] >= bins[i + 1]) v2 = bins[i];
    }
    samples.push({ b: gridNow(), f: hz(b1), two: (v1 - v2) < 12 });
  };
  const K = (t, c) => document.dispatchEvent(new KeyboardEvent(t, { code: c, key: c, bubbles: true, cancelable: true }));
  const wb = async x => { let g = 0; while (gridNow() < x && g++ < 8000) await sleep(5); };
  const KEYS = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'];
  /* live pass, recorded */
  if (!T.playing) play();
  await sleep(900);
  S.patterns[S.editPat].state = 'rec';
  await wb(Math.ceil(gridNow()) + 1);
  const t0 = Math.ceil(gridNow()) + 1;
  polling = setInterval(poll, 15);
  for (let k = 0; k < taps; k++) {
    await wb(t0 + k * 0.5 - 0.1);
    K('keydown', KEYS[k]); await sleep(170); K('keyup', KEYS[k]);
  }
  await wb(t0 + taps * 0.5 + 0.6);
  clearInterval(polling);
  const live = samples.splice(0);
  await sleep(300);
  S.patterns[S.editPat].state = 'on';
  const nEv = lane.events.length;
  /* replay, two loops */
  await wb(Math.ceil(gridNow() / lane.len) * lane.len + lane.len);
  polling = setInterval(poll, 15);
  await wb(gridNow() + lane.len * 2);
  clearInterval(polling);
  const rep = samples.splice(0);
  try { stop(); } catch (_) {}
  try { engine.buses[ch].pan.disconnect(an); } catch (_) {}
  try { if (trim) { engine.comp.disconnect(trim); trim.disconnect();
                    engine.comp.connect(AC.destination); } } catch (_) {}
  /* trajectories -> notes */
  const L = lane.len;
  const notes = A => {
    const out = []; let cur = null;
    for (const s of A) {
      if (s.f > 0) {
        if (!cur) cur = { b0: s.b, bN: s.b, fs: [s.f], two: s.two ? 1 : 0, n: 1 };
        else { cur.bN = s.b; cur.fs.push(s.f); cur.n++; if (s.two) cur.two++; }
      } else if (cur) { out.push(cur); cur = null; }
    }
    if (cur) out.push(cur);
    return out.filter(x => x.n >= 2).map(x => {
      const fs = x.fs.slice().sort((a, b) => a - b);
      return { startB: +fmod(x.b0, L).toFixed(2),
               pos: +(((fs[fs.length >> 1]) - 200) / 1800).toFixed(3),
               lenB: +(x.bN - x.b0).toFixed(2),
               twoFrac: +(x.two / x.n).toFixed(2) };
    });
  };
  const ln = notes(live), rn = notes(rep);
  /* match each live note to replay notes at the same loop phase */
  const match = ln.map(a => {
    const twins = rn.filter(b => Math.abs(fmod(b.startB - a.startB + L / 2, L) - L / 2) < 0.15);
    if (!twins.length) return { at: a.startB, live: a.pos, replay: 'MISSING', dPos: '-', dLen: '-' };
    const b = twins[0];
    return { at: a.startB, live: a.pos, replay: b.pos,
             dPos: +(Math.abs(b.pos - a.pos)).toFixed(3),
             dLen: +(b.lenB - a.lenB).toFixed(2) };
  });
  const twoLive = ln.reduce((m, x) => Math.max(m, x.twoFrac), 0);
  const twoRep = rn.reduce((m, x) => Math.max(m, x.twoFrac), 0);
  return { cols: ['at', 'live', 'replay', 'dPos', 'dLen'],
    rows: match.concat([{ at: '—', live: 'liveNotes ' + ln.length + ' recEvents ' + nEv,
      replay: 'replayNotes ' + rn.length + ' (2 loops)',
      dPos: 'twoHeads live ' + twoLive, dLen: 'twoHeads rep ' + twoRep }]) };
}

/* MIC RECORDING ON AN AUDIO CHANNEL, END TO END, WITH A FAKE MIC. getUserMedia
   is swapped for the run with a MediaStream carrying a 440Hz sine at 0.3 — the
   same on every machine, and no permission dialog in the way — and the input
   stage is torn down first so the fake is what it hears. Then, on channel `ch`:
     hold     keydown Tab, `hold` ms, keyup: a take lands (length, peak, where),
              and while held the column carries a .wrec path whose write head MOVES
     gain     the same take at `db` dB: the dial reaches what tab records
     keys     a cue key under the hold: the sound is DROPPED (it was a keys take)
     tap+ring mic already on (as escape-latched), tab tapped: the last loop comes off the ring
     monitor  the mic through the channel's strip, on vs off
     device   the row steps the input list; the stage is rebuilt on the new one
   ch=9 hold=900 db=-6. The channel, the lane and the mic config are put back. */
async function probeMicRec() {
  const ch = CH, hold = num(P.hold, 900), db = num(P.db, -6);
  const rows = [];
  const md = navigator.mediaDevices;
  const gum0 = md.getUserMedia, enu0 = md.enumerateDevices;
  const lane = S.patterns[S.editPat].lanes[ch];
  const keep = { p: stash(ch), buf: engine.audBuf[ch], name: engine.audName[ch],
                 gbuf: (engine.granBuf || [])[ch],
                 lane: { unit: lane.unit, count: lane.count, auto: lane.auto, events: lane.events.slice() },
                 micDb: CFG.micDb, micDev: CFG.micDev, micDevL: CFG.micDevL,
                 overdub: CFG.overdub, micMon: CFG.micMon, micTrim: CFG.micTrimMs,
                 layer: S.layer, playing: T.playing, bpm: T.bpm };
  /* the fake mic mints a FRESH stream per call off one feed node: micSetDev
     stops the old stream's tracks, and a stopped singleton was a dead mic
     for every row after the device one (sync heard 0/4 that way) */
  const osc = AC.createOscillator(), og = AC.createGain(), feed = AC.createGain();
  osc.frequency.value = 440; og.gain.value = 0.3; feed.gain.value = 1;
  osc.connect(og); og.connect(feed); osc.start();
  md.getUserMedia = () => { const d9 = AC.createMediaStreamDestination(); feed.connect(d9); return Promise.resolve(d9.stream); };
  md.enumerateDevices = () => Promise.resolve([
    { kind: 'audioinput', deviceId: 'fakeA', label: 'Fake A (probe)' },
    { kind: 'audioinput', deviceId: 'fakeB', label: 'Fake B (probe)' }]);
  const KS = (t, c, o) => document.dispatchEvent(new KeyboardEvent(t, Object.assign({ code: c, key: c, bubbles: true, cancelable: true }, o || {})));
  const K = (t, c) => KS(t, c);
  const sr = AC.sampleRate;
  const fresh = () => {            // the stage must hear the FAKE, whatever it heard before
    if (engine.audRec) engine.audRecStop(true);
    if (MIC.on) micOff(); MIC.stream = null; MIC.ring = null; MIC.devs = null;
    pin(ch);
    if (!isAudioCh(ch)) setEngine(ch, 'audio');
    /* TAPE, not cloud: seedCloud fills any gran channel with no take the
       moment the factory pool lands — which is mid-hold right after a reload,
       and the take then overwrote INTO nylonlick (peak 0.64 for a 0.3 sine) */
    const pr = S.presets[ch]; pr.cat = 'audio'; pr.au = pr.au || {}; pr.au.cmode = 0; pr.au.kmode = 0; audDefaults(pr);
    pr.au.src = 0; CFG.micMon = 0; micMonWire(); CFG.overdub = 0;
    engine.audBuf[ch] = null; engine.audName[ch] = null;
    if (engine.granBuf) engine.granBuf[ch] = null;
    lane.unit = 'B'; lane.count = 1; lane.auto = false; lane.events = [];
    S.layer = 1; dirty = true;
  };
  const pkOf = x => { let pk = 0; for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > pk) pk = v; } return pk; };
  const onOf = x => { let n = 0, first = -1; for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > 0.01) { n++; if (first < 0) first = i; } return { n, first }; };
  const headY = () => { const l = document.querySelector('.wrec line'); return l ? +l.getAttribute('y1') : null; };
  const strokes = () => { const q = document.querySelector('.wrec path'); return q ? (q.getAttribute('d').match(/M/g) || []).length : 0; };
  const flashes = [];
  const flash0 = window.flash; window.flash = m => { flashes.push(String(m)); return flash0(m); };
  try {
    delete CFG.micDev; delete CFG.micDevL;
    setBpm(120);        // the rows quote seconds that assume it; scratch state had drifted to 287 once
    delete CFG.micTrimMs;   // rows that need a trim set their own
    for (let w = 0; w < 25 && !POOL.length; w++) await sleep(200);   // let the pool land before the first take
    /* a take lands (lat+4096)/sr+8ms AFTER keyup — and while the transport
       plays, lat rides the reported output latency (measured 20066 samples =
       556ms drain under sink-none). A fixed sleep raced that and lost; wait
       for the buffer itself. */
    const landWait = async (b0, cap9) => { for (let i9 = 0; i9 < (cap9 || 1200) / 20; i9++) {
      const b9 = engine.audBuf[ch]; if (b9 && b9 !== b0) return true; await sleep(20); } return false; };
    /* tab-alone — the sound recorder must NOT start without the mic key
       (Gad, 2026-08-24: "it should be mic+rec records audio input") */
    fresh(); CFG.micDb = 0;
    K('keydown', 'Tab'); await sleep(300);
    const alone = { rec: engine.audRec ? 'RECORDING' : 'none', pend: engine.audRecPend ? 'pend' : 'none', mic: MIC.on };
    K('keyup', 'Tab'); await sleep(120);
    rows.push({ k: 'tab-alone', rec: alone.rec + '/' + alone.pend, micAfter: (alone.mic || MIC.on) ? 'on' : 'off',
                landed: !!engine.audBuf[ch], expect: 'none/none · off · false' });
    /* hold — the chord: esc engages the mic, tab records; draw while held.
       TRANSPORT PLAYING: a stopped take into an empty channel is the
       tempo-setting path now, and this row asserts grid placement */
    fresh(); CFG.micDb = 0; play(); await sleep(200);
    const beat0 = gridNow();
    K('keydown', 'Escape'); await sleep(30);
    K('keydown', 'Tab'); await sleep(hold * 0.35);
    const r1 = engine.audRec;
    const mid = { pi: r1 ? r1.pi : null, label: r1 ? r1.label : null, opened: r1 ? r1.openedMic : null };
    const y1 = headY(), s1 = strokes();
    await sleep(hold * 0.35);
    const y2 = headY(), s2 = strokes();
    await sleep(hold * 0.3);
    const bh0 = engine.audBuf[ch];
    K('keyup', 'Tab'); await landWait(bh0);
    K('keyup', 'Escape'); await sleep(120);
    const b1 = engine.audBuf[ch], d1 = b1 ? b1.getChannelData(0) : null;
    const L = lane.len, cl = Math.max(256, Math.round(L * spb() * sr));
    const exp0 = ((Math.round(fmod(beat0 - editAnchor(), L) * spb() * sr - AUDLATC) % cl) + cl) % cl;
    stop(); await sleep(120);
    const o1 = d1 ? onOf(d1) : { n: 0, first: -1 };
    rows.push({ k: 'hold', rec: mid.label + ' ch' + mid.pi + (mid.opened ? ' (opened mic)' : ''),
                landed: !!b1, peak: d1 ? r3(pkOf(d1)) : null, expect: 0.3,
                onSec: r3(o1.n / sr), heldSec: r3(hold / 1000), loopSec: r3(cl / sr),
                firstAt: r3(o1.first / sr), expAt: r3(exp0 / sr),
                head: y1 == null ? 'none' : r3(y1) + '→' + r3(y2), strokes: s1 + '→' + s2,
                micAfter: MIC.on ? 'on' : 'off', rec2: engine.audRec ? 'STILL RUNNING' : 'none' });
    /* gain — the dial reaches the take */
    fresh(); CFG.micDb = db; play(); await sleep(200);
    K('keydown', 'Escape'); await sleep(30); K('keydown', 'Tab'); await sleep(hold);
    K('keyup', 'Tab'); K('keyup', 'Escape'); await sleep(220); stop(); await sleep(120);
    const b2 = engine.audBuf[ch], d2 = b2 ? b2.getChannelData(0) : null;
    rows.push({ k: 'gain ' + db + 'dB', landed: !!b2, peak: d2 ? r3(pkOf(d2)) : null,
                expect: r3(0.3 * Math.pow(10, db / 20)) });
    /* keys — a cue key under the hold makes it a keys take */
    fresh(); CFG.micDb = 0;
    K('keydown', 'Escape'); await sleep(30);
    K('keydown', 'Tab'); await sleep(hold * 0.4); K('keydown', 'KeyA'); await sleep(80); K('keyup', 'KeyA');
    await sleep(hold * 0.5); const keysN = engine.audRec ? engine.audRec.keys : null;
    K('keyup', 'Tab'); K('keyup', 'Escape'); await sleep(200);
    rows.push({ k: 'keys', keysSeen: keysN, landed: !!engine.audBuf[ch], expect: 'landed false',
                micAfter: MIC.on ? 'on' : 'off' });
    /* tap-parked — the ring tap is commented out (round 13): a tap on an
       audio channel must land NO audio. The bed the later rows need is laid
       directly off the ring instead. */
    fresh(); await micOn(); MIC.latched = true;
    await sleep(Math.min(3000, cl / sr * 1000 + 400));
    K('keydown', 'Tab'); await sleep(60); K('keyup', 'Tab'); await sleep(150);
    rows.push({ k: 'tap-parked', landed: !!engine.audBuf[ch], rec2: engine.audRec ? 'STILL RUNNING' : 'none',
                micAfter: MIC.on ? 'on' : 'off', expect: 'landed false · none · on' });
    audPlace(ch, micGrab(lane.len * spb()), gridNow() - lane.len, 'mic');
    /* punch — overwrite replaces ONLY the held span and never sums (Gad,
       2026-08-24: "overwrite only the part where rec was held and keep other
       areas of the previous layer intact"). Bed: the full 2s ring take at
       0.3/440Hz. Punch: 0.45s at 0.15/523Hz — windows reading ~0.15 are the
       replaced span, ~0.3 the surviving bed, >0.33 would be a SUM (overdub
       shows those; overwrite must show none). */
    const cls = d9 => { const win = 256; let span = 0, bed = 0, mix = 0;
      for (let a = 0; a + win <= d9.length; a += win) { let pk = 0;
        for (let i = a; i < a + win; i += 2) { const v = Math.abs(d9[i]); if (v > pk) pk = v; }
        if (pk > 0.33) mix++; else if (pk > 0.21) bed++; else if (pk > 0.08) span++; }
      return { span: r3(span * win / sr), bed: r3(bed * win / sr), mix: r3(mix * win / sr) }; };
    osc.frequency.value = 523; CFG.micDb = -6; micGainApply();
    CFG.overdub = 1;
    const bp0 = engine.audBuf[ch];
    K('keydown', 'Tab'); await sleep(450); K('keyup', 'Tab'); await landWait(bp0);
    const od9 = cls(engine.audBuf[ch].getChannelData(0));
    /* the clean 440 bed back — in OVERWRITE, so the full-loop grab replaces
       everything (same-frequency overdub would phase-cancel the bed) — then
       the overwrite punch at 523 */
    CFG.overdub = 0;
    osc.frequency.value = 440; CFG.micDb = 0; micGainApply();
    await sleep(cl / sr * 1000 + 300);
    audPlace(ch, micGrab(lane.len * spb()), gridNow() - lane.len, 'mic');
    osc.frequency.value = 523; CFG.micDb = -6; micGainApply(); await sleep(150);
    const bp1 = engine.audBuf[ch];
    K('keydown', 'Tab'); await sleep(450); K('keyup', 'Tab'); await landWait(bp1);
    const pw9 = cls(engine.audBuf[ch].getChannelData(0));
    let mstep = 0; { const dd = engine.audBuf[ch].getChannelData(0);
      for (let i = 1; i < dd.length; i++) { const v = Math.abs(dd[i] - dd[i - 1]); if (v > mstep) mstep = v; } }
    osc.frequency.value = 440; CFG.micDb = 0; micGainApply();
    rows.push({ k: 'punch', spanSec: pw9.span, bedSec: pw9.bed, mixSec: pw9.mix, ovdubMixSec: od9.mix,
                maxStep: r3(mstep), loopSec: r3(cl / sr),
                expect: 'span~0.45 bed~1.5 mix 0 · ovdubMix >0.1 · maxStep <0.08 (xfade)' });
    /* repitch — a fresh take resets speed/pitch/crop to neutral, so it plays
       back as recorded; the dials only repitch when turned AFTER the take
       (Gad, 2026-08-24) */
    const auR = S.presets[ch].au; auR.spd = 2; auR.rate = 2; auR.semis = 7; auR.st = 0.3; auR.en = 0.6;
    K('keydown', 'Tab'); await sleep(500); K('keyup', 'Tab'); await sleep(200);
    rows.push({ k: 'repitch', spd: auR.spd + '/' + auR.rate, semis: auR.semis, crop: auR.st + '/' + auR.en,
                landed: !!engine.audBuf[ch], expect: '1/1 · 0 · 0/1 · true' });
    /* mute — in overwrite the carrier goes down while a take records, and
       comes back with the next cycle after the stop. The bed is re-laid
       wall-to-wall first (a full-loop ring grab), so a 250ms bus window
       cannot land in silence and read as a mute that is not there. */
    audPlace(ch, micGrab(lane.len * spb()), gridNow() - lane.len, 'mic');
    play(); await sleep(1300);
    const carBefore = !!(engine.audCar || [])[ch];
    const brms = async () => { const t9 = tap(busOf(ch)); await sleep(250); const [L9] = t9.stop();
      let s9 = 0; for (let i = 0; i < L9.length; i++) s9 += L9[i] * L9[i];
      return r3(Math.sqrt(s9 / Math.max(1, L9.length))); };
    const busPlay = await brms();
    engine.audRecStart(ch); await sleep(350);
    const carDuring = !!(engine.audCar || [])[ch];
    const busRec = await brms();
    engine.audRecStop(true); await sleep(120);
    const busResume = await brms();     // back BEFORE the bar comes round: the mid-phrase join
    await sleep(2100);
    const carAfter = !!(engine.audCar || [])[ch];
    stop(); await sleep(120);
    rows.push({ k: 'mute', carBefore, busPlay, carDuring, busRec, busResume, carAfter,
                expect: 'car t/f/t · bus >0 · ~0 · >0 at once' });
    /* from0 — a chord take that BEGINS with the transport stopped lands at
       the loop start, bed or no bed (only the empty channel also sets the
       clock). Clean 440 bed first, then a 523 punch: its span must sit at 0. */
    CFG.overdub = 0; CFG.micDb = 0; micGainApply(); osc.frequency.value = 440; og.gain.value = 0.3;
    await sleep(cl / sr * 1000 + 300);
    audPlace(ch, micGrab(lane.len * spb()), gridNow() - lane.len, 'mic');
    osc.frequency.value = 523; CFG.micDb = -6; micGainApply();
    K('keydown', 'Tab'); await sleep(500); K('keyup', 'Tab'); await sleep(250);
    osc.frequency.value = 440; CFG.micDb = 0; micGainApply();
    let spanAt = -1; { const dd0 = engine.audBuf[ch].getChannelData(0), win = 256;
      for (let a = 0; a + win <= dd0.length; a += win) { let pk = 0;
        for (let i = a; i < a + win; i += 2) { const v = Math.abs(dd0[i]); if (v > pk) pk = v; }
        if (pk > 0.08 && pk < 0.21) { spanAt = a; break; } } }
    rows.push({ k: 'from0', spanStartSec: spanAt < 0 ? null : r3(spanAt / sr),
                expect: '~0 — stopped takes land at the loop start' });
    /* tailfix — with a trim set, the punch WINDOW obeys it: the tap drains
       past the release and drops the pre-press head, so the take is the AIR
       of press..release — tail complete, no early start. Reuses from0's bed;
       the scan skips from0's span at 0-0.5s. */
    /* trim = the fake chain's OWN latency (22ms, the number the sync row
       measures) — the drop must equal the real chain delay; a trim that
       does not match the chain shifts content by the difference, which is
       exactly what it does on a machine whose gear changed without a
       re-measure */
    CFG.micTrimMs = 22;
    const phS = () => fmod(posNow() - actAt(posNow()).anchor, lane.len) * spb();
    const spanIn = (lo, hi) => { const d9 = engine.audBuf[ch].getChannelData(0), win = 256;
      let s1 = -1, s2 = -1;
      for (let a = Math.round(lo * sr); a + win <= Math.min(d9.length, Math.round(hi * sr)); a += win) {
        let pk = 0; for (let i = a; i < a + win; i += 2) { const v = Math.abs(d9[i]); if (v > pk) pk = v; }
        if (pk > 0.08 && pk < 0.21) { if (s1 < 0) s1 = a; s2 = a + win; } }
      return s1 < 0 ? null : [r3(s1 / sr), r3(s2 / sr)]; };
    play(); await sleep(400);
    let gg = 0; while ((phS() < 0.6 || phS() > 0.75) && gg++ < 300) await sleep(15);
    osc.frequency.value = 523; CFG.micDb = -6; micGainApply();
    K('keydown', 'Tab'); const tfP = r3(phS()); await sleep(320);
    const tfR = r3(phS()); K('keyup', 'Tab');
    osc.frequency.value = 440; CFG.micDb = 0; micGainApply();
    await sleep(450);
    const tfSpan = spanIn(0.55, 1.95);
    rows.push({ k: 'tailfix', press: tfP, release: tfR, span: tfSpan ? tfSpan.join('-') : null,
                expect: 'span ≈ press..release−30ms — tail kept, key-up click shaved' });
    /* shortpunch — a chord TAP lands a tiny punch now instead of cancelling */
    gg = 0; while ((phS() < 1.25 || phS() > 1.45) && gg++ < 300) await sleep(15);
    osc.frequency.value = 523; CFG.micDb = -6; micGainApply();
    K('keydown', 'Tab'); const spP = r3(phS()); await sleep(120); K('keyup', 'Tab');
    osc.frequency.value = 440; CFG.micDb = 0; micGainApply();
    await sleep(400); stop(); await sleep(150); delete CFG.micTrimMs;
    const spSpan = spanIn(Math.max(0, spP - 0.06), Math.min(1.95, spP + 0.5));
    rows.push({ k: 'shortpunch', press: spP, span: spSpan ? spSpan.join('-') : null,
                expect: '~120ms landed at the press (was: cancelled)' });
    /* unitsnap — changing the unit snaps the length to the CLOSEST whole
       count of the new unit (his walk: 7 16ths → … → 1 bar = 16 16ths).
       On a MIDI lane, pure length arithmetic, no audio coupling. */
    const laneM = S.patterns[S.editPat].lanes[2];
    const keepM = { u: laneM.unit, c: laneM.count, a: laneM.auto }, keepCur = S.curPreset;
    S.curPreset = 2; laneM.unit = 's'; laneM.count = 7; laneM.auto = false;
    const walk = ['7'];
    K('keydown', 'Tab'); await sleep(40);
    KS('keydown', 'ShiftRight', { shiftKey: true });
    for (let k9 = 0; k9 < 4; k9++) {
      KS('keydown', 'ArrowRight', { shiftKey: true }); KS('keyup', 'ArrowRight', { shiftKey: true });
      await sleep(20); walk.push(String(laneM.len * 4));
    }
    K('keyup', 'ShiftRight'); K('keyup', 'Tab'); await sleep(80);
    laneM.unit = keepM.u; laneM.count = keepM.c; laneM.auto = keepM.a; S.curPreset = keepCur;
    rows.push({ k: 'unitsnap', s16walk: walk.join('→'), expect: '7→8→8→8→16 (16th→8th→beat→half→bar)' });
    /* unitpitch — on AUDIO the snap must never move the pitch: the
       fit-compensated rate is invariant through the walk (exact spd now;
       toFixed(2) compounded to −15 cents over one walk) */
    pin(ch); S.layer = 1;
    const pau2 = S.presets[ch].au; pau2.spd = 1; pau2.rate = 1; pau2.fit = 1;
    pau2.st = 0; pau2.en = 1; pau2.semis = 0;
    lane.unit = 's'; lane.count = 7; lane.auto = false;
    const theo9 = () => { const au9 = Object.assign({}, pau2); const W9 = audWin(au9);
      const D9 = engine.audBuf[ch].duration, dur9 = Math.max(1e-6, (W9.hi - W9.lo) * D9);
      return audRate(au9, dur9, lane.len * spb()); };
    const r0 = theo9(); let rDev = 0;
    K('keydown', 'Tab'); await sleep(40); KS('keydown', 'ShiftRight', { shiftKey: true });
    for (let k9 = 0; k9 < 4; k9++) {
      KS('keydown', 'ArrowRight', { shiftKey: true }); KS('keyup', 'ArrowRight', { shiftKey: true });
      await sleep(20); rDev = Math.max(rDev, Math.abs(theo9() / r0 - 1)); }
    K('keyup', 'ShiftRight'); K('keyup', 'Tab'); await sleep(80);
    lane.unit = 'B'; lane.count = 1; pau2.spd = 1; pau2.rate = 1;
    rows.push({ k: 'unitpitch', cents: r3(1200 * Math.log2(1 + rDev)),
                expect: '0 — the snap never moves the pitch' });
    /* (the session rows — monitor, device, sync, esc gestures, tab loop,
       latc, stereo, tempo, nearend, headtrim, clear — moved to micrec2:
       the browse CLI caps a command at 30s and the full suite outgrew it) */

  } finally {
    window.flash = flash0;
    md.getUserMedia = gum0; md.enumerateDevices = enu0;
    if (engine.audRec) engine.audRecStop(true);
    if (MIC.on) micOff(); MIC.stream = null; MIC.ring = null; MIC.devs = null;
    try { osc.stop(); } catch (_) {}
    CFG.micDb = keep.micDb; CFG.overdub = keep.overdub; CFG.micMon = keep.micMon; micMonWire();
    if (Number.isFinite(keep.micTrim)) CFG.micTrimMs = keep.micTrim; else delete CFG.micTrimMs;
    if (T.playing && !keep.playing) stop();
    if (keep.micDev) { CFG.micDev = keep.micDev; CFG.micDevL = keep.micDevL; } else { delete CFG.micDev; delete CFG.micDevL; }
    saveCfg();
    unstash(ch, keep.p);
    Object.assign(lane, keep.lane);
    engine.audBuf[ch] = keep.buf; engine.audName[ch] = keep.name;
    if (engine.granBuf) engine.granBuf[ch] = keep.gbuf;
    S.layer = keep.layer; try { setBpm(keep.bpm); } catch (_) {} dirty = true;
  }
  notes.push('flashes: ' + flashes.join(' | '));
  return { cols: ['rec', 'landed', 'peak', 'expect', 'onSec', 'heldSec', 'loopSec', 'firstAt', 'expAt', 'head', 'strokes',
                  'micAfter', 'rec2', 'keysSeen', 'ovdubOnSec', 'carBefore', 'busPlay', 'carDuring', 'busRec', 'carAfter',
                  'on', 'off', 'bus', 'at', 'step1', 'step2', 'listed', 'row',
                  'micDuring', 'db', 'mon', 'layer', 'latched',
                  'down', 'up', 'full', 'l', 'r', 'rfull', 'sameBuf', 'spd', 'semis', 'crop',
                  'onsets', 'E', 'Ems', 'spread', 'nowLATC', 'implied', 'trimMs', 'status', 'maxStep', 'nch', 'LtoR', 'bpm', 'lane', 'dur', 'fitRatio', 'playingAfterSeed', 'playDelayMs', 'seedHeadAt', 'punchAt', 'relPh', 'busBoundary', 'busNext', 'buf', 'auto', 'events', 'spanStartSec', 'press', 'release', 'span', 's16walk', 'cents', 'clampUp', 'clampFull',
                  'spanSec', 'bedSec', 'mixSec', 'ovdubMixSec', 'dev', 'paramLeak', 'curParam', 'busResume'], rows };
}

async function probeMicRec2() {
  const ch = CH, hold = num(P.hold, 900), db = num(P.db, -6);
  const rows = [];
  const md = navigator.mediaDevices;
  const gum0 = md.getUserMedia, enu0 = md.enumerateDevices;
  const lane = S.patterns[S.editPat].lanes[ch];
  const keep = { p: stash(ch), buf: engine.audBuf[ch], name: engine.audName[ch],
                 gbuf: (engine.granBuf || [])[ch],
                 lane: { unit: lane.unit, count: lane.count, auto: lane.auto, events: lane.events.slice() },
                 micDb: CFG.micDb, micDev: CFG.micDev, micDevL: CFG.micDevL,
                 overdub: CFG.overdub, micMon: CFG.micMon, micTrim: CFG.micTrimMs,
                 layer: S.layer, playing: T.playing, bpm: T.bpm };
  /* the fake mic mints a FRESH stream per call off one feed node: micSetDev
     stops the old stream's tracks, and a stopped singleton was a dead mic
     for every row after the device one (sync heard 0/4 that way) */
  const osc = AC.createOscillator(), og = AC.createGain(), feed = AC.createGain();
  osc.frequency.value = 440; og.gain.value = 0.3; feed.gain.value = 1;
  osc.connect(og); og.connect(feed); osc.start();
  md.getUserMedia = () => { const d9 = AC.createMediaStreamDestination(); feed.connect(d9); return Promise.resolve(d9.stream); };
  md.enumerateDevices = () => Promise.resolve([
    { kind: 'audioinput', deviceId: 'fakeA', label: 'Fake A (probe)' },
    { kind: 'audioinput', deviceId: 'fakeB', label: 'Fake B (probe)' }]);
  const KS = (t, c, o) => document.dispatchEvent(new KeyboardEvent(t, Object.assign({ code: c, key: c, bubbles: true, cancelable: true }, o || {})));
  const K = (t, c) => KS(t, c);
  const sr = AC.sampleRate;
  const fresh = () => {            // the stage must hear the FAKE, whatever it heard before
    if (engine.audRec) engine.audRecStop(true);
    if (MIC.on) micOff(); MIC.stream = null; MIC.ring = null; MIC.devs = null;
    pin(ch);
    if (!isAudioCh(ch)) setEngine(ch, 'audio');
    /* TAPE, not cloud: seedCloud fills any gran channel with no take the
       moment the factory pool lands — which is mid-hold right after a reload,
       and the take then overwrote INTO nylonlick (peak 0.64 for a 0.3 sine) */
    const pr = S.presets[ch]; pr.cat = 'audio'; pr.au = pr.au || {}; pr.au.cmode = 0; pr.au.kmode = 0; audDefaults(pr);
    pr.au.src = 0; CFG.micMon = 0; micMonWire(); CFG.overdub = 0;
    engine.audBuf[ch] = null; engine.audName[ch] = null;
    if (engine.granBuf) engine.granBuf[ch] = null;
    lane.unit = 'B'; lane.count = 1; lane.auto = false; lane.events = [];
    S.layer = 1; dirty = true;
  };
  const pkOf = x => { let pk = 0; for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > pk) pk = v; } return pk; };
  const onOf = x => { let n = 0, first = -1; for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > 0.01) { n++; if (first < 0) first = i; } return { n, first }; };
  const headY = () => { const l = document.querySelector('.wrec line'); return l ? +l.getAttribute('y1') : null; };
  const strokes = () => { const q = document.querySelector('.wrec path'); return q ? (q.getAttribute('d').match(/M/g) || []).length : 0; };
  const flashes = [];
  const flash0 = window.flash; window.flash = m => { flashes.push(String(m)); return flash0(m); };
  try {
    delete CFG.micDev; delete CFG.micDevL;
    setBpm(120);        // the rows quote seconds that assume it; scratch state had drifted to 287 once
    delete CFG.micTrimMs;   // rows that need a trim set their own
    for (let w = 0; w < 25 && !POOL.length; w++) await sleep(200);   // let the pool land before the first take
    /* helpers the first half defined inside its rows */
    const brms = async () => { const t9 = tap(busOf(ch)); await sleep(250); const [L9] = t9.stop();
      let s9 = 0; for (let i = 0; i < L9.length; i++) s9 += L9[i] * L9[i];
      return r3(Math.sqrt(s9 / Math.max(1, L9.length))); };
    const cls = d9 => { const win = 256; let span = 0, bed = 0, mix = 0;
      for (let a = 0; a + win <= d9.length; a += win) { let pk = 0;
        for (let i = a; i < a + win; i += 2) { const v = Math.abs(d9[i]); if (v > pk) pk = v; }
        if (pk > 0.33) mix++; else if (pk > 0.21) bed++; else if (pk > 0.08) span++; }
      return { span: r3(span * win / sr), bed: r3(bed * win / sr), mix: r3(mix * win / sr) }; };
    const cl = Math.max(256, Math.round(lane.len * spb() * sr));

    /* monitor — one switch, heard through the focused audio channel's STRIP:
       the bus carries it and the master hears it downstream. This half of
       the suite starts cold: raise the stage first. */
    fresh(); if (!MIC.on) await micOn(); MIC.latched = true; await sleep(250);
    const nrms = async nd => { const t9 = tap(nd); await sleep(300); const [L9] = t9.stop();
      let s9 = 0; for (let i = 0; i < L9.length; i++) s9 += L9[i] * L9[i];
      return r3(Math.sqrt(s9 / Math.max(1, L9.length))); };
    CFG.micMon = 1; micMonWire();
    const mBus = await nrms(busOf(ch)), mOn = await nrms(engine.master);
    CFG.micMon = 0; micMonWire(); const mOff = await nrms(engine.master);
    rows.push({ k: 'monitor', bus: mBus, on: mOn, off: mOff, at: 'ch' + (MIC._monAt ?? '?'),
                expect: 'bus>0 · master>0 · ~0 · ch9' });
    /* device — the row steps the list and the stage follows */
    await micStepDev(1); const dv1 = CFG.micDevL + '/' + (MIC.on ? 'on' : 'off');
    await micStepDev(1); const dv2 = CFG.micDevL + '/' + (MIC.on ? 'on' : 'off');
    rows.push({ k: 'device', step1: dv1, step2: dv2, listed: (MIC.devs || []).length, row: micDevName() });
    /* sync — his click test as a button: the master wired into the fake mic,
       micCalibrate plays 4 clicks and measures the chain; the loopback's own
       buffering is all there is here, so the stored trim should be small */
    if (MIC.on) micOff(); MIC.stream = null; MIC.ring = null; MIC.devs = null;
    delete CFG.micTrimMs;
    og.gain.value = 0; try { engine.master.connect(feed); } catch (_) {}
    const st9 = await micCalibrate();
    const trim1 = Number.isFinite(CFG.micTrimMs) ? CFG.micTrimMs : 'none';
    try { engine.master.disconnect(feed); } catch (_) {}
    og.gain.value = 0.3; delete CFG.micTrimMs;
    rows.push({ k: 'sync', trimMs: trim1, status: st9, expect: 'ok, 0..40ms' });
    /* escmic — the dials ride the mic key: esc held past 200ms, -/= is the
       gain (⇧ coarse), ; the monitor. None of it counts as chord-use, none
       of it escapes, and the momentary release still closes the mic. */
    if (MIC.on) micOff(); MIC.latched = false;
    CFG.micDb = 0; CFG.micMon = 0; const lay0 = S.layer;
    K('keydown', 'Escape'); await sleep(280);
    const escMicOn = MIC.on;
    K('keydown', 'Minus'); K('keyup', 'Minus'); K('keydown', 'Minus'); K('keyup', 'Minus');
    KS('keydown', 'Equal', { shiftKey: true }); KS('keyup', 'Equal', { shiftKey: true });
    K('keydown', 'Semicolon'); K('keyup', 'Semicolon');
    await sleep(60);
    K('keyup', 'Escape'); await sleep(120);
    rows.push({ k: 'escmic', micDuring: escMicOn ? 'on' : 'off', db: CFG.micDb, mon: CFG.micMon,
                expect: 'db -1-1+6=+4 · mon 1', layer: lay0 + '→' + S.layer,
                micAfter: MIC.on ? 'on' : 'off', latched: MIC.latched });
    CFG.micMon = 0; micMonWire();
    /* micscope — the held mic owns the arrows: ↑↓ gain, ←→ device, and NO
       page param, cursor or layer moves underneath them */
    if (MIC.on) micOff(); MIC.latched = false; CFG.micDb = 0;
    pin(ch); S.layer = 2; S.curParam = 0; dirty = true; await sleep(80);
    const snap0 = JSON.stringify(S.presets[ch]); const cp0 = S.curParam, dev0 = CFG.micDevL || 'unset';
    K('keydown', 'Escape'); await sleep(280);
    K('keydown', 'ArrowUp'); K('keyup', 'ArrowUp');
    KS('keydown', 'ArrowDown', { shiftKey: true }); KS('keyup', 'ArrowDown', { shiftKey: true });
    K('keydown', 'ArrowRight'); K('keyup', 'ArrowRight');
    await sleep(150);
    K('keyup', 'Escape'); await sleep(120);
    rows.push({ k: 'micscope', db: CFG.micDb, expect: '+1-6=-5', dev: dev0 + '→' + (CFG.micDevL || 'unset'),
                paramLeak: JSON.stringify(S.presets[ch]) === snap0 ? 'none' : 'MOVED',
                curParam: cp0 + '→' + S.curParam, layer: S.layer, micAfter: MIC.on ? 'on' : 'off' });
    S.layer = 1;
    /* tabloop — tab+↑↓ is SAMPLE LENGTH: crop and lane scale together so
       the rate cannot move, the speed dial is never written, the full take
       refuses to grow, and no take lands from a modifier-spent hold.
       The gesture needs a take on the channel — lay a bed first. */
    fresh(); if (!MIC.on) await micOn(); MIC.latched = true;
    await sleep(lane.len * spb() * 1000 + 300);
    audPlace(ch, micGrab(lane.len * spb()), gridNow() - lane.len, 'mic');
    lane.unit = 'B'; lane.count = 1; lane.auto = false;
    const pau = S.presets[ch].au; pau.spd = 1; pau.rate = 1; pau.en = 1; pau.st = 0; pau.fit = 1;
    const bufRef = engine.audBuf[ch];
    const tl = async c9 => { K('keydown', 'Tab'); await sleep(60); K('keydown', c9); await sleep(30);
      K('keyup', c9); await sleep(30); K('keyup', 'Tab'); await sleep(150);
      return lane.count + '/' + (pau.en ?? 1) + '/' + (pau.spd ?? 1); };
    const dn = await tl('ArrowDown');
    const up = await tl('ArrowUp');
    const full = await tl('ArrowUp');
    /* ←→ steps one UNIT: on a 4-beat lane, ← is 3 beats of material, → back */
    lane.unit = 'b'; lane.count = 4; pau.en = 1;
    const lft = await tl('ArrowLeft');
    const rgt = await tl('ArrowRight');
    const rfull = await tl('ArrowRight');
    /* the step OVER the top pins at 100%: 3 beats of a 4-beat take (75%),
       doubled, lands at 4×b en 1 — not a refuse; the next ↑ refuses */
    lane.unit = 'b'; lane.count = 3; pau.en = 0.75;
    const cUp = await tl('ArrowUp');
    const cFull = await tl('ArrowUp');
    rows.push({ k: 'tabloop', down: dn, up, full, l: lft, r: rgt, rfull, clampUp: cUp, clampFull: cFull,
                sameBuf: engine.audBuf[ch] === bufRef,
                expect: 'dn .5/.5/1 up 1/1/1 full 1/1/1 · l 3/.75/1 r 4/1/1 rfull 4/1/1 · clamp 4/1/1 then refuse · true' });
    /* latc — his calibration: blips at known clock times into the take path
       (src=mstr, no MediaStream in the chain). Where they LAND vs the beat
       grid = the placement error E; the correct AUDLATC is the current one
       PLUS the median E. UNDER A PLAYING TRANSPORT, and the row starts it
       itself: a STOPPED take anchors its first sound at 0 by design (round
       12 from0 + the head trim), which erases absolute timing — the row used
       to inherit `playing` from its neighbours and read garbage the day the
       neighbourhood changed. The desk is muted so the blips are the only
       onsets the detector can see. */
    fresh(); S.presets[ch].au.src = 1;
    lane.unit = 'B'; lane.count = 2; lane.auto = false;
    const mut9 = muteOthers([ch]);
    play(); await sleep(300);
    const tCall = AC.currentTime;
    engine.audRecStart(ch);
    const sb9 = engine.audRec.startBeat, anc9 = editAnchor(), Lb9 = lane.len;
    const cl9 = Math.max(256, Math.round(Lb9 * spb() * sr));
    const t0 = tCall + 0.35;
    const bg = AC.createGain(); bg.gain.value = 0.5; bg.connect(engine.mSum);   // the tap moved pre-master-fx: feed what it records
    for (let k = 0; k < 6; k++) { const o9 = AC.createOscillator(); o9.frequency.value = 1000;
      o9.connect(bg); o9.start(t0 + k * 0.5); o9.stop(t0 + k * 0.5 + 0.03); }
    await sleep(3600);
    engine.audRecStop(); await sleep(250); try { bg.disconnect(); } catch (_) {}
    stop();
    muteRestore(mut9);
    const dbf = engine.audBuf[ch].getChannelData(0);
    const on9 = [];
    for (let i = 1; i < dbf.length; i++) if (Math.abs(dbf[i]) > 0.1 && Math.abs(dbf[i - 1]) <= 0.1) { on9.push(i); i += 4000; }
    const errs = [];
    for (let k = 0; k < 6; k++) {
      const target = ((Math.round(fmod(sb9 - anc9, Lb9) * spb() * sr + (t0 - tCall + k * 0.5) * sr) % cl9) + cl9) % cl9;
      let best = null;
      for (const o of on9) { let d9 = o - target;
        if (d9 > cl9 / 2) d9 -= cl9; if (d9 < -cl9 / 2) d9 += cl9;
        if (best === null || Math.abs(d9) < Math.abs(best)) best = d9; }
      if (best !== null) errs.push(best);
    }
    errs.sort((a, b) => a - b);
    const Emed = errs.length ? errs[Math.floor(errs.length / 2)] : null;
    rows.push({ k: 'latc', onsets: on9.length, E: Emed, Ems: Emed === null ? null : r3(Emed / sr * 1000),
                spread: errs.length ? (errs[errs.length - 1] - errs[0]) : null,
                nowLATC: AUDLATC, implied: Emed === null ? null : AUDLATC + Emed,
                expect: 'after calibration E ~0' });
    /* stereo — input=mstr records BOTH master channels: a hard-left blip
       lands left-only in a 2ch take */
    fresh(); S.presets[ch].au.src = 1;
    lane.unit = 'B'; lane.count = 1; lane.auto = false;
    engine.audRecStart(ch);
    const po = AC.createOscillator(); po.frequency.value = 660;
    const pg = AC.createGain(); pg.gain.value = 0.4;
    const pan9 = AC.createStereoPanner(); pan9.pan.value = -1;
    po.connect(pg); pg.connect(pan9); pan9.connect(engine.mSum);   // same: the mstr tap records mSum now
    po.start(); await sleep(600); po.stop(); await sleep(120);
    engine.audRecStop(); await sleep(200);
    try { pg.disconnect(); pan9.disconnect(); } catch (_) {}
    const sb2 = engine.audBuf[ch];
    let eL = 0, eR = 0;
    if (sb2 && sb2.numberOfChannels > 1) { const l9 = sb2.getChannelData(0), r9 = sb2.getChannelData(1);
      for (let i = 0; i < l9.length; i += 3) { eL += l9[i] * l9[i]; eR += r9[i] * r9[i]; } }
    rows.push({ k: 'stereo', nch: sb2 ? sb2.numberOfChannels : 0,
                LtoR: eR > 1e-9 ? r3(eL / eR) : (eL > 1e-9 ? 'inf' : '0'), expect: '2ch · L≫R' });
    /* tempo — a mic take into stopped silence sets the clock: ~1.75s of
       signal reads as one bar in the 80-170 window, lands at 0, fills the
       loop exactly */
    fresh(); og.gain.value = 0; CFG.micDb = 0; micGainApply();   // micscope leaves the dial at -5
    K('keydown', 'Escape'); await sleep(30); K('keydown', 'Tab'); await sleep(60);
    og.gain.value = 0.3; await sleep(300); og.gain.value = 0.12; await sleep(1500);
    K('keyup', 'Tab'); K('keyup', 'Escape'); og.gain.value = 0;
    let playDelayMs = 0; while (!T.playing && playDelayMs < 600) { await sleep(10); playDelayMs += 10; }
    await sleep(300);
    const tb9 = engine.audBuf[ch];
    const playingAfterSeed = T.playing;                 // the seed starts the transport itself
    /* …and a PLAYING punch must leave the seed's head where it was (his
       'messed up position' was a STOPPED punch replacing the head at 0) */
    await sleep(0.4 * lane.len * spb() * 1000);
    K('keydown', 'Escape'); await sleep(30); K('keydown', 'Tab'); await sleep(40);
    og.gain.value = 0.19; await sleep(400);
    K('keyup', 'Tab'); K('keyup', 'Escape'); og.gain.value = 0; await sleep(300);
    let mAt = -1, pAt = -1; { const d9 = engine.audBuf[ch].getChannelData(0), win = 256;
      for (let a = 0; a + win <= d9.length; a += win) { let pk = 0;
        for (let i = a; i < a + win; i += 2) { const v = Math.abs(d9[i]); if (v > pk) pk = v; }
        if (mAt < 0 && pk > 0.25) mAt = a; if (pAt < 0 && pk > 0.16 && pk <= 0.25) pAt = a; } }
    stop(); await sleep(150);
    rows.push({ k: 'tempo', bpm: r3(T.bpm), lane: lane.count + '×' + lane.unit,
                dur: tb9 ? r3(tb9.duration) : null,
                fitRatio: tb9 ? r3(tb9.duration / (lane.len * spb())) : null,
                playingAfterSeed, playDelayMs, seedHeadAt: mAt < 0 ? null : r3(mAt / sr), punchAt: pAt < 0 ? null : r3(pAt / sr),
                expect: 'bpm 125-145 · fit 1.0 · playing ≤30ms after release · head ~0 after the punch' });
    setBpm(120);
    /* nearend — releasing a take just before the bar must not eat the next
       loop: the boundary the mute consumed is re-posted (round 11) */
    fresh(); CFG.overdub = 0;
    og.gain.value = 0.3; osc.frequency.value = 440; CFG.micDb = 0; micGainApply();   // the tempo row mutes the feed
    await micOn(); MIC.latched = true; await sleep(lane.len * spb() * 1000 + 300);
    audPlace(ch, micGrab(lane.len * spb()), gridNow() - lane.len, 'mic');
    play(); await sleep(1200);
    const relAt = () => fmod(posNow() - actAt(posNow()).anchor, lane.len);
    engine.audRecStart(ch); await sleep(250);
    let g9 = 0; while (relAt() < lane.len - 0.14 && g9++ < 500) await sleep(10);
    engine.audRecStop();
    const relPh = r3(relAt());
    await sleep(150); const busB = await brms();
    await sleep(1200); const busN = await brms();
    const carN = !!(engine.audCar || [])[ch];
    stop(); await sleep(150);
    rows.push({ k: 'nearend', relPh, busBoundary: busB, busNext: busN, carAfter: carN,
                expect: 'both >0 (was: a silent loop)' });
    /* headtrim — silence between the press and the first sound must not
       punch a hole in the bed: the head is trimmed, the start beat moves */
    fresh(); CFG.overdub = 0; CFG.micDb = 0; micGainApply();
    if (!MIC.on) await micOn(); MIC.latched = true;
    osc.frequency.value = 440; og.gain.value = 0.3; await sleep(lane.len * spb() * 1000 + 300);
    audPlace(ch, micGrab(lane.len * spb()), gridNow() - lane.len, 'mic');
    osc.frequency.value = 523; CFG.micDb = -6; micGainApply(); og.gain.value = 0;
    K('keydown', 'Tab'); await sleep(400);
    og.gain.value = 0.3; await sleep(500);
    K('keyup', 'Tab'); await sleep(250);
    og.gain.value = 0.3; osc.frequency.value = 440; CFG.micDb = 0; micGainApply();
    const ht = cls(engine.audBuf[ch].getChannelData(0));
    rows.push({ k: 'headtrim', spanSec: ht.span, bedSec: ht.bed, mixSec: ht.mix,
                expect: 'span ~0.5 (tone only) · bed ~1.45 · no hole' });
    /* slices — rhythm is the default: a 1-bar take splits in 16 16ths, two
       bars in 16 8ths; the toggle brings the transient detector back */
    {const p9s = S.presets[ch]; p9s.au.cut = 0;
     lane.unit = 'B'; lane.count = 1; lane.auto = false;
     const n1 = (engine.audCuts(ch) || []).length;
     lane.count = 2;
     const n2 = (engine.audCuts(ch) || []).length;
     p9s.au.cut = 1; const nT = (engine.audCuts(ch) || []).length;
     p9s.au.cut = 0; lane.count = 1;
     rows.push({ k: 'slices', bar1: n1, bar2: n2, transient: nT,
                 expect: '16 · 16 (8ths) · detector ≥1' });}
    /* clear — rshift+⌫ is TWO-STAGE on audio: keys first, the sample only
       when the lane is already empty */
    pin(ch); S.layer = 1;
    HOLD.dig = -1; HOLD.tab = false;      // a stray trusted digit once left dig stuck and re-routed the key
    lane.events = [{ t: 0, cue: 0, vel: 0.9, dur: 0.25 }];
    const zap = async () => { HOLD.dig = -1; KS('keydown', 'ShiftRight', { shiftKey: true });
      KS('keydown', 'Backspace', { shiftKey: true }); await sleep(60);
      KS('keyup', 'Backspace', { shiftKey: true }); K('keyup', 'ShiftRight'); await sleep(120); };
    await zap();
    const st1 = { ev: lane.events.length, buf: !!engine.audBuf[ch] };
    await zap();
    rows.push({ k: 'clear', stage1: st1.ev + '/' + st1.buf, buf: !!engine.audBuf[ch], auto: lane.auto,
                expect: 'stage1 0/true (keys gone, take kept) · then buf false · auto true' });
  } finally {
    window.flash = flash0;
    md.getUserMedia = gum0; md.enumerateDevices = enu0;
    if (engine.audRec) engine.audRecStop(true);
    if (MIC.on) micOff(); MIC.stream = null; MIC.ring = null; MIC.devs = null;
    try { osc.stop(); } catch (_) {}
    CFG.micDb = keep.micDb; CFG.overdub = keep.overdub; CFG.micMon = keep.micMon; micMonWire();
    if (Number.isFinite(keep.micTrim)) CFG.micTrimMs = keep.micTrim; else delete CFG.micTrimMs;
    if (T.playing && !keep.playing) stop();
    if (keep.micDev) { CFG.micDev = keep.micDev; CFG.micDevL = keep.micDevL; } else { delete CFG.micDev; delete CFG.micDevL; }
    saveCfg();
    unstash(ch, keep.p);
    Object.assign(lane, keep.lane);
    engine.audBuf[ch] = keep.buf; engine.audName[ch] = keep.name;
    if (engine.granBuf) engine.granBuf[ch] = keep.gbuf;
    S.layer = keep.layer; try { setBpm(keep.bpm); } catch (_) {} dirty = true;
  }
  notes.push('flashes: ' + flashes.join(' | '));
  return { cols: ['rec', 'landed', 'peak', 'expect', 'onSec', 'heldSec', 'loopSec', 'firstAt', 'expAt', 'head', 'strokes',
                  'micAfter', 'rec2', 'keysSeen', 'ovdubOnSec', 'carBefore', 'busPlay', 'carDuring', 'busRec', 'carAfter',
                  'on', 'off', 'bus', 'at', 'step1', 'step2', 'listed', 'row',
                  'micDuring', 'db', 'mon', 'layer', 'latched',
                  'down', 'up', 'full', 'l', 'r', 'rfull', 'sameBuf', 'spd', 'semis', 'crop',
                  'onsets', 'E', 'Ems', 'spread', 'nowLATC', 'implied', 'trimMs', 'status', 'maxStep', 'nch', 'LtoR', 'bpm', 'lane', 'dur', 'fitRatio', 'playingAfterSeed', 'playDelayMs', 'seedHeadAt', 'punchAt', 'relPh', 'busBoundary', 'busNext', 'buf', 'auto', 'events', 'spanStartSec', 'press', 'release', 'span', 's16walk', 'cents', 'clampUp', 'clampFull',
                  'spanSec', 'bedSec', 'mixSec', 'ovdubMixSec', 'dev', 'paramLeak', 'curParam', 'busResume'], rows };
}

/* GRAIN PITCH + FILTER Q (2026-08-24): the two bug fixes of the bugfixes
   branch, held as regressions. lpq reads the lowpass response AT the cutoff
   across the reso dial — under 1 the dial maps below 0dB now (LP/HP Q is in
   dB per WebAudio; 0.1..1 used to be one indistinguishable decibel).
   grainpitch dials the channel pitch in GRAIN mode through the real door
   (applyAudParam) and expects the sounding cloud to follow — the write used
   to land in gr.semis with nothing pushing the worklet. */
async function probeGrainFlt() {
  const ch = CH, sr = AC.sampleRate, rows = [];
  const qFor = (ty9, q9) => ((ty9 === 'lowpass' || ty9 === 'highpass') && q9 < 1) ? (q9 - 1) * 12 : q9;
  const resp = q => { const bq = AC.createBiquadFilter(); bq.type = 'lowpass'; bq.frequency.value = 1000;
    bq.Q.value = qFor('lowpass', q);
    const F = new Float32Array([1000]), M = new Float32Array(1), P = new Float32Array(1);
    bq.getFrequencyResponse(F, M, P); return +(20 * Math.log10(M[0])).toFixed(1); };
  rows.push({ k: 'lpq', q01: resp(0.1), q05: resp(0.5), q1: resp(1), q4: resp(4),
              expect: '≈ −10.8 · −6 · +1 · +4 dB at fc — the bottom of the dial is real now' });
  const md = navigator.mediaDevices, gum0 = md.getUserMedia;
  const feed = AC.createGain(); feed.gain.value = 1;
  const o0 = AC.createOscillator(), og = AC.createGain(); o0.frequency.value = 440; og.gain.value = 0.3;
  o0.connect(og); og.connect(feed); o0.start();
  md.getUserMedia = () => { const d9 = AC.createMediaStreamDestination(); feed.connect(d9); return Promise.resolve(d9.stream); };
  const lane = S.patterns[S.editPat].lanes[ch];
  const keep = { p: stash(ch), buf: engine.audBuf[ch], name: engine.audName[ch],
                 gbuf: (engine.granBuf || [])[ch],
                 lane: { unit: lane.unit, count: lane.count, auto: lane.auto, events: lane.events.slice() },
                 bpm: T.bpm, playing: T.playing };
  try {
    setBpm(120); if (T.playing) stop();
    if (engine.audRec) engine.audRecStop(true); if (MIC.on) micOff(); MIC.stream = null; MIC.ring = null;
    pin(ch); if (!isAudioCh(ch)) setEngine(ch, 'audio');
    const pr = S.presets[ch]; pr.cat = 'audio'; pr.au = pr.au || {}; pr.au.cmode = 0; pr.au.kmode = 0;
    audDefaults(pr); pr.au.src = 0; CFG.overdub = 0; delete CFG.micTrimMs; CFG.micDb = 0; S.layer = 1;
    engine.audBuf[ch] = null; if (engine.granBuf) engine.granBuf[ch] = null;
    lane.unit = 'B'; lane.count = 1; lane.auto = false; lane.events = [];
    await micOn(); MIC.latched = true; await sleep(2300);
    audPlace(ch, micGrab(lane.len * spb()), gridNow() - lane.len, 'mic', 0);
    pr.au.spd = 1; pr.au.rate = 1; pr.au.st = 0; pr.au.en = 1; pr.au.semis = 0;
    pr.au.cmode = 2; applyCmode(ch); pr.gr.semis = 0; engine.granCfg(ch);
    const freq = async () => { const nd = busOf(ch);
      const sp = AC.createScriptProcessor(4096, 2, 2), L = [];
      sp.onaudioprocess = e => L.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      const sk = AC.createGain(); sk.gain.value = 0; nd.connect(sp); sp.connect(sk); sk.connect(AC.destination);
      await sleep(500); try { nd.disconnect(sp); sp.disconnect(); sk.disconnect(); } catch (_) {}
      const n = L.reduce((a, c) => a + c.length, 0), d = new Float32Array(n); let q = 0; for (const c of L) { d.set(c, q); q += c.length; }
      let z = 0, first = -1, last = -1;
      for (let i = 1; i < d.length; i++) if (d[i - 1] <= 0 && d[i] > 0) { z++; if (first < 0) first = i; last = i; }
      return z > 2 ? +(((z - 1) / ((last - first) / sr))).toFixed(1) : 0; };
    play(); await sleep(1000);
    const base9 = await freq();
    /* THE REAL DOOR: the sound page's pitch row, dialed with arrow keys —
       the first fix sat on applyAudParam (automation) while the keys come
       through audAction, which is where it did not work for him */
    const KS9 = (t9, c9) => document.dispatchEvent(new KeyboardEvent(t9, { code: c9, key: c9, bubbles: true, cancelable: true }));
    S.layer = 2; S.mSel = false;
    S.curMod = MODULES.findIndex(m9 => m9.id === 'osc');   // the audio page rides the OSC module
    S.curParam = AUDPAGE().findIndex(s9 => s9.key === 'semis');   // the PAGE array, not AUDALL — the cursor indexes the filtered list
    for (let k9 = 0; k9 < 12; k9++) { KS9('keydown', 'ArrowUp'); KS9('keyup', 'ArrowUp'); await sleep(12); }
    await sleep(380);
    const up9 = await freq(); const reads9 = pr.gr.semis;
    const spec9 = AUDALL().find(s9 => s9.key === 'semis');
    applyAudParam(ch, 'aud', spec9, 0); await sleep(250);   // …and the automation door still lands it back
    const back9 = await freq();
    S.layer = 1; stop(); await sleep(120);
    rows.push({ k: 'grainpitch', base: base9, plus12: up9, back: back9, dial: reads9,
                expect: '≈440 · ≈880 · ≈440 · gr.semis 12 — keys AND automation doors both reach the cloud' });
  } finally {
    md.getUserMedia = gum0; try { o0.stop(); } catch (_) {}
    if (engine.audRec) engine.audRecStop(true);
    if (MIC.on) micOff(); MIC.stream = null; MIC.ring = null; MIC.devs = null;
    if (T.playing && !keep.playing) stop();
    unstash(ch, keep.p);
    Object.assign(lane, keep.lane);
    engine.audBuf[ch] = keep.buf; engine.audName[ch] = keep.name;
    if (engine.granBuf) engine.granBuf[ch] = keep.gbuf;
    try { setBpm(keep.bpm); } catch (_) {}
    dirty = true;
  }
  return { cols: ['q01', 'q05', 'q1', 'q4', 'base', 'plus12', 'back', 'dial'], rows };
}

/* setio — the set FILE: a recorded take travels embedded (within the sample
   budget), the no-audio quota fallback degrades it to a named hole, stamps
   are local wall-clock, and exportSet writes through the save picker
   (stubbed here — no dialogs in a probe). */
async function probeSetIO() {
  const ch = CH, sr = AC.sampleRate, rows = [];
  const keep = { buf: engine.audBuf[ch], gbuf: (engine.granBuf || [])[ch],
                 name: engine.audName[ch], p: stash(ch) };
  try {
    pin(ch); if (!isAudioCh(ch)) setEngine(ch, 'audio');
    if (T.playing) stop();
    /* a synthetic stereo take: 0.5s, 440 left / 660 right */
    const n = Math.round(0.5 * sr), buf = AC.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c), f = c ? 660 : 440;
      for (let i = 0; i < n; i++) d[i] = 0.4 * Math.sin(2 * Math.PI * f * i / sr); }
    poolAdd(buf, 'probe-take', { k: 'r' });
    engine.granNode(ch); engine.setChanBuf(ch, buf, 'probe-take');
    const s1 = serialize(), o1 = JSON.parse(s1), ref = o1.aud[ch];
    const rms = d => { let a = 0, m = 0; for (let i = 0; i < d.length; i += 7) { a += d[i] * d[i]; m++; } return Math.sqrt(a / m); };
    engine.audBuf[ch] = null; if (engine.granBuf) engine.granBuf[ch] = null;
    restoreAudio(o1.aud);
    const back = engine.audBuf[ch] || (engine.granBuf || [])[ch];
    const dL = back && back.getChannelData(0);
    const dR = back && back.numberOfChannels > 1 ? back.getChannelData(1) : null;
    rows.push({ k: 'embed', hasD: ref && ref.emb && ref.emb.d ? 'yes' : 'NO',
                kb: ref && ref.emb ? Math.round(ref.emb.d.length / 1024) : 0,
                lenBack: back ? back.length : 0, lenWant: n,
                nameBack: engine.audName[ch],
                rmsL: dL ? r3(rms(dL)) : null, rmsR: dR ? r3(rms(dR)) : null,
                expect: 'yes; len equal; name probe-take; rms ~0.283 both sides' });
    const o2 = JSON.parse(serialize(true));
    rows.push({ k: 'noaudio', hasD: o2.aud[ch] && o2.aud[ch].emb ? 'LEAKED' : 'no',
                n: o2.aud[ch] && o2.aud[ch].n,
                bytesFull: s1.length, bytesBare: JSON.stringify(o2).length,
                expect: 'no; named; full >> bare' });
    const st = stampNow(), d0 = new Date(), p2 = x9 => String(x9).padStart(2, '0');
    rows.push({ k: 'stamp', stamp: st, localClock: p2(d0.getHours()) + ':' + p2(d0.getMinutes()),
                match: st.slice(11, 13) === p2(d0.getHours()) ? 'local' : 'NOT LOCAL',
                expect: 'stamp hour = wall clock (UTC was the bug)' });
    /* exportSet through a stubbed picker: bytes written, no anchor fallback,
       and esc in the dialog must cancel — not fall back to a silent anchor */
    const sp0 = window.showSaveFilePicker, dl0 = window.dl;
    let wrote = null, fellBack = null;
    window.dl = (b9, nm) => { fellBack = nm; };
    window.showSaveFilePicker = () => Promise.resolve({ name: 'stub.json',
      createWritable: () => Promise.resolve({
        write: b9 => { wrote = b9.size; return Promise.resolve(); },
        close: () => Promise.resolve() }) });
    await exportSet();
    const wrote1 = wrote, fb1 = fellBack;
    window.showSaveFilePicker = () => Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' }));
    fellBack = null; await exportSet();
    window.showSaveFilePicker = sp0; window.dl = dl0;
    rows.push({ k: 'export', pickerBytes: wrote1, fallback: fb1 || 'none',
                cancelFellBack: fellBack || 'no',
                expect: 'bytes ~ set size; none; no' });
  } finally {
    engine.audBuf[ch] = keep.buf; if (engine.granBuf) engine.granBuf[ch] = keep.gbuf;
    engine.audName[ch] = keep.name; unstash(ch, keep.p);
  }
  return { cols: ['k', 'hasD', 'kb', 'lenBack', 'lenWant', 'nameBack', 'rmsL', 'rmsR', 'n', 'bytesFull',
                  'bytesBare', 'stamp', 'localClock', 'match', 'pickerBytes', 'fallback',
                  'cancelFellBack', 'expect'], rows };
}

/* audclip — the two 2026-08-25 asks: the audio pitch dial spans 3 octaves
   (±36, was ±24) in every cmode, and c/x/v carries an audio channel WITH its
   take (same-session buffer refs on the clipboard). */
async function probeAudClip() {
  const ch = CH, sr = AC.sampleRate, rows = [];
  const dst = ch === 9 ? 8 : 9;
  const keep = { p: stash(ch), pd: stash(dst),
    buf: engine.audBuf[ch], gbuf: (engine.granBuf || [])[ch], name: engine.audName[ch],
    bufD: engine.audBuf[dst], gbufD: (engine.granBuf || [])[dst], nameD: engine.audName[dst],
    laneJ: S.patterns[S.editPat].lanes[ch].toJSON(),
    laneD: S.patterns[S.editPat].lanes[dst].toJSON(),
    clip: typeof CLIP !== 'undefined' ? CLIP : null };
  try {
    if (T.playing) stop();
    pin(ch); if (!isAudioCh(ch)) setEngine(ch, 'audio');
    const pr = S.presets[ch]; pr.cat = 'audio'; audDefaults(pr);
    pr.au.cmode = 0; pr.au.kmode = 0; pr.au.auto = 1; pr.au.src = 0;
    const lane = S.patterns[S.editPat].lanes[ch];
    lane.unit = 'B'; lane.count = 1; lane.auto = false; lane.events = [];
    setBpm(120);
    /* a 440 tone take, landed clean */
    const n = Math.round(lane.len * spb() * sr), buf = AC.createBuffer(1, n, sr);
    { const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = 0.45 * Math.sin(2 * Math.PI * 440 * i / sr); }
    engine.granNode(ch); engine.setChanBuf(ch, buf, 'clip-tone');
    pr.au.spd = 1; pr.au.rate = 1; pr.au.st = 0; pr.au.en = 1; pr.au.semis = 0;
    /* the pitch dial spec straight off the page — its set() is what clamps */
    const pitchSpec = () => AUDPAGE().find(x9 => x9.key === 'semis');
    const hzOf = async () => { const an = AC.createAnalyser(); an.fftSize = 2048;
      engine.buses[ch].pan.connect(an); await sleep(420);
      const td = new Float32Array(2048); let best = 0, hz = 0;
      for (let r9 = 0; r9 < 4; r9++) { an.getFloatTimeDomainData(td);
        let c9 = 0, pk = 0;
        for (let i = 1; i < 2048; i++) { if ((td[i] >= 0) !== (td[i - 1] >= 0)) c9++;
          const v = Math.abs(td[i]); if (v > pk) pk = v; }
        if (pk > best) { best = pk; hz = c9 * sr / (2 * 2048); } await sleep(60); }
      try { engine.buses[ch].pan.disconnect(an); } catch (_) { }
      return { hz: Math.round(hz), pk: +best.toFixed(3) }; };
    for (const cm of [0, 1, 2]) {
      pr.au.cmode = cm; applyCmode(ch); await sleep(150);
      const sp9 = pitchSpec(); if (!sp9) { rows.push({ k: 'cmode' + cm, err: 'no pitch spec' }); continue; }
      const r9 = { k: 'cmode' + cm };
      for (const v of [36, -36, 0]) {
        sp9.set(pr.au, v); engine.audLive(ch); if (cm === 2) engine.granCfg(ch);
        play(); const m9 = await hzOf(); stop(); await sleep(120);
        if (v === 36) { r9.up36 = m9.hz; r9.upPk = m9.pk; }
        else if (v === -36) { r9.dn36 = m9.hz; } else { r9.back0 = m9.hz; }
      }
      r9.dial = Math.round(sp9.get(pr.au));
      rows.push(Object.assign(r9, { expect: 'up ~3520 · dn ~55 · back ~440' }));
    }
    /* ---- the clipboard: copy ch → paste dst carries the take by ref ---- */
    pr.au.cmode = 0; applyCmode(ch);
    lane.events = [{ t: 0, cue: 3, dur: 0.4, born: 1 }, { t: 2, cue: 5, dur: 0.3, born: 2 }];
    S.curPreset = S.editSnd = ch; if (typeof CHSEL !== 'undefined') CHSEL.clear && CHSEL.clear();
    clipboardOp('copy');
    S.curPreset = S.editSnd = dst;
    clipboardOp('paste');
    const laneD = S.patterns[S.editPat].lanes[dst];
    rows.push({ k: 'copypaste',
      sameBuf: (engine.audBuf[dst] || (engine.granBuf || [])[dst]) === buf,
      name: engine.audName[dst], cat: S.presets[dst].cat,
      events: laneD.events.length, cue0: laneD.events[0] && laneD.events[0].cue,
      expect: 'sameBuf true · clip-tone · audio · 2 events · cue 3' });
    /* cut: lane leaves, the sound stays (the house cut rule) */
    S.curPreset = S.editSnd = ch;
    clipboardOp('cut');
    rows.push({ k: 'cut', laneAfter: lane.events.length,
      bufStays: !!(engine.audBuf[ch] || (engine.granBuf || [])[ch]),
      clipHasAud: !!(CLIP && CLIP.aud && (CLIP.aud.buf || CLIP.aud.gbuf)),
      expect: '0 · true · true' });
  } finally {
    engine.audBuf[ch] = keep.buf; if (engine.granBuf) engine.granBuf[ch] = keep.gbuf;
    engine.audName[ch] = keep.name;
    engine.audBuf[dst] = keep.bufD; if (engine.granBuf) engine.granBuf[dst] = keep.gbufD;
    engine.audName[dst] = keep.nameD;
    S.patterns[S.editPat].lanes[ch] = Looper.from(keep.laneJ);
    S.patterns[S.editPat].lanes[dst] = Looper.from(keep.laneD);
    unstash(ch, keep.p); unstash(dst, keep.pd);
    if (typeof CLIP !== 'undefined') CLIP = keep.clip;
    if (T.playing) stop();
  }
  return { cols: ['k', 'up36', 'dn36', 'back0', 'dial', 'upPk', 'sameBuf', 'name', 'cat',
                  'events', 'cue0', 'laneAfter', 'bufStays', 'clipHasAud', 'err', 'expect'], rows };
}

/* resamp — 2026-08-26: "master resampling records PRE master effects, and the
   resampled channel sounds exactly like the live sound from the channels."
   The mstr tap moved this.master → mSum (pre master rack, pre dj, pre fader)
   and audPlace lands a mstr take with the replay chain at unity. Live and
   replay are both measured at mSum: everything downstream (rack, dj, fader,
   comp) is SHARED, so mSum equality is ear equality. A hot sat on the master
   rack is the control — dirtMaster proves the fx is loud while the take and
   the replay stay clean of it (the old tap printed it, then played through
   it again). */
async function probeResamp() {
  const B = CH, A = B === 9 ? 8 : 9, sr = AC.sampleRate, rows = [];
  const keep = { pA: stash(A), pB: stash(B),
    bufA: engine.audBuf[A], gbufA: (engine.granBuf || [])[A], nameA: engine.audName[A],
    bufB: engine.audBuf[B], gbufB: (engine.granBuf || [])[B], nameB: engine.audName[B],
    laneA: S.patterns[S.editPat].lanes[A].toJSON(),
    laneB: S.patterns[S.editPat].lanes[B].toJSON(),
    master: JSON.parse(JSON.stringify(S.master)), mLvl: S.mLvl,
    bpm: T.bpm, ovd: CFG.overdub };
  const rms = x => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / (x.length || 1)); };
  const goe = (x, f) => { const w = 2 * Math.PI * f / sr, cw = 2 * Math.cos(w); let s1 = 0, s2 = 0;
    for (let i = 0; i < x.length; i++) { const s0 = x[i] + cw * s1 - s2; s2 = s1; s1 = s0; }
    return (s1 * s1 + s2 * s2 - cw * s1 * s2) / x.length; };
  /* no member is a 2x/3x harmonic of another — 330/660 was, and the dirt
     metric read beat 4's fundamental as beat 1's distortion */
  const F4 = [331, 419, 523, 601];
  const dirt = x => { let f = 0, h = 0; for (const f0 of F4) { f += goe(x, f0); h += goe(x, 2 * f0) + goe(x, 3 * f0); }
    return f > 1e-12 ? r3(h / f) : null; };
  const envOf = x => { const Bz = Math.round(sr * 0.01), o = []; for (let i = 0; i + Bz <= x.length; i += Bz) {
    let s = 0; for (let j = i; j < i + Bz; j++) s += x[j] * x[j]; o.push(Math.sqrt(s / Bz)); } return o; };
  const pk = x => { let p = 0; for (let i = 0; i < x.length; i++) { const v = x[i] < 0 ? -x[i] : x[i]; if (v > p) p = v; } return p; };
  /* sample-level verdict: align a 1s window of `a` into `b` (b doubled — the
     signal is loop-periodic), fit the one gain α that best maps b onto a,
     report α and the residual. α≈1 and resid≈0 IS "sounds exactly like". */
  const refine = (a, b, gB) => {
    const W = Math.round(sr * 1.0), s0 = Math.round(sr * 0.4);
    if (a.length < s0 + W) return { alpha: null, resid: null };
    const aw = a.subarray(s0, s0 + W);
    const b2 = new Float32Array(b.length * 2); b2.set(b, 0); b2.set(b, b.length);
    const c0 = s0 + gB * Math.round(sr * 0.01);
    let best = -Infinity, bs = c0;
    for (let s = -600; s <= 600; s += 4) { const off = ((c0 + s) % b.length + b.length) % b.length;
      let d = 0; for (let i = 0; i < W; i += 8) d += aw[i] * b2[off + i];
      if (d > best) { best = d; bs = off; } }
    let best2 = -Infinity, bs2 = bs;
    for (let s = bs - 4; s <= bs + 4; s++) { const off = (s % b.length + b.length) % b.length;
      let d = 0; for (let i = 0; i < W; i++) d += aw[i] * b2[off + i];
      if (d > best2) { best2 = d; bs2 = off; } }
    const bw = b2.subarray(bs2, bs2 + W);
    let dab = 0, dbb = 0, daa = 0;
    for (let i = 0; i < W; i++) { dab += aw[i] * bw[i]; dbb += bw[i] * bw[i]; daa += aw[i] * aw[i]; }
    const al = dbb > 0 ? dab / dbb : 0;
    let e = 0; for (let i = 0; i < W; i++) { const r = aw[i] - al * bw[i]; e += r * r; }
    return { alpha: r3(al), resid: r3(Math.sqrt(e / (daa || 1e-9))) };
  };
  const mutes = [];
  try {
    if (T.playing) stop();
    setBpm(120); CFG.overdub = 0;                       // overwrite: the canvas starts from silence
    pin(A);
    /* ISOLATE: live-vs-replay compares mSum, and any OTHER channel with
       material plays into BOTH passes — and during replay it plays AGAIN on
       top of its own copy inside the take. Mute every fader but A and B. */
    mutes.push(...muteOthers([A, B]));
    for (const c of [A, B]) { if (!isAudioCh(c)) setEngine(c, 'audio');
      const p = S.presets[c]; p.cat = 'audio'; audDefaults(p);
      p.au.cmode = 0; p.au.kmode = 0; p.au.auto = 1;
      const ln = S.patterns[S.editPat].lanes[c];
      ln.unit = 'B'; ln.count = 1; ln.auto = false; ln.events = []; }
    S.presets[A].au.src = 0; S.presets[B].au.src = 1;
    engine.audBuf[B] = null; if (engine.granBuf) engine.granBuf[B] = null;   // stopped, no carrier: safe to empty
    /* GHOST RACKS: the channel a bounce lands on keeps its synth life's
       filter/fx/mods, and they process the replay invisibly (measured:
       a leftover lowpass 4.3k read the bus −12dB@8k while the worklet was
       flat). Plant junk and let the landing prove it clears the strip. */
    Object.assign(S.presets[B].flt[0], { typ: 1, frq: 2000, q: 4 });
    S.presets[B].fx[0] = { typ: XTYPES.indexOf('comp'), rt: 0, p1: 0.8, p2: 0.5, p3: 0, mix: 1 };
    S.presets[B].mod[0] = Object.assign(mkMod(0), { src: 2, rate: 3,
      routes: [{ dst: 0, idx: 0, amt: 100, tgt: null, addr: { rack: 'mix', slot: 0, key: 'lvl', lbl: 'level' } }] });
    engine.rebuildRack(B); engine.refresh(B);
    /* the source: four decaying pure tones, one per beat — Goertzel-friendly,
       an envelope distinctive enough to align on */
    const laneA = S.patterns[S.editPat].lanes[A];
    const n = Math.round(laneA.len * spb() * sr), src = AC.createBuffer(1, n, sr);
    { const d = src.getChannelData(0), q = Math.round(n / 4), E = Math.round(sr * 0.005);
      for (let k = 0; k < 4; k++) for (let i = 0; i < q && k * q + i < n; i++) { const t = i / sr;
        const w9 = Math.min(1, i / E, (q - 1 - i) / E);       // 5ms edges: no broadband clicks
        d[k * q + i] = 0.45 * w9 * Math.exp(-t * 6) * Math.sin(2 * Math.PI * F4[k] * t); }
      /* …plus a steady quiet 11kHz: a filter anywhere in the replay path
         (the factory flt[0] is a 9k lowpass) shows up as hf loss in dB */
      for (let i = 0; i < n; i++) d[i] += 0.06 * Math.sin(2 * Math.PI * 11000 * i / sr); }
    engine.granNode(A); engine.setChanBuf(A, src, 'resamp-src');
    Object.assign(S.presets[A].au, { spd: 1, rate: 1, st: 0, en: 1, semis: 0 });
    /* the SOURCE strip is neutral too — its scratch filter would eat the 11k
       reference on the live side and blind the hf metric */
    S.presets[A].flt = rack(mkFlt); S.presets[A].flt[0].typ = 0;
    S.presets[A].fx = rack(mkFx); S.presets[A].mod = rack(mkMod);
    engine.rebuildRack(A); engine.refresh(A);
    const satI = XTYPES.indexOf('sat');
    S.master = S.master.map((s, i) => i === 0 ? { typ: satI, rt: 0, p1: 0.9, p2: 0.5, p3: 0, mix: 1 }
                                              : { typ: 0, rt: 0, p1: 0, p2: 0, p3: 0, mix: 1 });
    engine.rebuildMaster(); await sleep(150);
    /* ---- live: A plays, mSum + master captured, the bounce lands on B ---- */
    play(); await sleep(500);
    const tSum = tap(engine.mSum), tMst = tap(engine.master);
    engine.audRecStart(B);
    const started = !!engine.audRec;
    await sleep(2600);
    engine.audRecStop();
    let landed = false;
    for (let i = 0; i < 150; i++) { if (engine.audBuf[B]) { landed = true; break; } await sleep(20); }
    const [liveL] = tSum.stop(), [mstL] = tMst.stop();
    stop(); await sleep(150);
    const take = engine.audBuf[B];
    const tk0 = take ? take.getChannelData(0) : new Float32Array(1);
    const hfdB = (x, ref) => r3(10 * Math.log10((goe(x, 11000) + 1e-12) / (goe(ref, 11000) + 1e-12)));
    rows.push({ k: 'take', started, landed, nch: take ? take.numberOfChannels : 0,
      ratio: r3(rms(tk0) / (rms(liveL) || 1e-9)), pkRatio: r3(pk(tk0) / (pk(liveL) || 1e-9)),
      dirtTake: dirt(tk0), dirtLive: dirt(liveL), dirtMaster: dirt(mstL), hf: hfdB(tk0, liveL),
      expect: '2ch · ratio ~1 · pkRatio ~1 · dirt tiny · hf ~0dB · dirtMaster ≫ (sat hot, not printed)' });
    const auB = S.presets[B].au, mxB = S.presets[B].mix || {};
    rows.push({ k: 'unity', gain: r3(auB.gain), lvol: r3(auB.lvol),
      fader: r3(mxB.lvl), pan: r3(mxB.pan),
      strip: (S.presets[B].flt.some(f => f && f.typ) ? 'FLT' : '') +
             (S.presets[B].fx.some(f => f && f.typ) ? 'FX' : '') +
             (S.presets[B].mod.some(m => m && m.src) ? 'MOD' : '') || 'clean',
      expect: '1 · 1 · 1 · 0 · clean (planted junk cleared by the landing)' });
    /* ---- replay: A muted, B alone must put the same signal into mSum ---- */
    S.presets[A].mix.lvl = 0; engine.refresh(A); await sleep(100);
    play(); await sleep(500);
    const tSum2 = tap(engine.mSum);
    await sleep(2600);
    const [playL] = tSum2.stop();
    stop(); await sleep(150);
    const cut = x => x.subarray(Math.round(sr * 0.3), Math.min(x.length, Math.round(sr * 0.3) + Math.round(sr * 2.0)));
    const eA = envOf(cut(liveL)), eB = envOf(cut(playL));
    const N9 = Math.min(eA.length, eB.length);
    let bg = 0, bc = -2;
    for (let g = 0; g < N9; g++) { let sxy = 0, sx = 0, sy = 0, sxx = 0, syy = 0;
      for (let i = 0; i < N9; i++) { const a = eA[i], b = eB[(i + g) % N9];
        sxy += a * b; sx += a; sy += b; sxx += a * a; syy += b * b; }
      const den = Math.sqrt((sxx - sx * sx / N9) * (syy - sy * sy / N9)) || 1e-9;
      const c = (sxy - sx * sy / N9) / den; if (c > bc) { bc = c; bg = g; } }
    /* MAD, not max: a sharp attack split across a 10ms block boundary puts one
       whole block of deviation at the edge — the mean is the honest number */
    let mad = 0, mA = 0;
    for (let i = 0; i < N9; i++) { mad += Math.abs(eA[i] - eB[(i + bg) % N9]); mA += eA[i]; }
    const fine = refine(cut(liveL), cut(playL), bg);
    rows.push({ k: 'replay', ratio: r3(rms(playL) / (rms(liveL) || 1e-9)),
      corr: r3(bc), envDev: r3(mad / (mA || 1e-9)), alpha: fine.alpha, resid: fine.resid,
      dirtPlay: dirt(playL), hf: hfdB(playL, liveL),
      expect: 'ratio ~1 · corr >0.97 · envDev <0.1 · alpha ~1 resid ~0 · hf ~0dB (no ghost filter) · dirtPlay tiny' });
    /* ---- a master knob mid-bounce: rebuildMaster() disconnects mSum — the
       re-attach guard must keep the tail of the take alive ---- */
    S.presets[A].mix.lvl = 0.8; engine.refresh(A); await sleep(100);
    play(); await sleep(400);
    engine.audRecStart(B);
    await sleep(900);
    engine.rebuildMaster();                              // the knob turn
    await sleep(900);
    engine.audRecStop();
    let landed2 = false;
    for (let i = 0; i < 150; i++) { const b9 = engine.audBuf[B]; if (b9 && b9 !== take) { landed2 = true; break; } await sleep(20); }
    stop(); await sleep(100);
    let aliveFrac = null;
    if (landed2) { const d2 = engine.audBuf[B].getChannelData(0), e2 = envOf(d2);
      let on = 0; for (const v of e2) if (v > 0.01) on++;
      aliveFrac = r3(on / (e2.length || 1)); }
    rows.push({ k: 'rebuild', landed2, aliveFrac,
      expect: 'landed · aliveFrac >0.8 (rec spans ~90% of the loop; no silent half after the knob)' });
  } finally {
    try { if (engine.audRec) engine.audRecStop(); } catch (_) {}
    try { if (T.playing) stop(); } catch (_) {}
    S.master = keep.master; S.mLvl = keep.mLvl; CFG.overdub = keep.ovd;
    try { engine.rebuildMaster(); } catch (_) {}
    muteRestore(mutes);
    engine.audBuf[A] = keep.bufA; if (engine.granBuf) engine.granBuf[A] = keep.gbufA;
    engine.audName[A] = keep.nameA;
    engine.audBuf[B] = keep.bufB; if (engine.granBuf) engine.granBuf[B] = keep.gbufB;
    engine.audName[B] = keep.nameB;
    S.patterns[S.editPat].lanes[A] = Looper.from(keep.laneA);
    S.patterns[S.editPat].lanes[B] = Looper.from(keep.laneB);
    unstash(A, keep.pA); unstash(B, keep.pB);
    try { setBpm(keep.bpm); } catch (_) {}
  }
  return { cols: ['k', 'started', 'landed', 'nch', 'ratio', 'pkRatio', 'dirtTake', 'dirtLive', 'dirtMaster',
                  'hf', 'gain', 'lvol', 'fader', 'pan', 'strip', 'corr', 'envDev', 'alpha', 'resid', 'dirtPlay',
                  'landed2', 'aliveFrac', 'err', 'expect'], rows };
}

/* fxmod — 2026-08-26: "many fx and play fx … their params can be added to
   mods but the mod doesnt affect them audibly." fxLive used to refuse every
   modulator except mix and the delay; each wired (type,param) is measured
   here through the REAL ctrl path: a 5Hz lfo on the address, and the bus
   must wobble (std of block rms + zc) well beyond its unmodulated floor.
   The last row runs the arp: an lfo on its rate must move the note density
   (arpTick used to read the rack raw, never the overlay). */
async function probeFxMod() {
  const ch = CH === 9 ? 8 : CH, sr = AC.sampleRate, rows = [];
  const keep = { p: stash(ch), buf: engine.audBuf[ch], gbuf: (engine.granBuf || [])[ch],
    name: engine.audName[ch], laneJ: S.patterns[S.editPat].lanes[ch].toJSON(),
    p4: stash(4), bpm: T.bpm };
  const mutes = [];
  const wobble = x => {                       // block rms + zero-cross spread over 20ms blocks
    const B = Math.round(sr * 0.02), rs = [], zs = [];
    for (let i = 0; i + B <= x.length; i += B) { let s = 0, z = 0;
      for (let j = i; j < i + B; j++) { s += x[j] * x[j]; if (j > i && (x[j] >= 0) !== (x[j - 1] >= 0)) z++; }
      rs.push(Math.sqrt(s / B)); zs.push(z); }
    const sd = a => { if (!a.length) return 0; const m = a.reduce((q, w) => q + w, 0) / a.length;
      return Math.sqrt(a.reduce((q, w) => q + (w - m) * (w - m), 0) / a.length); };
    const mr = rs.reduce((q, w) => q + w, 0) / (rs.length || 1);
    return sd(rs) / Math.max(0.01, mr) + sd(zs) / Math.max(1, zs.reduce((q, w) => Math.max(q, w), 1)); };
  const cap = async ms => { const sp = AC.createScriptProcessor(4096, 1, 1); const Lz = [];
    sp.onaudioprocess = e => Lz.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    const sk = AC.createGain(); sk.gain.value = 0; sp.connect(sk); sk.connect(AC.destination);
    engine.buses[ch].pan.connect(sp);
    await sleep(ms);
    try { engine.buses[ch].pan.disconnect(sp); } catch (_) {} sp.disconnect(); sk.disconnect();
    const o = new Float32Array(Lz.reduce((a, x) => a + x.length, 0)); let i = 0;
    for (const x of Lz) { o.set(x, i); i += x.length; } return o; };
  try {
    if (T.playing) stop();
    setBpm(120); pin(ch);
    mutes.push(...muteOthers([ch]));
    if (!isAudioCh(ch)) setEngine(ch, 'audio');
    const p = S.presets[ch]; p.cat = 'audio'; audDefaults(p);
    p.au.cmode = 0; p.au.auto = 1; p.au.src = 0;
    Object.assign(p.au, { spd: 1, rate: 1, st: 0, en: 1, semis: 0, gain: 1, lvol: 1 });
    p.mix.lvl = 1; p.mix.pan = 0;
    (modHolder(p, 'vox').vox || (p.vox = {})).fmw = FMW;
    p.flt = rack(mkFlt); p.flt[0].typ = 0; p.fx = rack(mkFx); p.mod = rack(mkMod);
    const lane = S.patterns[S.editPat].lanes[ch];
    lane.unit = 'B'; lane.count = 1; lane.auto = false; lane.events = [];
    lane.mute = false; lane.solo = false;
    const n = Math.round(lane.len * spb() * sr), src = AC.createBuffer(1, n, sr);
    { const d = src.getChannelData(0);   // two steady tones: deterministic, near-zero wobble floor
      for (let i = 0; i < n; i++) d[i] = 0.3 * Math.sin(2 * Math.PI * 220 * i / sr)
        + 0.15 * Math.sin(2 * Math.PI * 2900 * i / sr); }
    engine.granNode(ch); engine.setChanBuf(ch, src, 'fxmod-src');
    engine.rebuildRack(ch); engine.refresh(ch);
    play(); await sleep(500);
    /* two judges. 'aud': the bus must wobble well past its unmodulated floor
       — for effects that are QUIET until the param moves. 'node': the
       registered target param must MOVE under the lfo — for effects that
       wobble constantly by nature (a delay's echoes, a tremolo), where
       modulating the rate changes the wobble's shape, not its amount, and an
       amplitude metric is blind. A moving delayTime or lfo rate IS the sound
       changing; the node is the honest witness there. */
    const CASES = [
      ['filt', 'p1', { p1: 0.5, p2: 0.3, p3: 0, mix: 1 }, 'aud'],
      ['filt', 'p2', { p1: 0.45, p2: 0.5, p3: 2, mix: 1 }, 'aud'],
      ['dly', 'p1', { p1: 0.25, p2: 0.4, p3: 0, mix: 0.8 }, 'node', L9 => L9.dls[0].delayTime.value],
      ['dly', 'p2', { p1: 0.2, p2: 0.4, p3: 0, mix: 0.8 }, 'node', L9 => L9.fb.gain.value],
      ['dly', 'p5', { p1: 0.2, p2: 0.4, p3: 0, p5: 0, mix: 0.8 }, 'node', L9 => L9.cols[0].frequency.value],
      ['phase', 'p1', { p1: 0.3, p2: 0.8, p3: 0, mix: 1 }, 'node', L9 => L9.los[0].frequency.value],
      ['phase', 'p2', { p1: 0.3, p2: 0.5, p3: 0, mix: 1 }, 'node', L9 => L9.lgs[0].gain.value],
      ['fla', 'p2', { p1: 0.3, p2: 0.5, p3: 0, mix: 1 }, 'node', L9 => L9.fbs[0].gain.value],
      ['pha', 'p2', { p1: 0.3, p2: 0.5, p3: 0, mix: 1 }, 'node', L9 => L9.lgs[0].gain.value],
      ['trm', 'p1', { p1: 0.3, p2: 0.8, mix: 1 }, 'node', L9 => L9.tlo.frequency.value],
      ['trm', 'p2', { p1: 0.3, p2: 0.5, mix: 1 }, 'node', L9 => L9.tlg.gain.value],
      ['comp', 'p1', { p1: 0.5, p2: 0.6, p3: 0.1, p4: 0.2, mix: 0.5 }, 'aud'],
      ['limit', 'p1', { p1: 0.4, p2: 0.3, mix: 0.5 }, 'aud'],
      ['gate', 'p1', { p1: 0.5, p2: 1, mix: 1 }, 'node', L9 => L9.flw.thr],
      ['verb', 'p2', { p1: 0.4, p2: 0.5, p3: 0.5, mix: 1 }, 'node', L9 => L9.vtone.frequency.value],
      ['clip', 'p1', { p1: 0.5, p2: 0.2, p3: 0.3, mix: 0.5 }, 'aud'],
      /* the distortion family — his 2026-08-26 report was `sat` tone (p2).
         p3 picks the curve: 0 = soft (has a tone filter), 5 = crush (p2 is a
         sample-rate divider on a worklet param instead). */
      ['sat', 'p2', { p1: 0.6, p2: 0.3, p3: 0, p5: 0.5, p7: 0.5, mix: 1 }, 'node', L9 => L9.stone.frequency.value],
      ['sat', 'p5', { p1: 0.6, p2: 0.5, p3: 0, p5: 0.5, p7: 0.5, mix: 1 }, 'node', L9 => L9.satIn.gain.value],
      ['sat', 'p7', { p1: 0.6, p2: 0.5, p3: 0, p5: 0.5, p7: 0.5, mix: 1 }, 'node', L9 => L9.satOut.gain.value],
      ['sat', 'p2c', { p1: 0.6, p2: 0.4, p3: 5, p5: 0.5, p7: 0.5, mix: 1 }, 'node', L9 => L9.deci.parameters.get('red').value],
      ['tape', 'p2', { p1: 0.4, p2: 0.4, mix: 1 }, 'node', L9 => L9.wlp.frequency.value],
      ['drv', 'p2', { p1: 0.6, p2: 0.4, mix: 1 }, 'node', L9 => L9.dtone.frequency.value],
    ];
    for (const [t9, key, cfg, judge, get9] of CASES) {
      p.fx = rack(mkFx);
      p.fx[0] = Object.assign({ typ: XTYPES.indexOf(t9), rt: 0, p1: 0.5, p2: 0.3, p3: 0, mix: 1 }, cfg);
      p.mod = rack(mkMod);
      engine.rebuildRack(ch); await sleep(200);
      /* the ADDRESS comes off the picker, exactly as a finger would pick it —
         resolveDest matches key AND label, so a guessed label is a dead route */
      const key9 = key === 'p2c' ? 'p2' : key;   // p2c = the crush curve's p2 (a divider, not a tone)
      const dz = destList(p).find(x => x.rack === 'fx' && x.slot === 0 && x.key === key9);
      const w0 = judge === 'aud' ? wobble(await cap(400)) : 0;
      p.mod[0] = Object.assign(mkMod(0), { src: 2, wav: 0, rate: 5, syn: 0, ltr: 1,
        routes: [{ dst: 0, idx: 0, amt: 100, tgt: null,
          addr: dz ? { rack: dz.rack, slot: dz.slot, key: dz.key, lbl: dz.lbl }
                   : { rack: 'fx', slot: 0, key: key9, lbl: key9 } }] });
      await sleep(250);
      if (judge === 'aud') {
        const w1 = wobble(await cap(400));
        rows.push({ k: t9 + '.' + key, judge, w0: r3(w0), w1: r3(w1),
          gain2: r3(w1 / Math.max(0.001, w0)), ok: w1 > Math.max(w0 * 2, 0.04),
          addr: dz ? 'listed' : 'MISSING' });
      } else {
        const L9 = engine.buses[ch].fxLive[0], vals = [];
        for (let q = 0; q < 4; q++) { vals.push(get9(L9)); await sleep(90); }
        const lo9 = Math.min(...vals), hi9 = Math.max(...vals);
        /* RELATIVE, not absolute: a phaser's depth param spans 0..0.006, so an
           absolute floor called a param that DOUBLED under the lfo dead. These
           are AudioParam.value reads — exact, no jitter — so a 5% swing is a
           real move and a dead param reads hi===lo. */
        const span9 = Math.max(Math.abs(hi9), Math.abs(lo9), 1e-9);
        rows.push({ k: t9 + '.' + key, judge, w0: r3(lo9), w1: r3(hi9),
          gain2: r3(hi9 - lo9), ok: (hi9 - lo9) > 0.05 * span9,
          addr: dz ? 'listed' : 'MISSING' });
      }
    }
    stop(); await sleep(120);
    /* ---- the generators: an lfo on the ratchet's divisions must move the
       note DENSITY per step (arpTick reads the rack THROUGH the overlay now;
       the arp's own rate is an enum and enums are not mod dests by design) ---- */
    pin(4);
    const p4 = S.presets[4];
    p4.ply = rack(mkPly); p4.mod = rack(mkMod);
    p4.ply[0] = Object.assign(mkPly(0), { typ: 15, p1: 3, p2: 0 });   // ratchet, 3 divs
    let count = 0; const on0 = engine.noteOn.bind(engine);
    engine.noteOn = (...a) => { count++; return on0(...a); };
    try {
      const dst9 = destList(p4).find(x => x.rack === 'ply' && x.key === 'p1' && x.slot === 0);
      play(); await sleep(200);
      engine.arpPool[4].push({ midi: 60, vel: 0.8, until: gridNow() + 64, born: gridNow() });
      count = 0; await sleep(1300); const base9 = count;
      p4.mod[0] = Object.assign(mkMod(0), { src: 2, wav: 2, rate: 0.05, syn: 0, ltr: 1, ph: 90,
        routes: [{ dst: 0, idx: 0, amt: 100, tgt: null,
          addr: dst9 ? { rack: dst9.rack, slot: dst9.slot, key: dst9.key, lbl: dst9.lbl }
                     : { rack: 'ply', slot: 0, key: 'p1', lbl: 'p1' } }] });
      await sleep(300); count = 0; await sleep(1300); const mod9 = count;
      rows.push({ k: 'ply.rtc', w0: base9, w1: mod9, gain2: r3(mod9 / Math.max(1, base9)),
        ok: Math.abs(mod9 - base9) > Math.max(2, base9 * 0.3), addr: dst9 ? 'listed' : 'MISSING' });
    } finally { engine.noteOn = on0; engine.arpPool[4].length = 0; stop(); }
  } finally {
    try { if (T.playing) stop(); } catch (_) {}
    engine.audBuf[ch] = keep.buf; if (engine.granBuf) engine.granBuf[ch] = keep.gbuf;
    engine.audName[ch] = keep.name;
    S.patterns[S.editPat].lanes[ch] = Looper.from(keep.laneJ);
    unstash(ch, keep.p); unstash(4, keep.p4);
    muteRestore(mutes);
    try { setBpm(keep.bpm); } catch (_) {}
  }
  return { cols: ['k', 'w0', 'w1', 'gain2', 'ok', 'addr', 'err', 'expect'], rows };
}

/* fxwire — the EXHAUSTIVE half of fxmod, and the answer to "do I have to test
   them one by one": every (type, param) pair FXMODOK claims is wired gets
   driven through the real applier and checked three ways —
     offered  the dest picker lists it (modDests agrees with the table)
     claimed  engine.fxLive() returned true for both a low and a high value
     moved    some node behind that slot actually changed value
   No audio and no waiting on an lfo, so all ~60 pairs run in one call. The
   hand-picked rows in `fxmod` stay as the tier above this: they prove the
   change reaches the SOUND. This one proves nothing is silently unwired. */
async function probeFxWire() {
  const ch = CH === 9 ? 8 : CH, rows = [];
  const keep = { p: stash(ch) };
  const snap = L => {
    const o = [];
    const pushNode = nd => {
      if (!nd || typeof nd !== 'object') return;
      /* a DynamicsCompressor's dials are threshold/knee/ratio/attack/release —
         none of them called `gain`, which is why comp and limit first read as
         "claimed but nothing moved" while fxmod's audio judge heard them
         plainly. Read every AudioParam a unit in this file can own. */
      for (const k of ['gain', 'frequency', 'Q', 'delayTime', 'detune',
                       'threshold', 'knee', 'ratio', 'attack', 'release'])
        if (nd[k] && typeof nd[k].value === 'number') o.push(nd[k].value);
      if (nd.parameters && typeof nd.parameters.forEach === 'function')
        nd.parameters.forEach(prm => { if (prm && typeof prm.value === 'number') o.push(prm.value); });
    };
    for (const k in L) {
      const v = L[k];
      if (v == null) continue;
      if (typeof v === 'number') o.push(v);
      else if (Array.isArray(v)) v.forEach(pushNode);
      else if (typeof v === 'object') pushNode(v);
    }
    if (L.flw) o.push(L.flw.thr, L.flw.depth);   // the gate's follower is plain numbers
    return o;
  };
  const diff = (a, b) => a.length === b.length && a.some((v, i) => Math.abs(v - b[i]) > 1e-9);
  try {
    if (T.playing) stop();
    pin(ch);
    const p = S.presets[ch];
    for (const t of Object.keys(FXMODOK)) {
      const ti = XTYPES.indexOf(t);
      if (ti < 0 || !FXMODOK[t].length) continue;
      for (const key of FXMODOK[t]) {
        /* p3 is a TYPE selector on two families, so a param that only exists
           on one kind needs that kind built: filt's gain is a shelving-only
           dial, sat's tone only exists off the crush curve. */
        let p3 = 0;
        if (t === 'filt') p3 = key === 'p4' ? XFT.indexOf('peq') : 0;
        p.fx = rack(mkFx);
        p.fx[0] = { typ: ti, rt: 0, p1: 0.5, p2: 0.5, p3, p4: 0.5, p5: 0.5, p7: 0.5, mix: 0.5 };
        engine.rebuildRack(ch);
        await sleep(120);
        const L = engine.buses[ch].fxLive && engine.buses[ch].fxLive[0];
        if (!L) { rows.push({ k: t + '.' + key, err: 'no live handle' }); continue; }
        const offered = destList(p).some(x => x.rack === 'fx' && x.slot === 0 && x.key === key);
        const a = snap(L);
        const r1 = engine.fxLive(ch, 0, key, 0.12);
        await sleep(70);                      // setTargetAtTime ramps; give it a tau
        const b = snap(L);
        const r2 = engine.fxLive(ch, 0, key, 0.88);
        await sleep(70);
        const c = snap(L);
        const moved = diff(a, c) || diff(b, c);
        rows.push({ k: t + '.' + key, offered, claimed: !!(r1 && r2), moved,
                    ok: !!(offered && r1 && r2 && moved) });
      }
    }
  } finally {
    try { if (T.playing) stop(); } catch (_) {}
    unstash(ch, keep.p);
  }
  return { cols: ['k', 'offered', 'claimed', 'moved', 'ok', 'err'], rows };
}

/* ---------------- poolkind: is every take in the pool called right ------
 * The classifier runs ONCE, at poolAdd, and after that the whole browsing
 * experience is downstream of it — so the only honest check is to print what
 * it decided for every take next to the numbers it decided on, and read the
 * column. `want=loop` also prints the two views in dial order, which is what
 * a hand actually turns through.
 */
async function probePoolKind() {
  if (typeof POOL === 'undefined') return { cols: [], rows: [], err: 'no POOL on this build' };
  const want = str(P.want, 'loop');
  const rows = POOL.map((e, i) => {
    let m = {};
    try { m = poolMeasure(e.buf); } catch (err) { m = { err: String(err) }; }
    return { k: e.name, i, kind: e.kind || '?', dur: r3(m.dur), onsets: m.onsets,
             cen: r3(m.cen), rise: r3(m.rise), drift: r3(m.drift), pk: r3(m.pk),
             src: (e.src || {}).k };
  });
  /* AND DRIVE THE TWO REAL DIAL SPECS, not a copy of their logic — the whole
     point of the views is what a hand turning that dial lands on, so read the
     first few positions out of the specs themselves. */
  const dial = (arr, want) => {
    const sp = (arr || []).find(x => x && x.key === '_pool');
    if (!sp) return 'spec not found';
    const n = Math.min(8, poolView(want).length);
    const out = [];
    for (let v = 0; v < n; v++) out.push(sp.fmt(v));
    return out.join('  ');
  };
  notes.push('audio dial 0..7: ' + dial(typeof GRANF !== 'undefined' ? GRANF : null, 'loop'));
  notes.push('smp op  0..7: ' + dial(typeof OSC_P !== 'undefined' ? OSC_P({ wav: 9 }) : null, 'one'));
  /* and what SHIFT does on that dial: the whole shelf in group-sized strides,
     driven through the real spec's own jump so this cannot drift from it */
  const sp9 = (typeof OSC_P !== 'undefined' ? OSC_P({ wav: 9 }) : []).find(x => x && x.key === '_pool');
  if (sp9 && sp9.jump) {
    const stops = []; let v = 0;
    for (let i = 0; i < 40; i++) {
      stops.push(sp9.fmt(v));
      const nv = adjust(sp9, v, 1, 10);
      if (nv === v) break;
      v = nv;
    }
    notes.push('shift-jump from 0 (' + stops.length + ' stops): ' + stops.join(' > '));
    let back = adjust(sp9, v, -1, 10);
    notes.push('and back one group: ' + sp9.fmt(back));
  }
  /* the head of each view and nothing more: the pool is 300+ and printing all
     of it is the "re-dumping results" waste NEXT.md warns about */
  const view = n => { const V = poolView(n);
    return V.slice(0, 12).map(i => (POOL[i].kind === n ? '' : '| ') + POOL[i].name).join(' ') +
           (V.length > 12 ? '  … +' + (V.length - 12) : ''); };
  notes.push('loop view: ' + view('loop'));
  notes.push('one  view: ' + view('one'));
  notes.push('counts: ' + POOL.filter(e => e.kind === 'loop').length + ' loop, ' +
             POOL.filter(e => e.kind !== 'loop').length + ' one-shot, of ' + POOL.length +
             '  (| marks where the wanted kind runs out, want=' + want + ')');
  return { cols: ['i', 'kind', 'dur', 'onsets', 'cen', 'rise', 'drift', 'pk', 'src'], rows };
}

/* ---------------- smplib: does a library one-shot reach the engine ------
 * The library is 666 sounds behind one dial, so the failure that matters is
 * not "does it look right in the list" but "does the buffer a synth op picks
 * actually SOUND". Sets one operator to smp, points it at named sounds from
 * the pool, plays a note, and reads the channel bus.
 *
 *     tools/probe.sh smplib ch=8 names=tr808-kick-01,linn-snare-01
 */
async function probeSmpLib() {
  if (typeof POOL === 'undefined') return { cols: [], rows: [], err: 'no POOL on this build' };
  const ch = CH;
  const names = list(P.names, ['tr808-kick-01', 'tr808-snare-01', 'linn-snare-01',
                               'tr8-hat-open-01', 'cr78-cowbell-01', 'dr5-tom-01']);
  const p = S.presets[ch];
  const keep = JSON.parse(JSON.stringify({ cat: p.cat, osc: p.osc, env: p.env }));
  p.cat = 'keys';
  p.osc = [{ wav: 9, mode: 0, dst: 0, rat: 1, amt: 1, fine: 0, ph: 0, phm: 0 }];
  p.env[0] = { a: 0.001, d: 0.5, s: 0, r: 0.1 };
  S.editSnd = ch; S.curSlot = 0;
  const rows = [];
  for (const nm of names) {
    const e = POOL.find(x => x.name === nm);
    if (!e) { rows.push({ k: nm, err: 'not in the pool' }); continue; }
    engine.opSamples.set(ch + ':0', e.buf);
    engine.rebuildRack(ch);
    const r = await hit(ch, () => engine.noteOn(AC.currentTime + 0.02, ch, NOTE, VEL), MS);
    rows.push(Object.assign({ k: nm, inst: e.inst, style: e.style, cat: e.cat,
                              dur: r3(e.buf.duration), kind: e.kind }, r));
    try { engine.allOff(); } catch (_) {}
    await sleep(60);
  }
  Object.assign(p, keep);
  engine.rebuildRack(ch);
  notes.push('pool ' + POOL.length + ' \u00b7 ' + POOL.filter(x => x.kind === 'loop').length +
             ' loop / ' + POOL.filter(x => x.kind !== 'loop').length + ' one-shot');
  const silent = rows.filter(r => !r.err && !(r.peak > 0.001)).map(r => r.k);
  if (silent.length) notes.push('SILENT: ' + silent.join(' '));
  return { cols: ['inst', 'style', 'cat', 'kind', 'dur', 'peak', 'rms', 'centroid'], rows };
}

/* ---------------- genqual: what the patch randomiser actually produces ---
 * Gad's rule for this work: a ROLL must stay instant, so there is no
 * render-and-check at roll time. This is the development half of that deal —
 * roll N patches, install each, play a note, read the bus, and say which ones
 * are duds before he ever hears them.
 *
 *     tools/probe.sh genqual cat=bass n=10 wild=35 seed=1
 *     tools/probe.sh genqual cat=lead n=10 wild=80
 *
 * SEEDED, so a round is reproducible: seed s gives roll i the stream
 * mulberry32(s*1000+i), and "number 4 of that ten was the good one" survives
 * the session. Verdicts, and why each is the one worth counting:
 *   SILENT   peak < 0.02   the patch makes no sound at all. The single worst
 *                          outcome and the one genPreset's own comments record
 *                          shipping three times (bass, snares, hats), always
 *                          the same way: a filter sitting where the tone is not.
 *   QUIET    peak < 0.08   audible only if you go looking
 *   HARSH    centroid > 6k all fizz, no body
 *   MUD      centroid < 250 on a category that is not a bass or a kick
 *   FLAT     the roll landed within 3% of the previous one on every axis —
 *            ten of the same patch is the OTHER failure, and a summary that
 *            only counts duds cannot see it
 */
async function probeGenQual() {
  if (typeof genPreset !== 'function') return { cols: [], rows: [], err: 'no genPreset on this build' };
  const cat = str(P.cat, 'bass');
  const n = Math.max(1, Math.min(24, Math.round(num(P.n, 10))));
  const wild = Math.max(0, Math.min(1, num(P.wild, 35) / 100));
  const seed = Math.round(num(P.seed, 1));
  const ch = CH;
  const low = /bass|kik|kick/.test(cat);
  /* BRIGHT IS NOT HARSH ON A HAT. The first run of this called 7 of 10 hi-hats
     HARSH for a centroid over 6kHz — and a real TR-808 closed hat measures
     11869Hz, which is what a hi-hat IS. A verdict that fires on the instrument
     working correctly is worse than no verdict. Hats, cymbals and zaps are
     exempt; snares get a higher bar than tonal patches do. */
  const bright = /hh|cymb|zap/.test(cat);
  const harshAt = bright ? Infinity : /snr/.test(cat) ? 9000 : 6000;
  const rows = [];
  let prev = null, flat = 0;
  for (let i = 0; i < n; i++) {
    const rnd = mulberry32(seed * 1000 + i);
    let pre;
    try { pre = genPreset(cat, rnd, wild); }
    catch (e) { rows.push({ k: cat + i, err: String(e).slice(0, 80) }); continue; }
    setP(ch, pre.name, cat, presetData(pre));
    engine.refresh(ch);
    await sleep(20);
    const r = await hit(ch, () => engine.noteOn(AC.currentTime + 0.02, ch, NOTE, VEL), MS);
    const v = [];
    if (!(r.peak > 0.02)) v.push('SILENT');
    else if (!(r.peak > 0.08)) v.push('QUIET');
    if (r.centroid > harshAt) v.push('HARSH');
    if (!low && !bright && r.centroid < 250) v.push('MUD');
    if (prev && ['peak', 'rms', 'centroid', 'hz'].every(k =>
        Math.abs((r[k] || 0) - (prev[k] || 0)) <= 0.03 * Math.max(Math.abs(r[k] || 0), 1e-9))) {
      v.push('FLAT'); flat++;
    }
    prev = r;
    const G = pre._gen || {};
    rows.push({ k: pre.name, i, rung: G.rung, arch: G.arch || (G.smp ? G.smp.split(':')[0] : ''),
                src: G.smp ? 'smp' : 'synth',
                ops: (pre.osc || []).filter(o => o && o.amt > 0.01).length,
                flt: (pre.flt[0] || {}).typ || 0, fq: Math.round((pre.flt[0] || {}).frq || 0),
                fx: (pre.fx[0] || {}).typ || 0,
                peak: r.peak, rms: r.rms, hz: r.hz, centroid: r.centroid,
                verdict: v.join('+') || 'ok' });
    try { engine.allOff(); } catch (_) {}
    await sleep(40);
  }
  const bad = rows.filter(r => r.verdict && r.verdict !== 'ok' && !r.err);
  const cs = rows.filter(r => Number.isFinite(r.centroid)).map(r => r.centroid);
  const ps = rows.filter(r => Number.isFinite(r.peak)).map(r => r.peak);
  notes.push(cat + ' x' + n + ' @wild ' + Math.round(wild * 100) + '% seed ' + seed +
             ' \u2014 ' + (rows.length - bad.length) + '/' + rows.length + ' clean');
  if (bad.length) notes.push('duds: ' + bad.map(r => r.k + '(' + r.verdict + ')').join(' '));
  if (cs.length) notes.push('centroid ' + Math.round(Math.min(...cs)) + '..' + Math.round(Math.max(...cs)) +
                            '  peak ' + r3(Math.min(...ps)) + '..' + r3(Math.max(...ps)) +
                            '  flat ' + flat);
  const arch = {};
  for (const r of rows) if (r.arch) arch[r.arch] = (arch[r.arch] || 0) + 1;
  notes.push('archetypes: ' + Object.entries(arch).map(([k, v]) => k + ' x' + v).join(' '));
  return { cols: ['i', 'src', 'rung', 'arch', 'ops', 'flt', 'fq', 'peak', 'rms', 'centroid', 'verdict'], rows };
}

/* ---------------- archlvl: how loud is each archetype, really -----------
 * The one thing that separates "every roll is a keeper" from "half of them
 * are inaudible" is that different archetypes have genuinely different output
 * — a blip is four operators quieter than a supersaw and no amount of
 * reasoning about gain structure will tell you by how much. Rolls stay
 * instant (no render-and-check at roll time, Gad's rule), so the trim is
 * measured HERE, at development time, and baked into the archetype.
 *
 *     tools/probe.sh archlvl k=6          # every archetype, 6 rolls each
 *     tools/probe.sh archlvl cat=bass k=8
 *
 * `mean` is what a trim should be computed against; `min` says whether the
 * archetype has a quiet TAIL as well as a quiet average, which is the case
 * a mean alone would hide.
 */
async function probeArchLvl() {
  if (typeof genPreset !== 'function') return { cols: [], rows: [], err: 'no genPreset on this build' };
  genPreset('pad', mulberry32(1), 0.5);            // one roll, to publish the table
  const A = (typeof ARCHNAMES !== 'undefined' && ARCHNAMES) || null;
  if (!A) return { cols: [], rows: [], err: 'no archetype table on this build' };
  const only = str(P.cat, '');
  const k = Math.max(1, Math.min(12, Math.round(num(P.k, 6))));
  const ch = CH;
  const rows = [];
  for (const cat of Object.keys(A)) {
    if (cat === 'misc') continue;
    if (only && cat !== only) continue;
    for (const an of Object.keys(A[cat])) {
      const pk = [], ct = [];
      for (let i = 0; i < k; i++) {
        let pre;
        try { pre = genPreset(cat, mulberry32(7000 + i * 31), 0.4, an); } catch (e) { continue; }
        setP(ch, pre.name, cat, presetData(pre));
        engine.refresh(ch);
        await sleep(15);
        const r = await hit(ch, () => engine.noteOn(AC.currentTime + 0.02, ch, NOTE, VEL), MS);
        if (Number.isFinite(r.peak)) pk.push(r.peak);
        if (Number.isFinite(r.centroid)) ct.push(r.centroid);
        try { engine.allOff(); } catch (_) {}
        await sleep(25);
      }
      if (!pk.length) { rows.push({ k: cat + '/' + an, err: 'no rolls' }); continue; }
      const mean = pk.reduce((a, b) => a + b, 0) / pk.length;
      rows.push({ k: cat + '/' + an, n: pk.length,
                  mean: r3(mean), min: r3(Math.min(...pk)), max: r3(Math.max(...pk)),
                  cent: Math.round(ct.reduce((a, b) => a + b, 0) / (ct.length || 1)),
                  trim: r3(0.2 / Math.max(mean, 1e-4)) });
    }
  }
  const ms = rows.filter(r => Number.isFinite(r.mean)).map(r => r.mean);
  if (ms.length) notes.push('mean peak ' + r3(Math.min(...ms)) + '..' + r3(Math.max(...ms)) +
                            '  spread x' + r3(Math.max(...ms) / Math.max(Math.min(...ms), 1e-6)) +
                            '   (trim = what multiplier lands each on 0.20)');
  return { cols: ['n', 'mean', 'min', 'max', 'cent', 'trim'], rows };
}

/* ---------------- patqual: is a generated pattern arranged or merely stacked
 * Three numbers, one per claim made about the note generator:
 *   vspread  standard deviation of velocity within a lane. A part whose notes
 *            are all the same loudness reads as typed in, not played; the old
 *            generator gave every note a constant with a 6% jitter.
 *   barvar   how different bar 4 is from bar 1, as 1 - (shared onsets /
 *            union of onsets). Every bar-pair used to be written by the same
 *            loop body, so this was near zero and a four-bar loop was one bar
 *            repeated.
 *   agree    fraction of a melodic lane's OFFBEAT onsets that another lane
 *            also plays. Parts that syncopate together sound arranged; parts
 *            that each invent their own syncopation sound co-located. This is
 *            the one the shared rhythmic cell exists to move.
 *
 *     tools/probe.sh patqual n=6
 */
async function probePatQual() {
  if (typeof genLane !== 'function') return { cols: [], rows: [], err: 'no genLane on this build' };
  const n = Math.max(1, Math.min(12, Math.round(num(P.n, 6))));
  const CATS2 = { 1: 'kik', 2: 'snr', 3: 'hh', 4: 'perc', 5: 'bass', 6: 'chord', 7: 'lead' };
  const pat = S.editPat;
  const rows = [];
  const keep = {};
  for (const pi of Object.keys(CATS2)) keep[pi] = S.presets[pi].cat;
  const agg = { vcorr: [], barvar: [], conc: [] };
  for (let run = 0; run < n; run++) {
    for (const pi of Object.keys(CATS2)) S.presets[pi].cat = CATS2[pi];
    const ctx = prodCtx(Math.random, {});
    const lanes = {};
    for (const pi of Object.keys(CATS2)) {
      const lane = S.patterns[pat].lanes[pi];
      /* FOUR BARS, FORCED -- and the dummy event is the point. genLane opens
         with `if (lane.auto || !lane.events.length)` and resets the lane to
         one or two bars, so CLEARING it first threw the length away and every
         build read bar 4 against an empty bar: barvar 1.000, pinned at its
         ceiling, measuring nothing. Leave one event behind and the length
         survives; genLane replaces the events anyway. */
      lane.unit = 'B'; lane.count = 4; lane.auto = false;
      lane.events = [{ t: 0, midi: 60, vel: 0.5, dur: 0.1 }];
      genLane(pat, +pi, false, ctx);
      lanes[pi] = (S.patterns[pat].lanes[pi].events || []).slice();
    }
    /* the whole grid, so a lane can be asked whether it lands WITH the others
       and whether they lean the same way when it does */
    const at = {};
    for (const pi of Object.keys(lanes))
      for (const e of lanes[pi]) {
        const t = +e.t.toFixed(3);
        (at[t] = at[t] || []).push({ pi, vel: e.vel || 0 });
      }
    /* ACCENT AGREEMENT: at every moment two or more lanes play together, do
       they agree on whether it is a strong beat? Correlate each lane's
       velocity against the mean of the others at the same instant. This, not
       within-lane spread, is what a shared accent grid is FOR. */
    let cn = 0, cs = 0;
    for (const t of Object.keys(at)) {
      const g = at[t]; if (g.length < 2) continue;
      const m = g.reduce((a, b) => a + b.vel, 0) / g.length;
      for (const x of g) { cs += 1 - Math.min(1, Math.abs(x.vel - m) / 0.5); cn++; }
    }
    agg.vcorr.push(cn ? cs / cn : 0);
    /* OFFBEAT CONCENTRATION: of all the offbeat onsets anyone plays, how few
       distinct POSITIONS do they use? Parts syncopating in the same places
       sound arranged; each inventing its own sounds co-located. */
    /* THE HAT LANE IS EXCLUDED, and that is a correction rather than a
       convenience: a hat is a CONTINUOUS STREAM of eighths or sixteenths, not
       a syncopation anybody chose, and it contributes more offbeat onsets than
       every other lane combined -- so it dominated this number and any change
       to hat DENSITY moved it more than any change to where the parts agree.
       What is being asked here is whether the parts that choose their
       syncopation choose the same one. */
    const offOn = [], offPos = new Set();
    for (const pi of Object.keys(lanes)) {
      if (CATS2[pi] === 'hh') continue;
      for (const e of lanes[pi]) if (Math.abs(e.t % 1) > 1e-6) {
        offOn.push(e); offPos.add(+(e.t % 4).toFixed(3));
      }
    }
    agg.conc.push(offOn.length ? 1 - offPos.size / offOn.length : 0);
    for (const pi of Object.keys(CATS2)) {
      const ev = lanes[pi];
      if (!ev.length) { rows.push({ k: CATS2[pi] + ' r' + run, notes: 0 }); continue; }
      const b1 = new Set(ev.filter(e => e.t < 4).map(e => +e.t.toFixed(2)));
      const b4 = new Set(ev.filter(e => e.t >= 12 && e.t < 16).map(e => +(e.t - 12).toFixed(2)));
      let shared = 0; for (const t of b4) if (b1.has(t)) shared++;
      const uni = new Set([...b1, ...b4]).size;
      const bv = (b1.size && b4.size) ? 1 - shared / uni : null;
      if (Number.isFinite(bv)) agg.barvar.push(bv);
      rows.push({ k: CATS2[pi] + ' r' + run, notes: ev.length, b1: b1.size, b4: b4.size,
                  barvar: Number.isFinite(bv) ? r3(bv) : null });
    }
  }
  for (const pi of Object.keys(CATS2)) S.presets[pi].cat = keep[pi];
  const av = a => a.length ? r3(a.reduce((x, y) => x + y, 0) / a.length) : null;
  notes.push('accent agreement ' + av(agg.vcorr) +
             '   bar4-vs-bar1 ' + av(agg.barvar) +
             '   offbeat concentration ' + av(agg.conc));
  return { cols: ['notes', 'b1', 'b4', 'barvar'], rows };
}

/* ---------------- smpkit: twelve pads, twelve DIFFERENT sounds ----------
 * `opSamples` was keyed channel:operator, with no pad in it, so every pad of a
 * kit collided on `pi:0` and a sampled kit could hold exactly ONE sound
 * however many pads you gave it. smpKey puts the pad's pitch class in the key.
 * This is the test for that, and the failure it looks for is not "silent" but
 * "all the same": twelve pads reading one centroid.
 *
 *     tools/probe.sh smpkit name=KT808 ch=8
 */
async function probeSmpKit() {
  if (typeof sampleKit !== 'function') return { cols: [], rows: [], err: 'no sampleKit on this build' };
  const nm = str(P.name, 'KT808');
  const ch = CH;
  const keep = presetData(S.presets[ch]);
  /* `roll=<wild>` tests the DICE instead of the library: rolling a kit has to
     give twelve sounding pads on the drum-machine layout just as a factory
     kit does, and it is the path that reaches synthesised drums when the
     shelf has no such voice. */
  const roll = P.roll === undefined ? null : num(P.roll, 35);
  if (roll == null) {
    const en = libAll().find(e => e && e.name === nm && e.cat === 'kit');
    if (!en) return { cols: [], rows: [], err: 'no kit named ' + nm + ' in the library' };
    setP(ch, en.name, 'kit', en.data);
  } else {
    S.presets[ch].cat = 'kit';
    randomizeKit(ch, roll);
  }
  /* `chflt=<hz>` puts a lowpass on the CHANNEL after the kit is loaded, which
     is the whole point of the shared racks: one filter, twelve pads. Applied
     HERE and not before, because loading the kit preset replaces the channel's
     own rack and would throw it away. */
  /* `dcy=` rewrites every pad's amp decay as a fraction of its take's own
     length, which is how the percussive envelope's factor was picked rather
     than guessed: the amp decay is a time CONSTANT, so what "the whole take"
     means in the field is a measurement, not arithmetic. */
  const dcy = P.dcy === undefined ? null : num(P.dcy, 1);
  if (dcy != null) for (let pc = 0; pc < 12; pc++) {
    const pad = (S.presets[ch].kit || [])[pc];
    /* the take's length comes from the POOL, not from opSamples: the samples
       are not wired until rebuildRack runs, which is after this, so the first
       version of this found no buffer and silently changed nothing — every
       decay factor measured identically, which is what gave it away. */
    const ref = pad && ((pad.osc || [])[0] || {}).smp;
    const e = ref && ref.f && POOLBYF.get(smpPath(ref.f));
    if (pad && pad.env && pad.env[0] && e && e.buf)
      Object.assign(pad.env[0], { a: 0.0004, d: Math.max(0.02, e.buf.duration * dcy), s: 0, r: 0.02 });
  }
  /* `gmod=amp|pitch|pan` puts an ENVELOPE on the KIT CHANNEL's shared mod rack
     — the thing that silently did nothing, because the merge was filtering
     every src-1 slot out of the channel's side. Installed after the kit loads,
     for the same reason chflt is. */
  const gmod = str(P.gmod, '');
  if (gmod) {
    const dst = { amp: 1, pitch: 2, filt: 3, pan: 4 }[gmod] || 1;
    const cp = S.presets[ch];
    cp.kglob = 1;
    cp.mod[0] = { src: 1, rsel: 0, a: 0.001, d: num(P.gd, 0.05), s: 0, r: 0.02,
                  routes: [{ dst, idx: 0, amt: num(P.gamt, 100), ctr: 0, tgt: null }] };
    cp._addr = false; addrMod(cp);
  }
  const chflt = P.chflt === undefined ? null : num(P.chflt, 0);
  if (chflt) {
    S.presets[ch].kglob = 1;
    S.presets[ch].flt[0] = { typ: 1, frq: chflt, q: 1.4, gn: 0 };
  }
  engine.rebuildRack(ch);
  await sleep(120);
  const rows = [];
  for (let pc = 0; pc < 12; pc++) {
    const midi = 60 + pc;
    const pad = (S.presets[ch].kit || [])[pc] || {};
    const ref = ((pad.osc || [])[0] || {}).smp;
    const key = smpKey(ch, 0, pc);
    const buf = engine.opSamples.get(key);
    const synth = !ref;
    const r = await hit(ch, () => engine.noteOn(AC.currentTime + 0.02, ch, midi, VEL), MS);
    rows.push({ k: NN[pc] + ' ' + (pad.cat || '?'),
                take: ref ? String(ref.f).split('/').pop().replace('.flac', '') : 'synth',
                wired: buf ? 'yes' : (synth ? 'n/a' : 'NO'),
                dur: buf ? r3(buf.duration) : null,
                peak: r.peak, rms: r.rms, centroid: r.centroid });
    try { engine.allOff(); } catch (_) {}
    await sleep(50);
  }
  setP(ch, keep.name || 'tmp', keep.cat || 'misc', keep);
  engine.rebuildRack(ch);
  const cents = rows.map(r => r.centroid).filter(Number.isFinite);
  const uniq = new Set(cents.map(c => Math.round(c))).size;
  const takes = new Set(rows.map(r => r.take)).size;
  const rs = rows.map(r => r.rms).filter(Number.isFinite);
  if (rs.length) notes.push('rms ' + r3(Math.min(...rs)) + '..' + r3(Math.max(...rs)) +
    '  mean ' + r3(rs.reduce((a, b) => a + b, 0) / rs.length) +
    (dcy != null ? '   (amp decay = ' + dcy + ' x the take)' : '   (each pad\'s own decay)') +
    (gmod ? '   [global ' + gmod + ' env]' : ''));
  const cs2 = rows.map(r => r.centroid).filter(Number.isFinite);
  if (cs2.length) notes.push('centroid ' + Math.round(Math.min(...cs2)) + '..' +
    Math.round(Math.max(...cs2)) + '  mean ' +
    Math.round(cs2.reduce((a, b) => a + b, 0) / cs2.length) +
    (chflt ? '   (channel lowpass at ' + chflt + 'Hz)' : '   (no channel filter)'));
  const silent = rows.filter(r => !(r.peak > 0.01)).map(r => r.k);
  const unwired = rows.filter(r => r.wired === 'NO').map(r => r.k);
  notes.push((roll == null ? nm : 'rolled @wild ' + roll) + ': ' + takes + '/12 distinct takes, ' + uniq + '/12 distinct centroids' +
             (uniq <= 2 ? '  <-- THE PADS ARE ALL ONE SOUND' : ''));
  if (unwired.length) notes.push('NOT WIRED: ' + unwired.join(' '));
  if (silent.length) notes.push('SILENT: ' + silent.join(' '));
  return { cols: ['take', 'wired', 'dur', 'peak', 'rms', 'centroid'], rows };
}

/* ---------------- pwm: is the width a real width, and does it move smoothly ---
 * Two questions, and they are not the same one.
 *
 * IS IT A WIDTH? A pulse of duty d has EVERY harmonic — |b_k| = 4/(pi k)
 * |sin(pi k d)| — and that is what makes the edge sit anywhere other than
 * halfway. A square has only the ODD ones. So h2/h1 at d=0.25 is the whole
 * test: theory says 0.71, and a build that can only RESCALE the square's own
 * harmonics can never make it anything but 0, because zero times anything is
 * zero. That build has no width; it has a comb filter on a square.
 *
 * DOES IT MOVE SMOOTHLY? A pulse crosses zero exactly twice per cycle, always.
 * Move the width continuously and it still crosses twice — the edge simply
 * arrives earlier or later. Move it in STEPS and every step that lands on top
 * of the running phase flips the output where no edge belongs and then flips
 * back at the real one: an extra PAIR of crossings, which is the click. So the
 * excess over 2-per-cycle IS the click rate, and smooth means zero.
 *
 *     tools/probe.sh pwm ch=8 wav=3 rate=2 amt=70
 *     tools/probe.sh pwm --ab http://localhost:3032/                            */
async function probePwm() {
  const ch = CH === 9 ? 8 : CH;
  const WAV = Math.round(num(P.wav, 3));
  const RATE = num(P.rate, 2);
  const AMT = num(P.amt, 70);
  const FMW = Math.round(num(P.fmw, 0));
  const sr = AC.sampleRate;
  const keep = stash(ch);
  const mutes = [];
  const rows = [];
  let realPw = null;
  try {
    if (T.playing) stop();
    pin(ch);
    mutes.push(...muteOthers([ch]));
    const p = S.presets[ch];
    p.cat = 'keys';
    p.osc = rack(mkOsc);
    p.osc[0] = { wav: WAV, mode: 0, dst: 0, rat: 1, amt: 1, fine: 0, ph: 0, phm: 0, pw: 0.5 };
    p.flt = rack(mkFlt); p.flt[0].typ = 0;      // nothing between the operator and the bus
    p.fx = rack(mkFx);
    p.env = rack(mkEnv);
    p.env[0] = { dst: 1, idx: 0, amt: 100, a: 0.004, d: 0.02, s: 1, r: 0.05, crv: 0 };
    p.mod = rack(mkMod);
    p.mix.lvl = 1; p.mix.pan = 0;
    (modHolder(p, 'vox').vox || (p.vox = {})).fmw = FMW;
    /* the LFO, wired the way the picker wires one: an ADDRESS, which is the
       only shape modTick's ctrl path reads */
    p.mod[0] = Object.assign(mkMod(0), {
      src: 2, wav: 0, rate: RATE, syn: 0, ltr: 0, ph: 0, off: true,
      routes: [{ dst: 0, idx: 0, amt: AMT, tgt: null,
                 addr: { rack: 'osc', slot: 0, key: 'pw', lbl: 'width' } }] });
    S.editSnd = ch; S.curSlot = 0;
    engine.rebuildRack(ch); engine.refresh(ch);
    if (!resolveDest(p, p.mod[0].routes[0].addr).length)
      return { cols: [], rows: [], err: 'the pw route does not resolve on this build' };

    /* witness the width itself — a smooth reading means nothing until we know
       the modulator actually reached pw */
    const seen = [];
    realPw = engine.pwLive.bind(engine);
    engine.pwLive = function (pi2, si2, v2) {
      if (pi2 === ch && si2 === 0) seen.push(v2 === undefined ? -1 : v2);
      return realPw(pi2, si2, v2);
    };
    const grab = async ms => {
      engine.allOff(); await sleep(80);
      const bus = busOf(ch); if (!bus) return null;
      engine.noteOn(AC.currentTime + 0.02, ch, NOTE, VEL);
      await sleep(140);                       // past the attack and the first ticks
      seen.length = 0;
      const t = tap(bus);
      await sleep(ms);
      const [L] = t.stop();
      L._calls = seen.length;
      L._lo = seen.length ? Math.min.apply(null, seen) : null;
      L._hi = seen.length ? Math.max.apply(null, seen) : null;
      engine.allOff(); await sleep(50);
      return L;
    };
    /* HARMONICS BY GOERTZEL, NOT BY BIN. A 16384-point FFT is 2.7Hz per bin and
       a 129Hz note lands between bins, so a Hann peak-pick scallops by up to
       1.4dB and the +/-3 bin search walks onto a neighbour at high k. Summing
       x[n]e^-i2.pi.k.f0.n/sr against a Hann taper reads the amplitude AT the
       frequency asked for, whatever the bin grid happens to be. */
    const goertz = (x, hz, o, N) => {
      let re = 0, im = 0;
      const w = 2 * Math.PI * hz / sr;
      for (let n = 0; n < N; n++) {
        const win = 0.5 - 0.5 * Math.cos(2 * Math.PI * n / N), v = x[o + n] * win;
        re += v * Math.cos(w * n); im -= v * Math.sin(w * n);
      }
      return 2 * Math.sqrt(re * re + im * im) / N / 0.5;   // 0.5 = Hann coherent gain
    };
    /* and f0 refined until harmonic 1 is loudest — a crossing count is only
       good to a fraction of a cycle, and 1% of f0 times k=6 is a whole bin */
    const refine = (x, f0, o, N) => {
      let best = f0, bm = -1;
      for (let q = -30; q <= 30; q++) {
        const f2 = f0 * (1 + q * 0.001), m = goertz(x, f2, o, N);
        if (m > bm) { bm = m; best = f2; }
      }
      return best;
    };
    const harms = (x, f0, H) => {
      const N = Math.min(16384, x.length - 1);
      if (N < 4096) return null;
      const o = Math.round((x.length - N) / 2);
      const ff = refine(x, f0, o, N), out = [];
      for (let k = 1; k <= H; k++) out.push(goertz(x, k * ff, o, N));
      out.f = ff;
      return out;
    };
    /* THE DUTY THE WAVE ACTUALLY HAS: the falling edge's place between two
       rising ones, median over every cycle in the window. No spectrum and no
       assumptions — this is the number the whole ask is about. */
    /* the whole duty series, not just its median — a sweep that never moves and
       a sweep that moves smoothly BOTH show zero excess edges, and only the
       span tells them apart. A phase-engine operator whose table message never
       lands reads perfectly smooth because it is perfectly still. */
    const dutySeries = (x, per) => {
      const e = edges(x, per), d = [];
      for (let i = 0; i + 1 < e.rise.length; i++) {
        const f2 = e.fall.find(v => v > e.rise[i] && v < e.rise[i + 1]);
        if (f2 !== undefined) d.push((f2 - e.rise[i]) / (e.rise[i + 1] - e.rise[i]));
      }
      return d;
    };
    const dutyOf = (x, per) => {
      const d = dutySeries(x, per).slice().sort((a, b) => a - b);
      return d.length ? d[d.length >> 1] : null;
    };
    const dutySpan = (x, per) => {
      const d = dutySeries(x, per).slice().sort((a, b) => a - b);
      if (d.length < 8) return null;
      return { lo: +d[Math.round(0.05 * (d.length - 1))].toFixed(3),
               hi: +d[Math.round(0.95 * (d.length - 1))].toFixed(3) };
    };
    const theory = (d, H) => { const o = [];
      for (let k = 1; k <= H; k++) o.push(4 / (Math.PI * k) * Math.abs(Math.sin(Math.PI * k * d)));
      return o; };
    /* Schmitt crossings — hysteresis at a quarter of peak, so band-limit
       ringing around an edge cannot be counted as one */
    /* THE SPLIT IS THE MIDPOINT BETWEEN THE TWO LEVELS, NOT ZERO — and getting
       that wrong cost a whole round of numbers. A pulse carries no DC through a
       PeriodicWave, so at duty 0.15 it sits at +1.7 for 15% of the cycle and
       -0.3 for the other 85%: a threshold at a quarter of PEAK is +/-0.42, the
       low level never reaches -0.42, and the detector simply stops finding
       falling edges. Duty then read 0.486 for a 0.15 pulse and went
       NON-MONOTONIC, which is the tell. Split at (hi+lo)/2 with hysteresis
       scaled to the span and every duty reads alike. */
    const levels = x => {
      const srt = Array.from(x).sort((a, b) => a - b), n = srt.length;
      const lo = srt[Math.round(0.02 * (n - 1))], hi = srt[Math.round(0.98 * (n - 1))];
      return { lo, hi, mid: (hi + lo) / 2, h: 0.18 * (hi - lo) };
    };
    /* ...AND THE SPLIT HAS TO FOLLOW A MOVING WIDTH. Those two levels are
       1-2d apart from the mean, so a sweep from 0.185 to 0.815 walks the
       midpoint from +0.63 to -0.63: one split for the whole window counts the
       wrong things at both ends, which is why the excess came out -65/s.
       Local max/min over a couple of cycles tracks it. */
    const edges = (x, per) => {
      const n = x.length, L = levels(x);
      const pk = Math.max(Math.abs(L.hi), Math.abs(L.lo));
      if (L.hi - L.lo < 1e-4) return { pk: 0, n: 0, rise: [], fall: [] };
      const W = per ? Math.max(8, Math.round(per * 2)) : 0;
      let st = 0, cnt = 0; const rise = [], fall = [];
      let mid = L.mid, h = L.h, next = 0;
      for (let i = 0; i < n; i++) {
        if (W && i >= next) {                       // re-read the levels each window
          let mx = -1e9, mn = 1e9;
          for (let q = Math.max(0, i - (W >> 1)); q < Math.min(n, i + W); q++) {
            if (x[q] > mx) mx = x[q];
            if (x[q] < mn) mn = x[q];
          }
          if (mx - mn > 1e-4) { mid = (mx + mn) / 2; h = 0.18 * (mx - mn); }
          next = i + (W >> 2);
        }
        if (st <= 0 && x[i] > mid + h) { if (st) cnt++; rise.push(i); st = 1; }
        else if (st >= 0 && x[i] < mid - h) { if (st) { cnt++; fall.push(i); } st = -1; }
      }
      return { pk, n: cnt, rise, fall };
    };
    /* f0 FROM THE FIRST AND LAST RISING EDGE, not from a count over the window.
       A count divided by the window length is wrong by whatever fraction of a
       cycle hangs off each end — it read 128.1 on a 130.5Hz note, and 2% times
       harmonic 3 walks clean off the bin the FFT was sent to look at. Whole
       cycles between two rising edges is exact. */
    const f0Of = e => (e.rise.length > 4)
      ? (e.rise.length - 1) / ((e.rise[e.rise.length - 1] - e.rise[0]) / sr) : 0;

    /* ---- the ruler: one static note at 0.5, to learn f0 ---- */
    const A0 = await grab(480);
    if (!A0) return { cols: [], rows: [], err: 'no bus' };
    /* THE RULER IS THE CROSSING COUNT, not an FFT bin. At 2.7Hz per bin a peak
       pick is 1% out on a 130Hz note, and 1% times harmonic 6 walks clean off
       the harmonic it was sent to look at. A square crosses zero exactly twice
       per cycle, so counting them over a known window is exact. */
    const e0 = edges(A0);
    const f = f0Of(e0);
    if (!(f > 20)) return { cols: [], rows: [], err: 'silent, peak ' + r3(e0.pk) };

    /* ---- IS IT A WIDTH? one static row per duty ---- */
    const H = 6;
    for (const d of [0.5, 0.35, 0.25, 0.15]) {
      p.osc[0].pw = d;
      engine.rebuildRack(ch); engine.refresh(ch);
      const x = await grab(480);
      const hm = harms(x, f, H), th = theory(d, H);
      const rel = hm ? hm.map(v => v / (hm[0] || 1)) : [];
      const rth = th.map(v => v / (th[0] || 1));
      const row = { k: 'static pw ' + d.toFixed(2), hz: r3(hm && hm.f || f),
                    duty: r3(dutyOf(x, 0)), asked: d };
      for (let k = 2; k <= 3; k++) { row['h' + k] = r3(rel[k - 1]); row['want' + k] = r3(rth[k - 1]); }
      rows.push(row);
    }

    /* ---- DOES IT MOVE SMOOTHLY? static first, as the floor ---- */
    p.osc[0].pw = 0.5;
    engine.rebuildRack(ch); engine.refresh(ch);
    const A = await grab(450);
    /* COLD is the honest worst case and it is what a first sweep actually is:
       the cache has never seen these rows. It is also what a patch with two
       shape dials moving looks like forever, because the key space is the
       PRODUCT of the dials and it outruns 400 rows. */
    if (Math.round(num(P.cold, 1))) engine.waveCache.clear();
    p.mod[0].off = false;
    const B = await grab(Math.round(Math.min(4000, Math.max(700, 2000 / RATE))));
    const ea = edges(A, 0), eb = edges(B, sr / f);
    /* how many crossings a pulse MUST have over the same span: two per cycle,
       counted between the first and last rising edge so no partial cycle is
       charged to the total */
    const per = (z, e) => (e.rise.length > 4)
      ? 2 * f * (e.rise[e.rise.length - 1] - e.rise[0]) / sr + 1 : 2 * f * (z.length / sr);
    const spanA = (ea.rise[ea.rise.length - 1] - ea.rise[0]) / sr;
    const spanB = (eb.rise[eb.rise.length - 1] - eb.rise[0]) / sr;
    const nA = ea.rise.length * 2 - 1, nB = eb.rise.length * 2 - 1;
    rows.push({ k: 'sweep OFF (the floor)', hz: r3(f), h2: r3(ea.pk),
                want2: nA, h3: Math.round(per(A, ea)),
                want3: +((nA - per(A, ea)) / spanA).toFixed(1) });
    rows.push({ k: 'sweep ON  ' + RATE + 'Hz depth ' + AMT, hz: r3(f), h2: r3(eb.pk),
                want2: nB, h3: Math.round(per(B, eb)),
                want3: +((nB - per(B, eb)) / spanB).toFixed(1),
                h4: B._calls, want4: r3(B._lo) + '..' + r3(B._hi),
                duty: (sp => sp ? sp.lo + '..' + sp.hi : '?')(dutySpan(B, sr / f)),
                asked: r3(B._lo) + '..' + r3(B._hi) });
    p.mod[0].off = true;
  } finally {
    if (typeof realPw === 'function') engine.pwLive = realPw;
    for (const m of mutes) try { m(); } catch (_) {}
    unstash(ch, keep);
  }
  notes.push('STATIC rows: h2/h3/h4 against "want". A pulse of duty d has every harmonic; ' +
             'a square has only the odd ones. h2 reading 0 where want2 is not 0 means the ' +
             'width is not a width — the even harmonics were never created.');
  notes.push('SWEEP rows: h2=peak, want2=crossings counted, h3=crossings a pulse must have ' +
             '(2 per cycle), want3=EXCESS PER SECOND. That excess is the click rate. ' +
             'Smooth = 0. h4/want4 = pwLive calls and the width range they carried.');
  return { cols: ['hz', 'duty', 'asked', 'h2', 'want2', 'h3', 'want3', 'h4', 'want4'], rows };
}

/* ---------------- kitoct: does a kit pad move with the octave -----------
 * A kit picks its pad by PITCH CLASS and "octaves just transpose", so the same
 * pad played at C2, C3 and C4 is the same sound at three pitches. For a
 * SAMPLED pad that means three playback rates — and it decides whether the
 * keyboard's home can be moved an octave without every drum in the library
 * changing speed.
 *
 *     tools/probe.sh kitoct name=KT808 ch=8
 */
async function probeKitOct() {
  const nm = str(P.name, 'KT808');
  const ch = CH;
  const en = libAll().find(e => e && e.name === nm && e.cat === 'kit');
  if (!en) return { cols: [], rows: [], err: 'no kit named ' + nm };
  const keep = presetData(S.presets[ch]);
  setP(ch, en.name, 'kit', en.data);
  engine.rebuildRack(ch);
  await sleep(120);
  const rows = [];
  for (const midi of list(P.notes, ['24', '36', '48', '60', '72']).map(Number)) {
    const r = await hit(ch, () => engine.noteOn(AC.currentTime + 0.02, ch, midi, VEL), MS);
    rows.push({ k: 'C@' + midi + ' (' + NN[((midi % 12) + 12) % 12] + ')',
                hz: r.hz, centroid: r.centroid, peak: r.peak, rms: r.rms });
    try { engine.allOff(); } catch (_) {}
    await sleep(60);
  }
  setP(ch, keep.name || 'tmp', keep.cat || 'misc', keep);
  engine.rebuildRack(ch);
  const cs = rows.map(r => r.centroid).filter(Number.isFinite);
  if (cs.length > 1) {
    const ratios = [];
    for (let i = 1; i < cs.length; i++) ratios.push(r3(cs[i] / cs[i - 1]));
    notes.push('centroid ratio per octave: ' + ratios.join(' ') +
               '   (~2 = the pad transposes · ~1 = it is pinned)');
  }
  return { cols: ['hz', 'centroid', 'peak', 'rms'], rows };
}


/* ---------------- spread: can a bank's shape be moved at all -------------
 * `spread` is the one dial the six BANK filters share — fmnt vowl twin trip
 * comb rake — and it is the only filter dial that was reachable by nothing:
 * destRate had no entry for flt.spr, so the picker refused every route
 * ("nothing can drive spread yet"), and a hand edit went to rebuildRack, which
 * rebuilds the CHANNEL bus and never touches a voice that is already sounding.
 * Turn it under a held note and the peaks did not move.
 *
 * Three questions, one call: is it OFFERED as a destination, does a hand tweak
 * reach the note that is already sounding, and does a route on it actually
 * swing the peaks. The witness is peak 2 of the bank, in Hz — a centroid over
 * a whole saw is far too blunt to see a shape move.
 *
 *     tools/probe.sh spread ch=8 ty=rake
 *     tools/probe.sh spread --ab https://gadbaruch.github.io/Ten/                */
async function probeSpread() {
  const ch = CH === 9 ? 8 : CH;
  const ty = str(P.ty, 'rake');
  const keep = stash(ch);
  const mutes = [];
  const rows = [];
  try {
    if (T.playing) stop();
    pin(ch);
    mutes.push(...muteOthers([ch]));
    const p = S.presets[ch];
    p.cat = 'keys';
    p.osc = rack(mkOsc);
    p.osc[0] = { wav: 2, mode: 0, dst: 0, rat: 1, amt: 1, fine: 0, ph: 0, phm: 0, pw: 0.5 };
    p.env = rack(mkEnv);
    p.env[0] = { dst: 1, idx: 0, amt: 100, a: 0.004, d: 0.02, s: 1, r: 0.05, crv: 0 };
    p.flt = rack(mkFlt);
    p.flt.forEach((f, i) => { f.typ = i === 0 ? FTYPES.indexOf(ty) : 0; f.frq = 600; f.q = 6; f.spr = 0.4; });
    p.fx = rack(mkFx); p.mod = rack(mkMod);
    p.mix.lvl = 1; p.mix.pan = 0;
    S.editSnd = ch; S.curSlot = 0;
    engine.rebuildRack(ch); engine.refresh(ch);
    const offered = (destList(p) || []).some(d => d.rack === 'flt' && d.spec && d.spec.key === 'spr');
    rows.push({ k: 'offered as a destination', got: offered ? 'yes' : 'NO',
                want: 'yes', rate: destRate('flt', 'spr') || '(none)' });
    /* peak 2 of the bank, after moving spread on a note that is ALREADY held */
    const tweak = async sp => {
      p.flt[0].spr = 0.5; engine.rebuildRack(ch); engine.refresh(ch);
      engine.allOff(); await sleep(70);
      engine.noteOn(AC.currentTime + 0.02, ch, NOTE, VEL);
      await sleep(200);
      p.flt[0].spr = sp;
      if (typeof engine.sprLive === 'function') engine.sprLive(ch, 0, sp);
      else engine.rebuildRack(ch);
      await sleep(220);
      const v = (engine.act[ch] || [])[0], b = v && v.fBank && v.fBank[0];
      const hz = b && b[1] ? Math.round(b[1].frequency.value) : null;
      engine.allOff(); await sleep(50);
      return hz;
    };
    const lo = await tweak(0.05), hi = await tweak(0.95);
    rows.push({ k: 'hand tweak under a held note', got: lo + ' -> ' + hi,
                want: 'two different numbers', rate: (lo && hi && lo !== hi) ? 'MOVES' : 'DEAD' });
    /* and through the real ctrl path, from an LFO */
    p.flt[0].spr = 0.5;
    p.mod[0] = Object.assign(mkMod(0), { src: 2, wav: 0, rate: 3, syn: 0, ltr: 0, ph: 0,
      routes: [{ dst: 0, idx: 0, amt: 180, tgt: null,
                 addr: { rack: 'flt', slot: 0, key: 'spr', lbl: 'spread' } }] });
    engine.rebuildRack(ch); engine.refresh(ch);
    const res = resolveDest(p, p.mod[0].routes[0].addr).length;
    engine.allOff(); await sleep(70);
    engine.noteOn(AC.currentTime + 0.02, ch, NOTE, VEL);
    const seen = [];
    for (let i = 0; i < 40; i++) {
      await sleep(25);
      const v = (engine.act[ch] || [])[0], b = v && v.fBank && v.fBank[0];
      if (b && b[1]) seen.push(b[1].frequency.value);
    }
    engine.allOff();
    const mn = seen.length ? Math.round(Math.min.apply(null, seen)) : 0;
    const mx = seen.length ? Math.round(Math.max.apply(null, seen)) : 0;
    rows.push({ k: 'a 3Hz lfo on spread', got: mn + ' -> ' + mx,
                want: 'a wide swing', rate: res ? (mx - mn > 50 ? 'MOVES' : 'DEAD') : 'UNRESOLVED' });
  } finally {
    for (const m of mutes) try { m(); } catch (_) {}
    unstash(ch, keep);
  }
  notes.push('peak 2 of the bank in Hz is the witness — a centroid over a whole saw is ' +
             'too blunt to see a shape move. DEAD on any row is the bug.');
  return { cols: ['got', 'want', 'rate'], rows };
}

/* ---------------- kitdcy: how long a pad actually rings ------------------
 * RMS IN A WINDOW CANNOT SEE A DECAY. hit() measures around the onset, which
 * is where the envelope has not happened yet — sweeping the amp decay across a
 * 20x range moved the reported rms by nothing at all, three decimals
 * identical, which is what gave the wrong instrument away. This measures the
 * thing itself: time from the onset until the envelope has fallen 40dB.
 *
 *     tools/probe.sh kitdcy name=KT808 pad=0 dcys=0.15,0.35,0.7,1.5,3
 */
async function probeKitDcy() {
  const nm = str(P.name, 'KT808');
  const ch = CH, pc = Math.round(num(P.pad, 0));
  const en = libAll().find(e => e && e.name === nm && e.cat === 'kit');
  if (!en) return { cols: [], rows: [], err: 'no kit named ' + nm };
  const keep = presetData(S.presets[ch]);
  setP(ch, en.name, 'kit', en.data);
  engine.rebuildRack(ch);
  await sleep(150);
  const pad = (S.presets[ch].kit || [])[pc] || {};
  const ref = ((pad.osc || [])[0] || {}).smp;
  const e = ref && ref.f && POOLBYF.get(smpPath(ref.f));
  const dur = e && e.buf ? e.buf.duration : 0;
  /* `gmod=amp|pitch|pan` installs an ENVELOPE on the kit CHANNEL's shared rack,
     which is the thing being tested — and it is tested HERE, with ring time,
     because hit()'s window sits at the onset and cannot see an envelope at
     all. That instrument said "no change" for three different global mods
     that were in fact wired correctly. */
  const gmod = str(P.gmod, '');
  if (gmod) {
    const dst = { amp: 1, pitch: 2, filt: 3, pan: 4 }[gmod] || 1;
    const cp = S.presets[ch]; cp.kglob = 1;
    cp.mod[0] = { src: 1, rsel: 0, a: 0.001, d: num(P.gd, 0.03), s: 0, r: 0.02,
                  routes: [{ dst, idx: 0, amt: num(P.gamt, 100), ctr: 0, tgt: null }] };
    cp._addr = false; addrMod(cp);
    engine.rebuildRack(ch);
    await sleep(80);
  }
  const rows = [];
  for (const f of list(P.dcys, ['0.15', '0.35', '0.7', '1.5', '3']).map(Number)) {
    /* WRITE THE FOLDED SLOT, not p.env[0]. foldMod moves an envelope's
       a/d/s/r ONTO the mod slot (MSRC[1] = 'env'), and the engine reads it
       there — so setting p.env[0].d after loading changes nothing at all, and
       a sweep across a 40x range reported one number. */
    const es = (pad.mod || []).find(m => m && m.src === 1);
    const adsr = { a: 0.0004, d: Math.max(0.02, dur * f), s: 0, r: 0.02 };
    if (es) Object.assign(es, adsr);
    if (pad.env && pad.env[0]) Object.assign(pad.env[0], adsr);
    const bus = busOf(ch);
    const t = tap(bus);
    await sleep(30);
    engine.noteOn(AC.currentTime + 0.02, ch, 60 + pc, VEL);
    await sleep(Math.max(400, dur * 2200));
    const [L, R] = t.stop();
    try { engine.allOff(); } catch (_) {}
    /* envelope in 5ms frames, then the first frame after the peak that is
       40dB down and stays down */
    const W = Math.round(AC.sampleRate * 0.005), nf = Math.floor(L.length / W);
    let pk = 0, pkAt = 0;
    const env = new Float32Array(nf);
    for (let i = 0; i < nf; i++) {
      let s2 = 0;
      for (let j = i * W; j < (i + 1) * W; j++) s2 += L[j] * L[j];
      env[i] = Math.sqrt(s2 / W);
      if (env[i] > pk) { pk = env[i]; pkAt = i; }
    }
    let end = nf - 1;
    if (pk > 0) { const thr = pk * 0.01; for (let i = pkAt; i < nf; i++) if (env[i] < thr) { end = i; break; } }
    /* L AND R TOO, because a PAN mod is invisible to every other number here —
       and the ring, measured on L alone, COLLAPSES when a pan env is added
       (155ms -> 35ms) which reads as "the sound got shorter" when what
       happened is that it moved. A hand-rolled tap on the wrong bus node had
       already reported L and R equal for a route that was wired correctly;
       busOf is the tap that knows where a channel comes out. */
    const pkOf = a => { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i])); return m; };
    rows.push({ k: 'x' + f, d: r3(Math.max(0.02, dur * f)),
                ringMs: Math.round((end - pkAt) * 5), peak: r3(pk),
                pkL: r3(pkOf(L)), pkR: r3(pkOf(R)) });
    await sleep(60);
  }
  setP(ch, keep.name || 'tmp', keep.cat || 'misc', keep);
  engine.rebuildRack(ch);
  notes.push('pad ' + NN[pc] + ' · take ' + r3(dur) + 's · ring = onset to -40dB');
  return { cols: ['d', 'ringMs', 'peak', 'pkL', 'pkR'], rows };
}

/* ---------------- pwmall: which waves still STEP their width -------------
 * The excess-edge count in `pwm` only works on a pulse — it counts edge PAIRS
 * that should not be there. A saw or a triangle under a width sweep has no
 * edge to double, so that probe is blind to them, and "smooth" for a square
 * says nothing about the other three waves.
 *
 * This one is mechanism-agnostic. The note is periodic at f0, so take the
 * SECOND difference across one period:
 *
 *     r[n] = x[n] - 2x[n-P] + x[n-2P]        P fractional, interpolated
 *
 * A width that slides makes the waveform change smoothly period to period, and
 * a second difference cancels anything moving at a constant rate — r stays
 * small and smooth. A width that STEPS puts one whole period out of line with
 * its neighbours, and r gets an isolated spike. So the shape of r is the
 * answer, and crest (max/rms) and kurtosis both read it without needing a
 * calibrated threshold.
 *
 * Every wave is compared to ITS OWN floor — the same note with the modulator
 * off — because the interpolation at a fractional P leaves more residue on a
 * bright wave than a dull one, and that residue is not an artifact.
 *
 *     tools/probe.sh pwmall ch=8 rate=2 amt=70                                */
/* WHAT YOU PLAYED vs WHAT CAME BACK (Gad, 2026-08-28: "played notes and the
 * recorded notes are not the same like they are shifted after recording maybe
 * its the scaler doing some rogue adjusting").
 *
 * Three numbers per case, and the whole question is whether the last two agree:
 *   heard   engine.lastMidi after the keydown — the note trigger() DECIDED to
 *           play, i.e. post-transpose and post-scale-snap
 *   rec     the midi that landed in the lane
 *   replay  what trigger() decides when the SCHEDULER hands that stored note
 *           back (durSec!=null — the replay signature)
 * shift = replay - heard. Anything but 0 is the bug, in semitones.
 */
async function probeRecPitch() {
  const ch = CH;
  const p  = S.presets[ch];
  const pat = S.patterns[S.editPat];
  const lane = pat.lanes[ch];
  const keep = stash(ch);
  const keepCfg = { scaleOn: CFG.scaleOn, key: CFG.key, scale: CFG.scale,
                    kbd: CFG.kbd, qOn: CFG.qOn };
  const keepLane = JSON.parse(JSON.stringify(lane.toJSON()));
  const keepState = pat.state, keepPlaying = T.playing, keepOct = S.oct;
  const keepHeld = [...heldPCs.keys()];
  const keepSel = S.curPreset, keepLayer = S.layer;

  const ev = (ty, code) => document.dispatchEvent(
    new KeyboardEvent(ty, { code, key: code, bubbles: true, cancelable: true }));
  const wb = async x => { let g = 0; while (gridNow() < x && g++ < 4000) await sleep(5); };
  const nm = m => (m == null ? '—' : NN[((Math.round(m) % 12) + 12) % 12] + Math.floor(Math.round(m) / 12 - 1));

  const rows = [];
  /* one case: set the world up, play ONE key with rec armed, then ask the
     three questions. */
  const one = async (k, code, setup) => {
    for (const q of [...heldPCs.keys()]) heldPCs.delete(q);
    CFG.scaleOn = 1; CFG.key = 0; CFG.scale = 0; CFG.kbd = 'full'; CFG.qOn = 0;
    p.tr = 0; p.trs = 0; S.oct = 0;
    const note = setup ? setup() : null;
    lane.events = []; delete lane._cap; delete lane._rec;
    lane.unit = 'B'; lane.count = 1; lane.auto = false;
    pat.state = 'rec';
    if (!T.playing) play();
    await wb(Math.ceil(gridNow()) + 1);
    engine.lastMidi[ch] = null;
    ev('keydown', code);
    await sleep(90);
    const heard = engine.lastMidi[ch];
    ev('keyup', code);
    await sleep(140);
    const e0 = lane.events.find(e => e.midi !== undefined);
    const rec = e0 ? e0.midi : null;
    /* the replay, through the real door: durSec set is the scheduler's own
       signature and it is what makes trigger() skip the snap */
    let replay = null;
    if (rec != null) {
      engine.lastMidi[ch] = null;
      engine.trigger(AC.currentTime + 0.02, ch, rec, 0.9, 0.2);
      await sleep(60);
      replay = engine.lastMidi[ch];
      engine.allOff();
    }
    rows.push({ k, key: code,
                heard: heard == null ? null : Math.round(heard),
                rec: rec == null ? null : Math.round(rec),
                replay: replay == null ? null : Math.round(replay),
                shift: (heard != null && replay != null) ? Math.round(replay - heard) : null,
                sounded: nm(heard), back: nm(replay),
                t: e0 ? r3(e0.t) : null, dur: e0 ? r3(e0.dur) : null, n: lane.events.length });
    pat.state = 'on';
    await sleep(40);
  };

  try {
    S.layer = 1; S.curPreset = ch; S.mSel = false;
    if (isAudioCh(ch) || isKit(p) || isDrumCat(p.cat))
      notes.push('ch ' + ch + ' is ' + (isAudioCh(ch) ? 'audio' : isKit(p) ? 'a kit' : 'a drum cat') +
                 ' — the scale skips it by design; pass ch=<a melodic channel>');
    await one('plain',        'KeyD');
    await one('scale off',    'KeyD', () => { CFG.scaleOn = 0; });
    await one('trs +1',       'KeyD', () => { p.trs = 1; });
    await one('trs +2 (off-scale)', 'KeyD', () => { p.trs = 2; });
    await one('trs +3',       'KeyD', () => { p.trs = 3; });
    await one('tr +1 oct',    'KeyD', () => { p.tr = 1; });
    await one('piano kb, C#', 'KeyW', () => { CFG.kbd = 'piano'; });
    await one('piano kb, D',  'KeyS', () => { CFG.kbd = 'piano'; });
    await one('held chord',   'KeyS', () => { [0, 4, 7].forEach(addPC); });
    await one('key=F',        'KeyD', () => { CFG.key = 5; });
    /* THE GENERATORS. Their output is recorded by recPlayNote, which is handed
       a note that has ALREADY been through transpose and the snap — so the
       question here is whether the lane gets transposed twice. */
    await one('chord slot',   'KeyD', () => { p.ply[0] = ply1({ typ: 1, p1: 0 }); });
    await one('chord, tr +1 oct', 'KeyD', () => { p.ply[0] = ply1({ typ: 1, p1: 0 }); p.tr = 1; });
    await one('arp, tr +1 oct',   'KeyD', () => { p.ply[0] = ply1({ typ: 2, p1: 2, p3: 0.25 }); p.tr = 1; });
  } finally {
    try { stop(); } catch (_) {}
    if (keepPlaying) { try { play(); } catch (_) {} }
    Object.assign(CFG, keepCfg);
    for (const q of [...heldPCs.keys()]) heldPCs.delete(q);
    keepHeld.forEach(addPC);
    pat.state = keepState; S.oct = keepOct;
    S.curPreset = keepSel; S.layer = keepLayer;
    pat.lanes[ch] = Looper.from(keepLane);
    unstash(ch, keep);
  }
  notes.push('shift = replay - heard, in semitones. 0 is correct: the note the ' +
             'scheduler hands back must be the note your finger played.');
  return { cols: ['key', 'heard', 'rec', 'replay', 'shift', 'sounded', 'back', 't', 'dur', 'n'], rows };
}

/* THE MASTER IS A CHANNEL — IS IT? (Gad, 2026-08-28: "when on master channel
 * i need to be able to edit the loop length same as in normal channels, right
 * now it only changes the last visited channel, also i need to be able to
 * clear recordings on master same as normal channel".)
 *
 * Every row is one gesture made with the master selected, and the answer is
 * WHICH LANE MOVED: 0 is the master's own, anything else is the channel the
 * cursor was last on. `tgt` is chTargets() — the one function every
 * channel-scoped action asks — so it says whether the gesture was ever going
 * to land on the master at all.
 */
async function probeMaster() {
  const pat = S.patterns[S.editPat];
  const keepLanes = pat.lanes.map(l => (l ? JSON.parse(JSON.stringify(l.toJSON())) : null));
  const keepSel = S.curPreset, keepEd = S.editSnd, keepLayer = S.layer, keepM = S.mSel;
  const keepState = pat.state, keepPlaying = T.playing;
  const keepClips = JSON.parse(JSON.stringify(S.clips || {}));
  const keepScenes = JSON.parse(JSON.stringify(S.scenes || {}));
  const keepAt = JSON.parse(JSON.stringify(S.clipAt || {})), keepSc = S.sceneAt;

  const ev = (ty, code, mods) => document.dispatchEvent(new KeyboardEvent(ty,
    Object.assign({ code, key: code, bubbles: true, cancelable: true }, mods || {})));
  const lens = () => pat.lanes.map(l => (l ? +(l.count) : null));
  const cnts = () => pat.lanes.map(l => (l ? l.events.length : 0));
  const moved = (a, b) => { const o = []; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) o.push(i); return o.join(',') || 'none'; };

  const rows = [];
  /* one gesture, with the master selected at the given layer */
  const g = (k, layer, run) => {
    S.mSel = true; S.layer = layer; S.editSnd = 7; S.curPreset = 7;
    for (let i = 0; i < 10; i++) { const l = pat.lanes[i]; if (!l) continue;
      l.unit = 'B'; l.count = 2; l.auto = false;
      l.events = [{ t: 0, midi: 60, vel: 0.9, dur: 0.5 }]; delete l._cap; }
    const L0 = lens(), C0 = cnts();
    let err = null;
    try { run(); } catch (e) { err = String(e).slice(0, 60); }
    rows.push({ k, layer, tgt: '[' + chTargets().join(',') + ']', focus: focusCh(),
                lenMoved: moved(L0, lens()), notesCleared: moved(C0, cnts()),
                m0len: pat.lanes[0].count, err });
  };

  try {
    if (T.playing) stop();
    /* TAB+UP is the loop length. HOLD.tab is what the real chord sets. */
    const tabUp = () => { HOLD.tab = true; HOLD.tabAt = performance.now(); HOLD.tabUsed = false;
                          ev('keydown', 'ArrowUp'); HOLD.tab = false; };
    const tabDn = () => { HOLD.tab = true; HOLD.tabAt = performance.now(); HOLD.tabUsed = false;
                          ev('keydown', 'ArrowDown'); HOLD.tab = false; };
    const tabRight = () => { HOLD.tab = true; HOLD.tabAt = performance.now(); HOLD.tabUsed = false;
                             ev('keydown', 'ArrowRight'); HOLD.tab = false; };
    const shDel = () => { ev('keydown', 'Backspace', { shiftKey: true }); ev('keyup', 'Backspace', { shiftKey: true }); };
    g('tab+↑  (len ×2)',  1, tabUp);
    g('tab+↓  (len ÷2)',  1, tabDn);
    g('tab+→  (len +1)',  1, tabRight);
    g('⇧⌫  (clear lane)', 1, shDel);
    g('tab+↑  (len ×2)',  2, tabUp);
    g('tab+→  (len +1)',  2, tabRight);
    g('⇧⌫  (clear lane)', 2, shDel);

    /* ---- the 0+letter gestures, and the two ways to get one into the lane ---- */
    const dig = (n, code, mods) => { HOLD.dig = n; HOLD.digUsed = false;
      ev('keydown', code, mods); HOLD.dig = -1; };
    const at = () => CHANS().map(i => CLIPKEYS[(S.clipAt || {})[i] ?? 0]).join('');
    const m0 = () => pat.lanes[0].events.filter(e => e.clip !== undefined)
      .map(e => (e.ch === 0 ? (e.row ? 'row' : 'sc') : 'ch' + e.ch) + CLIPKEYS[e.clip] + '@' + r3(e.t)).join(' ') || 'none';
    const setup = () => { S.mSel = true; S.layer = 2; S.editSnd = 7; S.curPreset = 7;
      S.clips = {}; S.scenes = {}; S.clipAt = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}; S.sceneAt = 0;
      pat.state = 'on'; pat.lanes[0].events = []; };
    const g2 = (k, run) => { let err = null; try { run(); } catch (e) { err = String(e).slice(0, 70); }
      rows.push({ k, at: at(), sceneAt: CLIPKEYS[S.sceneAt ?? 0], master: m0(), err }); };

    setup();
    g2('0s   plain', () => dig(0, 'KeyS'));
    g2('0d   plain', () => dig(0, 'KeyD'));
    g2('3f   one channel', () => dig(3, 'KeyF'));
    g2('⇧0S  scene', () => dig(0, 'KeyS', { shiftKey: true }));
    g2('⇧0Q  scene', () => dig(0, 'KeyQ', { shiftKey: true }));

    /* RECORD: armed master lane, transport running — the gesture goes down */
    setup(); pat.lanes[0].unit = 'B'; pat.lanes[0].count = 4; pat.lanes[0].auto = false;
    pat.state = 'rec'; if (!T.playing) play();
    await sleep(200);
    g2('rec 1a  (already on a)', () => dig(1, 'KeyA'));
    g2('rec 1b  (a real move)', () => dig(1, 'KeyB'));
    g2('rec 0s  (playing)', () => dig(0, 'KeyS'));
    g2('rec ⇧0Q (playing)', () => dig(0, 'KeyQ', { shiftKey: true }));
    stop();

    /* ENTER: edit on the master, no transport — placed at the cursor cell */
    setup(); pat.lanes[0].unit = 'B'; pat.lanes[0].count = 4; pat.lanes[0].auto = false;
    pat.state = 'edit'; stepCur = 0;
    g2('edit 1a @cell0', () => dig(1, 'KeyA'));
    g2('edit 1b @cell0 (replaces)', () => dig(1, 'KeyB'));
    g2('edit 1b again (toggles off)', () => dig(1, 'KeyB'));
    g2('edit 0s @cell0', () => dig(0, 'KeyS'));
    stepCur = 4;
    g2('edit 1b @cell4', () => dig(1, 'KeyB'));
    g2('...did any of that FIRE?', () => {});

    /* REPLAY: a row event walks the desk, a bare ch0 event restores a scene */
    setup();
    S.clips = { 1: {}, 2: {} };
    g2('replay row-e', () => { const e = { clip: 4, ch: 0, row: 1 }; if (e.row) goSnaps(e.clip); });
    g2('replay scene-h (bare ch0)', () => { const e = { clip: 7, ch: 0 }; if (e.row) goSnaps(e.clip); else goScene(e.clip); });
  } finally {
    for (let i = 0; i < keepLanes.length; i++)
      if (keepLanes[i]) pat.lanes[i] = Looper.from(keepLanes[i]);
    S.curPreset = keepSel; S.editSnd = keepEd; S.layer = keepLayer; S.mSel = keepM;
    pat.state = keepState;
    S.clips = keepClips; S.scenes = keepScenes; S.clipAt = keepAt; S.sceneAt = keepSc;
    if (keepPlaying && !T.playing) { try { play(); } catch (_) {} }
    if (!keepPlaying && T.playing) { try { stop(); } catch (_) {} }
  }
  notes.push('every lane starts 2 bars with one note. lenMoved / notesCleared name the LANE INDEX ' +
             'that changed — 0 is the master, 7 is the channel the cursor was last on.');
  return { cols: ['layer', 'tgt', 'focus', 'lenMoved', 'notesCleared', 'm0len',
                  'at', 'sceneAt', 'master', 'err'], rows };
}

/* HOW FAR ONE PRESS MOVES A DIAL (Gad, 2026-08-28: "reso params should jump by
 * 0.1 normally, and 1 shifted" · "all params that are 0-1 should jump 0.01
 * normally and by 0.1 shifted for example reverb width and damp").
 *
 * Every param the fx racks and the filter offer, driven through adjust() —
 * the real door — at the three modifiers. `plain` and `shift` are what he
 * named; only rows that DISAGREE with the rule are printed unless all=1.
 */
async function probeSteps() {
  const ALL = num(P.all, 0) !== 0;
  const rows = [], seen = new Set();
  const look = (where, spec) => {
    if (!spec || spec.type === 'enum' || spec.type === 'freq' || spec.type === 'time') return;
    const lo = spec.min, hi = spec.max;
    if (!(Number.isFinite(lo) && Number.isFinite(hi))) return;
    const key = where + '|' + spec.lbl + '|' + lo + '|' + hi + '|' + spec.step + '|' + (spec.big ?? '');
    if (seen.has(key)) return; seen.add(key);
    /* FROM A VALUE ON THE GRID. `big` SNAPS the coarse step to its own
       multiples, so measuring from an arbitrary midpoint reports the distance
       to the next multiple and calls a correct dial broken — flt reso read
       0.95 from 12.05 and 1 from 12. */
    const grid = spec.big || spec.step || 1;
    const mid = Math.round((lo + (hi - lo) * 0.5) / grid) * grid;
    const d = m => r3(Math.abs(adjust(spec, mid, 1, m) - mid));
    const plain = d(1), shift = d(10), fine = d(0.1);
    /* the two rules he named, and the two things they deliberately do not
       cover: a curve:'vol' dial is a FADER (⇧10 · 2 · ⌥0.5 in fader units, so
       a wet/dry feels like the channel strip), and grain's pitch steps in
       SEMITONES (1/48 of ±24) because that is what a pitch dial is for. */
    const isUnit = lo === 0 && hi === 1 && !spec.curve && spec.lbl !== 'pitch';
    const isReso = /reso/.test(spec.lbl) && !(lo === 0 && hi === 1);
    const want = isUnit ? [0.01, 0.1] : isReso ? [0.1, 1] : null;
    const ok = !want || (Math.abs(plain - want[0]) < 1e-9 && Math.abs(shift - want[1]) < 1e-9);
    if (ALL || !ok || isReso)
      rows.push({ k: where + ' · ' + spec.lbl, lo, hi, step: spec.step, big: spec.big ?? '—',
                  plain, shift, fine, rule: want ? want.join(' / ') : 'n/a', ok: ok ? 'yes' : 'NO' });
    return ok;
  };

  let unit = 0, unitBad = 0, other = 0;
  const tally = spec => {
    if (!spec || spec.type === 'enum' || spec.type === 'freq' || spec.type === 'time') return;
    if (!(spec.min === 0 && spec.max === 1) || spec.curve || spec.lbl === 'pitch') { other++; return; }
    unit++;
    const d = m => Math.abs(adjust(spec, 0.5, 1, m) - 0.5);
    if (Math.abs(d(1) - 0.01) > 1e-9 || Math.abs(d(10) - 0.1) > 1e-9) unitBad++;
  };

  /* every fx type, through the real spec builder */
  for (let t = 0; t < XTYPES.length; t++) {
    const sl = Object.assign(mkFx ? mkFx() : {}, { typ: t, p1: 0.5, p2: 0.5, p3: 0.5, p4: 0.5,
                                                   p5: 0.5, p6: 0.5, p7: 0.5, mix: 0.5 });
    let sp2 = []; try { sp2 = FX_P(sl) || []; } catch (_) {}
    for (const s2 of sp2) { look('fx ' + XTYPES[t], s2); tally(s2); }
  }
  /* the channel racks: filter, env, amp, lfo, mod, ply — whatever paramsFor offers */
  const pre = S.presets[CH];
  for (let mi = 0; mi < MODULES.length; mi++) {
    const M = MODULES[mi]; if (!M || !M.id || M.prs) continue;
    const hold = modHolder(pre, M.id); const list = hold && hold[M.id];
    const slots = Array.isArray(list) ? list : [list];
    for (const sl of slots) {
      let sp2 = []; try { sp2 = paramsFor(mi, sl) || []; } catch (_) {}
      for (const s2 of sp2) { look(M.id, s2); tally(s2); }
    }
  }
  notes.push('0..1 params seen: ' + unit + ', of which ' + unitBad + ' still disagree with 0.01 / 0.1');
  notes.push('non-unit params seen: ' + other + ' (untouched)');
  notes.push('rows shown: every reso, plus anything that BREAKS a rule. pass all=1 for the lot.');
  if (!rows.length) rows.push({ k: 'every rule holds', lo: '', hi: '', ok: 'yes' });
  return { cols: ['lo', 'hi', 'step', 'big', 'plain', 'shift', 'fine', 'rule', 'ok'], rows };
}

/* THE SCALE AND THE GLOBAL CHORD (Gad, 2026-08-28: "i have 2 adjacent keys
 * playing the same note with scale on, and global chord changes looks like it
 * works, i can see notes moving but i dont hear the change").
 *
 * `keys`   what the home row maps to, as the key -> the note that SOUNDS
 * `uniq`   how many distinct notes those keys make. 10 keys, 10 notes is a
 *          playable row; anything less is two keys on one pitch.
 * `grid`   what heardMidi() DRAWS for a stored note
 * `sound`  what the scheduler actually plays for that same stored note
 *          (trigger with durSec set — the replay signature)
 * The last two disagreeing IS "i can see notes moving but i dont hear it".
 */
async function probeChord() {
  const ch = CH, p = S.presets[ch];
  const keep = stash(ch), keepCfg = { scaleOn: CFG.scaleOn, key: CFG.key, scale: CFG.scale, kbd: CFG.kbd };
  const keepHeld = [...heldPCs.keys()], keepHold = chordHold.slice();
  const keepPly = JSON.parse(JSON.stringify(p.ply || []));
  const other = ch === 6 ? 5 : 6, keepOther = stash(other);
  const ROW = ['KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL'];
  const nm = m => (m == null ? '—' : NN[((Math.round(m) % 12) + 12) % 12] + Math.floor(Math.round(m) / 12 - 1));
  const rows = [];

  /* what the key SOUNDS as: noteOf through trigger's own arithmetic, live */
  const sounds = (pi) => { const q = S.presets[pi]; return ROW.map(c => {
    const raw = KBBASE + S.oct * 12 + (noteOf(c, pi) ?? 0);
    let m = raw + (isKit(q) ? 0 : trSemis(q));
    if (CFG.scaleOn && !isDrumCat(q.cat) && !isChordMaster(q)) m = snapToPCs(m, pcsNow());
    return m;
  }); };

  const one = async (k, setup, viaCh) => {
    /* A CHORD MASTER'S OWN NOTE ADDS A PITCH CLASS AND TAKES IT BACK ON A
       TIMER (trigger: subPC after durSec). Without the wait the NEXT row runs
       with the previous row's note still in heldPCs — which is how this probe
       first reported "pcs 4" for a case with no chord anywhere. */
    await sleep(250);
    for (const q of [...heldPCs.keys()]) heldPCs.delete(q);
    chordHold.length = 0;
    CFG.scaleOn = 1; CFG.key = 0; CFG.scale = 0; CFG.kbd = 'full';
    S.presets[other].ply = (keepOther.data.ply || []).map(x => Object.assign({}, x));
    /* and the channel under test must not BE one — a master does not follow
       itself, so it would measure the snap never running */
    p.ply = keepPly.map(x => Object.assign({}, x)).filter(x => !isGlobalChordSlot(x));
    while (p.ply.length < keepPly.length) p.ply.push(mkPly());
    if (setup) setup();
    const S2 = sounds(viaCh == null ? ch : viaCh);
    /* one stored note, drawn and played */
    const stored = 52;                                    // E3 as it sits in a lane
    const drawn = heardMidi(ch, stored);
    engine.lastMidi[ch] = null;
    engine.trigger(AC.currentTime + 0.02, ch, stored, 0.9, 0.15);
    await sleep(60);
    const played = engine.lastMidi[ch];
    engine.allOff();
    rows.push({ k,
      pcs: pcsNow().slice().sort((a, b) => a - b).join(','),
      keys: S2.map(nm).join(' '),
      uniq: new Set(S2).size + '/' + ROW.length,
      grid: nm(drawn), sound: nm(played),
      agree: (drawn === played) ? 'yes' : 'NO' });
  };

  try {
    /* a channel that DEFINES the chord: a global chord slot on `other` */
    const master = () => { const sl = ply1({ typ: 1, p1: 0, p3: 1 });   // isGlobalChordSlot: typ 1, p3 == 1
      S.presets[other].ply = [sl].concat((keepOther.data.ply || []).slice(1));
      return sl; };
    await one('scale only, no chord master');
    await one('chord master exists, nothing held', () => { master(); });
    await one('chord master exists, C-E-G HELD', () => { master(); [0, 4, 7].forEach(addPC); });
    await one('released — chordHold sticks', () => { master(); chordHold.push(0, 4, 7); });
    await one('...now a Dm: D-F-A held', () => { master(); [2, 5, 9].forEach(addPC); });
    await one('scale OFF, chord held', () => { master(); [0, 4, 7].forEach(addPC); CFG.scaleOn = 0; });
    /* THE MASTER'S OWN ROW. It defines the chord, so it must not be laid out
       on it — press a key, it defines a chord; the next press mapped through
       that chord defines a different one, and one key toggles two chords
       forever. Asked of the MASTER channel itself. */
    await one('the MASTER\u2019s own keys, chord held', () => {
      const sl = ply1({ typ: 1, p1: 0, p3: 1 });
      S.presets[other].ply = [sl].concat((keepOther.data.ply || []).slice(1));
      S.presets[ch].ply = [Object.assign({}, sl)].concat(keepPly.slice(1));
      [0, 4, 7].forEach(addPC);
    }, ch);
    /* THE GLOBAL KEY REACHES A RECORDED NOTE (2026-08-29). No chord anywhere,
       key moved to F# — a stored C3 must come back in the new key, and the
       grid must say the same thing. */
    await one('key = F#, nothing held', () => { CFG.key = 6; });
    /* CLEARING THE MASTER HANDS THE KEY BACK (2026-08-29). The sticky chord
       survives your hand lifting — that is the point — but not the channel
       being emptied. */
    await one('Dm stuck (released, not cleared)', () => {
      master(); [2, 5, 9].forEach(addPC); [2, 5, 9].forEach(subPC);
      chordHold = [2, 5, 9];
    });
    await one('...then the master is CLEARED', () => {
      master(); [2, 5, 9].forEach(addPC); [2, 5, 9].forEach(subPC);
      chordHold = [2, 5, 9];
      clearLane(other);
    });
    await one('...cleared while STILL HOLDING it', () => {
      master(); chordHold = [2, 5, 9];
      [2, 5, 9].forEach(addPC);
      clearLane(other);
    });
  } finally {
    for (const q of [...heldPCs.keys()]) heldPCs.delete(q);
    chordHold.length = 0; keepHold.forEach(x => chordHold.push(x));
    keepHeld.forEach(addPC);
    Object.assign(CFG, keepCfg);
    unstash(ch, keep); unstash(other, keepOther);
  }
  notes.push('grid vs sound on the SAME stored note (52 = E3). They must agree or the ' +
             'display is telling you about a change you cannot hear.');
  notes.push('a global chord slot is ply typ 1 with p4=1 (isGlobalChordSlot).');
  return { cols: ['pcs', 'uniq', 'keys', 'grid', 'sound', 'agree'], rows };
}

/* RETRO'S ONE PROMISE (Gad, 2026-08-28: "when loop length already set, and
 * then i preform mid loop, let the loop wrap around to the beginning, then hit
 * retro rec, it only captures the beginning of the loop, instead it should
 * also capture the start of my performance that started mid loop").
 *
 * The promise the code states is "a note played on beat 3 comes back on beat
 * 3". So: seed the buffer with a performance whose loop positions are KNOWN,
 * tap retro, and ask where each note landed.
 *   want   fmod(playedAt - anchor, L) — where it was played in the loop
 *   got    where retro put it
 *   lost   played inside the last cycle but absent from the lane
 * `tap` is where in the loop the retro key was pressed, which is the variable
 * the bug lives in.
 */
async function probeRetro() {
  const ch = CH, pat = S.patterns[S.editPat], lane = pat.lanes[ch];
  const keepLane = JSON.parse(JSON.stringify(lane.toJSON()));
  const keepBuf = (retroBuf[ch] || []).slice();
  const keepPlaying = T.playing, keepState = pat.state;
  const keepSel = S.curPreset, keepLayer = S.layer;
  const BARS = Math.max(1, Math.round(num(P.bars, 4)));
  const rows = [];

  const wb = async x => { let g = 0; while (gridNow() < x && g++ < 1200) await sleep(4); };
  const keepBpm = T.bpm;

  try {
    S.layer = 1; S.curPreset = ch; S.mSel = false; pat.state = 'on';
    /* FAST, so five cases fit inside one eval. A 4-bar cycle at 120 is eight
       seconds of waiting for a phase; at 300 it is three. Nothing here is a
       timing measurement — the beats are the units. */
    setBpm(300);
    if (!T.playing) play();
    await sleep(150);
    if (!T.playing) { notes.push('transport would not start — nothing to measure'); return { cols: [], rows: [] }; }

    /* one case: tap the retro key `tapAt` beats into the cycle, having played
       a phrase that started `startBack` beats before that tap */
    const one = async (k, tapAt, startBack) => {
      lane.unit = 'B'; lane.count = BARS; lane.auto = false;
      lane.events = []; delete lane._cap; delete lane._rec;
      const L = lane.len, anc = editAnchor();
      /* land on the wanted phase of the cycle so `tap` is the real variable */
      const now0 = gridNow();
      const cyc = Math.ceil((now0 - anc) / L) * L;
      const target = anc + cyc + tapAt;
      await wb(target);
      const nowB = gridNow();
      /* the performance: one note a beat, ending at the tap */
      const played = [];
      for (let b = startBack; b >= 1; b--) played.push(nowB - b);
      retroBuf[ch] = played.map((t, i) => ({ t, midi: 60 + i, vel: 0.9, dur: 0.25 }));
      for (const k2 in RETRO.end) delete RETRO.end[k2];
      retroCapture();
      /* every note inside the last cycle must come back where it was played */
      const inCycle = played.filter(t => t > nowB - L - 1e-9);
      let lost = 0, moved = 0, worst = 0;
      const detail = [];
      inCycle.forEach((t, n) => {
        const i = played.indexOf(t), midi = 60 + i;
        const want = r3(fmod(t - anc, L));
        const ev = lane.events.find(e => e.midi === midi);
        if (!ev) { lost++; detail.push(midi + ':lost@' + want); return; }
        const got = r3(ev.t);
        const d = Math.abs(fmod(got - want + L / 2, L) - L / 2);
        if (d > 1e-6) { moved++; worst = Math.max(worst, r3(d)); detail.push(want + '->' + got); }
      });
      rows.push({ k, tap: r3(fmod(nowB - anc, L)), L, played: played.length,
                  inCycle: inCycle.length, inLane: lane.events.length,
                  lost, moved, worstShift: worst || 0,
                  ok: (!lost && !moved) ? 'yes' : 'NO',
                  sample: detail.slice(0, 4).join(' ') });
    };

    await one('tap on the cycle line', 0.05, Math.min(4 * BARS - 1, 8));
    await one('tap MID-loop, phrase crosses the wrap', 4.05, 8);
    await one('tap at beat 2 — off the bar line', 2.05, 6);
  } finally {
    try { stop(); } catch (_) {}
    try { setBpm(keepBpm); } catch (_) {}
    if (keepPlaying && !T.playing) { try { play(); } catch (_) {} }
    pat.lanes[ch] = Looper.from(keepLane);
    retroBuf[ch] = keepBuf;
    for (const k2 in RETRO.end) delete RETRO.end[k2];
    pat.state = keepState; S.curPreset = keepSel; S.layer = keepLayer;
  }
  notes.push('lost = played inside the last cycle and NOT in the lane. moved = in the lane ' +
             'at the wrong loop position. Both must be 0: retro promises a note played on ' +
             'beat 3 comes back on beat 3.');
  notes.push('sample shows want->got for the first few that moved.');
  return { cols: ['tap', 'L', 'played', 'inCycle', 'inLane', 'lost', 'moved', 'worstShift', 'ok', 'sample'], rows };
}

/* THE ARP THAT WOULD NOT LET GO (Gad, 2026-08-28: "holding rec>holding arp =
 * freezes arp like it latches when letting go of rec, arp is stuck for a few
 * rounds of loop then stops").
 *
 * A live arp note sits in engine.arpPool with an `until` beat; the note
 * handle's release() pulls that back to the key-up. So the whole question is
 * what `until` holds once the key is up.
 *   until   beats past the key-up that the pool will keep emitting
 *   pool    entries still in the pool 1s after the key-up
 *   steps   notes the arp actually emitted after the key came up
 * Anything but "until <= 0, pool 0, steps 0" is a stuck arp.
 */
async function probeArpLatch() {
  const ch = CH, p = S.presets[ch], pat = S.patterns[S.editPat], lane = pat.lanes[ch];
  const keep = stash(ch);
  const keepLane = JSON.parse(JSON.stringify(lane.toJSON()));
  const keepPlaying = T.playing, keepState = pat.state, keepBpm = T.bpm;
  const keepSel = S.curPreset, keepLayer = S.layer;
  const CODE = 'KeyD';
  const rows = [];
  const ev = (ty, code, mods) => document.dispatchEvent(new KeyboardEvent(ty,
    Object.assign({ code, key: code, bubbles: true, cancelable: true }, mods || {})));

  /* count what the arp emits, at the door the pool uses */
  let fired = 0;
  const realNoteOn = engine.noteOn;
  engine.noteOn = function (at, pi, ...a) { if (pi === ch) fired++; return realNoteOn.call(this, at, pi, ...a); };

  try {
    S.layer = 1; S.curPreset = ch; S.mSel = false;
    setBpm(300);
    p.ply = (p.ply || []).map(x => Object.assign({}, x));
    p.ply[0] = ply1({ typ: 2, p1: 2, p3: 0.25, p4: 60 });        // arp, 1/16, up
    lane.unit = 'B'; lane.count = 1; lane.auto = false;

    const one = async (k, rec, order) => {
      engine.allOff(); engine.arpPool[ch].length = 0;
      lane.events = []; delete lane._cap; delete lane._rec;
      for (const c2 of [...kbHeld]) kbHeld.delete(c2);
      noteLatch.clear(); SUS.clear();
      KM.sl = false; LATCH.on = false; LATCH.used = false;
      HOLD.tab = false; HOLD.tabUsed = false; HOLD.tabLatch = false;
      pat.state = rec ? 'rec' : 'on';
      if (!T.playing) play();
      await sleep(200);
      await order();
      /* the key is up — from here nothing should sound */
      const nowB0 = gridNow();
      const pool0 = engine.arpPool[ch].length;
      const untils = engine.arpPool[ch].map(e2 => (e2.until === Infinity ? 'inf' : r3(e2.until - nowB0)));
      fired = 0;
      /* WATCH THE LANE OVER SEVERAL ROUNDS. "stuck for a few rounds of loop
         then stops" is not a stuck arp — it is a take that is being ERASED
         while it plays, which is what a pend entry left behind does: the
         sweep follows the playhead and wipes what it passes, round on round,
         until there is nothing left. So count the lane, not the pool. */
      const cyc = lane.len * spb() * 1000;
      const trail = [lane.events.length];
      for (let r = 0; r < 4; r++) { await sleep(cyc); trail.push(lane.events.length); }
      const after = fired;
      const stale = Object.keys(pend).length, susN = SUS.size, heldN = kbHeld.size;
      const laneDur = lane.events.length ? r3(Math.max(...lane.events.map(e2 => e2.dur || 0))) : null;
      /* live = pool entries still owed time. A SPENT entry (until already
         past) is harmless housekeeping and must not read as a failure — the
         first version of this probe called every clean case NO for it. */
      const live = engine.arpPool[ch].filter(e2 => e2.until > gridNow()).length;
      rows.push({ k, rec: rec ? 'armed' : 'off',
                  poolAtUp: pool0, liveNow: live,
                  until: untils.slice(0, 3).join(',') || '—',
                  laneOverRounds: trail.join('→'), pend: stale, sus: susN, held: heldN,
                  stepsAfter: rec ? '(lane)' : after,
                  /* WITH REC ARMED THE LANE FEEDS THE POOL, legitimately —
                     the take that was just recorded is playing back through
                     the same arp. So liveNow and stepsAfter only mean
                     something with rec OFF, and a probe that says otherwise
                     flickers between yes and NO on a sampling race. */
                  ok: (!stale && (rec ? true : (live === 0 && after === 0))) ? 'yes' : 'NO' });
      engine.allOff(); engine.arpPool[ch].length = 0;
      await sleep(80);
    };

    const down = () => ev('keydown', CODE);
    const up   = () => ev('keyup', CODE);
    const tabD = () => { ev('keydown', 'Tab'); };
    const tabU = () => { ev('keyup', 'Tab'); };

    /* HIS REPRO (2026-08-29): "have playback paused > hold a few arp notes >
       let go > start playback = notice the arp is running even tho notes
       arent pressed". The pool's `until` is a beat on whichever clock was
       running; play() restarts the transport clock at 0. */
    await one('STOPPED · hold arp · let go · PLAY', false, async () => {
      try { stop(); } catch (_) {}
      await sleep(150);
      down(); await sleep(500); up(); await sleep(150);
      play(); await sleep(200);
    });
    await one('note alone, rec off', false, async () => { down(); await sleep(500); up(); await sleep(120); });
    await one('note alone, rec ARMED', true, async () => { down(); await sleep(500); up(); await sleep(120); });
    await one('tab down · note · note up · tab up', true, async () => {
      tabD(); await sleep(60); down(); await sleep(500); up(); await sleep(60); tabU(); await sleep(120); });
    await one('tab down · note · TAB UP · note up', true, async () => {
      tabD(); await sleep(60); down(); await sleep(500); tabU(); await sleep(60); up(); await sleep(120); });
    await one('rec LATCHED (win+tab) · note', true, async () => {
      tabD(); await sleep(40); KM.sl = true; latchArmHeld(); await sleep(20); tabU(); await sleep(60);
      KM.sl = false; down(); await sleep(500); up(); await sleep(120); });
  } finally {
    engine.noteOn = realNoteOn;
    try { engine.allOff(); } catch (_) {}
    engine.arpPool[ch].length = 0;
    for (const c2 of [...kbHeld]) kbHeld.delete(c2);
    noteLatch.clear(); SUS.clear(); KM.sl = false; LATCH.on = false;
    HOLD.tab = false; HOLD.tabLatch = false;
    try { stop(); } catch (_) {}
    try { setBpm(keepBpm); } catch (_) {}
    if (keepPlaying && !T.playing) { try { play(); } catch (_) {} }
    pat.state = keepState; pat.lanes[ch] = Looper.from(keepLane);
    S.curPreset = keepSel; S.layer = keepLayer;
    unstash(ch, keep);
  }
  notes.push('until = beats of arp still owed AFTER the key came up. "inf" is a pool entry ' +
             'whose release never fired — it arps until something else clears it.');
  notes.push('stepsAfter = notes the arp emitted in the 900ms after the key-up. Must be 0.');
  notes.push('laneOverRounds = how many events are in the lane at the key-up and after each ' +
             'of four loop cycles. A take that shrinks is being swept by a pend entry nobody ' +
             'took out; `pend` names how many are left behind.');
  notes.push('liveNow = pool entries still owed arp time with nothing held. Must be 0. ' +
             'stepsAfter is only meaningful with rec off — armed, the lane is legitimately ' +
             'playing back what was just recorded.');
  return { cols: ['rec', 'poolAtUp', 'liveNow', 'until', 'laneOverRounds', 'pend', 'sus', 'held', 'stepsAfter', 'ok'], rows };
}

/* A SNAPSHOT CARRIES ITS TAKE (Gad, 2026-08-28: "snapshots of channels that
 * contain different audio samples in audio channels should swap the audio when
 * changing snapshot").
 *
 * `take` is what the channel is actually holding after each move — the name
 * engine.audName reports, which is what the strip shows. The round trip at the
 * end is the one that used to fail silently: the OTHER snapshot's take is on
 * no channel at save time, so it had nothing to come back from.
 */
async function probeSnapAud() {
  const ch = CH, pat = S.patterns[S.editPat];
  const keep = { p: stash(ch), buf: engine.audBuf[ch], name: engine.audName[ch],
                 lane: JSON.parse(JSON.stringify(pat.lanes[ch].toJSON())) };
  const keepClips = JSON.parse(JSON.stringify(S.clips || {}));
  const keepAt = JSON.parse(JSON.stringify(S.clipAt || {}));
  const keepSel = S.curPreset, keepLayer = S.layer, keepM = S.mSel;
  const rows = [];
  const take = () => engine.audName[ch] || '—';
  const say = (k, extra) => rows.push(Object.assign(
    { k, at: CLIPKEYS[(S.clipAt || {})[ch] ?? 0], take: take(),
      buf: engine.audBuf[ch] ? r3(engine.audBuf[ch].duration) + 's' : 'none' }, extra || {}));

  try {
    S.layer = 1; S.curPreset = ch; S.mSel = false;
    S.clips = {}; S.clipAt = { 1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0 };
    /* two takes off the pool, told apart by name and length */
    const pool = POOL.filter(e => e && e.buf && e.name);
    if (pool.length < 2) { notes.push('pool has fewer than two takes — nothing to swap'); return { cols: [], rows: [] }; }
    const A = pool[0], B = pool.find(e => e !== A && e.name !== A.name) || pool[1];

    /* make the channel audio and give it take A on snapshot a */
    setEngine ? setEngine(ch, 'audio') : (S.presets[ch].cat = 'audio');
    S.presets[ch].cat = 'audio'; audDefaults(S.presets[ch]);
    engine.granNode(ch); engine.setChanBuf(ch, A.buf, A.name);
    engine.rebuildRack(ch); engine.refresh(ch);
    clipMark(ch);
    say('snapshot a, take A', { want: A.name });

    /* to b, and give it take B */
    goClip(ch, 1);
    engine.setChanBuf(ch, B.buf, B.name);
    say('moved to b, loaded take B', { want: B.name });

    goClip(ch, 0);
    say('back to a', { want: A.name, ok: take() === A.name ? 'yes' : 'NO' });
    goClip(ch, 1);
    say('back to b', { want: B.name, ok: take() === B.name ? 'yes' : 'NO' });

    /* THE ROUND TRIP. Serialize with the channel on b, so A lives only in the
       snapshot — exactly the case that had nothing to come back from. */
    const json = serialize(false);
    const o = JSON.parse(json);
    const inAud = (o.aud || []).filter(r => r && r.emb).map(r => r.n);
    const inCaud = (o.caud || []).map(r => r.n + (r.emb ? '(emb)' : '(ref)'));
    rows.push({ k: 'serialize, channel on b', at: 'b', take: take(), buf: '',
                want: 'A embedded somewhere',
                note: 'aud:[' + inAud.join(',') + '] caud:[' + inCaud.join(',') + ']',
                ok: (o.caud || []).some(r => r.n === A.name) ? 'yes' : 'NO' });

    /* drop A from the pool entirely and put it back the way a load does */
    const ai = POOL.indexOf(A); const savedA = POOL[ai];
    POOL.splice(ai, 1);
    restoreClipAudio(o.caud);
    const backA = poolFind({ n: A.name, src: A.src });
    rows.push({ k: 'A dropped from the pool, then restored', at: '', take: '',
                buf: backA && backA.buf ? r3(backA.buf.duration) + 's' : 'none',
                want: r3(savedA.buf.duration) + 's',
                ok: backA && backA.buf ? 'yes' : 'NO' });
    goClip(ch, 0);
    say('...and snapshot a still finds it', { want: A.name, ok: take() === A.name ? 'yes' : 'NO' });
    if (POOL.indexOf(savedA) < 0) POOL.splice(ai, 0, savedA);

    /* THE CASE THAT ACTUALLY NEEDED caud: a RECORDED take. A factory take is
       a path and comes back with the shelf; a recording exists nowhere but
       this set, so it has to ride embedded. */
    const R = AC.createBuffer(1, Math.round(AC.sampleRate * 0.4), AC.sampleRate);
    { const d = R.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.sin(i * 0.05) * 0.3; }
    poolAdd(R, 'probe-rec', { k: 'r' });
    goClip(ch, 2);                                   // snapshot c
    engine.granNode(ch); engine.setChanBuf(ch, R, 'probe-rec');
    goClip(ch, 0);                                   // leave it: c holds the only reference
    const o2 = JSON.parse(serialize(false));
    const rec = (o2.caud || []).find(r => r.n === 'probe-rec');
    rows.push({ k: 'a RECORDED take, referenced only by snapshot c', at: 'a', take: take(),
                buf: r3(R.duration) + 's',
                want: 'embedded in caud',
                note: rec ? (rec.emb ? 'emb ' + Math.round(rec.emb.d.length / 1024) + 'kB' : 'ref only') : 'ABSENT',
                ok: (rec && rec.emb) ? 'yes' : 'NO' });
    /* and it comes back from nothing but the file */
    const ri = POOL.findIndex(e => e && e.name === 'probe-rec');
    if (ri >= 0) POOL.splice(ri, 1);
    restoreClipAudio(o2.caud);
    goClip(ch, 2);
    rows.push({ k: '...pool wiped of it, restored from the set', at: 'c', take: take(),
                buf: engine.audBuf[ch] ? r3(engine.audBuf[ch].duration) + 's' : 'none',
                want: r3(R.duration) + 's',
                ok: take() === 'probe-rec' ? 'yes' : 'NO' });
    { const ri2 = POOL.findIndex(e => e && e.name === 'probe-rec');
      if (ri2 >= 0) POOL.splice(ri2, 1); }
  } finally {
    S.clips = keepClips; S.clipAt = keepAt;
    S.curPreset = keepSel; S.layer = keepLayer; S.mSel = keepM;
    pat.lanes[ch] = Looper.from(keep.lane);
    engine.audBuf[ch] = keep.buf; engine.audName[ch] = keep.name;
    unstash(ch, keep.p);
    try { engine.audRelockAll(); } catch (_) {}
  }
  notes.push('`take` is engine.audName — what the strip shows. ok=NO anywhere means the ' +
             'snapshot did not bring its sample back.');
  return { cols: ['at', 'take', 'buf', 'want', 'ok', 'note'], rows };
}

/* THE CLICK AT THE END OF A NOTE (Gad, 2026-08-28: "there is a click on note
 * off even when ther is long release and sustain is at 1 not sure whats going
 * on but env note off is not always very clean").
 *
 * A click is a DISCONTINUITY, so measure discontinuities. The bus is tapped
 * across the whole release; every sample-to-sample step is compared with the
 * median step of that same window.
 *   jumps    steps over 8x the median, in the release tail
 *   worst    the biggest step, as a multiple of the median
 *   cutAt    where the tail stops dead, in seconds after the note-off
 *   cutDb    the level at the sample BEFORE it stops — that is the size of
 *            the step to silence, and the click you hear
 * A clean release ends below about -90dB. -30dB is a click.
 */
async function probeEnvOff() {
  const ch = CH, p = S.presets[ch];
  const keep = stash(ch);
  /* ONE EVAL'S WORTH. Each case waits out rel*4 plus the tail, so the whole
     table is ~4x rel x cases seconds — at rel 2 and five cases that is 45s
     and the eval times out. rel 1 is still long enough that a step to
     silence is unmistakable. */
  const REL = num(P.rel, 1);
  const HOLD9 = num(P.hold, 400);
  const rows = [];
  const sr = AC.sampleRate;

  const db = v => (v > 0 ? +(20 * Math.log10(v)).toFixed(1) : -999);

  const one = async (k, setup) => {
    engine.allOff(); await sleep(120);
    /* one operator, flat sustain, a long release — his exact case */
    unstash(ch, keep);
    const q = S.presets[ch];
    q.cat = 'keys';
    q.osc.forEach((o, i) => { o.wav = i ? 0 : 2; o.amt = i ? 0 : 0.8; o.rat = 1; });
    /* THE AMP ENVELOPE IS A MOD SLOT, not p.env. p.env is the legacy shape
       and foldMod only reads it on an UNFOLDED preset, so writing it here
       reached nothing: the first run of this probe measured this.rel 0.058 —
       the no-envelope default of 0.05 — while claiming to test a 1s release. */
    q.mod[0] = Object.assign(mkMod(), { src: 1, rsel: 0,
      routes: [{ dst: 1, idx: 0, amt: 100, tgt: null }],
      a: 0.005, d: 0.05, s: 1, r: REL, crv: 0 });
    q.mod[0].off = false;
    for (let i = 1; i < q.mod.length; i++) q.mod[i].src = 0;
    q.flt.forEach(f => { f.typ = 0; });
    q.fx.forEach(f => { f.typ = 0; });
    q.mix = { lvl: 0.8, pan: 0 };
    if (setup) setup(q);
    engine.rebuildRack(ch); engine.refresh(ch);
    await sleep(120);
    /* what the VOICE ended up with, so a probe that failed to reach the
       envelope says so instead of reporting a clean release it never set */
    let relSeen = null;
    const bus = busOf(ch); if (!bus) { rows.push({ k, err: 'no bus' }); return; }
    const h = engine.trigger(AC.currentTime + 0.02, ch, NOTE, 0.9);
    await sleep(HOLD9);
    { const v = (engine.act[ch] || []).find(x => x && !x.killed); relSeen = v ? r3(v.rel) : null; }
    const t = tap(bus);
    await sleep(40);
    const relT = AC.currentTime;
    if (h && h.release) h.release(relT); else engine.allOff();
    /* the whole release, plus a second past where _end should have fired */
    await sleep((REL * 4 + 0.4) * 1000 + 400);
    const [L] = t.stop();
    engine.allOff();
    const n = L.length;
    /* where the tail stops dead: the last sample with any level in it */
    let last = -1;
    for (let i = n - 1; i >= 0; i--) if (Math.abs(L[i]) > 1e-7) { last = i; break; }
    /* envelope of the tail, so cutDb is a level and not one sample's phase */
    const W = Math.round(sr * 0.005);
    let pkAtCut = 0;
    for (let i = Math.max(0, last - W); i <= last; i++) { const v = Math.abs(L[i]); if (v > pkAtCut) pkAtCut = v; }
    let pk0 = 0;
    for (let i = 0; i < Math.min(n, W * 4); i++) { const v = Math.abs(L[i]); if (v > pk0) pk0 = v; }
    /* discontinuities across the tail */
    const seg = L.subarray(0, last + 1);
    const d = new Float64Array(Math.max(1, seg.length - 1));
    for (let i = 1; i < seg.length; i++) d[i - 1] = Math.abs(seg[i] - seg[i - 1]);
    const srt = Array.from(d).sort((a, b) => a - b);
    const med = srt[srt.length >> 1] || 1e-12;
    let big = 0, mx = 0;
    for (let i = 0; i < d.length; i++) { if (d[i] > 8 * med) big++; if (d[i] > mx) mx = d[i]; }
    /* how long the tail took to fall 12dB — says whether the release the
       slot asks for is the release you actually hear */
    let t12 = null;
    { const want = pk0 * 0.251;
      for (let i = 0; i <= last; i += 64) {
        let v = 0; for (let j = i; j < Math.min(i + 64, last + 1); j++) { const a2 = Math.abs(L[j]); if (a2 > v) v = a2; }
        if (v < want) { t12 = r3(i / sr - 0.04); break; } } }
    rows.push({ k,
      rel: REL, relSeen, held: db(pk0), t12,
      cutAt: last < 0 ? '—' : r3((last / sr) - 0.04),
      cutDb: last < 0 ? '—' : +(db(pkAtCut) - db(pk0)).toFixed(1),
      /* A CASE THAT MADE NO SOUND HAS NOTHING TO SAY ABOUT A CLICK, and
         reporting one as a failure is worse than dropping it — the filter-env
         case drove its cutoff shut and read cutDb +905. */
      ok: db(pk0) < -60 ? 'n/a — silent' :
          (last < 0 || db(pkAtCut) - db(pk0) < -80) ? 'yes' : 'NO' });
    await sleep(80);
  };

  try {
    const WHICH = str(P.only, '');
    const pick = k => !WHICH || k.indexOf(WHICH) >= 0;
    if (pick('native')) await one('native osc · sus 1 · long rel');
    if (pick('worklet')) await one('FM worklet (phase engine)', q => { q.eng = 1; });
    if (pick('filter')) await one('with a filter env', q => { q.flt[0].typ = 2; q.flt[0].frq = 3000; q.flt[0].q = 1;
      q.mod[1] = Object.assign(mkMod(), { src: 1, rsel: 0,
        routes: [{ dst: 3, idx: 1, amt: 25, tgt: null }],
        a: 0.005, d: 0.2, s: 1, r: REL, crv: 0 }); q.mod[1].off = false; });
    if (WHICH === 'more') { await one('native osc · sus 0.5', q => { q.env[0].s = 0.5; });
      await one('two ops, both sounding', q => { q.osc[1].wav = 2; q.osc[1].amt = 0.5; q.osc[1].rat = 2; }); }
  } finally {
    engine.allOff();
    unstash(ch, keep);
  }
  notes.push('cutDb = how far below the held level the sound was when it stopped DEAD. ' +
             'That step is the click. Under -80dB is inaudible; anything near -30 you hear.');
  notes.push('rel=' + REL + 's, sustain 1 — the release is the only thing shaping the tail.');
  notes.push('relSeen is the voice\u2019s own this.rel — if it does not match rel, the probe ' +
             'never reached the envelope and every other number is about the default 0.05.');
  notes.push('t12 = seconds for the tail to fall 12dB. With rel R the target is R/3 x 1.38.');
  return { cols: ['rel', 'relSeen', 'held', 't12', 'cutAt', 'cutDb', 'ok', 'err'], rows };
}

/* RETRO ON A LANE WITH NOTHING DECIDED (Gad, 2026-08-29: "retro rec on empty
 * ch with no set length — in that state retro needs to listen to the
 * performance and guess the length based on when started playing, with some
 * gap window like if silent for a bar then assume that the next playing is
 * the rec punch in position").
 *
 * The buffer IS the input retro reads, so each case writes a performance into
 * it directly and then presses the key. `bars` is what the lane came out as,
 * `took` how many of the notes it kept, `first` where the earliest kept note
 * landed. A guess that clips the take, or that swallows the warm-up on the
 * other side of the silence, is the failure.
 */
async function probeRetroGuess() {
  const ch = CH;
  const pat = S.patterns[S.editPat], lane0 = pat.lanes[ch];
  const keepLane = JSON.parse(JSON.stringify(lane0.toJSON()));
  const keepLanes = pat.lanes.map(l => (l ? JSON.parse(JSON.stringify(l.toJSON())) : null));
  const keepBuf = retroBuf.map(b => b.slice());
  const keepPlaying = T.playing, keepSel = S.curPreset, keepEd = S.editSnd, keepLayer = S.layer;
  const keepDef = CFG.defLen;

  const rows = [];
  /* one case: a synthetic performance in the buffer, then the retro key */
  const one = (k, notes, setLen) => {
    try { stop(); } catch (_) {}
    S.layer = 1; S.curPreset = ch; S.editSnd = ch; S.mSel = false;
    for (let i = 0; i < 10; i++) { pat.lanes[i].events = []; delete pat.lanes[i]._cap; }
    const lane = pat.lanes[ch];
    if (setLen) { lane.unit = 'B'; lane.count = setLen; lane.auto = false; }
    else { lane.unit = 'B'; lane.count = 1; lane.auto = true; }
    const base = gridNow() - 40;                     // well inside retro's 64-beat reach
    retroBuf[ch] = notes.map(n => ({ t: base + n[0], midi: 60 + (n[1] || 0),
                                     vel: 0.9, dur: n[2] || 0.25 }));
    const want = notes.length;
    /* THE SAME CALL THE CODE MAKES: stopped, retroCapture passes punchIn=true.
       Reporting the other variant here made this column disagree with the
       length the lane actually came out as, which is worse than no column. */
    const g = lane.auto ? retroGuess(ch, true) : null;
    let err = null;
    try { retroCapture(); } catch (e) { err = String(e).slice(0, 70); }
    const evs = lane.events.slice().sort((a, b) => a.t - b.t);
    const wrapped = evs.length > 1 && evs.some((e, i2) =>
      i2 > 0 && Math.abs(e.t - evs[i2 - 1].t) < 1e-6);
    rows.push({ k, auto: setLen ? 'SET ' + setLen : 'unset',
                guessBars: g ? g.bars : '—', guessSpan: g ? r3(g.span) : '—',
                bars: lane.count + UNIT_NAMES[lane.unit].slice(0, 1),
                took: evs.length + '/' + want,
                first: evs.length ? r3(evs[0].t) : null,
                last: evs.length ? r3(evs[evs.length - 1].t) : null,
                clipped: (evs.length && lane.len > 0 &&
                          evs[evs.length - 1].t >= lane.len - 1e-9) ? 'YES' : 'no',
                collide: wrapped ? 'YES' : 'no', err });
    try { stop(); } catch (_) {}
  };

  /* THE RUNNING CASE. The transport clock is wound back rather than waited
     out — posNow() is pure arithmetic off T.startTime, so a 21-beat-old
     transport is exactly a 21-beat-old transport. */
  const midRun = (k, notes, setBars, atBeat) => {
    try { stop(); } catch (_) {}
    S.layer = 1; S.curPreset = ch; S.editSnd = ch; S.mSel = false;
    for (let i = 0; i < 10; i++) { pat.lanes[i].events = []; delete pat.lanes[i]._cap; }
    const lane = pat.lanes[ch];
    if (setBars) { lane.unit = 'B'; lane.count = setBars; lane.auto = false; }
    else { lane.unit = 'B'; lane.count = 1; lane.auto = true; }
    play();
    T.startTime = AC.currentTime - atBeat * spb();   // the transport is `atBeat` old
    acts = [{ pat: S.editPat, start: -1e9, anchor: 0 }];
    retroBuf[ch] = notes.map(n => ({ t: n[0], midi: 60 + (n[1] || 0), vel: 0.9, dur: n[2] || 0.25 }));
    const want = notes.map(n => n[0]);
    const g = lane.auto ? retroGuess(ch, false) : null;   // running: no gap walk
    let err = null;
    try { retroCapture(); } catch (e) { err = String(e).slice(0, 70); }
    const L = lane.len;
    const got = lane.events.slice().sort((a, b) => a.t - b.t).map(e => r3(e.t));
    /* WHAT RETRO PROMISES, AS ARITHMETIC: the last L beats of PLAYING — the
       window ends at the last note, not at the clock and NOT at a cycle line —
       every note in it placed against the anchor.
       ⚠ THIS EXPECTATION HAD THE BUG IN IT. Snapping endT9 up to a bar line
       here is what the code did, so the probe agreed with it and called
       4-of-8 on a one-bar loop `yes`. An oracle derived from the
       implementation only ever checks that the code does what it does; it has
       to state the PROMISE, which is his sentence: everything I just played,
       where I played it. */
    const newest = Math.max(...want);
    const wantAt = want.filter(t => t > newest - L - 1e-9 && t <= newest + 1e-9)
                       .map(t => r3(fmod(t, L))).sort((a, b) => a - b);
    rows.push({ k, auto: setBars ? 'SET ' + setBars : 'unset',
                guessBars: g ? g.bars : '—',
                bars: lane.count + UNIT_NAMES[lane.unit].slice(0, 1),
                took: got.length + '/' + wantAt.length + ' of ' + want.length,
                at: got.join(' ') || '—',
                shouldBe: wantAt.join(' '),
                right: (got.length === wantAt.length &&
                        got.every((v, i2) => Math.abs(v - wantAt[i2]) < 1e-6)) ? 'yes' : 'NO',
                err });
    try { stop(); } catch (_) {}
  };

  try {
    CFG.defLen = 1;                                  // 1 bar — so a guess is visible against it
    /* eight 8ths over two bars, nothing before it */
    one('2-bar phrase, clean',
        [[0,0],[1,2],[2,4],[3,5],[4,7],[5,5],[6,4],[7,2]]);
    /* one bar */
    one('1-bar phrase', [[0,0],[1,2],[2,4],[3,5]]);
    /* a warm-up, ONE BAR of silence, then the take — the punch-in rule */
    one('warm-up · 1 bar silence · 2-bar take',
        [[0,0],[1,3],[2,7], /* gap */ [7,0],[8,2],[9,4],[10,5],[11,7],[12,5],[13,4],[14,2]]);
    /* a phrase whose last note sits just PAST the bar line: rounding down clips it */
    one('last note past the line (4.5)', [[0,0],[2,4],[4.5,7,0.5]]);
    /* a long one */
    one('4-bar phrase', [[0,0],[4,4],[8,7],[12,4],[15,2]]);
    /* HIS SCENARIO, RUNNING (2026-08-29: "if i start playing mid loop then
       wrap around and do retro rec, only the beginning of the loop is
       captured and not the end where i started playing from"). A 4-bar loop,
       the performance starts at beat 12 — bar 4, mid-loop — and runs past the
       wrap to beat 20. Every note must survive, and a note played at 12 must
       come back at 12. */
    const mid = [];
    for (let b = 12; b <= 20; b += 1) mid.push([b - 40 + 40, (b - 12) % 8]);
    midRun('4-bar SET · play 12→20 · retro at 21', mid, 4, 21);
    midRun('4-bar SET · a bar of rest inside', 
           [[12,0],[13,2],[14,4],[15,5],/* rest */[20,7]], 4, 21);
    midRun('AUTO · play 12→20 · retro at 21', mid, 0, 21);
    midRun('AUTO · a bar of rest inside',
           [[12,0],[13,2],[14,4],[15,5],/* rest */[20,7]], 0, 21);

    /* THE VARIABLE I ASSUMED AWAY: WHEN he hits retro. "let the loop wrap
       around to the beginning, THEN hit retro rec" — the wrap takes a whole
       cycle, so the clock has moved on. endB follows the clock and
       from = endB - L slides forward with it. */
    for (const at of [21, 24, 26, 28, 32, 36, 48, 64])
      midRun('4-bar SET · played 12\u219220 · retro at ' + at, mid, 4, at);
    /* HIS SINGLE-BAR CASE (2026-08-29: "im testing with single bar… i start
       playing mid bar and past the end of the bar then hit retro mid bar again
       where i started"). L=4, so the bar-snapped window IS exactly one bar —
       there is no slack, and anything played before the bar line falls out.
       This is why a longer loop (his channel 3) looked fine. */
    const cross = [[2,0],[2.5,2],[3,4],[3.5,5],[4,7],[4.5,5],[5,4],[5.5,2]];
    for (const at of [5.75, 6, 6.5, 7, 9, 13])
      midRun('1-BAR · played 2\u21925.5 across the line · retro at ' + at, cross, 1, at);
    /* the same phrase on a 4-bar loop — the slack that hid it */
    midRun('4-bar, same phrase · retro at 6', cross, 4, 6);

    /* AND THE GUARD AGAINST THE FIX OVER-REACHING: play again later and the
       window must follow the NEWER playing, not reach back for the old take. */
    midRun('...then played again 40\u219244 · retro at 46',
           mid.concat([[40,0],[41,2],[42,4],[43,5],[44,7]]), 4, 46);

    /* AND THE ONE THE GUESSER MUST NOT TOUCH: a length you set */
    one('length already SET to 2', [[0,0],[1,2],[2,4],[3,5],[4,7],[5,5],[6,4],[7,2]], 2);
    one('length already SET to 1', [[0,0],[1,2],[2,4],[3,5],[4,7],[5,5],[6,4],[7,2]], 1);
  } finally {
    try { stop(); } catch (_) {}
    for (let i = 0; i < keepLanes.length; i++)
      if (keepLanes[i]) pat.lanes[i] = Looper.from(keepLanes[i]);
    pat.lanes[ch] = Looper.from(keepLane);
    for (let i = 0; i < keepBuf.length; i++) retroBuf[i] = keepBuf[i];
    CFG.defLen = keepDef;
    S.curPreset = keepSel; S.editSnd = keepEd; S.layer = keepLayer;
    if (keepPlaying && !T.playing) { try { play(); } catch (_) {} }
    if (!keepPlaying && T.playing) { try { stop(); } catch (_) {} }
  }
  notes.push('CFG.defLen forced to 1 bar, so any length other than 1b on an unset lane came ' +
             'from listening. clipped = a note landed on or past the loop line; collide = two ' +
             'notes on one instant, which is what a too-short loop does to a phrase.');
  return { cols: ['auto', 'guessBars', 'guessSpan', 'bars', 'took', 'first', 'last',
                  'clipped', 'collide', 'at', 'shouldBe', 'right', 'err'], rows };
}

/* WHAT A MOD SCOPE MAKES, AND WHETHER IT AIMS IT (Gad, 2026-08-29: "scope M
 * now creates a macro immediately, it should always opt for env first" and
 * "oh and it doesnt even set the mod destination anymore - big bug").
 *
 * One row per scope letter, opened with the channel strip down on a KNOWN
 * parameter. `made` is the slot it created, `src` what kind, and `aimed` is
 * the whole question: did the new route get pointed at the parameter the
 * cursor was standing on, or at nothing.
 */
async function probeModScope() {
  const ch = CH;
  const keep = stash(ch);
  const keepLayer = S.layer, keepSel = S.curPreset, keepEd = S.editSnd;
  const keepMod = S.curMod, keepSlot = S.curSlot, keepP = S.slotParam;
  const ev = (ty, code, mods) => document.dispatchEvent(new KeyboardEvent(ty,
    Object.assign({ code, key: code, bubbles: true, cancelable: true }, mods || {})));
  const rows = [];

  /* the scope modifier is left control + numlock — SCOPEKEY, fixed */
  const scope = code => {
    KM.scp = true;
    ev('keydown', code, { ctrlKey: true });
    const H = HOLD.opt;
    ev('keyup', code, { ctrlKey: true });
    KM.scp = false;
    return H;
  };

  const LETTERS = [['KeyE', 'env'], ['KeyL', 'lfo'], ['KeyK', 'keytrack'],
                   ['KeyM', 'mod'], ['Slash', 'random']];
  try {
    for (const [code, nm] of LETTERS) {
      /* a clean mod rack, and the cursor parked on a real parameter */
      const p = S.presets[ch];
      p.mod = (p.mod || []).map((_, i) => mkMod(i));
      while (p.mod.length < 4) p.mod.push(mkMod(p.mod.length));
      S.layer = 2; S.curPreset = ch; S.editSnd = ch; S.mSel = false;
      S.curMod = MODULES.findIndex(M2 => M2 && M2.id === 'flt');
      S.curSlot = 0; S.slotParam = 1;                 // the filter's cutoff
      const before = p.mod.filter(m => m && m.src).length;
      let err = null, H = null;
      try { H = scope(code); } catch (e) { err = String(e).slice(0, 70); }
      const made = p.mod.findIndex(m => m && m.src);
      const sl = made >= 0 ? p.mod[made] : null;
      const rt = sl && sl.routes && sl.routes[0];
      rows.push({ k: nm + '  (⌃' + code.replace('Key', '') + ')',
                  wasEmpty: before === 0 ? 'yes' : before,
                  made: made < 0 ? 'none' : 'slot ' + made,
                  src: sl ? MSRC[Math.round(sl.src || 0)] : '—',
                  aimed: rt ? (rt.addr ? (rt.addr.rack + '.' + rt.addr.key)
                                       : (rt.dst ? 'dst ' + rt.dst : 'NOTHING')) : '—',
                  amt: rt ? rt.amt : '—',
                  scopeOpen: H ? H.c.replace('Key', '') : 'no',
                  err });
      HOLD.opt = null; HOLD.optLatched = false;
      for (const q of [...ALTSUS]) ALTSUS.delete(q);
      await sleep(40);
    }
    /* AND THE SECOND PRESS MUST NOT MAKE A SECOND ONE. ⌃M asks "what moves
       THIS knob" — so once something does, it has to arrive at it. Seeded with
       an LFO on the cutoff so the row also shows whether it finds a mod that
       is not an envelope, and whether the dials follow what it landed on. */
    for (const [seed, nm] of [[1, 'env'], [2, 'lfo'], [MSRC_MACRO, 'macro']]) {
      const p = S.presets[ch];
      p.mod = (p.mod || []).map((_, i) => mkMod(i));
      while (p.mod.length < 4) p.mod.push(mkMod(p.mod.length));
      S.layer = 2; S.curPreset = ch; S.editSnd = ch; S.mSel = false;
      S.curMod = MODULES.findIndex(M2 => M2 && M2.id === 'flt');
      S.curSlot = 0; S.slotParam = 1;
      /* slot 2 already modulates the cutoff, with the given source */
      Object.assign(p.mod[2], mkMod(2), { src: seed, off: false });
      p.mod[2].routes[0].addr = { rack: 'flt', slot: 0, key: 'frq', lbl: 'freq' };
      const n0 = p.mod.filter(m => m && m.src).length;
      let H = null, err = null;
      try { H = scope('KeyM'); } catch (e) { err = String(e).slice(0, 70); }
      const n1 = p.mod.filter(m => m && m.src).length;
      rows.push({ k: '\u2303M onto an existing ' + nm,
                  wasEmpty: n0 + ' slot(s)',
                  made: n1 > n0 ? 'MADE ANOTHER' : 'found it',
                  src: MSRC[Math.round(p.mod[2].src || 0)],
                  aimed: H ? 'slot ' + H.si : '—',
                  amt: p.mod[2].routes[0].amt,
                  scopeOpen: H ? (H.c.replace('Key', '') + ' \u00b7 ' + (H.fld || '?')) : 'no',
                  err });
      HOLD.opt = null; HOLD.optLatched = false;
      for (const q of [...ALTSUS]) ALTSUS.delete(q);
      await sleep(40);
    }
  } finally {
    HOLD.opt = null; HOLD.optLatched = false;
    for (const q of [...ALTSUS]) ALTSUS.delete(q);
    S.layer = keepLayer; S.curPreset = keepSel; S.editSnd = keepEd;
    S.curMod = keepMod; S.curSlot = keepSlot; S.slotParam = keepP;
    unstash(ch, keep);
  }
  notes.push('cursor parked on the FILTER CUTOFF before each scope opens. aimed=NOTHING means ' +
             'the slot was made pointing at no destination, so nothing it does can be heard.');
  return { cols: ['wasEmpty', 'made', 'src', 'aimed', 'amt', 'scopeOpen', 'err'], rows };
}

async function probePwmAll() {
  const ch = CH === 9 ? 8 : CH;
  const RATE = num(P.rate, 2), AMT = num(P.amt, 70);
  const FMW = Math.round(num(P.fmw, 0));
  const WAVS = list(P.wavs, ['0', '1', '2', '3']).map(Number);
  const sr = AC.sampleRate;
  const keep = stash(ch);
  const mutes = [];
  const rows = [];
  try {
    if (T.playing) stop();
    pin(ch);
    mutes.push(...muteOthers([ch]));
    const p = S.presets[ch];
    const at = (x, t) => { const i = Math.floor(t), f = t - i;
      return (i < 0 || i + 1 >= x.length) ? 0 : x[i] * (1 - f) + x[i + 1] * f; };
    /* JUNK BETWEEN THE TEETH. A note's energy sits ON the harmonics of f0; a
       width sweep smears each one into sidebands a few Hz wide. A STEP is
       broadband and lands everywhere, including the gaps. So: the bins from
       60Hz to 1.6kHz that are more than 25Hz from any harmonic, against the
       fundamental, in dB.

       This number is NOT comparable to an ideal — the legitimate sidebands sit
       in it too, and an exact continuous sweep reads WORSE than a stepped one
       that barely moves (measured: -42.2 ideal against -46.5 for a build whose
       width was not moving at all). It IS comparable BEFORE AND AFTER on the
       same wave, because the spectrum those two builds are asked for is
       identical and only the way the width arrives changed. */
    /* ⚠ ONE 16384-POINT WINDOW IS 371ms AND AN LFO CYCLE AT 0.5Hz IS TWO
       SECONDS, so a single centred window reads whichever 18% of the sweep it
       landed on — MEASURED: the same configuration gave 0.1, 18.2 and 26.2 dB
       on three consecutive runs. Every non-overlapping window across the whole
       grab, averaged, and the grab itself is at least two full LFO periods. */
    const junk1 = (x, f0, o) => {
      const N = 16384;
      const re = new Float64Array(N), im = new Float64Array(N);
      for (let i2 = 0; i2 < N; i2++)
        re[i2] = x[o + i2] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i2 / N));
      fft(re, im);
      const bhz = sr / N;
      let j2 = 0, jn = 0, fund = 0;
      for (let k = Math.round(60 / bhz); k < Math.round(1600 / bhz); k++) {
        const hz = k * bhz, m = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
        if (Math.abs(hz - f0) < 3 * bhz) fund = Math.max(fund, m);
        if (Math.abs(hz - Math.round(hz / f0) * f0) > 25) { j2 += m * m; jn++; }
      }
      return { j: j2 / Math.max(1, jn), f: fund * fund };
    };
    const junk = (x, f0) => {
      const N = 16384, w = Math.floor(x.length / N);
      if (w < 1) return null;
      let j = 0, f = 0;
      for (let i2 = 0; i2 < w; i2++) { const r = junk1(x, f0, i2 * N); j += r.j; f += r.f; }
      return +(10 * Math.log10(Math.max(1e-20, j / w) / Math.max(1e-20, f / w))).toFixed(1);
    };
    /* f0 FROM THE ENGINE, NOT FROM THE SIGNAL. Two origins do not necessarily
       play the same note — localStorage carries the octave — and this probe
       read 130.845 on one and 128.683 on the other for the same NOTE. 1.7% is
       26Hz at harmonic 12, which is exactly the guard band, so real harmonics
       fell into the "junk" bins and the pre-fix build showed a -43dB floor on a
       STATIC note. A voice knows what frequency it was built at; ask it. */
    /* A TRIANGLE HAS NO DISCONTINUITY OF ITS OWN. Band-limited, it is the
       smoothest wave in the set — so every large sample-to-sample jump in one
       IS an artifact, and no guard band or harmonic bookkeeping is needed to
       say so. (A saw jumps once per cycle by construction and a square twice,
       so for those the count is offset by that, not zero.) Threshold at 8x the
       MEDIAN step, which is robust to whatever slope the wave itself has. */
    const jumps = (x, f0) => {
      const n = x.length, d = new Float64Array(n - 1);
      for (let i = 1; i < n; i++) d[i - 1] = Math.abs(x[i] - x[i - 1]);
      const srt = Array.from(d).sort((a, b) => a - b);
      const med = srt[srt.length >> 1] || 1e-12;
      let big = 0, mx = 0;
      for (let i = 0; i < d.length; i++) { if (d[i] > 8 * med) big++; if (d[i] > mx) mx = d[i]; }
      return { per_s: +(big / (n / sr)).toFixed(1), worst: +(mx / med).toFixed(0) };
    };
    const grab = async ms => {
      engine.allOff(); await sleep(80);
      const bus = busOf(ch); if (!bus) return null;
      engine.noteOn(AC.currentTime + 0.02, ch, NOTE, VEL);
      await sleep(140);
      const v = (engine.act[ch] || [])[0];
      const pp = v && v.opPitch && v.opPitch[0] && v.opPitch[0][0];
      const t = tap(bus);
      await sleep(ms);
      const [L] = t.stop();
      L._f0 = (pp && pp.base > 20) ? pp.base : 0;
      engine.allOff(); await sleep(50);
      return L;
    };
    const goertz = (x, hz, o, N) => { let re = 0, im = 0; const w = 2 * Math.PI * hz / sr;
      for (let i = 0; i < N; i++) { const win = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N), v = x[o + i] * win;
        re += v * Math.cos(w * i); im -= v * Math.sin(w * i); }
      return Math.sqrt(re * re + im * im); };
    for (const wv of WAVS) {
      p.cat = 'keys';
      p.osc = rack(mkOsc);
      p.osc[0] = { wav: wv, mode: 0, dst: 0, rat: 1, amt: 1, fine: 0, ph: 0, phm: 0, pw: 0.5 };
      p.flt = rack(mkFlt); p.flt[0].typ = 0;
      p.fx = rack(mkFx); p.env = rack(mkEnv);
      p.env[0] = { dst: 1, idx: 0, amt: 100, a: 0.004, d: 0.02, s: 1, r: 0.05, crv: 0 };
      p.mod = rack(mkMod);
      p.mix.lvl = 1; p.mix.pan = 0;
      /* PIN THE VOICE. Unison and its detune spread make the sum INHARMONIC,
         which fills the gaps between the harmonics with energy that is not an
         artifact — the pre-fix build read a -43dB "floor" on a completely
         static note purely because its vox carried uni>1. One voice, no
         spread, no slop: then anything between the teeth got there by
         stepping. */
      Object.assign(modHolder(p, 'vox').vox || (p.vox = {}),
        { mode: 0, glide: 0, uni: 1, sprd: 0, wide: 0, slop: 0, fmw: FMW });
      p.mod[0] = Object.assign(mkMod(0), {
        src: 2, wav: 0, rate: RATE, syn: 0, ltr: 0, ph: 0, off: true,
        routes: [{ dst: 0, idx: 0, amt: AMT, tgt: null,
                   addr: { rack: 'osc', slot: 0, key: 'pw', lbl: 'width' } }] });
      S.editSnd = ch; S.curSlot = 0;
      engine.rebuildRack(ch); engine.refresh(ch);
      const A = await grab(500);
      if (!A) { rows.push({ k: 'wav ' + wv, floor: 'no bus' }); continue; }
      let f = A._f0;
      if (!f) {                          // no voice to ask: fall back to the spectrum
        const N = Math.min(16384, A.length - 1), o = Math.round((A.length - N) / 2);
        let bm = -1, bf = spectral(A, A, sr, 0, Math.min(NFFT, A.length)).hz;
        for (let q = -40; q <= 40; q++) { const f2 = bf * (1 + q * 0.001), m = goertz(A, f2, o, N);
          if (m > bm) { bm = m; f = f2; } }
      }
      const fl = junk(A, f), jA = jumps(A, f);
      p.mod[0].off = false;
      const B = await grab(700);
      p.mod[0].off = true;
      const sw = junk(B, f), jB = jumps(B, f);
      rows.push({ k: 'wav ' + wv + ' ' + (['sine', 'tri', 'saw', 'square'][wv] || '?'),
                  hz: r3(f),
                  floor: fl, swept: sw,
                  added: (fl != null && sw != null) ? +(sw - fl).toFixed(1) : '?',
                  jfloor: jA.per_s, jswept: jB.per_s, worst: jB.worst });
    }
  } finally {
    for (const m of mutes) try { m(); } catch (_) {}
    unstash(ch, keep);
  }
  notes.push('floor = the junk between the harmonics with the modulator OFF, dB under the ' +
             'fundamental. swept = the same with the width sweeping. Compare the SWEPT column ' +
             'between two builds — it is not meaningful against an absolute.');
  notes.push('jfloor/jswept = sample-to-sample jumps over 8x the median step, per second. ' +
             'On a TRIANGLE the wave has none of its own, so jswept above jfloor is the click ' +
             'rate outright. A saw carries one per cycle and a square two, by construction.');
  return { cols: ['hz', 'floor', 'swept', 'added', 'jfloor', 'jswept', 'worst'], rows };
}

/* ---------------- wtpos: does a MODULATED wavetable position click? ------
 * Gad, 2026-08-30: "wt op modulating the position of a wavetable is very
 * crackly, needs to be smooth."
 *
 * Same mechanism-agnostic metric as `pwmall`, because it is the same class of
 * fault: a wt operator is a PAIR of oscillators crossfading, and every table
 * change lands on the standby copy. If the standby is not actually silent when
 * the table lands, the swap is a waveform discontinuity — a click — and at a
 * control tick of ~6ms against a 12ms crossfade the standby is never silent.
 *
 * jswept - jfloor is the click rate. gWrite is the smoking gun: the GAIN of the
 * copy at the moment its table was replaced. Zero is what silent looks like.
 *
 *     tools/probe.sh wtpos ch=8 key=posa rate=2 amt=100                       */
async function probeWtPos() {
  const ch = CH === 9 ? 8 : CH;
  const KEY = String(P.key || 'posa');
  const RATE = num(P.rate, 2), AMT = num(P.amt, 100);
  const TA = Math.round(num(P.wta, 0)), TB = Math.round(num(P.wtb, 3));
  const sr = AC.sampleRate;
  const keep = stash(ch);
  const mutes = [], rows = [], notes = [];
  let realWt = null, realWave = null, realMod = null;
  try {
    if (T.playing) stop();
    pin(ch);
    mutes.push(...muteOthers([ch]));
    const p = S.presets[ch];
    /* the same junk-between-the-teeth reading pwmall uses, and the same
       caveat: comparable BEFORE and AFTER on one wave, never to an ideal */
    /* ⚠ ONE 16384-POINT WINDOW IS 371ms AND AN LFO CYCLE AT 0.5Hz IS TWO
       SECONDS, so a single centred window reads whichever 18% of the sweep it
       landed on — MEASURED: the same configuration gave 0.1, 18.2 and 26.2 dB
       on three consecutive runs. Every non-overlapping window across the whole
       grab, averaged, and the grab itself is at least two full LFO periods. */
    const junk1 = (x, f0, o) => {
      const N = 16384;
      const re = new Float64Array(N), im = new Float64Array(N);
      for (let i2 = 0; i2 < N; i2++)
        re[i2] = x[o + i2] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i2 / N));
      fft(re, im);
      const bhz = sr / N;
      let j2 = 0, jn = 0, fund = 0;
      for (let k = Math.round(60 / bhz); k < Math.round(1600 / bhz); k++) {
        const hz = k * bhz, m = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
        if (Math.abs(hz - f0) < 3 * bhz) fund = Math.max(fund, m);
        if (Math.abs(hz - Math.round(hz / f0) * f0) > 25) { j2 += m * m; jn++; }
      }
      return { j: j2 / Math.max(1, jn), f: fund * fund };
    };
    const junk = (x, f0) => {
      const N = 16384, w = Math.floor(x.length / N);
      if (w < 1) return null;
      let j = 0, f = 0;
      for (let i2 = 0; i2 < w; i2++) { const r = junk1(x, f0, i2 * N); j += r.j; f += r.f; }
      return +(10 * Math.log10(Math.max(1e-20, j / w) / Math.max(1e-20, f / w))).toFixed(1);
    };
    /* STEPPING vs SWEEPING, told apart without a calibrated threshold. The
       note is periodic at f0, so take the SECOND difference across one period:

           r[n] = x[n] - 2x[n-P] + x[n-2P]        P fractional, interpolated

       A table that slides makes the waveform change smoothly period to period
       and a second difference cancels anything moving at a constant rate — r
       stays small and NOISE-SHAPED. A table that STEPS puts one whole period
       out of line with its neighbours and r gets an isolated spike. So CREST
       (max/rms) is the answer, and it does not care how far the timbre moved,
       which is exactly what `added` cannot say. */
    const at = (x, t) => { const i = Math.floor(t), f = t - i;
      return (i < 0 || i + 1 >= x.length) ? 0 : x[i] * (1 - f) + x[i + 1] * f; };
    const resid = (x, f0) => {
      const P = sr / f0, o = Math.ceil(2 * P) + 2, n = x.length;
      if (n < o + 4096) return null;
      let s2 = 0, mx = 0; const m = n - o;
      const r = new Float64Array(m);
      for (let i = 0; i < m; i++) {
        const t = o + i;
        const v = x[t] - 2 * at(x, t - P) + at(x, t - 2 * P);
        r[i] = v; s2 += v * v; if (Math.abs(v) > mx) mx = Math.abs(v);
      }
      const rms = Math.sqrt(s2 / m);
      /* ⚠ crest is a single MAX — extreme-value statistics, and it wanders by
         a factor of two between identical runs. The 99.99th percentile says
         the same thing about isolated spikes and actually repeats. */
      /* how much of the energy sits in the loudest 0.1% of samples — a spike
         train puts it all there, a noise floor spreads it evenly (0.001) */
      const srt = Array.from(r, Math.abs).sort((a, b) => b - a);
      const top = Math.max(1, Math.round(m * 0.001));
      let te = 0; for (let i = 0; i < top; i++) te += srt[i] * srt[i];
      const p9999 = srt[Math.min(srt.length - 1, Math.round(m * 0.0001))];
      /* WHERE the loud residual sits, in ms from the start of the tap, and how
         many separate bursts there are — an intermittent artifact and a
         steadily rough sweep read the same on any single statistic. */
      /* ⚠ NOT `at` — that is the fractional-index interpolator this very
         function calls, and shadowing it is a TDZ error a syntax check will
         not find (CLAUDE.md says so, and here it is again). */
      const thr = 6 * rms;
      let peakAt = 0, mxv = 0, bursts = 0, run = 0;
      for (let i = 0; i < m; i++) {
        const a = Math.abs(r[i]);
        if (a > mxv) { mxv = a; peakAt = i; }
        if (a > thr) { if (!run) bursts++; run = 1; } else run = 0;
      }
      return { rms: +rms.toFixed(5), crest: +(mx / Math.max(1e-12, rms)).toFixed(1),
               p9999: +(p9999 / Math.max(1e-12, rms)).toFixed(2),
               atMs: +((peakAt + o) / sr * 1000).toFixed(0),
               ofMs: +(n / sr * 1000).toFixed(0), bursts,
               top01: +(te / Math.max(1e-20, s2)).toFixed(3) };
    };
    const jumps = x => {
      const n = x.length, d = new Float64Array(n - 1);
      for (let i = 1; i < n; i++) d[i - 1] = Math.abs(x[i] - x[i - 1]);
      const srt = Array.from(d).sort((a, b) => a - b);
      const med = srt[srt.length >> 1] || 1e-12;
      let big = 0, mx = 0;
      for (let i = 0; i < d.length; i++) { if (d[i] > 8 * med) big++; if (d[i] > mx) mx = d[i]; }
      return { per_s: +(big / (n / sr)).toFixed(1), worst: +(mx / med).toFixed(0) };
    };
    p.cat = 'keys';
    p.osc = rack(mkOsc);
    p.osc[0] = { wav: 14, mode: 0, dst: 0, rat: 1, amt: 1, fine: 0, ph: 0, phm: 0, pw: 0.5,
                 wta: TA, wtb: TB, posa: 0.5, posb: 0.5, mrph: 0, fold: 0 };
    p.flt = rack(mkFlt); p.flt[0].typ = 0;      // nothing between the operator and the bus
    p.fx = rack(mkFx);
    p.env = rack(mkEnv);
    p.env[0] = { dst: 1, idx: 0, amt: 100, a: 0.004, d: 0.02, s: 1, r: 0.05, crv: 0 };
    p.mod = rack(mkMod);
    p.mix.lvl = 1; p.mix.pan = 0;
    /* ONE VOICE, NO SPREAD — unison detune makes the sum inharmonic and fills
       the gaps with energy that is not an artifact (pwmall's own lesson) */
    Object.assign(modHolder(p, 'vox').vox || (p.vox = {}),
      { mode: 0, glide: 0, uni: 1, sprd: 0, wide: 0, slop: 0, fmw: 0 });
    p.mod[0] = Object.assign(mkMod(0), {
      src: 2, wav: 0, rate: RATE, syn: 0, ltr: 0, ph: 0, off: true,
      routes: [{ dst: 0, idx: 0, amt: AMT, tgt: null,
                 /* resolveDest matches on key AND LABEL, and the wt dials are
                    labelled 'pos a' not 'posa' — ask the spec, do not guess */
                 addr: { rack: 'osc', slot: 0, key: KEY,
                         lbl: (WTF.find(x => x.key === KEY) || { lbl: KEY }).lbl } }] });
    S.editSnd = ch; S.curSlot = 0;
    engine.rebuildRack(ch); engine.refresh(ch);
    if (!resolveDest(p, p.mod[0].routes[0].addr).length)
      return { cols: [], rows: [], err: 'the ' + KEY + ' route does not resolve on this build' };

    /* WITNESS THE SWAP. Wrap wtLive and read, for every table that lands, the
       gain of the copy it landed on. A silent-standby design reads ~0. */
    const seen = [];
    realWt = engine.wtLive.bind(engine);
    /* the gain BEFORE and whether the swap actually happened — wtLive refuses
       a write onto a loud copy now, and counting refusals as writes reads the
       gate's worst case as the mechanism's */
    engine.wtLive = function (pi2, si2, k2, v2) {
      const pre = [];
      if (pi2 === ch && si2 === 0)
        for (const vo of engine.act[pi2] || [])
          for (const w of (vo.opWt && vo.opWt[si2]) || [])
            pre.push({ w, ka: w.ka, kb: w.kb, ga: w.ga.gain.value, gb: w.gb.gain.value });
      const r = realWt(pi2, si2, k2, v2);
      /* A WRITE IS A COPY WHOSE TABLE CHANGED, not a call — wtLive refuses a
         write onto a loud copy now, and counting refusals reads the gate's
         worst case as the mechanism's. The gain recorded is the one the copy
         had at the moment the table landed ON it. */
      for (const q of pre) {
        let wrote = false, g = 0;
        if (q.w.ka !== q.ka) { wrote = true; g = Math.max(g, q.ga); }
        if (q.w.kb !== q.kb) { wrote = true; g = Math.max(g, q.gb); }
        seen.push({ v: v2, g, wrote });
      }
      return r;
    };
    const grab = async ms => {
      engine.allOff(); await sleep(80);
      const bus = busOf(ch); if (!bus) return null;
      engine.noteOn(AC.currentTime + 0.02, ch, NOTE, VEL);
      await sleep(140);                       // past the attack and the first ticks
      const v = (engine.act[ch] || [])[0];
      const pp = v && v.opPitch && v.opPitch[0] && v.opPitch[0][0];
      seen.length = 0;
      const t = tap(bus);
      await sleep(ms);
      const [L] = t.stop();
      L._f0 = (pp && pp.base > 20) ? pp.base : 0;
      L._n = seen.length;
      const wr = seen.filter(s => s.wrote).map(s => s.g);
      L._w = wr.length;
      L._gmax = wr.length ? +Math.max.apply(null, wr).toFixed(3) : null;
      L._gmed = wr.length
        ? +wr.slice().sort((a, b) => a - b)[wr.length >> 1].toFixed(3) : null;
      const vs = seen.filter(s => s.v != null).map(s => s.v);
      L._span = vs.length
        ? +(Math.max.apply(null, vs) - Math.min.apply(null, vs)).toFixed(3) : null;
      L._ms = +(ms / Math.max(1, seen.length)).toFixed(1);
      engine.allOff(); await sleep(50);
      return L;
    };
    /* WHAT IT COSTS THE MAIN THREAD. wtWave synthesises 1024 samples, folds
       them, runs a 64-harmonic DFT over all 1024 and then calls
       createPeriodicWave — which builds a band-limited table per octave. All
       of that on the main thread, inside the 8ms control tick. If the miss
       rate is anywhere near the tick rate the crackle is not a waveform step
       at all, it is the audio thread being starved, and no crossfade fixes
       that. (The pulse-width work hit exactly this once: "createPeriodicWave
       runs on the MAIN thread. It drained memory and starved modTick.") */
    const cpu = { calls: 0, miss: 0, ms: 0 };
    realWave = engine.wtWave.bind(engine);
    engine.wtWave = function (op) {
      const k = engine.wtKey ? engine.wtKey(op) : null;
      const hit = k != null && engine.waveCache.has(k);
      const t0 = performance.now();
      const r = realWave(op);
      cpu.calls++; if (!hit) cpu.miss++; cpu.ms += performance.now() - t0;
      return r;
    };
    /* and the tick itself: a starved main thread shows up as LATE ticks */
    const ticks = []; let tPrev = 0;
    realMod = engine.modTick.bind(engine);
    engine.modTick = function () { const n0 = performance.now();
      if (tPrev) ticks.push(n0 - tPrev); tPrev = n0; return realMod(); };
    /* THE BLEND MUST NOT DIP. The straddle holds BOTH copies at once — rung
       below at 1-x, rung above at x — so if the two oscillators are not
       phase-locked a half-way position partially cancels, and a 64-per-sweep
       amplitude ripple is itself a crackle. Static note, on a rung and
       half-way between two: the levels have to match. */
    /* DRIVEN THROUGH wtLive, not through the preset: a static note never calls
       it, so setting posa and rebuilding measures the BUILD-TIME table and says
       nothing about the blend. This is the live path a modulator uses. */
    const lvlAt = async pos => {
      engine.allOff(); await sleep(80);
      const bus = busOf(ch); if (!bus) return null;
      engine.noteOn(AC.currentTime + 0.02, ch, NOTE, VEL);
      await sleep(140);
      for (let i = 0; i < 12; i++) { engine.wtLive(ch, 0, 'posa', pos); await sleep(10); }
      const t = tap(bus);
      await sleep(300);
      const [L] = t.stop();
      engine.allOff(); await sleep(50);
      let s2 = 0; for (let i = 0; i < L.length; i++) s2 += L[i] * L[i];
      return +Math.sqrt(s2 / L.length).toFixed(5);
    };
    const r32 = await lvlAt(32 / 64), r33 = await lvlAt(33 / 64),
          between = await lvlAt(32.5 / 64);
    /* the two PURE rungs bracket it. Each table is peak-normalised on its own,
       so they need not have the same rms — the question is only whether the
       BLEND sits between them (phase-locked, no loss) or below both
       (cancelling). */
    const onRung = +((r32 + r33) / 2).toFixed(5);
    const A = await grab(700);
    if (!A) return { cols: [], rows: [], err: 'no bus on ch ' + ch };
    const f = A._f0 || 130.8;
    const jA = jumps(A), fl = junk(A, f), rA = resid(A, f);
    /* COLD is the honest worst case and it is what a first sweep actually is:
       the cache has never seen these rows. It is also what a patch with two
       shape dials moving looks like forever, because the key space is the
       PRODUCT of the dials and it outruns 400 rows. */
    if (Math.round(num(P.cold, 1))) engine.waveCache.clear();
    /* ⚠ DRIVE THE POSITION, DO NOT USE AN LFO. A sine LFO sweeps fast in the
       middle and slow at the ends, so the signal is NON-STATIONARY and every
       statistic over the window reads whichever part it covered — the same
       configuration gave `added` 0.1, 18.2 and 26.2 on three runs, and the
       spike percentile read the fast middle as a spike train (topS 0.575 on a
       sweep that has no steps in it at all).
       A constant rate makes it stationary, makes `rungs per tick` the dial
       that actually decides which branch of wtAim runs, and exercises exactly
       the code path a modulator does — _ctrlPut calls wtLive the same way. */
    const RUNGS = num(P.rungs, 0.5);            // rungs of the 64-grid per tick
    const stepPos = RUNGS / 64;
    let pos = 0, dir = 1;
    const drive = setInterval(() => {
      pos += dir * stepPos;
      if (pos >= 1) { pos = 1; dir = -1; } else if (pos <= 0) { pos = 0; dir = 1; }
      try { engine.wtLive(ch, 0, 'posa', pos); } catch (_) {}
    }, 8);
    let B;
    try { B = await grab(1500); } finally { clearInterval(drive); }
    const jB = jumps(B), sw = junk(B, f), rB = resid(B, f);
    const tk = ticks.slice().sort((a, b) => a - b);
    const tkMed = tk.length ? +tk[tk.length >> 1].toFixed(1) : null;
    const tkMax = tk.length ? +tk[tk.length - 1].toFixed(1) : null;
    rows.push({ k: RUNGS + ' rung/tick ' + WTNAMES[TA] + '/' + WTNAMES[TB], hz: r3(f),
                floor: fl, swept: sw,
                added: (fl != null && sw != null) ? +(sw - fl).toFixed(1) : '?',
                rF: rA && rA.rms, rS: rB && rB.rms,
                pF: rA && rA.p9999, pS: rB && rB.p9999,
                atMs: rB && rB.atMs, ofMs: rB && rB.ofMs, bursts: rB && rB.bursts,
                topF: rA && rA.top01, topS: rB && rB.top01,
                r32, r33, between,
                below: +(between - Math.min(r32, r33)).toFixed(5),
                dipDb: (onRung && between)
                  ? +(20 * Math.log10(between / onRung)).toFixed(2) : null,
                writes: B._w, gWrite: B._gmax, span: B._span,
                wCall: cpu.calls, wMiss: cpu.miss,
                wMs: +cpu.ms.toFixed(1), perMs: +(cpu.ms / Math.max(1, cpu.miss)).toFixed(2),
                tkMed, tkMax });
  } finally {
    try { if (realWt) engine.wtLive = realWt; } catch (_) {}
    try { if (realWave) engine.wtWave = realWave; } catch (_) {}
    try { if (realMod) engine.modTick = realMod; } catch (_) {}
    for (const m of mutes) try { m(); } catch (_) {}
    unstash(ch, keep);
  }
  notes.push('clicks = jswept - jfloor, sample-to-sample jumps over 8x the median step, per ' +
             'second. The wt table is band-limited and static at the floor, so anything ' +
             'the sweep ADDS got there by a discontinuity.');
  notes.push('calls = wtLive calls in the window · writes = the ones that actually put a ' +
             'table on an oscillator · gWrite = the WORST gain a copy had when a table ' +
             'landed ON it. 0 is silent and inaudible, near 1 is a full-scale flip.');
  notes.push('the position is DRIVEN at a constant `rungs` per 8ms tick, not by an LFO — a ' +
             'sine sweeps fast in the middle and slow at the ends and every statistic then ' +
             'reads whichever part of the cycle the window caught. rungs is also the dial ' +
             'that decides which branch of wtAim runs: under ~0.9 the straddle brackets the ' +
             'position, over it the fade takes over.');
  notes.push('rF/rS = rms of the one-period second difference, floor and swept. pF/pS = its ' +
             '99.99th percentile over rms, topS = the share of its energy in the loudest 0.1% ' +
             'of samples. A smooth sweep raises rms and leaves pS near the floor; a STEPPING ' +
             'one puts isolated spikes in and pS/topS climb. That pair is the answer — ' +
             '`added` cannot tell a big smooth sweep from a small steppy one. ' +
             'The swept take is at least TWO LFO periods and `added` averages every ' +
             'non-overlapping 16384-point window across it, because one centred window is ' +
             '371ms and read 0.1, 18.2 and 26.2 dB on three runs of the same thing.');
  notes.push('wCall/wMiss = wtWave calls and CACHE MISSES in the swept window · wMs = total ' +
             'main-thread ms inside wtWave · perMs = ms per miss · tkMed/tkMax = the control ' +
             'tick interval while it ran. A miss rate near the tick rate with a fat perMs is ' +
             'a starved audio thread, which is crackle no crossfade can fix.');
  notes.push('r32/r33 = rms of a STATIC note on each of two neighbouring cache rungs; ' +
             'between = half-way, where the straddle sounds BOTH. dipDb is between against ' +
             'their mean and `below` is between minus the quieter rung. The two tables are ' +
             'each peak-normalised so they need not match, but the blend must land BETWEEN ' +
             'them: below < 0 is the pair cancelling, which would ripple once per rung.');
  return { cols: ['hz', 'floor', 'swept', 'added', 'rF', 'rS', 'pF', 'pS', 'atMs', 'ofMs',
                  'bursts', 'topF', 'topS',
                  'r32', 'r33', 'between', 'below', 'dipDb',
                  'writes', 'gWrite', 'span', 'wCall', 'wMiss', 'wMs', 'perMs',
                  'tkMed', 'tkMax'], rows, notes };
}

/* ---------------- rollkey: does the dice key fire on the PRESS? ----------
 * Gad, 2026-08-30: "the roll clicking should activate on pressing / not on key
 * release - also for modifiers+roll".
 *
 * Wrap roll() and the auto-roll latch, then play each gesture and record WHEN
 * it landed — after the keydown, or only after the keyup. Every modifier
 * combination the key understands is in the table, because "also for
 * modifiers" is the half that is easy to fix for the bare key and miss for the
 * rest.
 *
 *     tools/probe.sh rollkey                                                  */
async function probeRollKey() {
  const rows = [], notes = [];
  const realRoll = roll, realKM = { sl: KM.sl, sr: KM.sr, shl: KM.shl };
  const seen = [];
  window.roll = function (mode, scope) { seen.push({ mode, scope: scope || '-' }); };
  const ev = (t, code, o) => document.dispatchEvent(new KeyboardEvent(t,
    Object.assign({ code, key: code, bubbles: true, cancelable: true }, o || {})));
  const auto0 = { on: AUTORND.on, ch: AUTORND.ch };
  try {
    pin(CH);
    const cases = [
      { k: '/',        pre: [], mods: {},                km: {} },
      { k: '⇧/ fresh', pre: [], mods: { shiftKey: true }, km: { sr: 1 } },
      { k: '⇧⌥/ wild', pre: [], mods: { shiftKey: true, altKey: true }, km: { sr: 1 } },
      { k: '\\+/ sound', pre: ['Backslash'], mods: {},    km: {} },
      /* v and n only become scope holds under the SCOPE key (ctlOf), and / is
         guarded by !altOf — so the real gesture arms them with ctrl down and
         then lets ctrl go, keeping the letter held */
      { k: 'v+/ vel',  pre: ['KeyV'], scp: 1, mods: {},   km: {} },
      { k: 'n+/ notes', pre: ['KeyN'], scp: 1, mods: {},  km: {} },
      { k: 'win+/ latch', pre: [], mods: {},             km: { sl: 1 }, latch: true },
    ];
    for (const c of cases) {
      /* the modifier FLAGS the code reads live, not the event's — KM is where
         a left/right shift and the win key are told apart */
      KM.sl = !!c.km.sl; KM.sr = !!c.km.sr; KM.shl = false;
      AUTORND.on = false; AUTORND.ch = -1;
      if (c.scp) KM.scp = true;
      for (const k of c.pre) ev('keydown', k);
      await sleep(20);
      KM.scp = false;                       // ctrl let go, the letter still held
      seen.length = 0;
      ev('keydown', 'Slash', c.mods);
      await sleep(30);
      const onDown = seen.slice(), latchDown = AUTORND.on;
      ev('keyup', 'Slash', c.mods);
      await sleep(30);
      const onUp = seen.slice(), latchUp = AUTORND.on;
      for (const k of c.pre.slice().reverse()) ev('keyup', k);
      await sleep(20);
      KM.sl = KM.sr = false;
      rows.push({ k: c.k,
                  when: c.latch ? (latchDown ? 'PRESS' : latchUp ? 'release' : 'never')
                                : (onDown.length ? 'PRESS' : onUp.length ? 'release' : 'never'),
                  n: c.latch ? (latchUp ? 1 : 0) : onUp.length,
                  mode: c.latch ? (AUTORND.mode || '-') : (onUp[0] ? onUp[0].mode : '-'),
                  scope: c.latch ? (AUTORND.scope || '-') : (onUp[0] ? onUp[0].scope : '-') });
    }
    /* AND THE LATCH REACHED FOR AFTER THE PRESS. The press cannot see it, so
       the release has to still be live for exactly this one case. */
    KM.sl = false; AUTORND.on = false; AUTORND.ch = -1;
    seen.length = 0;
    ev('keydown', 'Slash');
    await sleep(20);
    const rolledFirst = seen.length;
    KM.sl = true; latchArmHeld();
    await sleep(10);
    ev('keyup', 'Slash');
    await sleep(30);
    KM.sl = false;
    rows.push({ k: '/ then win', when: rolledFirst ? 'PRESS' : 'never',
                n: seen.length, mode: AUTORND.mode || '-',
                scope: AUTORND.on ? (AUTORND.scope || '-') : 'NOT LATCHED' });
    /* THE COST OF THE ASK, measured rather than asserted: /+↑↓ is the wildness
       dial and the press cannot know an arrow is coming, so reaching for
       wildness now rolls once on the way in. The dial itself must still work. */
    const w0 = CFG.wild ?? 35;
    seen.length = 0;
    ev('keydown', 'Slash');
    await sleep(20);
    const rollBeforeArrow = seen.length;
    ev('keydown', 'ArrowUp');
    await sleep(20);
    ev('keyup', 'ArrowUp');
    ev('keyup', 'Slash');
    await sleep(30);
    const w1 = CFG.wild ?? 35;
    CFG.wild = w0; try { saveCfg(); } catch (_) {}
    rows.push({ k: '/ then ↑ (wild)', when: rollBeforeArrow ? 'PRESS' : 'never',
                n: seen.length, mode: 'wild ' + w0 + '→' + w1,
                scope: w1 !== w0 ? 'dial ok' : 'DIAL DEAD' });
  } finally {
    window.roll = realRoll;
    KM.sl = realKM.sl; KM.sr = realKM.sr; KM.shl = realKM.shl; KM.scp = realKM.scp;
    AUTORND.on = auto0.on; AUTORND.ch = auto0.ch;
    HOLD.r = false; HOLD.rDid = null; HOLD.i = false; HOLD.v = false; HOLD.n = false;
  }
  notes.push('when = did the dice land on the keydown or only on the keyup. PRESS on every ' +
             'row is the ask. n = how many rolls the whole press-and-release produced: 1, ' +
             'never 2 — a press that rolls and a release that rolls again is a double.');
  notes.push('"/ then win" is the latch reached for AFTER the press: it must roll on the ' +
             'press AND still latch on the release, because the press could not have seen it. ' +
             '"/ then ↑" is the COST — the wildness dial now rolls once on the way in, and ' +
             'the dial itself still has to move.');
  return { cols: ['when', 'n', 'mode', 'scope'], rows, notes };
}

/* ---------------- wtshelf: what is on the wavetable shelf ----------------
 * Every table, at the dark end and the bright end of its position, through the
 * REAL path — createPeriodicWave normalises to peak 1, so a bright recipe with
 * fifty harmonics lands quieter in RMS than a sine no matter what the numbers
 * say, and only the audio answers that.
 *
 * Run it whenever WTBL changes: it says whether a new table is actually
 * brighter than the old ones, whether `pos` sweeps the same direction in all of
 * them, and whether any of them is a level outlier on the shelf.
 *
 *     tools/probe.sh wtshelf ch=8                                             */
async function probeWtShelf() {
  const ch = CH === 9 ? 8 : CH;
  const sr = AC.sampleRate;
  const keep = stash(ch);
  const mutes = [], rows = [], notes = [];
  try {
    if (T.playing) stop();
    pin(ch);
    mutes.push(...muteOthers([ch]));
    const p = S.presets[ch];
    p.cat = 'keys';
    p.flt = rack(mkFlt); p.flt[0].typ = 0;      // nothing between the operator and the bus
    p.fx = rack(mkFx); p.env = rack(mkEnv); p.mod = rack(mkMod);
    p.env[0] = { dst: 1, idx: 0, amt: 100, a: 0.004, d: 0.02, s: 1, r: 0.05, crv: 0 };
    p.mix.lvl = 1; p.mix.pan = 0;
    Object.assign(modHolder(p, 'vox').vox || (p.vox = {}),
      { mode: 0, glide: 0, uni: 1, sprd: 0, wide: 0, slop: 0, fmw: 0 });
    const take = async (ti, pos) => {
      p.osc = rack(mkOsc);
      p.osc[0] = { wav: 14, mode: 0, dst: 0, rat: 1, amt: 1, fine: 0, ph: 0, phm: 0, pw: 0.5,
                   wta: ti, wtb: ti, posa: pos, posb: pos, mrph: 0, fold: 0 };
      engine.rebuildRack(ch); engine.refresh(ch);
      engine.allOff(); await sleep(50);
      const bus = busOf(ch); if (!bus) return null;
      engine.noteOn(AC.currentTime + 0.02, ch, NOTE, VEL);
      await sleep(120);
      const t = tap(bus);
      await sleep(200);
      const [L] = t.stop();
      engine.allOff(); await sleep(30);
      let s2 = 0; for (let i = 0; i < L.length; i++) s2 += L[i] * L[i];
      return { rms: Math.sqrt(s2 / L.length) };
    };
    for (let ti = 0; ti < WTBL.length; ti++) {
      const lo = await take(ti, 0), hi = await take(ti, 1);
      /* harmonics in the recipe at each end — what the table is MADE of, next
         to what came out, so a table that is rich on paper and dull in the air
         shows up */
      const nLo = wtHarm(ti, 0).filter(v => Math.abs(v) > 0.012).length;
      const nHi = wtHarm(ti, 1).filter(v => Math.abs(v) > 0.012).length;
      /* ⚠ BRIGHTNESS FROM THE RECIPE, NOT FROM THE AUDIO. A measured spectral
         centroid is dominated by the NOISE FLOOR — 8000 bins of it outweigh
         one loud harmonic — and read ~1500Hz for every table including a pure
         sine, which is the third metric today to say something confident and
         wrong. The recipe IS the spectrum: power-weighted mean harmonic
         number, exact, no audio needed. */
      const cen = pos => { const h = wtHarm(ti, pos);
        let num = 0, den = 0;
        for (let k = 0; k < h.length; k++) { const p2 = h[k] * h[k]; num += (k + 1) * p2; den += p2; }
        return +(num / Math.max(1e-12, den)).toFixed(2); };
      const cLo = cen(0), cHi = cen(1);
      rows.push({ k: ti + ' ' + WTNAMES[ti],
                  frames: WTBL[ti][1].length, hLo: nLo, hHi: nHi,
                  cenLo: cLo, cenHi: cHi,
                  rmsLo: lo && +lo.rms.toFixed(4), rmsHi: hi && +hi.rms.toFixed(4),
                  dbLo: lo && +(20 * Math.log10(Math.max(1e-9, lo.rms))).toFixed(1),
                  dbHi: hi && +(20 * Math.log10(Math.max(1e-9, hi.rms))).toFixed(1) });
    }
  } finally {
    for (const m of mutes) try { m(); } catch (_) {}
    unstash(ch, keep);
  }
  const db = rows.flatMap(r => [r.dbLo, r.dbHi]).filter(v => typeof v === 'number');
  if (db.length)
    notes.push('level spread across the whole shelf: ' + Math.min.apply(null, db).toFixed(1) +
               ' to ' + Math.max.apply(null, db).toFixed(1) + ' dB, ' +
               (Math.max.apply(null, db) - Math.min.apply(null, db)).toFixed(1) + ' dB wide.');
  notes.push('hLo/hHi = harmonics above -38dB in the recipe at pos 0 and pos 1. cenLo/cenHi = ' +
             'the power-weighted mean HARMONIC NUMBER of the recipe there — 1 is a pure sine. ' +
             'cenHi should be the HIGHER of the two in every row: pos means brighter, ' +
             'everywhere, which is what makes the dial findable without looking.');
  notes.push('rms is what createPeriodicWave leaves after normalising to peak 1, so a rich ' +
             'table is quieter than a sine by construction. It is the SPREAD that matters.');
  const bad = rows.filter(r => r.cenHi != null && r.cenLo != null && r.cenHi < r.cenLo);
  if (bad.length) notes.push('!! pos gets DARKER in: ' + bad.map(r => r.k).join(', '));
  return { cols: ['frames', 'hLo', 'hHi', 'cenLo', 'cenHi', 'rmsLo', 'rmsHi', 'dbLo', 'dbHi'],
           rows, notes };
}

/* ---------------- wtalias: is the MODULATOR itself aliasing? -------------
 * Gad, 2026-08-30: "at fast modulations like put lfo at max speed on the
 * position and it will be inacurate and noisey."
 *
 * This is the test that settles it, and it does not need a judgement call. Put
 * a sine LFO at F on the wavetable position. If the position is a real
 * AudioParam the timbre is modulated at F and the spectrum grows sidebands at
 * k*f0 +/- F. If the position is written on the 8ms CONTROL TICK instead, the
 * modulator is being sampled at ~125Hz and the sampling folds it: sidebands
 * appear at k*f0 +/- |125 - F| as well, which for F=40 is 85Hz, a frequency
 * nothing in the patch has any business producing.
 *
 * So: Goertzel at the true sideband and at the alias, either side of several
 * harmonics, and report the ratio. alias-to-true in dB is the answer — deeply
 * negative is clean, near zero is the fault.
 *
 *     tools/probe.sh wtalias ch=8 lfo=40                                      */
async function probeWtAlias() {
  const ch = CH === 9 ? 8 : CH;
  const F = num(P.lfo, 40);
  const KEY = String(P.key || 'posa');
  const AMT = num(P.amt, 100);
  const TICK = num(P.tick, 125);          // the control-tick rate the old path ran at
  const sr = AC.sampleRate;
  const keep = stash(ch);
  const mutes = [], rows = [], notes = [];
  try {
    if (T.playing) stop();
    pin(ch);
    mutes.push(...muteOthers([ch]));
    const p = S.presets[ch];
    p.cat = 'keys';
    p.osc = rack(mkOsc);
    p.osc[0] = { wav: 14, mode: 0, dst: 0, rat: 1, amt: 1, fine: 0, ph: 0, phm: 0, pw: 0.5,
                 /* a BRIGHT table by default — the test looks for sidebands at
                    high harmonics and `basic` has none up there to carry them */
                 wta: Math.round(num(P.wta, 12)), wtb: Math.round(num(P.wtb, 12)),
                 posa: 0.5, posb: 0.5, mrph: 0, fold: 0 };
    p.flt = rack(mkFlt); p.flt[0].typ = 0;
    p.fx = rack(mkFx); p.env = rack(mkEnv);
    p.env[0] = { dst: 1, idx: 0, amt: 100, a: 0.004, d: 0.02, s: 1, r: 0.05, crv: 0 };
    p.mod = rack(mkMod);
    p.mix.lvl = 1; p.mix.pan = 0;
    Object.assign(modHolder(p, 'vox').vox || (p.vox = {}),
      { mode: 0, glide: 0, uni: 1, sprd: 0, wide: 0, slop: 0, fmw: 0 });
    p.mod[0] = Object.assign(mkMod(0), {
      src: 2, wav: 0, rate: F, syn: 0, ltr: 0, ph: 0, off: false,
      routes: [{ dst: 0, idx: 0, amt: AMT, tgt: null,
                 addr: { rack: 'osc', slot: 0, key: KEY,
                         lbl: (WTF.find(x => x.key === KEY) || { lbl: KEY }).lbl } }] });
    S.editSnd = ch; S.curSlot = 0;
    engine.rebuildRack(ch); engine.refresh(ch);
    const addr = p.mod[0].routes[0].addr;
    if (!resolveDest(p, addr).length)
      return { cols: [], rows: [], err: 'the ' + KEY + ' route does not resolve' };
    const lane = destRate('osc', KEY);

    engine.allOff(); await sleep(80);
    const bus = busOf(ch);
    if (!bus) return { cols: [], rows: [], err: 'no bus on ch ' + ch };
    engine.noteOn(AC.currentTime + 0.02, ch, NOTE, VEL);
    await sleep(200);
    const v = (engine.act[ch] || [])[0];
    const wired = !!(v && v.opWtN && (v.opWtN[0] || []).length);
    const pp = v && v.opPitch && v.opPitch[0] && v.opPitch[0][0];
    const f0 = (pp && pp.base > 20) ? pp.base : 130.8;
    const t = tap(bus);
    await sleep(2000);
    const [L] = t.stop();
    engine.allOff(); await sleep(50);

    /* Goertzel at an exact frequency, Hann-tapered — the sidebands sit a few Hz
       from a harmonic and a bin grid cannot resolve that */
    const N = Math.min(1 << 17, L.length - 1), o = Math.round((L.length - N) / 2);
    const g = hz => {
      let re = 0, im = 0; const w = 2 * Math.PI * hz / sr;
      for (let i = 0; i < N; i++) {
        const win = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N), x = L[o + i] * win;
        re += x * Math.cos(w * i); im -= x * Math.sin(w * i);
      }
      return 2 * Math.sqrt(re * re + im * im) / N / 0.5;
    };
    const ALIAS = Math.abs(TICK - F);
    /* ⚠ EVERYTHING AGAINST THE FUNDAMENTAL, not against the local carrier. A
       harmonic the recipe does not contain has no carrier to divide by, and
       the first cut of this probe happily printed alias-to-carrier ratios of
       +49dB where BOTH terms were -130dB noise. Referenced to h1 the numbers
       stay comparable all the way up, and the carrier column then says
       something too: junk at a harmonic the table does not have is junk. */
    const h1 = Math.max(1e-12, g(f0)), dB = x => +(20 * Math.log10(Math.max(1e-12, x) / h1)).toFixed(1);
    for (const k of [2, 4, 8, 12, 20]) {
      const c = k * f0;
      if (c + ALIAS > sr * 0.45) continue;
      const car = g(c);
      const tru = Math.max(g(c - F), g(c + F));
      const ali = Math.max(g(c - ALIAS), g(c + ALIAS));
      rows.push({ k: 'harm ' + k, hz: r3(c),
                  carrier: dB(car), trueSb: dB(tru), aliasSb: dB(ali),
                  aliasVsTrue: +(20 * Math.log10(Math.max(1e-12, ali) /
                                                 Math.max(1e-12, tru))).toFixed(1) });
    }
    /* ⚠ THE METRIC DEGENERATES WHEN THE ALIAS LANDS ON THE HARMONIC GRID.
       At a 5Hz LFO the fold sits at 120Hz and f0 is 131 — so the "alias" bin
       is measuring the note's own structure and both builds read alike. Say so
       rather than let the row be read as "no improvement". */
    const near = Math.abs(ALIAS - Math.round(ALIAS / f0) * f0);
    if (near < 20)
      notes.push('!! the alias at ' + r3(ALIAS) + 'Hz is only ' + r3(near) + 'Hz from a ' +
                 'harmonic of ' + r3(f0) + ' — this row is measuring the note, not the fold. ' +
                 'Raise the LFO or change the note.');
    notes.push('lfo ' + F + 'Hz on ' + KEY + ' · f0 ' + r3(f0) + 'Hz · alias sought at ' +
               r3(ALIAS) + 'Hz (|' + TICK + ' - ' + F + '|) · route lane = ' + lane +
               ' · worklet on the voice: ' + (wired ? 'YES' : 'no (native pair)'));
  } finally {
    for (const m of mutes) try { m(); } catch (_) {}
    unstash(ch, keep);
  }
  notes.push('carrier/trueSb/aliasSb are dB under the FUNDAMENTAL. aliasVsTrue is the ' +
             'one that matters: the alias sideband against the real one. Deeply negative is ' +
             'a modulator that is actually being read at audio rate; near 0 means the ' +
             'position is being written on a tick slow enough to fold the LFO.');
  return { cols: ['hz', 'carrier', 'trueSb', 'aliasSb', 'aliasVsTrue'], rows, notes };
}

/* ---------------- lfosync: does a synced LFO actually LOCK? --------------
 * Gad, 2026-08-30: "something broke with lfo doesnt do sync anymore."
 *
 * Sync is TWO claims and the rate is only the easy one:
 *   RATE   1/4 at 120bpm is 2Hz. This was always right.
 *   PHASE  two notes a whole number of bars apart must find the wave in the
 *          SAME PLACE. That is what makes it feel locked, and it is what a
 *          free-run phase taken off AC.currentTime cannot do — the audio
 *          clock's zero and the transport's zero are unrelated.
 *   TEMPO  moving the tempo has to move a SOUNDING one, not just the next note.
 *
 * The phase is read out of the built PeriodicWave rather than guessed: the
 * wave's own coefficients carry the phase setWave baked in.
 *
 *     tools/probe.sh lfosync ch=8 bpm=120 rdiv=6                              */
async function probeLfoSync() {
  const ch = CH === 9 ? 8 : CH;
  const BPM = num(P.bpm, 120);
  const RD = Math.round(num(P.rdiv, 6));
  const keep = stash(ch);
  const mutes = [], rows = [], notes = [];
  const bpm0 = T.bpm;
  let realSW = null;
  try {
    if (T.playing) stop();
    pin(ch);
    mutes.push(...muteOthers([ch]));
    setBpm(BPM);
    const p = S.presets[ch];
    p.cat = 'keys';
    p.osc = rack(mkOsc);
    p.osc[0] = { wav: 0, mode: 0, dst: 0, rat: 1, amt: 1, fine: 0, ph: 0, phm: 0, pw: 0.5 };
    p.flt = rack(mkFlt); p.flt[0].typ = 0;
    p.fx = rack(mkFx); p.env = rack(mkEnv);
    p.env[0] = { dst: 1, idx: 0, amt: 100, a: 0.004, d: 0.02, s: 1, r: 0.05, crv: 0 };
    p.mod = rack(mkMod);
    p.mix.lvl = 1; p.mix.pan = 0;
    /* ltr 1 = FREE, which is the mode where the phase has to come off the grid;
       retrig restarts at every note and can never be out of sync by definition */
    p.mod[0] = Object.assign(mkMod(0), {
      src: 2, wav: 0, rate: 5, syn: 1, rdiv: RD, ltr: 1, ph: 0, off: false,
      routes: [{ dst: 0, idx: 0, amt: 100, tgt: null,
                 addr: { rack: 'flt', slot: 0, key: 'frq', lbl: 'freq', sid: 0 } }] });
    p.flt[0] = Object.assign(mkFlt(0), { typ: 1, frq: 2000, q: 1 });
    engine.rebuildRack(ch); engine.refresh(ch);

    const beats = LFODIV[Math.max(0, Math.min(LFODIV.length - 1, RD))][1];
    const wantHz = 1 / (beats * (60 / BPM));
    /* ONE BAR in seconds — the interval two notes must be apart to land on the
       same phase for any division that divides a bar evenly */
    const bar = 4 * (60 / BPM);

    /* ⚠ CAPTURE WHAT THE BUILDER ACTUALLY WROTE. The first cut of this probe
       recomputed the phase from the same grid function the fix uses and then
       compared it with itself — so it read identically on both builds and
       said DRIFTING on the one that had just been fixed. setWave is where the
       phase is baked in; wrap it and take the number. */
    const seen = [];
    realSW = engine.setWave.bind(engine);
    engine.setWave = function (osc, w, ph, wid) { seen.push(ph); return realSW(osc, w, ph, wid); };
    const grab = async () => {
      engine.allOff(); await sleep(60);
      seen.length = 0;
      const at = AC.currentTime + 0.02;
      engine.noteOn(at, ch, NOTE, VEL);
      await sleep(140);
      const v = (engine.act[ch] || [])[0];
      const L = v && v.lfoN && v.lfoN[0];
      const hz = (L && L.lo && L.lo.frequency) ? L.lo.frequency.value : null;
      const deg = seen.length ? seen[seen.length - 1] : null;
      engine.allOff(); await sleep(40);
      /* the two candidate phase axes, at this note's own start time */
      return { hz, deg, at,
               grid: fmod((gridBeatsAt(at) / beats) * 360, 360),
               clock: fmod(at * wantHz * 360, 360) };
    };
    const A = await grab();
    engine.setWave = realSW;
    const near = (a, b) => (a == null || b == null) ? 999
      : Math.abs(fmod(a - b + 180, 360) - 180);
    const dGrid = near(A.deg, A.grid), dClock = near(A.deg, A.clock);
    rows.push({ k: 'rate', want: +wantHz.toFixed(4), got: A.hz != null ? +A.hz.toFixed(4) : null,
                err: A.hz != null ? +(A.hz - wantHz).toFixed(4) : null,
                verdict: (A.hz != null && Math.abs(A.hz - wantHz) < 0.01) ? 'LOCKED' : 'WRONG' });
    rows.push({ k: 'phase axis: the GRID', want: +A.grid.toFixed(1),
                got: A.deg == null ? null : +A.deg.toFixed(1), err: +dGrid.toFixed(1),
                verdict: dGrid < 3 ? 'LOCKED TO THE BAR' : 'no' });
    rows.push({ k: 'phase axis: the audio CLOCK', want: +A.clock.toFixed(1),
                got: A.deg == null ? null : +A.deg.toFixed(1), err: +dClock.toFixed(1),
                verdict: dClock < 3 ? 'FREE-RUNNING (not synced)' : 'no' });

    /* and the tempo: move it under a HELD note and see whether the running
       oscillator follows */
    engine.allOff(); await sleep(60);
    engine.noteOn(AC.currentTime + 0.02, ch, NOTE, VEL);
    await sleep(160);
    const v2 = (engine.act[ch] || [])[0];
    const L2 = v2 && v2.lfoN && v2.lfoN[0];
    const before = (L2 && L2.lo) ? L2.lo.frequency.value : null;
    setBpm(BPM * 2);
    await sleep(220);
    const after = (L2 && L2.lo) ? L2.lo.frequency.value : null;
    engine.allOff();
    rows.push({ k: 'tempo x2 under a held note', want: +(wantHz * 2).toFixed(4),
                got: after != null ? +after.toFixed(4) : null,
                err: (after != null && before != null) ? +(after - before).toFixed(4) : null,
                verdict: (after != null && Math.abs(after - wantHz * 2) < 0.05) ? 'FOLLOWS' : 'STUCK' });
    notes.push('division ' + LFODIV[RD][0] + ' = ' + beats + ' beats at ' + BPM +
               'bpm · trig FREE (retrig restarts every note and cannot be out of sync)');
  } finally {
    try { if (realSW) engine.setWave = realSW; } catch (_) {}
    try { setBpm(bpm0); } catch (_) {}
    for (const m of mutes) try { m(); } catch (_) {}
    unstash(ch, keep);
  }
  notes.push('the two phase rows are the SAME number measured against two different axes, ' +
             'and exactly one of them should match: the GRID means the wave is where the bar ' +
             'says, the audio CLOCK means it runs at the right rate and lands anywhere, which ' +
             'is what not-synced feels like.');
  return { cols: ['want', 'got', 'err', 'verdict'], rows, notes };
}

const HELP = {
  cols: ['args'],
  rows: [
    { k: 'level',    args: 'chs=8,9 ms=500 — rms/peak of a channel bus over a window' },
    { k: 'spectrum', args: 'chs=4 note=48 ms=500 fft=16384 win=rect|hann' },
    { k: 'cursor',   args: 'chs=9 — ping ten-grsyn: tv/g/tpos/cpos' },
    { k: 'preset',   args: 'names=SNR,S909 note=48 ch=8 — library name, played and measured' },
    { k: 'key',      args: 'code=KeyA hold=120 shift=0 alt=0 ctrl=0 meta=0' },
    { k: 'kitcal',   args: 'kit=KT01 — all twelve pads measured on their own buses in ONE 400ms pass' },
    { k: 'synthlvl', args: 'k=8 slots=0,1,2 seed=4000 — what a GENERATED drum pad weighs, with its voicing and envelope, to fit a build-time predictor' },
    { k: 'mixbus',   args: 'kit=KT808 bars=2 bpm=120 at=ch|master ref=brushkit — the whole kit playing, gated LUFS + PLR + band balance, against a real drum record' },
    { k: 'padpred',  args: 'kit=KT808 — offline buffer+envelope loudness vs the measured bus, to prove the model' },
    { k: 'kitmix',   args: 'kit=KT808,KTLIN|ROLL|ROLL80 ms=400 real=1 — BS.1770 loudness + 8-band balance of every pad in a kit, against the role target' },
    { k: 'smploud',  args: 'ch=4 ms=200 names=a,b,c — perceptual loudness of samples vs a synth op, and the median deficit' },
    { k: 'smprate',  args: 'ch=4 notes=36,48,60,72 — which note plays a sample at its own speed' },
    { k: 'smpdiag',  args: 'ch=4 file=oneshots/snare/linn-snare-03.flac note=48 — the file vs the op: level, band balance, stereo' },
    { k: 'press',    args: 'ch=4 amt=90 note=48 — does src=press actually move a param (the hall-effect wire, without the board)' },
    { k: 'veldecay', args: 'ch=4 key=tmul|d amt=90 note=48 — does a velocity mod actually shorten a note' },
    { k: 'shelf',    args: 'one=kik loop=pad — the shelf split, the type filters, and that a session take beats both' },
    { k: 'syscopy',  args: 'ch=3 — cmd+C: patch JSON to the system clipboard for ONE channel, silent for a block or the desk' },
    { k: 'keypath',  args: 'code=KeyA ch=9 kmode=0 auto=1 arp=0 hold=400 — did the app CLAIM the key, and which engine door did it reach' },
    { k: 'roundtrip',args: 'ch=9 kmode=0 auto=1 arp=1 div=0.25 keys=KeyA,KeyS — record a phrase and replay it: did the head do the same thing twice' },
    { k: 'sweep',    args: 'ch=9 taps=6 — sine-sweep take: pitch IS position; record, replay, compare what SOUNDED' },
    { k: 'mono',     args: 'ch=9 kmode=0 auto=1 — one playhead? a cue must MOVE the head, never add one' },
    { k: 'trig',     args: 'ch=1 note=60 ph=90 — does an operator rtrg/free reach the sound, in both fm engines' },
    { k: 'matrix',   args: 'ch=8 take=nylonlick cues=4 — the seven cases + the cue jumps' },
    { k: 'modmatrix',args: 'only=filt — every mod SOURCE x every DESTINATION: reaches/anchor/live/tweak' },
    { k: 'micrec',   args: 'ch=9 hold=900 db=-6 — the RECORDER rows (fake mic): chord, tab-alone, picture, gain, keys, ring, punch/xfade, repitch, mute/resume' },
    { k: 'micrec2',  args: 'ch=9 — the SESSION rows: monitor, device, mic sync, esc dials+arrows, tab loop, latc, stereo, tempo-from-take, nearend, headtrim, rshift-del clear' },
    { k: 'grainflt', args: 'ch=9 — the cloud follows its own pitch dial (440→880 on +12) and the reso dial is real under 1 (LP/HP Q maps below 0dB)' },
    { k: 'setio',    args: 'ch=9 — the set file: takes travel embedded, no-audio fallback holes them, local stamps, exportSet via stubbed save picker' },
    { k: 'audclip',  args: 'ch=9 — pitch dial spans ±36 in all three cmodes (sounding Hz), and c/x/v carries an audio channel with its take' },
    { k: 'resamp',   args: 'ch=9 — master resample is pre-master-fx and replays exactly like live at mSum: take clean of a hot sat, unity dials, replay ratio ~1, mid-bounce rebuild survives' },
    { k: 'fxwire',   args: 'ch=8 — EXHAUSTIVE: every (fx type, param) FXMODOK claims, driven through the real applier — offered/claimed/moved. No audio, one call.' },
    { k: 'fxmod',    args: 'ch=8 — every wired fx (type,param) wobbles under a 5Hz lfo through the real ctrl path; arp rate mod moves note density' },
    { k: 'patqual',  args: 'n=6 \u2014 generated patterns: velocity spread, bar-4-vs-bar-1 difference, cross-lane onset agreement' },
    { k: 'archlvl',  args: 'cat=bass k=6 \u2014 mean peak of every ARCHETYPE, and the trim that would level them' },
    { k: 'genqual',  args: 'cat=bass n=10 wild=35 seed=1 \u2014 roll N patches, play each, and name the duds: SILENT/QUIET/HARSH/MUD/FLAT' },
    { k: 'kitdcy',   args: 'name=KT808 pad=0 dcys=0.15,0.35,0.7,1.5,3 \u2014 how long a pad rings at each amp-decay factor' },
    { k: 'kitoct',   args: 'name=KT808 notes=24,36,48,60,72 \u2014 does a kit pad transpose with the octave, and by how much' },
    { k: 'smpkit',   args: 'name=KT808 ch=8 \u2014 load a sampled kit and play all twelve pads: distinct takes, distinct sounds, none unwired' },
    { k: 'smplib',   args: 'ch=8 names=tr808-kick-01,linn-snare-01 \u2014 point a synth op at named library one-shots and hear whether they sound' },
    { k: 'spread',   args: "ch=8 ty=rake \u2014 can a bank filter's spread be modulated, and does a tweak reach a held note" },
    { k: 'pwmall',   args: 'ch=8 rate=2 amt=70 wavs=0,1,2,3 \u2014 which waves still STEP their width, for waves a pulse metric cannot see' },
    { k: 'lfosync',  args: 'ch=8 bpm=120 rdiv=6 \u2014 does a synced LFO lock its RATE, its PHASE and follow the tempo' },
    { k: 'wtalias',  args: 'ch=8 lfo=40 \u2014 is the MODULATOR aliasing? true sideband vs the control-tick fold' },
    { k: 'wtshelf',  args: 'ch=8 \u2014 every wavetable at pos 0 and pos 1: harmonics, centroid, level' },
    { k: 'rollkey',  args: '\u2014 does the dice key fire on the PRESS, for every modifier combination' },
    { k: 'wtpos',    args: 'ch=8 rungs=0.5 \u2014 drive a wavetable position at a constant rate: junk added, spike share, and the standby gain at each write' },
    { k: 'pwm',      args: 'ch=8 wav=3 rate=2 amt=70 \u2014 is a width sweep smooth? excess edges per second = clicks' },
    { k: 'recpitch', args: 'ch=8 \u2014 played vs recorded vs replayed pitch: does the scale snap the finger and not the lane' },
    { k: 'master',   args: '\u2014 with the master selected: which lane do the loop-length and clear gestures actually move' },
    { k: 'steps',    args: 'ch=8 all=0 \u2014 how far one press moves every dial: 0..1 params must be 0.01/0.1, reso 0.1/1' },
    { k: 'chord',    args: 'ch=6 \u2014 the scale and the global chord: do adjacent keys stay distinct, and does the grid agree with the sound' },
    { k: 'retro',    args: 'ch=5 bars=4 \u2014 does a retro tap keep a phrase that started mid-loop, and at the beat it was played' },
    { k: 'arplatch', args: 'ch=5 \u2014 does an arp let go of the key? pool/until/steps after the key-up, with rec off, armed and latched' },
    { k: 'snapaud',  args: 'ch=9 \u2014 does a snapshot swap the audio channel\u2019s take, and survive a save round trip' },
    { k: 'envoff',   args: 'ch=5 rel=2 hold=400 \u2014 does a note stop DEAD at the end of its release? cutDb is the size of the step to silence' },
    { k: 'retroguess', args: 'ch=5 \u2014 retro on a lane with no length set: does it hear the punch-in and the span' },
    { k: 'modscope', args: 'ch=5 \u2014 what each mod scope letter makes, and whether it aims the route at the cursor' },
    { k: 'poolkind', args: 'want=loop — every pool take: measured onsets/centroid, the kind it was called, and both dial views in order' },
    { k: '(any)',    args: '--ab <url> runs the same probe on a second build and diffs it' },
  ]
};

/* ---------------- run -------------------------------------------------- */
let out;
try {
  if (AC.state !== 'running') { try { await AC.resume(); } catch (_) {} }
  if (AC.state !== 'running') notes.push('AudioContext is ' + AC.state + ' — every level will read 0');
  /* A STALLED OUTPUT DEVICE STALLS THE CLOCK (2026-08-23: 'External Headphones'
     hung afplay itself; AC said 'running' and rendered exactly one buffer, so
     every ScriptProcessor, analyser and worklet sat still). A probe can still
     measure: the graph renders into a sink of type 'none' — real time, no
     device, silent — so when the clock does not move in 120ms the harness
     moves the context there and says so. sink=none asks for it outright. */
  { const c0 = AC.currentTime; await sleep(120);
    const stuck = AC.currentTime - c0 < 0.05;
    if (stuck || str(P.sink, '') === 'none') {
      if (typeof AC.setSinkId === 'function') {
        try { await AC.setSinkId({ type: 'none' });
              notes.push((stuck ? 'output clock stalled' : 'sink=none asked') + ' → AC.setSinkId none: rendering silently, in real time'); }
        catch (e) { notes.push('setSinkId(none) failed: ' + e); }
      } else notes.push('output clock stalled and this browser has no setSinkId — every level will read 0');
    } }
  /* CMD+C PUTS THE PATCH ON THE SYSTEM CLIPBOARD TOO — and only for ONE channel
   (Gad, 2026-08-28: "command+c is better for my muscle memory"). Stubs
   navigator.clipboard.writeText, so what is measured is what clipboardOp
   actually handed the system rather than what a paste buffer looked like
   afterwards. Three scopes, because two of them MUST stay silent: a desk and a
   block are tens of kB and have no business on somebody's clipboard. */
async function probeSysCopy() {
  const real = navigator.clipboard.writeText.bind(navigator.clipboard);
  let cap = null;
  navigator.clipboard.writeText = t => { cap = String(t); return Promise.resolve(); };
  const rows = [];
  const run = (label, setup) => {
    cap = null;
    let err = '';
    try { setup(); clipboardOp('copy'); } catch (e) { err = String(e && e.message || e); }
    let sys = 'none', bytes = 0, name = '', cat = '', keys = 0;
    if (cap) {
      bytes = cap.length; sys = 'BAD';
      try { const j = JSON.parse(cap);
            sys = 'json'; name = j.name || ''; cat = j.cat || '';
            keys = ['ten', 'ch', 'name', 'cat', 'data'].filter(k => j[k] !== undefined).length;
      } catch (e) {}
    }
    rows.push({ k: label, sys, bytes, name, cat, keys,
                clip: (typeof CLIP !== 'undefined' && CLIP) ? CLIP.kind : '-', err });
  };
  const ch = num(P.ch, 3);
  run('one channel', () => { S.mSel = false; CHSEL.clear(); S.layer = 1; S.curPreset = ch; });
  run('block 2-4', () => { S.mSel = false; CHSEL.clear();
                           CHSEL.add(2); CHSEL.add(3); CHSEL.add(4); S.layer = 1; });
  run('master desk', () => { CHSEL.clear(); S.mSel = true; S.layer = 1; });
  try { CHSEL.clear(); S.mSel = false; } catch (e) {}
  navigator.clipboard.writeText = real;
  return { cols: ['sys', 'bytes', 'keys', 'name', 'cat', 'clip', 'err'], rows };
}

/* THE TWO SHELVES ARE SPLIT, AND WHAT YOU MADE IS NOT (Gad, 2026-08-29:
   "seperate audio samples from one shots and loops"). The browsers filter on
   `shelf`, NOT on `kind` — the phrase shelf carries three one-shots (bell,
   riser, sweep) and an audio channel is exactly where a riser belongs. Adds a
   session take and proves it survives both the shelf split and a type filter,
   because poolKindOf is a heuristic and a hard filter must never be able to
   lose a recording. */
async function probeShelf() {
  const fac = POOL.filter(e => e && e.src && e.src.k === 'f');
  const nm = v => v.map(i => POOL[i].name);
  const b = AC.createBuffer(1, 4410, 44100), d = b.getChannelData(0);
  for (let i = 0; i < 4410; i++) d[i] = Math.sin(i * 0.05) * Math.exp(-i / 800);
  poolAdd(b, '__probe_take', { k: 'r' });
  const has = v => nm(v).includes('__probe_take');
  const rows = [
    { k: 'shelf tags', one: fac.filter(e => e.shelf === 'one').length,
      loop: fac.filter(e => e.shelf === 'loop').length, note: 'of ' + fac.length + ' factory' },
    { k: 'view, all', one: poolView('one', '').length, loop: poolView('loop', '').length,
      note: 'smp op | audio ch' },
    { k: 'one-shots on phrase shelf', one: 0,
      loop: nm(poolView('loop', '')).filter(n => ['bell', 'riser', 'sweep'].includes(n)).length,
      note: 'must be 3 — a riser is audio-channel material' },
    { k: 'type filter', one: poolView('one', str(P.one, 'kik')).length,
      loop: poolView('loop', str(P.loop, 'pad')).length,
      note: str(P.one, 'kik') + ' | ' + str(P.loop, 'pad') },
    { k: 'your take visible', one: has(poolView('one', '')) ? 1 : 0,
      loop: has(poolView('loop', '')) ? 1 : 0, note: 'both must be 1' },
    { k: 'take beats a filter', one: has(poolView('one', str(P.one, 'kik'))) ? 1 : 0,
      loop: has(poolView('loop', str(P.loop, 'pad'))) ? 1 : 0, note: 'both must be 1' },
  ];
  return { cols: ['one', 'loop', 'note'], rows };
}

/* CAN VELOCITY SHORTEN A NOTE? (Gad, 2026-08-29: "sure it is... just have a
   vel mod with decay destenation to the smp or synth ops, easy peasy. or map
   it to the time multiplier even.") He was right and SOUND.md said BLOCKED.

   BUILT ON A REAL ROLL, not a hand-assembled preset: the first attempt wired
   mod[0] by hand and read 1486ms at every velocity — the whole capture window,
   because an unfolded preset has no amp envelope at all and the note simply
   never ended. foldMod/addrMod are what make a mod rack live, so the honest
   test starts from a patch that already works and adds ONE route to it. */
async function probeVelDecay() {
  const ch = num(P.ch, CH), note = num(P.note, NOTE);
  const key = str(P.key, 'tmul'), lbl = key === 'tmul' ? 'time' : key === 'd' ? 'dec' : key;
  const keep = stash(ch);
  const rows = [];
  let ampSlot = -1, resolves = -1, wired = false;
  try {
    const p = S.presets[ch];
    /* a pluck: something with an audible tail to shorten */
    const g = genPreset('plk', mulberry32(num(P.seed, 7)), 0.2);
    for (const k of Object.keys(p)) if (k !== 'modLoop') delete p[k];
    Object.assign(p, JSON.parse(JSON.stringify(presetData(g))));
    /* FX OFF, or this measures a REVERB TAIL. First run read ~2000ms at every
       velocity on an envelope whose decay is 486ms with sustain 0 — the tail
       stayed above 5% of peak for the whole window, and since a tail scales
       with the peak the ratio was a flat 1.00 no matter what the route did. */
    for (const x of (p.fx || [])) if (x) x.typ = 0;
    for (const x of (p.amp || [])) if (x) x.typ = 0;
    foldMod(p); addrMod(p);
    /* the slot carrying the AMP envelope is the one to stretch */
    ampSlot = (p.mod || []).findIndex(m => m && m.src === 1 &&
      (m.routes || []).some(r => r && ((r.addr && r.addr.key === 'amp') || (!r.addr && r.dst === 1))));
    if (ampSlot >= 0) {
      const free = (p.mod || []).findIndex(m => m && !m.src);
      if (free >= 0) {
        p.mod[free] = { src: 3, rsel: 0, mac: 0, a: 0.002, d: 0.2, s: 0, r: 0.2, crv: 0, tmul: 1,
          routes: [{ dst: 0, idx: 0, amt: num(P.amt, 95), ctr: 0, tgt: null,
                     addr: { rack: 'mod', slot: ampSlot, key, lbl } }] };
        wired = true;
        resolves = resolveDest(p, p.mod[free].routes[0].addr).length;
      }
    }
    engine.rebuildRack(ch); engine.refresh(ch);
    const len = async vel => {
      engine.allOff(); await sleep(90);
      const bus = busOf(ch); if (!bus) return null;
      const t = tap(bus); await sleep(30);
      engine.noteOn(AC.currentTime + 0.02, ch, note, vel);
      await sleep(2200);
      engine.allOff();
      const w = t.stop()[0];
      let pk = 0; for (let i = 0; i < w.length; i++) { const x = Math.abs(w[i]); if (x > pk) pk = x; }
      if (!(pk > 1e-4)) return { pk: 0, ms: 0 };
      let last = 0;
      for (let i = 0; i < w.length; i++) if (Math.abs(w[i]) > pk * 0.05) last = i;
      return { pk: +pk.toFixed(4), ms: Math.round(last / AC.sampleRate * 1000) };
    };
    /* A SEQUENCE, not three isolated notes. An env time is a 'next' kind
       destination — read once when a note starts — so if a velocity route
       reaches it at all, it reaches the note AFTER the one that set it. Play
       loud, soft, soft, loud: an off-by-one shows as row N tracking row N-1. */
    const seq = [1, 0.25, 0.25, 1];
    for (let i = 0; i < seq.length; i++) {
      const r = await len(seq[i]);
      rows.push({ k: (i + 1) + '. vel ' + seq[i].toFixed(2), peak: r ? r.pk : 0, ms: r ? r.ms : 0 });
    }
    const ms = rows.map(r => r.ms);
    rows.push({ k: 'same-note effect', peak: '', ms: ms[0] ? +(ms[1] / ms[0]).toFixed(2) : 0 });
    rows.push({ k: 'one-note-late', peak: '', ms: ms[1] ? +(ms[2] / ms[1]).toFixed(2) : 0 });
  } finally { unstash(ch, keep); }
  return { cols: ['peak', 'ms'], rows,
           notes: 'vel -> mod[' + ampSlot + '].' + key + ' amt ' + num(P.amt, 95) +
                  ' | wired ' + wired + ' | resolves ' + resolves };
}

/* IS THE PRESS WIRE REAL? (Gad, 2026-08-29: "yes do the press wire".) It turned
   out already built and SOUND.md was wrong to call it BLOCKED: EXP.keyPress
   does v.setPressure(x), and the hall-effect sample handler already calls it
   with per-key travel. So there is nothing to wire — only something to PROVE,
   without the board, before Gad QAs it on the FUN60.

   Routes press -> filter cutoff on a live voice and reads the AudioParam back
   at three depths. pressN is the list of params a press route actually
   claimed: 0 there means the route never landed and every reading below is
   meaningless. */
async function probePress() {
  const ch = num(P.ch, CH), note = num(P.note, NOTE), amt = num(P.amt, 90);
  const keep = stash(ch);
  const rows = [];
  try {
    const p = S.presets[ch];
    p.osc[0] = { wav: 2, mode: 0, dst: 0, rat: 1, amt: 1, fine: 0, ph: 0, phm: 0 };
    for (let i = 1; i < p.osc.length; i++) if (p.osc[i]) p.osc[i].amt = 0;
    for (const x of (p.fx || [])) if (x) x.typ = 0;
    p.flt[0] = { typ: 1, frq: 800, q: 1, gn: 0, par: 0, pol: 0, spr: 0.4, lvl: 1 };
    for (const m of p.mod) if (m) { m.src = 0; m.routes = [{ dst: 0, idx: 0, amt: 100, ctr: 0, tgt: null }]; }
    for (const e of p.env) if (e) e.dst = 0;
    p.mod[0] = { src: 1, rsel: 0, mac: 0, a: 0.002, d: 0.5, s: 0.9, r: 0.2, crv: 0, tmul: 1,
      routes: [{ dst: 1, idx: 0, amt: 100, ctr: 0, tgt: null,
                 addr: { rack: 'voice', slot: 0, key: 'amp', lbl: 'amp' } }] };
    p.mod[1] = { src: 6, rsel: 0, mac: 0, a: 0.002, d: 0.2, s: 0, r: 0.2, crv: 0, tmul: 1,
      routes: [{ dst: 3, idx: 1, amt: amt, ctr: 0, tgt: null,
                 addr: { rack: 'flt', slot: 0, key: 'frq', lbl: 'freq' } }] };
    p._folded = true; p._addr = true;
    engine.rebuildRack(ch); engine.refresh(ch);
    engine.allOff(); await sleep(80);
    const h = engine.trigger(AC.currentTime + 0.02, ch, note, 0.9);
    await sleep(120);
    const vs = (h && h.voices) || [];
    const v0 = vs[0];
    const claimed = v0 && v0.pressN ? v0.pressN.length : 0;
    const read = () => {
      if (!v0 || !v0.pressN || !v0.pressN.length) return null;
      return +(v0.pressN[0].p.value).toFixed(1);
    };
    for (const x of [0, 0.5, 1]) {
      if (v0 && v0.setPressure) v0.setPressure(x);
      await sleep(140);
      rows.push({ k: 'press ' + x.toFixed(2), press: v0 ? +(v0.press || 0).toFixed(2) : '-', param: read() });
    }
    engine.allOff();
    const a = rows[0].param, b = rows[2].param;
    rows.push({ k: 'moved', press: 'pressN ' + claimed,
                param: (a != null && b != null) ? +(b - a).toFixed(1) : 'n/a' });
  } finally { unstash(ch, keep); }
  return { cols: ['press', 'param'], rows, notes: 'src=press -> flt[0].frq amt ' + amt };
}

/* WHY DOES A SAMPLE SOUND WORSE THROUGH THE OP THAN IN FINDER? (Gad,
   2026-08-29: "it sounds to me like TEN is sounding not as good ... muffled,
   much quiter and a bit phasing like its mono combined channels".)

   Decodes the file itself as the REFERENCE, then renders the same buffer
   through a sample op in several configurations and measures all of them the
   same way: level, spectral balance in four bands, brightness, and L/R
   correlation. The configurations isolate one setting at a time, so the answer
   names a dial rather than confirming a feeling.

   Gad's ch4 as saved: rat 2, uni 2, sprd 12, wide 0.6 — a sample op playing
   TWO copies detuned twelve cents, at double rate. */
async function probeSmpDiag() {
  const ch = num(P.ch, 4), note = num(P.note, 48);
  const file = str(P.file, 'oneshots/snare/linn-snare-03.flac');
  const keep = stash(ch);
  const rows = [];
  const band = (S, f, lo, hi) => {
    let a = 0; for (let i = 0; i < S.length; i++) if (f[i] >= lo && f[i] < hi) a += S[i] * S[i];
    return a;
  };
  const meas = (k, L, R, extra) => {
    const n = Math.min(L.length, R.length);
    let pk = 0, sq = 0, lr = 0, ll = 0, rr = 0;
    for (let i = 0; i < n; i++) {
      const a = Math.abs(L[i]) > Math.abs(R[i]) ? Math.abs(L[i]) : Math.abs(R[i]);
      if (a > pk) pk = a;
      const m = (L[i] + R[i]) * 0.5; sq += m * m;
      lr += L[i] * R[i]; ll += L[i] * L[i]; rr += R[i] * R[i];
    }
    const rms = Math.sqrt(sq / Math.max(1, n));
    const corr = (ll > 1e-12 && rr > 1e-12) ? lr / Math.sqrt(ll * rr) : 1;
    /* ALIGN TO THE ONSET BEFORE WINDOWING, or the comparison is meaningless.
       The first version windowed both signals from sample 0 — but the file's
       attack IS sample 0, where a Hann window is zero, while the op's attack
       sits ~45ms in where the window is already open. That alone moves the
       measured brightness, so the whole "the op is muffled" read was an
       artefact of my own window. Find the hit, then window from there. */
    let on = 0, pk2 = 0;
    for (let i = 0; i < n; i++) { const a = Math.abs(L[i]) + Math.abs(R[i]); if (a > pk2) pk2 = a; }
    for (let i = 0; i < n; i++) { if (Math.abs(L[i]) + Math.abs(R[i]) > pk2 * 0.02) { on = i; break; } }
    const N = 8192, m2 = new Float32Array(N);
    for (let i = 0; i < N && on + i < n; i++)
      m2[i] = (L[on + i] + R[on + i]) * 0.5 * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = m2[i];
    // cheap DFT over log-spaced probe bins is enough for a balance read
    const sr = AC.sampleRate, half = N / 2;
    const S = new Float64Array(half), f = new Float64Array(half);
    for (let b = 0; b < half; b++) f[b] = b * sr / N;
    // goertzel-free: use the analyser-style magnitude via a real FFT surrogate
    // (N is small and this runs once per row, so a direct transform is fine)
    for (let b = 1; b < half; b++) {
      let sre = 0, sim = 0, w = 2 * Math.PI * b / N;
      for (let i = 0; i < N; i++) { sre += re[i] * Math.cos(w * i); sim -= re[i] * Math.sin(w * i); }
      S[b] = Math.sqrt(sre * sre + sim * sim) / N;
    }
    let tot = 0, cen = 0;
    for (let b = 1; b < half; b++) { tot += S[b]; cen += S[b] * f[b]; }
    cen = tot > 0 ? cen / tot : 0;
    const lo = band(S, f, 20, 250), md = band(S, f, 250, 2000),
          hi = band(S, f, 2000, 8000), air = band(S, f, 8000, 20000);
    const T = lo + md + hi + air || 1;
    rows.push({ k, peak: +pk.toFixed(3), rms: +rms.toFixed(4),
                lo: Math.round(lo / T * 100), mid: Math.round(md / T * 100),
                hi: Math.round(hi / T * 100), air: Math.round(air / T * 100),
                cen: Math.round(cen), 'L/R': +corr.toFixed(3), note: extra || '' });
  };

  try {
    const ab = await (await fetch('samples/' + file)).arrayBuffer();
    const ref = await AC.decodeAudioData(ab.slice(0));
    const rl = ref.getChannelData(0);
    const rr2 = ref.numberOfChannels > 1 ? ref.getChannelData(1) : rl;
    meas('THE FILE', rl, rr2, ref.numberOfChannels + 'ch ' + ref.duration.toFixed(3) + 's');

    const CFG = [
      /* THE REFERENCE THAT MATTERS: a SYNTH op at the identical settings. "A
         sample is quieter than Finder" is the pan law and is by design; "a
         sample is quieter than a saw at the same amt" would be a real
         inconsistency, and only this row can tell them apart. */
      { k: 'synth saw, amt 1', rat: 1, uni: 1, sprd: 0,  wide: 0,   n: 'wav 2', wav: 2 },
      { k: 'op, plain',        rat: 1, uni: 1, sprd: 0,  wide: 0,   n: 'defaults' },
      { k: 'op, rat 2',        rat: 2, uni: 1, sprd: 0,  wide: 0,   n: 'ch4 rate' },
      { k: 'op, uni 2 sprd12', rat: 1, uni: 2, sprd: 12, wide: 0.6, n: 'ch4 voice' },
      { k: 'op, ch4 as saved', rat: 2, uni: 2, sprd: 12, wide: 0.6, n: 'both' },
    ];
    for (const c of CFG) {
      const p = S.presets[ch];
      for (const k of Object.keys(p)) if (k !== 'modLoop') delete p[k];
      Object.assign(p, JSON.parse(JSON.stringify(presetData(genPreset('kik', mulberry32(3), 0.1)))));
      p.osc[0] = { wav: c.wav === undefined ? 9 : c.wav, mode: 0, dst: 0, rat: c.rat,
                   amt: 1, fine: 0, ph: 0, phm: 1, lps: 1 };
      for (let i = 1; i < p.osc.length; i++) if (p.osc[i]) p.osc[i].amt = 0;
      for (const x of p.flt) if (x) x.typ = 0;
      for (const x of p.fx) if (x) x.typ = 0;
      for (const x of p.amp) if (x) x.typ = 0;
      for (const m of p.mod) if (m) { m.src = 0; m.routes = [{ dst: 0, idx: 0, amt: 100, ctr: 0, tgt: null }]; }
      for (const e of p.env) if (e) e.dst = 0;
      p.mod[0] = { src: 1, rsel: 0, mac: 0, a: 0.0005, d: 2.0, s: 1, r: 0.5, crv: 0, tmul: 1,
        routes: [{ dst: 1, idx: 0, amt: 100, ctr: 0, tgt: null,
                   addr: { rack: 'voice', slot: 0, key: 'amp', lbl: 'amp' } }] };
      Object.assign(p.vox, { mode: 1, uni: c.uni, sprd: c.sprd, wide: c.wide, slop: 0 });
      p.mix.lvl = 1; p.mix.pan = 0; p._folded = true; p._addr = true;
      engine.rebuildRack(ch); engine.refresh(ch);
      engine.opSamples.set(smpKey(ch, 0, null), ref);
      engine.rebuildRack(ch);
      engine.allOff(); await sleep(80);
      const bus = busOf(ch); if (!bus) { rows.push({ k: c.k, note: 'no bus' }); continue; }
      const t = tap(bus); await sleep(30);
      engine.noteOn(AC.currentTime + 0.02, ch, note, 1.0);
      await sleep(600);
      engine.allOff();
      const [L, R] = t.stop();
      meas(c.k, L, R, c.n);
    }
  } finally { unstash(ch, keep); }
  return { cols: ['peak', 'rms', 'lo', 'mid', 'hi', 'air', 'cen', 'L/R', 'note'], rows,
           notes: 'lo/mid/hi/air = % of energy under 250 / 250-2k / 2-8k / over 8k' };
}

/* AT WHICH NOTE DOES A SAMPLE PLAY AT ITS OWN SPEED? The spectral read in
   smpdiag says the op is an octave down at KBBASE, but a spectrum measured over
   a fixed window is confounded by the very rate it is trying to measure. Length
   is not: a 0.140s file played at rate 1 lasts 0.140s, at rate 0.5 it lasts
   0.280s, and nothing about the window changes that. */
async function probeSmpRate() {
  const ch = num(P.ch, 4);
  const file = str(P.file, 'oneshots/snare/linn-snare-03.flac');
  const notes = str(P.notes, '36,48,60,63,65,72').split(',').map(Number);
  const keep = stash(ch);
  const rows = [];
  try {
    const ab = await (await fetch('samples/' + file)).arrayBuffer();
    const ref = await AC.decodeAudioData(ab.slice(0));
    rows.push({ k: 'THE FILE', dur: +ref.duration.toFixed(3), rate: 1, peak: '', semis: '' });
    const p = S.presets[ch];
    for (const k of Object.keys(p)) if (k !== 'modLoop') delete p[k];
    Object.assign(p, JSON.parse(JSON.stringify(presetData(genPreset('kik', mulberry32(3), 0.1)))));
    p.osc[0] = { wav: 9, mode: 0, dst: 0, rat: 1, amt: 1, fine: 0, ph: 0, phm: 1, lps: 1 };
    for (let i = 1; i < p.osc.length; i++) if (p.osc[i]) p.osc[i].amt = 0;
    for (const x of p.flt) if (x) x.typ = 0;
    for (const x of p.fx) if (x) x.typ = 0;
    for (const x of p.amp) if (x) x.typ = 0;
    for (const m of p.mod) if (m) { m.src = 0; m.routes = [{ dst: 0, idx: 0, amt: 100, ctr: 0, tgt: null }]; }
    for (const e of p.env) if (e) e.dst = 0;
    p.mod[0] = { src: 1, rsel: 0, mac: 0, a: 0.0005, d: 3, s: 1, r: 0.5, crv: 0, tmul: 1,
      routes: [{ dst: 1, idx: 0, amt: 100, ctr: 0, tgt: null,
                 addr: { rack: 'voice', slot: 0, key: 'amp', lbl: 'amp' } }] };
    Object.assign(p.vox, { mode: 1, uni: 1, sprd: 0, wide: 0, slop: 0 });
    p.mix.lvl = 1; p._folded = true; p._addr = true;
    for (const note of notes) {
      engine.rebuildRack(ch); engine.refresh(ch);
      engine.opSamples.set(smpKey(ch, 0, null), ref);
      engine.rebuildRack(ch);
      engine.allOff(); await sleep(70);
      const bus = busOf(ch); if (!bus) continue;
      const t = tap(bus); await sleep(25);
      engine.noteOn(AC.currentTime + 0.02, ch, note, 1.0);
      await sleep(700);
      engine.allOff();
      const w = t.stop()[0];
      let pk = 0; for (let i = 0; i < w.length; i++) { const a = Math.abs(w[i]); if (a > pk) pk = a; }
      let first = -1, last = 0;
      for (let i = 0; i < w.length; i++) if (Math.abs(w[i]) > pk * 0.01) { if (first < 0) first = i; last = i; }
      const dur = first < 0 ? 0 : (last - first) / AC.sampleRate;
      const rate = dur > 0 ? ref.duration / dur : 0;
      rows.push({ k: 'note ' + note, dur: +dur.toFixed(3), rate: +rate.toFixed(3),
                  peak: +pk.toFixed(3),
                  semis: rate > 0 ? +(12 * Math.log2(rate)).toFixed(1) : '' });
    }
  } finally { unstash(ch, keep); }
  return { cols: ['dur', 'rate', 'peak', 'semis'], rows,
           notes: 'rate = file duration / played duration; semis = how far off native' };
}

/* HOW MUCH QUIETER IS A SAMPLE THAN A SYNTH, PERCEPTUALLY? (Gad, 2026-08-29:
   "i dont think its fair to compare a saw or sin db with a drum sample ... a
   synth is consistent volume. It sounds way louder than a drum hit, which has
   very, very short loud transient, and the rest is quite low volume.")

   He is right and the first comparison was wrong: peak-matched, a saw and a
   snare sit 0.87dB apart and sound nothing alike. Crest factor is the whole
   story — the ear integrates energy over roughly 200ms, so that is the window
   to measure in, not the tallest spike.

   Renders each factory drum through the op at amt 1 and a saw at amt 1, and
   reports RMS over 200ms from the onset. The MEDIAN deficit is the honest
   makeup: a constant offset that puts the sample path in the same ballpark,
   NOT a per-sample normalisation — a hat should still be quieter than a kick. */
async function probeSmpLoud() {
  const ch = num(P.ch, 4);
  const names = str(P.names, 'linn-snare-03,tr808-kick-08,tr909-snare-01,linn-kick-01,'
                           + 'tr808-hat-closed-01,tr707-tom-03,tr909-clap-02,linn-tom-01')
                .split(',');
  const WIN = num(P.ms, 200) / 1000;
  const keep = stash(ch);
  const rows = [];
  const loud = (w) => {
    let pk = 0;
    for (let i = 0; i < w.length; i++) { const a = Math.abs(w[i]); if (a > pk) pk = a; }
    let on = 0;
    for (let i = 0; i < w.length; i++) if (Math.abs(w[i]) > pk * 0.02) { on = i; break; }
    const n = Math.min(w.length - on, Math.round(WIN * AC.sampleRate));
    let sq = 0;
    for (let i = 0; i < n; i++) sq += w[on + i] * w[on + i];
    return { rms: Math.sqrt(sq / Math.max(1, n)), pk };
  };
  const build = (wav, smpBuf) => {
    const p = S.presets[ch];
    for (const k of Object.keys(p)) if (k !== 'modLoop') delete p[k];
    Object.assign(p, JSON.parse(JSON.stringify(presetData(genPreset('kik', mulberry32(3), 0.1)))));
    p.osc[0] = { wav, mode: 0, dst: 0, rat: 1, amt: 1, fine: 0, ph: 0, phm: 1, lps: 1, pw: 0.5 };
    for (let i = 1; i < p.osc.length; i++) if (p.osc[i]) p.osc[i].amt = 0;
    for (const x of p.flt) if (x) x.typ = 0;
    for (const x of p.fx) if (x) x.typ = 0;
    for (const x of p.amp) if (x) x.typ = 0;
    for (const m of p.mod) if (m) { m.src = 0; m.routes = [{ dst: 0, idx: 0, amt: 100, ctr: 0, tgt: null }]; }
    for (const e of p.env) if (e) e.dst = 0;
    p.mod[0] = { src: 1, rsel: 0, mac: 0, a: 0.0005, d: 3, s: 1, r: 0.5, crv: 0, tmul: 1,
      routes: [{ dst: 1, idx: 0, amt: 100, ctr: 0, tgt: null,
                 addr: { rack: 'voice', slot: 0, key: 'amp', lbl: 'amp' } }] };
    Object.assign(p.vox, { mode: 1, uni: 1, sprd: 0, wide: 0, slop: 0 });
    p.mix.lvl = 1; p._folded = true; p._addr = true;
    engine.rebuildRack(ch); engine.refresh(ch);
    if (smpBuf) { engine.opSamples.set(smpKey(ch, 0, null), smpBuf); engine.rebuildRack(ch); }
  };
  const render = async () => {
    engine.allOff(); await sleep(70);
    const bus = busOf(ch); if (!bus) return null;
    const t = tap(bus); await sleep(25);
    engine.noteOn(AC.currentTime + 0.02, ch, KBBASE, 1.0);
    await sleep(500);
    engine.allOff();
    return loud(t.stop()[0]);
  };
  const db = x => 20 * Math.log10(Math.max(x, 1e-9));
  try {
    build(2, null);
    const saw = await render();
    rows.push({ k: 'SYNTH saw', rms: +saw.rms.toFixed(4), peak: +saw.pk.toFixed(3),
                crest: +db(saw.pk / saw.rms).toFixed(1), 'vs saw dB': 0 });
    const defs = [];
    for (const nm of names) {
      const e = POOL.find(x => x && x.name === nm);
      if (!e || !e.buf) { rows.push({ k: nm, rms: '', peak: '', crest: '', 'vs saw dB': 'not on shelf' }); continue; }
      build(9, e.buf);
      const r = await render();
      if (!r) continue;
      const d = db(r.rms / saw.rms);
      defs.push(d);
      rows.push({ k: nm, rms: +r.rms.toFixed(4), peak: +r.pk.toFixed(3),
                  crest: +db(r.pk / r.rms).toFixed(1), 'vs saw dB': +d.toFixed(1) });
    }
    defs.sort((a, b) => a - b);
    const med = defs.length ? defs[Math.floor(defs.length / 2)] : 0;
    rows.push({ k: '— MEDIAN DEFICIT —', rms: '', peak: '', crest: '',
                'vs saw dB': +med.toFixed(1) });
  } finally { unstash(ch, keep); }
  return { cols: ['rms', 'peak', 'crest', 'vs saw dB'], rows,
           notes: 'rms over ' + Math.round(WIN * 1000) + 'ms from onset; crest = peak/rms in dB' };
}

/* ---------------- THE MIX METER  (2026-08-29) -------------------------- *
 * Everything above measures a sound. This measures a MIX, and the unit it
 * measures in is the one mixing engineers actually use: ITU-R BS.1770
 * K-weighted loudness, not bare RMS.
 *
 * WHY NOT RMS. `smploud` compares rms over 200ms and that is what found the
 * -7.5dB sample deficit, so it is not wrong — but it weights 40Hz and 4kHz the
 * same, and the ear does not. A kick and a hat matched by rms are not matched
 * by ear, and a drum mix is precisely a question about kicks against hats.
 *
 * The K filter is derived here from BS.1770's design parameters rather than
 * pasted at 48k, because AC.sampleRate is 44100 on this machine. VERIFIED: at
 * fs=48000 the derivation reproduces the published coefficients
 *   shelf  1.53512485958697 -2.69169618940638 1.19839281085285
 *                           -1.69065929318241  0.73248077421585
 *   rlb    1 -2 1           -1.99004745483398  0.99007225036621
 * to 8.9e-16 — machine precision, so the meter is the spec's and not an
 * approximation of it. */
function kCoeffs(fs) {
  let db = 3.999843853973347, f0 = 1681.974450955533, Q = 0.7071752369554196;
  let K = Math.tan(Math.PI * f0 / fs), Vh = Math.pow(10, db / 20);
  let Vb = Math.pow(Vh, 0.4996667741545416), a0 = 1 + K / Q + K * K;
  const sh = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0,
              (Vh - Vb * K / Q + K * K) / a0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0];
  f0 = 38.13547087602444; Q = 0.5003270373238773;
  K = Math.tan(Math.PI * f0 / fs); a0 = 1 + K / Q + K * K;
  const hp = [1, -2, 1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0];
  return [sh, hp];
}
function biq(x, c) {
  const [b0, b1, b2, a1, a2] = c, y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xn = x[i], yn = b0 * xn + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = xn; y2 = y1; y1 = yn; y[i] = yn;
  }
  return y;
}
/* K-weight a whole recording ONCE, from its start, so the filter has real
   history by the time the window opens. Measuring a block from the middle of
   an unfiltered buffer starts the biquad at rest and reads a transient of the
   meter rather than of the sound. */
function kWeight(L, R, sr) {
  const [sh, hp] = kCoeffs(sr), n = Math.max(L.length, R.length);
  const cast = ch => { const o = new Float64Array(n); for (let i = 0; i < n; i++) o[i] = ch[i] || 0; return o; };
  return [biq(biq(cast(L), sh), hp), biq(biq(cast(R), sh), hp)];
}
/* one BS.1770 block: -0.691 + 10log10(sum over channels of mean square),
   G = 1.0 for L and R. This is MOMENTARY loudness when the block is 400ms,
   which is the right window for a drum hit — it reads level and duration at
   once, so a click that is loud but 8ms long does not score as a kick. */
function lufsOf(kL, kR, o, n) {
  if (n <= 0) return -120;
  let sl = 0, sr2 = 0;
  for (let i = o; i < o + n; i++) { sl += kL[i] * kL[i]; sr2 += kR[i] * kR[i]; }
  return -0.691 + 10 * Math.log10(Math.max(sl / n + sr2 / n, 1e-20));
}
/* WHERE THE ENERGY SITS, in the eight bands a mixer names. Returned as a
   percentage of total spectral energy, because that is what a tonal-balance
   judgement is: nobody asks how many dB the air band has, they ask whether it
   is too much of the sound. */
const MIXBANDS = [['sub', 20, 60], ['low', 60, 120], ['lomid', 120, 300], ['mid', 300, 800],
                  ['himid', 800, 2500], ['pres', 2500, 6000], ['bril', 6000, 12000],
                  ['air', 12000, 20000]];
function bands(L, R, sr, o, take) {
  const N = 16384, re = new Float64Array(N), im = new Float64Array(N);
  const n = Math.min(take, N);
  for (let i = 0; i < n; i++)
    re[i] = ((L[o + i] || 0) + (R[o + i] || 0)) * 0.5 * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / n));
  fft(re, im);
  const half = N >> 1, e = MIXBANDS.map(() => 0);
  let tot = 0, sw = 0, sm = 0;
  for (let k = 1; k < half; k++) {
    const hz = k * sr / N, m = re[k] * re[k] + im[k] * im[k];
    tot += m; sw += Math.sqrt(m) * hz; sm += Math.sqrt(m);
    for (let b = 0; b < MIXBANDS.length; b++)
      if (hz >= MIXBANDS[b][1] && hz < MIXBANDS[b][2]) { e[b] += m; break; }
  }
  const out = {};
  MIXBANDS.forEach(([nm], b) => out[nm] = tot ? +(100 * e[b] / tot).toFixed(1) : 0);
  out.cent = sm ? Math.round(sw / sm) : 0;
  return out;
}

/* THE TARGET. Loudness of each drum role in LU relative to the KICK, which is
   the reference every drum mix is built around. Cross-read from published
   mixing practice (kick -12..-8 dBFS, snare -10..-6, hats -18..-14, overheads
   ~60% of kick+snare) and written as one table so it can be argued with in one
   place instead of being spread through the code as constants. */
const MIXTARGET = {
  kick: 0, sub: 0, snare: -1, clap: -3.5, rim: -9, tom: -3.5,
  'hat-closed': -6.5, 'hat-open': -6, cymbal: -7, ride: -9,
  cowbell: -8, conga: -5, bongo: -6, shaker: -11, clave: -9, timbale: -5,
  wood: -9, perc: -7, fx: -8,
};

/* ---------------- kitmix: the balance inside one kit ------------------- */
async function probeKitMix() {
  const ch = Math.max(1, Math.min(9, Math.round(num(P.ch, 9))));
  const want = str(P.kit, '');
  const MSWIN = num(P.ms, 400) / 1000;      // the BS.1770 momentary block
  const HOLD = num(P.hold, 700);            // how long to record per pad
  const vel = num(P.vel, 1.0);
  const lib = (typeof libAll === 'function') ? libAll() : [];
  const kits = lib.filter(e => e && e.cat === 'kit');
  if (!kits.length) return { cols: [], rows: [], err: 'no kits in libAll() — shelf not in yet?' };
  const names = want ? want.split(',') : [kits[0].name];
  const keep = stash(ch);
  const rows = [], sr = AC.sampleRate;
  try {
    for (const nm of names) {
      /* `ROLL` and `ROLL80` measure a kit the DICE made, at that wildness —
         the path randomizeKit takes, which is not the path a library kit
         takes and had never been measured. */
      if (/^ROLL/i.test(nm)) {
        const w = parseFloat(nm.slice(4)) || 35;
        unstash(ch, keep);
        S.presets[ch].cat = 'kit';
        randomizeKit(ch, w);
        /* THE CHANNEL FADER IS THE CHANNEL'S, not the roll's — randomizeKit
           replaces p.kit and leaves p.mix alone, so whatever preset was on
           this channel keeps its own level. A factory kit arrives at MIXT.kit,
           so match it, or the rolled kit is measured against a fader that
           happened to be there: the first run read every rolled kick at -26.8
           LUFS against a -20.0 target for exactly that reason. */
        S.presets[ch].mix.lvl = (MIXT.kit || {}).lvl != null ? MIXT.kit.lvl : 0.95;
        S.presets[ch].mix.pan = 0;
        engine.rebuildRack(ch); engine.refresh(ch);
        await sleep(80);
      } else {
        const en = kits.find(e => e.name === nm);
        if (!en) { rows.push({ k: nm, err: 'no such kit' }); continue; }
        if (num(P.real, 0)) {
          /* THE PATH THE APP TAKES. unstash writes the preset straight in, which
             is right for measuring a library entry but skips setPresetData —
             and calibKit hangs off setPresetData. `real=1` loads the way
             picking a preset does, then waits for the calibration queue. */
          setP(ch, en.name, 'kit', JSON.parse(JSON.stringify(en.data)));
          try { await CALQ; } catch (_) {}
          await sleep(120);
        } else {
          unstash(ch, { data: JSON.parse(JSON.stringify(en.data)), loop: keep.loop });
          await sleep(60);
        }
      }
      const p = S.presets[ch];
      let kickL = null;
      for (let i = 0; i < 12; i++) {
        const K = p.kit && p.kit[i];
        const slot = (typeof KITMAP !== 'undefined' && KITMAP[i]) || { inst: '?' };
        if (!K) { rows.push({ k: nm + ' ' + slot.inst, err: 'empty pad' }); continue; }
        pin(ch);
        engine.allOff(); await sleep(40);
        const bus = busOf(ch); if (!bus) { rows.push({ k: slot.inst, err: 'no bus' }); continue; }
        const t = tap(bus); await sleep(25);
        engine.noteOn(AC.currentTime + 0.02, ch, KBBASE + i, vel);
        await sleep(HOLD);
        engine.allOff();
        const [L, R] = t.stop();
        const w = windowOf(L, R);
        const [kL, kR] = kWeight(L, R, sr);
        const nBlk = Math.min(Math.round(MSWIN * sr), Math.max(0, L.length - w.o));
        const lu = lufsOf(kL, kR, w.o, nBlk);
        const lv = levels(L, R, w.o, w.take);
        const bd = bands(L, R, sr, w.o, w.take);
        if (i === 0) kickL = lu;
        const smp = ((K.osc && K.osc[0] && K.osc[0].smp) || {}).f || '';
        rows.push({ k: slot.inst, file: smp ? smp.split('/').pop().replace('.flac', '')
                                            : 'SYNTH ' + (K.name || ''),
                    lvl: r3((K.mix || {}).lvl), lufs: +lu.toFixed(1),
                    'vs kick': kickL == null ? 0 : +(lu - kickL).toFixed(1),
                    tgt: MIXTARGET[slot.inst] == null ? '—' : MIXTARGET[slot.inst],
                    err_: kickL == null || MIXTARGET[slot.inst] == null ? ''
                          : +((lu - kickL) - MIXTARGET[slot.inst]).toFixed(1),
                    peak: lv.peak, crest: +(20 * Math.log10(Math.max(lv.peak, 1e-9) /
                          Math.max(lv.rms, 1e-9))).toFixed(1),
                    cent: bd.cent, sub: bd.sub, low: bd.low, lomid: bd.lomid, mid: bd.mid,
                    himid: bd.himid, pres: bd.pres, bril: bd.bril, air: bd.air });
      }
      const errs = rows.filter(r => typeof r.err_ === 'number').map(r => Math.abs(r.err_));
      if (errs.length) {
        errs.sort((a, b) => a - b);
        rows.push({ k: '— ' + nm + ' spread —',
                    err_: +errs[errs.length - 1].toFixed(1),
                    lufs: +(errs.reduce((a, b) => a + b, 0) / errs.length).toFixed(1) });
      }
    }
  } finally { unstash(ch, keep); }
  return { cols: ['file', 'lvl', 'lufs', 'vs kick', 'tgt', 'err_', 'peak', 'crest', 'cent',
                  'sub', 'low', 'lomid', 'mid', 'himid', 'pres', 'bril', 'air'], rows,
           notes: 'lufs = BS.1770 momentary over ' + Math.round(MSWIN * 1000) +
                  'ms from onset · "vs kick" is LU relative to pad 0 · err_ = vs kick minus tgt' +
                  ' · on the summary row err_ is the WORST pad and lufs the MEAN |err|' +
                  ' · bands are % of spectral energy' };
}

/* ---------------- padpred: does the OFFLINE model predict the BUS? ----- *
 * The fix has to compute a pad's level at BUILD time, from the buffer, with
 * no rendering — a rolled kit cannot wait 12 seconds for a measurement. So
 * before trusting that arithmetic, prove it: predict each pad's loudness from
 * its buffer plus its own amp envelope, then measure the same pad through the
 * engine and subtract. If the model is right the difference is ONE constant —
 * the voice chain's gain — and not a per-pad fudge. */
function padLoudOffline(buf, dcyF, sr, rate) {
  rate = rate > 0 ? rate : 1;
  if (!buf) return null;
  const n = buf.length, L = buf.getChannelData(0);
  const R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
  /* the envelope the voice will actually schedule: a 0.4ms ramp, then
     setTargetAtTime with the time constant d/3 toward sustain 0 */
  const dur = buf.duration || 0.4;
  const d = Math.max(0.02, Math.min(5, dur * dcyF));
  const tau = Math.max(0.005, d / 3), aA = 0.0004;
  /* onset first — a take with 20ms of leader would otherwise spend the
     envelope's loudest moment on silence */
  let pk = 0; for (let i = 0; i < n; i++) { const a = Math.abs(L[i]); if (a > pk) pk = a; }
  const thr = Math.max(1e-5, pk * 0.02);
  let o = 0; for (let i = 0; i < n; i++) if (Math.abs(L[i]) >= thr) { o = i; break; }
  /* A FIXED 400ms BLOCK, ZERO-PADDED — not "as much buffer as there is".
     BS.1770 momentary loudness averages over 400ms whatever the source does,
     so the silence after a 60ms rim is PART of its loudness and is exactly why
     a rim reads quieter than a kick of the same peak. Truncating the block to
     the take instead put the model out by 10log10(take/0.4) — measured as an
     8.25dB spread in the chain gain, worst on the shortest pads (rim 0.06s,
     -10.34dB) and near zero on the longest (clap 1.27s, -2.47dB). */
  const blk = Math.round(0.4 * sr);
  const eL = new Float32Array(blk), eR = new Float32Array(blk);
  for (let j = 0; j < blk; j++) {
    const x = o + j * rate, i0 = Math.floor(x); if (i0 + 1 >= n) break;
    const fr = x - i0, t = j / sr, g = t < aA ? t / aA : Math.exp(-(t - aA) / tau);
    eL[j] = (L[i0] + (L[i0 + 1] - L[i0]) * fr) * g;
    eR[j] = (R[i0] + (R[i0 + 1] - R[i0]) * fr) * g;
  }
  const [kL, kR] = kWeight(eL, eR, sr);
  return lufsOf(kL, kR, 0, blk);
}
async function probePadPred() {
  const ch = Math.max(1, Math.min(9, Math.round(num(P.ch, 9))));
  const want = str(P.kit, 'KT808').split(',');
  const kits = (typeof libAll === 'function' ? libAll() : []).filter(e => e && e.cat === 'kit');
  const keep = stash(ch), rows = [], sr = AC.sampleRate;
  try {
    for (const nm of want) {
      const en = kits.find(e => e.name === nm);
      if (!en) { rows.push({ k: nm, err: 'no such kit' }); continue; }
      unstash(ch, { data: JSON.parse(JSON.stringify(en.data)), loop: keep.loop });
      await sleep(60);
      const p = S.presets[ch];
      for (let i = 0; i < 12; i++) {
        const K = p.kit && p.kit[i]; if (!K) continue;
        const slot = KITMAP[i], f = ((K.osc && K.osc[0] && K.osc[0].smp) || {}).f;
        const e = POOL.find(x => x && x.src && x.src.f === f);
        if (!e || !e.buf) { rows.push({ k: nm + ':' + slot.inst, err: 'no buffer for ' + f }); continue; }
        const dur = e.buf.duration, dcyF = (K.env && K.env[0] && K.env[0].d) ? K.env[0].d / dur
                                          : kitDcy(slot.inst);
        const pred = padLoudOffline(e.buf, dcyF, sr, Math.pow(2, i / 12));
        pin(ch); engine.allOff(); await sleep(40);
        const bus = busOf(ch); const t = tap(bus); await sleep(25);
        engine.noteOn(AC.currentTime + 0.02, ch, KBBASE + i, 1.0);
        await sleep(650); engine.allOff();
        const [L, R] = t.stop(), w = windowOf(L, R);
        const [kL, kR] = kWeight(L, R, sr);
        const meas = lufsOf(kL, kR, w.o, Math.min(Math.round(0.4 * sr), L.length - w.o));
        const lvl = (K.mix || {}).lvl != null ? K.mix.lvl : 0.8;
        const lvlDb = 20 * Math.log10(Math.max(lvl, 1e-9));
        rows.push({ k: nm + ':' + slot.inst, dur: +dur.toFixed(3), dcy: +dcyF.toFixed(3),
                    lvl: +lvl.toFixed(3), pred: +pred.toFixed(1), meas: +meas.toFixed(1),
                    gain: +(meas - pred - lvlDb).toFixed(2) });
      }
    }
  } finally { unstash(ch, keep); }
  const gs = rows.filter(r => typeof r.gain === 'number').map(r => r.gain).sort((a, b) => a - b);
  if (gs.length) {
    const mean = gs.reduce((a, b) => a + b, 0) / gs.length;
    const sd = Math.sqrt(gs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / gs.length);
    rows.push({ k: '— CHAIN GAIN —', pred: +mean.toFixed(2), meas: +sd.toFixed(2),
                gain: +(gs[gs.length - 1] - gs[0]).toFixed(2) });
  }
  return { cols: ['dur', 'dcy', 'lvl', 'pred', 'meas', 'gain'], rows,
           notes: 'gain = meas - pred - 20log10(lvl): the voice chain, which the model does NOT '
                + 'include. On the summary row: pred = its MEAN, meas = its SD, gain = its RANGE. '
                + 'A small SD means the offline model predicts the bus and the fix can be arithmetic.' };
}

/* ---------------- mixbus: the whole kit, against a real record ---------- *
 * kitmix weighs the pads against each other. This plays them TOGETHER and asks
 * the two questions a mix engineer actually asks of a drum bus: how loud is it
 * (BS.1770 INTEGRATED, gated — not a peak, not an rms), and where does its
 * energy sit. Then it asks the same of a real drum recording off the loop
 * shelf, so the answer is a comparison and not an opinion. */

/* GATED INTEGRATED LOUDNESS, the real one: 400ms blocks at 75% overlap, an
   absolute gate at -70 LUFS, then a relative gate 10 LU below the mean of what
   survived. The gate is the whole point — without it the silence between hits
   drags a drum loop's reading down by several LU and two patterns of different
   density stop being comparable. */
function lufsIntegrated(kL, kR, sr) {
  const blk = Math.round(0.4 * sr), hop = Math.round(blk / 4);
  const n = Math.min(kL.length, kR.length), zs = [];
  for (let o = 0; o + blk <= n; o += hop) {
    let sl = 0, s2 = 0;
    for (let i = o; i < o + blk; i++) { sl += kL[i] * kL[i]; s2 += kR[i] * kR[i]; }
    zs.push(sl / blk + s2 / blk);
  }
  if (!zs.length) return { lufs: -120, blocks: 0 };
  const L = z => -0.691 + 10 * Math.log10(Math.max(z, 1e-20));
  let keep = zs.filter(z => L(z) > -70);
  if (!keep.length) return { lufs: -120, blocks: 0 };
  const relGate = L(keep.reduce((a, b) => a + b, 0) / keep.length) - 10;
  const k2 = keep.filter(z => L(z) > relGate);
  const use = k2.length ? k2 : keep;
  return { lufs: L(use.reduce((a, b) => a + b, 0) / use.length), blocks: use.length,
           mmax: Math.max(...zs.map(L)) };
}
/* A DRUM PATTERN THAT IS REPRESENTATIVE, because band balance is a question
   about DENSITY as much as level: a hat on every eighth puts far more energy in
   the mix than a crash on bar one, whatever their faders say. Steps are
   sixteenths; each row is which pad, on which steps of a bar. */
const MIXPAT = [
  [0,  [0, 6, 10]],            // kick
  [1,  [4, 12]],               // snare
  [2,  [0, 2, 4, 6, 8, 10, 12]],  // hat closed — eighths, minus the one the open takes
  [3,  [14]],                  // hat open
  [4,  [12]],                  // clap, doubling the backbeat
  [5,  [11, 15]],              // tom
  [6,  [7]],                   // rim
  [7,  [0]],                   // cymbal — bar 1 only, see below
  [8,  [3]],                   // cowbell
  [9,  [9]],                   // conga
  [10, [1, 3, 5, 7, 9, 11, 13, 15]],  // shaker — offbeat sixteenths
  [11, [2, 6, 10, 14]],        // ride
];
/* THE BALANCE OF THE MIX, NOT OF ITS FIRST HIT. `bands` reads one 16384-point
   window — 372ms — which over a four-second pattern is the kick and nothing
   else. Welch: average the POWER spectra of successive windows at 50% overlap
   across the whole recording, so every hat and every crash is in the answer in
   proportion to how often it plays. Density is half of what tonal balance
   means for drums. */
function bandsAvg(L, R, sr) {
  const N = 16384, half = N >> 1, hop = N >> 1;
  const acc = new Float64Array(half);
  const re = new Float64Array(N), im = new Float64Array(N);
  const n = Math.min(L.length, R.length);
  let wins = 0;
  for (let o = 0; o + N <= n; o += hop) {
    for (let i = 0; i < N; i++) {
      re[i] = ((L[o + i] || 0) + (R[o + i] || 0)) * 0.5 *
              (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 1; k < half; k++) acc[k] += re[k] * re[k] + im[k] * im[k];
    wins++;
  }
  const e = MIXBANDS.map(() => 0);
  let tot = 0, sw = 0, sm = 0;
  for (let k = 1; k < half; k++) {
    const hz = k * sr / N, m = acc[k];
    tot += m; const mag = Math.sqrt(m); sw += mag * hz; sm += mag;
    for (let b = 0; b < MIXBANDS.length; b++)
      if (hz >= MIXBANDS[b][1] && hz < MIXBANDS[b][2]) { e[b] += m; break; }
  }
  const out = { wins };
  MIXBANDS.forEach(([nm], b) => out[nm] = tot ? +(100 * e[b] / tot).toFixed(1) : 0);
  out.cent = sm ? Math.round(sw / sm) : 0;
  return out;
}
async function probeMixBus() {
  const ch = Math.max(1, Math.min(9, Math.round(num(P.ch, 9))));
  const want = str(P.kit, 'KT808').split(',');
  const bpm = num(P.bpm, 120), bars = Math.max(1, Math.round(num(P.bars, 2)));
  const refName = str(P.ref, 'brushkit');
  const kits = (typeof libAll === 'function' ? libAll() : []).filter(e => e && e.cat === 'kit');
  const keep = stash(ch), rows = [], sr = AC.sampleRate;
  const spb = 60 / bpm, step = spb / 4, barT = spb * 4;
  const report = (k, L, R, extra) => {
    const [kL, kR] = kWeight(L, R, sr);
    const ig = lufsIntegrated(kL, kR, sr);
    let pk = 0;
    for (let i = 0; i < L.length; i++) {
      const a = Math.abs(L[i]), b = Math.abs(R[i] || 0);
      if (a > pk) pk = a; if (b > pk) pk = b;
    }
    const pkDb = 20 * Math.log10(Math.max(pk, 1e-9));
    let over = 0;
    for (let i = 0; i < L.length; i++)
      if (Math.abs(L[i]) > 1 || Math.abs(R[i] || 0) > 1) over++;
    const bd = bandsAvg(L, R, sr);
    return Object.assign({ k, lufs: +ig.lufs.toFixed(1), mmax: +ig.mmax.toFixed(1),
      peak: +pkDb.toFixed(1), over: over, PLR: +(pkDb - ig.lufs).toFixed(1), cent: bd.cent,
      sub: bd.sub, low: bd.low, lomid: bd.lomid, mid: bd.mid, himid: bd.himid,
      pres: bd.pres, bril: bd.bril, air: bd.air }, extra || {});
  };
  try {
    for (const nm of want) {
      const en = kits.find(e => e.name === nm);
      if (!en) { rows.push({ k: nm, err: 'no such kit' }); continue; }
      unstash(ch, { data: JSON.parse(JSON.stringify(en.data)), loop: keep.loop });
      await sleep(80); pin(ch);
      engine.allOff(); await sleep(50);
      /* THE MASTER, NOT THE CHANNEL, when asked. Web Audio is float and does
         not clip between nodes, so a channel-bus peak over 1.0 is not a fault
         — the only place clipping is real is the last node before the
         destination. `at=master` taps engine.comp, post-compressor. */
      const bus = str(P.at, 'ch') === 'master' ? engine.comp : busOf(ch);
      if (!bus) { rows.push({ k: nm, err: 'no bus' }); continue; }
      const t = tap(bus); await sleep(30);
      const t0 = AC.currentTime + 0.08;
      for (let b = 0; b < bars; b++) for (const [pad, steps] of MIXPAT)
        for (const s of steps) {
          if (pad === 7 && b !== 0) continue;                 // the crash lands once
          engine.noteOn(t0 + b * barT + s * step, ch, KBBASE + pad, 1.0);
        }
      await sleep((bars * barT + 0.6) * 1000);
      engine.allOff();
      const [L, R] = t.stop();
      rows.push(report(nm, L, R, { src: 'kit' }));
    }
  } finally { unstash(ch, keep); }
  /* THE REFERENCE IS A RECORD, analysed as a FILE — no engine in the path, so
     nothing this instrument does can flatter it. */
  const re = POOL.find(e => e && e.name === refName && e.buf);
  if (re) {
    const b = re.buf, L = b.getChannelData(0),
          R = b.numberOfChannels > 1 ? b.getChannelData(1) : L;
    rows.push(report('REF ' + refName, L, R, { src: 'file ' + b.duration.toFixed(2) + 's' }));
  } else rows.push({ k: 'REF ' + refName, err: 'not on the shelf' });
  return { cols: ['src', 'lufs', 'mmax', 'peak', 'over', 'PLR', 'cent', 'sub', 'low', 'lomid', 'mid',
                  'himid', 'pres', 'bril', 'air'], rows,
           notes: 'lufs = BS.1770 INTEGRATED, gated · mmax = loudest 400ms block · '
                + 'PLR = peak minus integrated, the crest factor mastering reads · '
                + 'bands are % of spectral energy, Welch-averaged over the whole take' };
}

/* ---------------- synthlvl: what a GENERATED drum pad weighs -------------- *
 * The sampled path measures the buffer. A synth pad has no buffer, so the
 * question is whether its loudness can be PREDICTED from the preset — which is
 * all a kit roll has at the moment it must choose a fader.
 *
 * This rolls k presets per KITMAP slot, at that slot's own NOTE (a synth drum
 * is pitched by the pad the same way a sample is rated by it), renders each at
 * fader 1.0, and records alongside the measurement everything a build-time
 * predictor could legally use: the voicing name the generator encodes into the
 * preset name, and the amp envelope. `env` here is the envelope's own
 * contribution in dB, computed exactly as the engine schedules it — so
 * `meas - env` is what is LEFT once the envelope is accounted for, and if that
 * clusters per voicing then a voicing table plus this term is the model. */
function envTermDb(e, sr) {
  const aA = Math.max(0.001, e.a || 0.003), aS = e.s == null ? 1 : e.s;
  const aD = e.d == null ? 0.1 : e.d, tau = Math.max(0.005, aD / 3);
  const n = Math.round(0.4 * sr);
  let sq = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const g = t < aA ? t / aA : aS + (1 - aS) * Math.exp(-(t - aA) / tau);
    sq += g * g;
  }
  return 10 * Math.log10(Math.max(sq / n, 1e-12));
}
async function probeSynthLvl() {
  const ch = Math.max(1, Math.min(9, Math.round(num(P.ch, 9))));
  const k = Math.max(1, Math.round(num(P.k, 8)));
  const slots = list(P.slots, ['0','1','2','3','4','5','6','7','8','9','10','11']).map(Number);
  const seed0 = Math.round(num(P.seed, 4000));
  const keep = stash(ch), rows = [], sr = AC.sampleRate;
  try {
    for (const si of slots) {
      const slot = KITMAP[si]; if (!slot) continue;
      for (let i = 0; i < k; i++) {
        const rnd = mulberry32(seed0 + si * 977 + i * 31);
        let pre; try { pre = genPreset(slot.cat, rnd, 0.3); } catch (e) { continue; }
        pre.cat = slot.cat; delete pre.kit;
        const dat = presetData(pre);
        setP(ch, pre.name, slot.cat, dat);
        S.presets[ch].mix.lvl = 1.0; S.presets[ch].mix.pan = 0;
        engine.rebuildRack(ch); engine.refresh(ch);
        await sleep(35); pin(ch);
        engine.allOff(); await sleep(30);
        const bus = busOf(ch); if (!bus) continue;
        const t = tap(bus); await sleep(20);
        engine.noteOn(AC.currentTime + 0.02, ch, KBBASE + si, 1.0);
        await sleep(520); engine.allOff();
        const [L, R] = t.stop(), w = windowOf(L, R);
        const [kL, kR] = kWeight(L, R, sr);
        const lu = lufsOf(kL, kR, w.o, Math.min(Math.round(0.4 * sr), L.length - w.o));
        const e0 = (S.presets[ch].env || [])[0] || {};
        const ampMod = (S.presets[ch].mod || []).find(m => m && m.src === 1);
        const ae = ampMod ? ampMod : e0;
        const et = envTermDb(ae, sr);
        rows.push({ k: slot.inst + '#' + i, cat: slot.cat, slot: si, nm: pre.name,
                    voice: String(pre.name).slice(3),
                    a: r3(ae.a), d: r3(ae.d), s: r3(ae.s),
                    meas: +lu.toFixed(1), env: +et.toFixed(1),
                    resid: +(lu - et).toFixed(1) });
      }
    }
  } finally { unstash(ch, keep); }
  return { cols: ['cat', 'slot', 'nm', 'voice', 'a', 'd', 's', 'meas', 'env', 'resid'], rows,
           notes: 'meas = BS.1770 momentary at fader 1.0, at the pad\'s own note · '
                + 'env = the amp envelope\'s own dB over the same 400ms · '
                + 'resid = meas - env, what a build-time table would have to supply' };
}

/* ---------------- kitcal: the whole kit measured in ONE pass ------------- *
 * The prototype of what a shipped calibration would do. Twelve pads share a
 * channel bus, so measuring them one at a time costs twelve 400ms passes —
 * five seconds a kit, fifty for the ten factory synth kits, which is why the
 * table was the only option. But every pad already owns its OWN bus
 * (voiceOut -> kitBuses[pi][pc].out), so all twelve can be tapped separately,
 * fired together, and read in a SINGLE 400ms window.
 *
 * This proves the two things that decide whether it can ship: that twelve
 * simultaneous pads do not steal each other's voices, and that a per-pad tap
 * hears only its own pad. */
async function probeKitCal() {
  const ch = Math.max(1, Math.min(9, Math.round(num(P.ch, 9))));
  const nm = str(P.kit, 'KT01');
  const kits = (typeof libAll === 'function' ? libAll() : []).filter(e => e && e.cat === 'kit');
  const en = kits.find(e => e.name === nm);
  if (!en) return { cols: [], rows: [], err: 'no kit named ' + nm };
  const keep = stash(ch), rows = [], sr = AC.sampleRate;
  const t0 = performance.now();
  try {
    unstash(ch, { data: JSON.parse(JSON.stringify(en.data)), loop: keep.loop });
    await sleep(80); pin(ch);
    engine.allOff(); await sleep(40);
    /* SILENCE THE CHANNEL AT ITS ONLY EXIT. trim -> mSum is the single path to
       the master, so cutting it makes the pass inaudible while everything
       upstream still renders. */
    const B = engine.buses[ch];
    try { B.trim.disconnect(engine.mSum); } catch (_) {}
    /* the pad buses are built LAZILY on first note, so ask for them first or
       there is nothing to tap */
    for (let i = 0; i < 12; i++) try { engine.voiceOut(ch, KBBASE + i); } catch (_) {}
    const store = (engine.kitBuses || {})[ch] || {};
    const taps = [];
    for (let i = 0; i < 12; i++) {
      const kb = store[i];
      taps.push(kb && kb.out ? tap(kb.out) : null);
    }
    await sleep(30);
    const at = AC.currentTime + 0.05;
    for (let i = 0; i < 12; i++) engine.noteOn(at, ch, KBBASE + i, 1.0);
    await sleep(520);
    engine.allOff();
    for (let i = 0; i < 12; i++) {
      const t = taps[i]; if (!t) { rows.push({ k: 'pad' + i, err: 'no pad bus' }); continue; }
      const [L, R] = t.stop();
      const w = windowOf(L, R);
      const [kL, kR] = kWeight(L, R, sr);
      const lu = lufsOf(kL, kR, w.o, Math.min(Math.round(0.4 * sr), L.length - w.o));
      const K = S.presets[ch].kit[i] || {};
      const lvl = (K.mix || {}).lvl != null ? K.mix.lvl : 0.8;
      const inst = KITMAP[i].inst;
      const at1 = lu - 20 * Math.log10(Math.max(lvl, 1e-9));   // its loudness at fader 1.0
      const want = -20.0 + ((MIXROLE[inst] || MIXROLE.perc).lu);
      rows.push({ k: inst, lvl: r3(lvl), lufs: +lu.toFixed(1), at1: +at1.toFixed(1),
                  tgt: want, 'new lvl': +Math.max(0.05, Math.min(3,
                    Math.pow(10, (want - at1) / 20))).toFixed(3),
                  'would be': +(want).toFixed(1) });
    }
    try { B.trim.connect(engine.mSum); } catch (_) {}
  } finally { unstash(ch, keep); try { engine.buses[ch].trim.connect(engine.mSum); } catch (_) {} }
  rows.push({ k: '— one pass took —', lufs: Math.round(performance.now() - t0) });
  return { cols: ['lvl', 'lufs', 'at1', 'tgt', 'new lvl', 'would be'], rows,
           notes: 'lufs = what the pad measured at its CURRENT fader, on its own bus, with all '
                + 'twelve sounding at once · at1 = its loudness at fader 1.0 · '
                + '"new lvl" is the fader that would put it on target · the last row is '
                + 'wall-clock milliseconds for the whole kit' };
}

const PROBES = { level: probeLevel, spectrum: probeSpectrum, cursor: probeCursor,
                   preset: probePreset, key: probeKey, keypath: probeKeyPath,
                   roundtrip: probeRoundTrip,
                   sweep: probeSweep,
                   mono: probeMono,
                   trig: probeTrig,
                   matrix: probeMatrix,
                   modmatrix: probeModMatrix,
                   micrec: probeMicRec,
                   micrec2: probeMicRec2,
                   grainflt: probeGrainFlt,
                   setio: probeSetIO,
                   audclip: probeAudClip,
                   resamp: probeResamp,
                   fxmod: probeFxMod,
                   fxwire: probeFxWire,
                   poolkind: probePoolKind,
                   modscope: probeModScope,
                   retroguess: probeRetroGuess,
                   envoff: probeEnvOff,
                   snapaud: probeSnapAud,
                   arplatch: probeArpLatch,
                   retro: probeRetro,
                   chord: probeChord,
                   steps: probeSteps,
                   master: probeMaster,
                   recpitch: probeRecPitch,
                   smplib: probeSmpLib,
                   smpkit: probeSmpKit,
                   kitoct: probeKitOct,
                   kitdcy: probeKitDcy,
                   genqual: probeGenQual,
                   archlvl: probeArchLvl,
                   patqual: probePatQual,
                   pwm: probePwm,
                   pwmall: probePwmAll,
                   spread: probeSpread,
                   syscopy: probeSysCopy,
                   shelf: probeShelf,
                   veldecay: probeVelDecay,
                   press: probePress,
                   smpdiag: probeSmpDiag,
                   smprate: probeSmpRate,
                   smploud: probeSmpLoud,
                   kitmix: probeKitMix,
                   padpred: probePadPred,
                   mixbus: probeMixBus,
                   synthlvl: probeSynthLvl,
                   kitcal: probeKitCal,
                   wtpos: probeWtPos,
                   rollkey: probeRollKey,
                   wtshelf: probeWtShelf,
                   wtalias: probeWtAlias,
                   lfosync: probeLfoSync };
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
