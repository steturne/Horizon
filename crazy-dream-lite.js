/* Crazy Dream Lite: the Crazy Dream reverb, slimmed down to run next to the decks.
   The same sound engine: a feedback delay network of 8 lines (same lengths, same Householder mixing, same damping,
   same diffusion, drifting delays for the shimmer), Chime, Bloom and Hold. What is gone, and why it was costly:
     - Nudge and Flick (pitch tricks on the way in): their saw, shapers, sweeping delay lines and envelope followers ran
       all the time, even switched off. About 25 nodes.
     - per line: the input mix, cross and tap gains (a Web Audio delay adds up its inputs by itself, and the taps can
       share one gain), the low cut inside the loop (the input already has one), its own LFO (two drifts are shared,
       each both ways) and its own Chime filter (Chime is one chain per side, connected only when it is turned up).
   About 50 nodes instead of about 115; Bloom's convolver exists only once Bloom is turned up, and its rising tail is
   made in a background worker instead of on the page.

     const r = CrazyDreamLite.create(ctx, {settings: {mix: 1, decay: 6}});
     source.connect(r.input); r.output.connect(ctx.destination);
     r.set({decay: 8}); r.freeze(true);

   Settings are Crazy Dream's: mix, size, decay, gravity (below 0 = the tail swells up: Bloom), predelay, mod, rate,
   lowCut, highCut, resonance. */
