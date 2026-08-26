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
                   fxwire: probeFxWire };
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