(function () {
  'use strict';
  const MAX_DECAY = 60;
  const DEFAULTS = { mix: 0.35, size: 0.7, decay: 10, gravity: 0, predelay: 0.03, mod: 0.35, rate: 0.25, lowCut: 90, highCut: 8000, resonance: 0 };
  const PRESETS = {
    'Big room':      { size: 0.6, decay: 2.2, gravity: 0, predelay: 0.012, mod: 0.2, rate: 0.25, lowCut: 100, highCut: 5500, resonance: 0 },
    'Concert hall':  { size: 0.55, decay: 2.4, gravity: 0, predelay: 0.025, mod: 0.15, rate: 0.2, lowCut: 120, highCut: 6500, resonance: 0 },
    'Cathedral':     { size: 0.85, decay: 6, gravity: 0, predelay: 0.04, mod: 0.25, rate: 0.15, lowCut: 100, highCut: 5000, resonance: 0 },
    'Daydream':      { size: 0.25, decay: 1.4, gravity: 0, predelay: 0.01, mod: 0.15, rate: 0.3, lowCut: 100, highCut: 10000, resonance: 0 },
    'Crazy dream':   { size: 0.9, decay: 18, gravity: 0, predelay: 0.04, mod: 0.45, rate: 0.2, lowCut: 90, highCut: 7000, resonance: 0 },
    'Waking bloom':  { size: 0.8, decay: 8, gravity: -0.85, predelay: 0, mod: 0.3, rate: 0.2, lowCut: 120, highCut: 9000, resonance: 0 },
    'Endless sleep': { size: 1, decay: 60, gravity: 0, predelay: 0.06, mod: 0.6, rate: 0.12, lowCut: 120, highCut: 5500, resonance: 0.15 },
    'Nightmare':     { size: 0.85, decay: 25, gravity: 0, predelay: 0.02, mod: 0.5, rate: 0.15, lowCut: 60, highCut: 2200, resonance: 0.1 },
    'Music box':     { size: 0.6, decay: 12, gravity: 0, predelay: 0.03, mod: 0.25, rate: 0.3, lowCut: 150, highCut: 9000, resonance: 0.7 },
  };

  // Bloom's rising tail (noise on a rising envelope, as in Crazy Dream), made in a worker
  function renderSwell(sr, amt, len, highCut) {
    const n = Math.round(len * sr), k = Math.exp(-2 * Math.PI * Math.min(highCut, 16000) / sr), pw = 1 + 2.5 * amt, fo = Math.round(sr * 0.03), out = [];
    let E = 0;
    for (let c = 0; c < 2; c++) {
      const o = new Float32Array(n);
      let y = 0;
      for (let j = 0; j < n; j++) { y = (1 - k) * (Math.random() * 2 - 1) + k * y; let e = Math.pow(j / n, pw); if (j > n - fo) e *= (n - j) / fo; o[j] = y * e; E += o[j] * o[j]; }
      out.push(o);
    }
    const sc = 2.2 / Math.sqrt(E / 2 + 1e-12);
    for (const o of out) for (let j = 0; j < n; j++) o[j] *= sc;
    return out;
  }
  let worker = null, seq = 0;
  const waiting = new Map();
  function printSwell(sr, amt, len, highCut) {
    const args = [sr, amt, len, highCut];
    if (worker === null) {
      try {
        const src = 'const renderSwell=' + renderSwell.toString() + ';self.onmessage=e=>{const ch=renderSwell(...e.data.args);self.postMessage({id:e.data.id,ch},ch.map(c=>c.buffer));};';
        worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
        worker.onmessage = e => { const p = waiting.get(e.data.id); waiting.delete(e.data.id); if (p) p.resolve(e.data.ch); };
        worker.onerror = ev => { ev.preventDefault(); worker = false; for (const [id, p] of waiting) { waiting.delete(id); p.resolve(renderSwell(...p.args)); } };
      } catch (e) { worker = false; }
    }
    if (!worker) return new Promise(res => setTimeout(() => res(renderSwell(...args)), 0));
    return new Promise(resolve => { const id = ++seq; waiting.set(id, { resolve, args }); worker.postMessage({ id, args }); });
  }

  // ---- the live network, slimmed: the same 8 delay lines, diffusion, damping and modulation as Crazy Dream,
  // without the parts that cost the most and matter least here (see the top of this file)
  // opts.eco: 4 lines instead of 8 (about half the work; a little grainier)
  // opts.autoSleep (default on): when nothing has come in for longer than the tail lasts, the network is unplugged and
  // costs nothing; the first sound in plugs it back in (within about 40 ms). Never in an OfflineAudioContext.
  function create(ctx, opts) {
    const ALL8 = [0.0371, 0.0437, 0.0533, 0.0619, 0.0713, 0.0831, 0.0977, 0.1079];
    const LENS = opts && opts.eco ? [0.0437, 0.0619, 0.0831, 0.1079] : ALL8, N = LENS.length, MEAN = ALL8.reduce((a, b) => a + b) / 8;
    const S = Object.assign({}, DEFAULTS, (opts && opts.settings) || {}), frozen = { on: false };
    const ALL = [], keep = n => (ALL.push(n), n);
    const G = v => { const g = keep(ctx.createGain()); if (v != null) g.gain.value = v; return g; };
    const F = (type, f, q) => { const b = keep(ctx.createBiquadFilter()); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; };
    let ready = false;
    const to = (p, v) => { if (!ready) { p.value = v; return; } p.cancelScheduledValues(ctx.currentTime); p.setTargetAtTime(v, ctx.currentTime, 0.04); };

    const input = G(), output = G(), dry = G(), fdnWet = G(), gate = G(1);
    const mono = G(); mono.channelCount = 1; mono.channelCountMode = 'explicit'; mono.channelInterpretation = 'speakers';
    input.connect(dry); dry.connect(output); input.connect(gate); gate.connect(mono);
    const pre = keep(ctx.createDelay(1)), lowCut = F('highpass', S.lowCut, -3.5), highCut = F('lowpass', S.highCut, -3.5);
    mono.connect(pre); pre.connect(lowCut); lowCut.connect(highCut);
    let d = highCut;
    for (const f of [190, 430, 970, 2100, 4700]) { const a = F('allpass', f, 0.55); d.connect(a); d = a; }
    // the tank: a delay's input adds up everything connected to it, so the feed, the line's own return and the
    // Householder mix (minus 2/N of all lines) need no mixing nodes of their own
    const sum = G(), merger = keep(ctx.createChannelMerger(2)), lines = [];
    const lfos = [0, 1].map(() => { const o = keep(ctx.createOscillator()); o.start(); return o; });
    const depths = [0, 1, 2, 3].map(i => { const g = G(0); lfos[i & 1].connect(g); return g; });   // two drifts, each both ways
    for (let i = 0; i < N; i++) {
      const dl = keep(ctx.createDelay(2)), damp = F('lowpass', S.highCut, -3.5), self = G();
      d.connect(dl); dl.connect(damp); damp.connect(self); self.connect(dl); damp.connect(sum); sum.connect(dl);
      damp.connect(merger, 0, i % 2);
      lines.push({ dl, damp, self, depth: depths[i % 4] });
    }
    const wetSum = G();                                  // everything wet meets here; unplugging it puts the network to sleep
    wetSum.connect(output);
    merger.connect(fdnWet); fdnWet.connect(wetSum);
    // Chime: ringing colour on what leaves the tank (left gets the even lines' notes, right the odd ones'); off = not connected
    const split = keep(ctx.createChannelSplitter(2)), rmerge = keep(ctx.createChannelMerger(2)), chime = G(0);
    [0, 1].forEach(c => { let x = null; for (let i = c; i < N; i += 2) { const pk = F('peaking', 650 * Math.pow(1.37, i), 8); pk.gain.value = 0; if (x) x.connect(pk); else split.connect(pk, c); x = pk; lines[i].peak = pk; } x.connect(rmerge, 0, c); });
    rmerge.connect(chime); chime.connect(wetSum);
    let chimeOn = false, drifting = false;
    // Bloom (negative gravity): a convolver with a rising tail, made only when Bloom is turned up
    let conv = null, swellWet = null, swellKey = '', swellGen = 0;
    function swell() {
      const amt = Math.max(0, -S.gravity);
      if (amt <= 0) { if (swellWet) to(swellWet.gain, 0); return; }
      if (!conv) { conv = keep(ctx.createConvolver()); conv.normalize = false; swellWet = G(0); highCut.connect(conv); conv.connect(swellWet); swellWet.connect(wetSum); }
      const len = Math.min(12, Math.max(0.4, S.decay * (0.25 + 0.5 * amt))), key = [amt.toFixed(2), len.toFixed(2), S.highCut | 0].join();
      if (key === swellKey) return;
      swellKey = key;
      const my = ++swellGen;
      printSwell(ctx.sampleRate, amt, len, S.highCut).then(ch => {
        if (my !== swellGen) return;
        const b = ctx.createBuffer(2, ch[0].length, ctx.sampleRate);
        ch.forEach((c, i) => b.copyToChannel(c, i));
        conv.buffer = b;
      });
    }
    function apply() {
      const scale = 0.35 + 3.4 * S.size, resDb = 14 * S.resonance;
      let g = Math.pow(10, -3 * MEAN * scale / Math.max(0.3, S.decay));
      if (frozen.on) g = 0.9997;
      g = Math.min(g, 0.9997);
      lines.forEach((L, i) => {
        to(L.dl.delayTime, LENS[i] * scale);
        to(L.self.gain, g);
        to(L.damp.frequency, frozen.on ? 20000 : Math.min(20000, S.highCut * 1.1));
        to(L.peak.gain, resDb);
      });
      to(sum.gain, -2 * g / N);
      const dep = S.mod * 0.0035 * (0.4 + S.size), hz = 0.05 + 1.6 * S.rate, moving = S.mod > 0.005 && !frozen.on;
      if (moving !== drifting) { lines.forEach(L => { if (moving) L.depth.connect(L.dl.delayTime); else L.depth.disconnect(L.dl.delayTime); }); drifting = moving; }
      depths.forEach((x, i) => to(x.gain, (i & 2 ? -1 : 1) * dep * (1 - 0.15 * i)));
      to(lfos[0].frequency, hz * 0.83); to(lfos[1].frequency, hz * 1.21);
      to(pre.delayTime, Math.min(0.99, Math.max(0, S.predelay)));
      to(lowCut.frequency, S.lowCut); to(highCut.frequency, S.highCut);
      const neg = Math.max(0, -S.gravity), wet = Math.sin(S.mix * Math.PI / 2), dryV = Math.cos(S.mix * Math.PI / 2);
      const ch = resDb > 0.01;
      if (ch !== chimeOn) { if (ch) merger.connect(split); else merger.disconnect(split); chimeOn = ch; }
      to(dry.gain, dryV);
      const tap = 0.42 * Math.sqrt(8 / N);                                     // Eco: half the lines, same loudness
      to(fdnWet.gain, tap * wet * (1 - neg) * (ch ? 0.5 : 1));
      to(chime.gain, ch ? tap * wet * (1 - neg) * 0.5 : 0);
      to(gate.gain, frozen.on ? 0 : 1);
      swell();
      if (swellWet) to(swellWet.gain, wet * neg * 0.9);
    }
    apply(); ready = true;
    const lev = keep(ctx.createAnalyser()); lev.fftSize = 512; wetSum.connect(lev);
    // sleep: Chrome only runs nodes that lead to the speakers (or to an analyser), so unplugging wetSum stops the
    // whole network behind it; the input keeps a small level meter of its own to wake it
    let asleep = false, lastSound = performance.now(), timer = 0;
    const inMon = keep(ctx.createAnalyser()); inMon.fftSize = 256; mono.connect(inMon);
    const inBuf = new Float32Array(inMon.fftSize);
    function sleep(on) {
      if (on === asleep) return;
      asleep = on;
      if (on) wetSum.disconnect(); else { wetSum.connect(output); wetSum.connect(lev); }
    }
    const offline = typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
    if (!(opts && opts.autoSleep === false) && !offline) timer = setInterval(() => {
      inMon.getFloatTimeDomainData(inBuf);
      let pk = 0;
      for (let i = 0; i < inBuf.length; i++) { const a = Math.abs(inBuf[i]); if (a > pk) pk = a; }
      const now = performance.now();
      if (pk > 1e-4 || frozen.on) { lastSound = now; sleep(false); return; }
      const tail = (S.decay * 1.1 + S.predelay + 0.4 + (S.gravity < 0 ? 12 : 0)) * 1000;
      if (!asleep && now - lastSound > tail) sleep(true);
    }, 40);
    return {
      input, output, ready: Promise.resolve(),
      set(p) { for (const k in p || {}) if (k in DEFAULTS && Number.isFinite(+p[k])) S[k] = k === 'decay' ? Math.min(MAX_DECAY, Math.max(0.3, +p[k])) : +p[k]; apply(); return this; },
      get settings() { return Object.assign({}, S); },
      freeze(on) { frozen.on = !!on; if (frozen.on) sleep(false); apply(); return frozen.on; },
      get asleep() { return asleep; },
      sleep(on) { sleep(!!on); },
      get frozen() { return frozen.on; },
      level() { const a = new Float32Array(lev.fftSize); lev.getFloatTimeDomainData(a); let s = 0; for (const v of a) s += v * v; return Math.sqrt(s / a.length); },
      dispose() { clearInterval(timer); swellGen++; lfos.forEach(o => { try { o.stop(); } catch (e) { /* stopped */ } }); ALL.forEach(n => { try { n.disconnect(); } catch (e) { /* gone */ } }); },
    };
  }

  // ---- a plain panel (no animation, to stay light): preset + the main settings
  function mountUI(el, r, onChange) {
    const doc = el.ownerDocument || document;
    const dec = v => 0.3 * Math.pow(MAX_DECAY / 0.3, v), decInv = s => Math.log(s / 0.3) / Math.log(MAX_DECAY / 0.3);
    const tone = v => 800 * Math.pow(25, v), toneInv = f => Math.log(f / 800) / Math.log(25);
    const pct = v => Math.round(v * 100) + '%';
    const SL = [
      ['mix', 'Dream', s => s.mix, v => ({ mix: v }), s => pct(s.mix)],
      ['size', 'Depth', s => s.size, v => ({ size: v }), s => pct(s.size)],
      ['decay', 'Linger', s => decInv(s.decay), v => ({ decay: dec(v) }), s => s.decay.toFixed(1) + ' s'],
      ['bloom', 'Bloom', s => Math.max(0, -s.gravity), v => ({ gravity: -v }), s => (s.gravity < -0.02 ? pct(-s.gravity) : 'off')],
      ['mod', 'Shimmer', s => s.mod, v => ({ mod: v }), s => pct(s.mod)],
      ['tone', 'Light', s => toneInv(s.highCut), v => ({ highCut: tone(v) }), s => (s.highCut / 1000).toFixed(1) + ' kHz'],
      ['res', 'Chime', s => s.resonance, v => ({ resonance: v }), s => pct(s.resonance)],
    ];
    el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:end;font:12px Arial,sans-serif;color:#C9CED4">
      <label style="display:flex;flex-direction:column;gap:2px">Preset<select data-k="preset"><option value="">Custom</option>${Object.keys(PRESETS).map(k => `<option>${k}</option>`).join('')}</select></label>
      ${SL.map(([k, l]) => `<label style="display:flex;flex-direction:column;gap:2px;min-width:100px"><span>${l} <b data-v="${k}" style="font-weight:400;color:#62E6F2"></b></span><input type="range" data-k="${k}" min="0" max="1" step="0.005"></label>`).join('')}</div>`;
    const q = s => el.querySelector(s);
    const show = () => { const s = r.settings; SL.forEach(([k, , get, , fmt]) => { const i = q(`[data-k="${k}"]`); if (doc.activeElement !== i) i.value = get(s); q(`[data-v="${k}"]`).textContent = fmt(s); }); };
    q('[data-k="preset"]').onchange = e => { if (PRESETS[e.target.value]) { r.set(PRESETS[e.target.value]); show(); if (onChange) onChange(r); } };
    SL.forEach(([k, , , map]) => { q(`[data-k="${k}"]`).oninput = e => { r.set(map(+e.target.value)); q('[data-k="preset"]').value = ''; show(); if (onChange) onChange(r); }; });
    show();
    return { refresh: show, destroy() { el.innerHTML = ''; } };
  }

  window.CrazyDreamLite = { create, mountUI, DEFAULTS, PRESETS, MAX_DECAY };
})();
