/*
 * Protein Melody Player - main application logic
 *
 * Depends on: aa_mapping.js (AM, AN, A3, AB, GR, GC, FR, HP, MAPPINGS, COMPLEXES)
 *             aa_structures.js (SC, renderStructSVG, renderSideChainSVG)
 */

/* ── Constants ── */
const SPIN_SPEED = 0.05;
/* Chromatic layout */
const MORD = ['C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4','C5','C#5','D5','D#5','E5','F5','F#5','G5'];
const NI = {}; MORD.forEach((n, i) => NI[n] = i);
const WN = ['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5'];
const BN = ['C#4','D#4','F#4','G#4','A#4','C#5','D#5','F#5'];
const BP = { 'C#4': 0, 'D#4': 1, 'F#4': 3, 'G#4': 4, 'A#4': 5, 'C#5': 7, 'D#5': 8, 'F#5': 10 };
const WW = 48, BW = 30, WH = 178, BH = 112;
/* Pentatonic layout */
const PENT_MORD = ['C3','D3','E3','G3','A3','C4','D4','E4','G4','A4','C5','D5','E5','G5','A5','C6','D6','E6','G6','A6'];
const PENT_NI = {}; PENT_MORD.forEach((n, i) => PENT_NI[n] = i);
const PENT_W = 36;
/* White-only layout (grouped mapping, G3–F5) */
const WO_WN = ['G3','A3','B3','C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5'];
const WO_BN = ['G#3','A#3','C#4','D#4','F#4','G#4','A#4','C#5','D#5'];
const WO_BP = { 'G#3': 0, 'A#3': 1, 'C#4': 3, 'D#4': 4, 'F#4': 6, 'G#4': 7, 'A#4': 8, 'C#5': 10, 'D#5': 11 };
const WO_NI = {}; WO_WN.forEach((n, i) => WO_NI[n] = i);
const AF = { L: 9.66, A: 8.25, G: 7.07, V: 6.87, E: 6.75, S: 6.56, I: 5.96, K: 5.84, R: 5.53, D: 5.45, T: 5.34, P: 4.70, N: 4.06, Q: 3.93, F: 3.86, Y: 2.92, M: 2.42, H: 2.27, C: 1.37, W: 1.08 };

const PS = [
  { name: 'hemoglobin', seq: 'VHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDP', ss: 'CCCCHHHHHHHHHHHCCCCHHHHHHHHHHHHHHHCHHHHHHCHHHCCCCCHHHHHHCHHHHHHHHHHHHHHHHHHCCHHHHHHHHHHHHHHHHHHHCCCC', pdb: '4HHB', desc: 'Hemoglobin \u03B2 (100aa): the oxygen carrier that colors your blood red', significance: 'Hemoglobin is the protein in red blood cells that carries oxygen from your lungs to every tissue in your body. Its \u03B2-chain contains the classic globin fold: eight alpha-helices wrapping around a heme group that binds O\u2082. A single mutation in this chain (E6V) causes sickle-cell disease, the first \u201Cmolecular disease\u201D ever identified. Max Perutz solved hemoglobin\'s structure in 1959 and earned the 1962 Nobel Prize, one of the first protein structures determined by X-ray crystallography.' },
  { name: 'VHH nanobody', seq: 'DVQLVESGGGSVQAGGSLRLSCAASGYIASINYLGWFRQAPGKEREGVAAVSPAGGTPYYADSVKGRFTVSLDNAENTVYLQMNSLKPEDTALYYCAAARQGWYIPLNSYGYNYWGQGTQVTVS', ss: 'CEEEEEECCEEECCCCCEEEEEEEEECHHHEEEEEEEEECCCCCCEEEEEECCCCCCEEECCCCECCEEEEEECCCCEEEEEECCCCHHHCEEEEEEEEECCCCCCCCHHHEEEECCCEEEEEC', pdb: '1ZVH', desc: 'VHH nanobody (124aa): a complete single-domain antibody from a llama', significance: 'Camelids (llamas, camels, alpacas) produce unique heavy-chain-only antibodies. The VHH domain, or nanobody, is their single variable region containing four framework regions (FR1\u2013FR4) that form a \u03B2-sandwich scaffold, and three hypervariable CDR loops that determine antigen specificity. At only ~15 kDa, nanobodies are the smallest known antigen-binding fragments. They are prized for their stability, ease of engineering, and ability to access hidden epitopes that conventional antibodies cannot reach, now used as research tools, diagnostics, and FDA-approved therapeutics (e.g. caplacizumab).' }
];

/* Keyboard bindings */
const KB_CHROMATIC = {
  'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4', 'f': 'F4', 't': 'F#4',
  'g': 'G4', 'y': 'G#4', 'h': 'A4', 'u': 'A#4', 'j': 'B4',
  'k': 'C5', 'o': 'C#5', 'l': 'D5', 'p': 'D#5', ';': 'E5', "'": 'F5', ']': 'F#5',
  '\\': 'G5'
};
let KB = {};
function isDirect() {
  const m = MAPPINGS.find(m => m.id === activeMapping);
  return m && m.type === 'direct';
}
function rebuildKB() {
  Object.keys(KB).forEach(k => delete KB[k]);
  if (isDirect()) {
    Object.entries(AM).forEach(([aa, note]) => { KB[aa.toLowerCase()] = note; });
  } else {
    Object.assign(KB, KB_CHROMATIC);
  }
}

function getLayout() {
  const m = MAPPINGS.find(m => m.id === activeMapping);
  return m ? m.layout : 'chromatic';
}

function isPentatonic() { return getLayout() === 'pentatonic'; }
function isWhiteOnly() { return getLayout() === 'whiteOnly'; }

function getNoteIndex(note) {
  const layout = getLayout();
  if (layout === 'whiteOnly') return WO_NI[note] ?? -1;
  if (layout === 'pentatonic') return PENT_NI[note] ?? -1;
  return NI[note] ?? -1;
}

/* ── State ── */
let NA = {};
let activeMapping = MAPPINGS[0].id;
let seq = [], playing = false, paused = false, playIdx = 0, timers = [], ctx = null;
let presetActive = '';
let activeComplex = null, contactMap = new Map();
let activeFocusChain = null, activeStartResi = null;
let detailsOpen = false;
let composing = false, compSeq = [], compFolded = false, compFoldPdb = null, compFoldSeq = null;
let compMatch = null, searchInProgress = false;
const kbDown = new Map();

function rebuildNA() { NA = {}; Object.entries(AM).forEach(([aa, n]) => NA[n] = aa); }
rebuildNA();
rebuildKB();

/* ── Audio ── */
function getCtx() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }

/**
 * Map amino acid hydrophobicity to a sustain multiplier.
 * Most hydrophobic (I=4.5) → 2.0x sustain, least (R=-4.5) → 1.0x sustain.
 * Non-hydrophobic AAs get 1.0x (neutral).
 */
function hySustain(aa) {
  if (!aa || HY[aa] === undefined) return 1.0;
  // Normalize from [-4.5, 4.5] to [1.0, 2.0]
  return 1.0 + ((HY[aa] + 4.5) / 9.0);
}

function playNote(freq, dur, sustain, vel) {
  sustain = sustain || 1.0;
  vel = vel ?? 1.0;
  const c = getCtx(); if (c.state === 'suspended') c.resume();
  const hold = dur * 2.2 * sustain;
  const t = c.currentTime, master = c.createGain();
  const resonance = c.createBiquadFilter();
  resonance.type = 'peaking'; resonance.frequency.value = freq; resonance.Q.value = 3.5; resonance.gain.value = 6;
  const res2 = c.createBiquadFilter();
  res2.type = 'peaking'; res2.frequency.value = freq * 2; res2.Q.value = 2; res2.gain.value = 3;
  master.connect(resonance); resonance.connect(res2); res2.connect(c.destination);
  const partials = [[1, 0.38], [2, 0.15], [3, 0.08], [4, 0.04], [0.5, 0.06]];
  partials.forEach(([mult, amp]) => {
    amp *= vel;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = freq * mult;
    if (mult > 1) o.detune.value = Math.random() * 4 - 2;
    o.connect(g); g.connect(master);
    const decay = hold * (0.98 - mult * 0.05);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.008);
    g.gain.setValueAtTime(amp * 0.9, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + Math.max(decay, 0.15));
    o.start(t); o.stop(t + hold);
  });
  master.gain.setValueAtTime(0.9 * vel, t);
  master.gain.linearRampToValueAtTime(0.75 * vel, t + 0.05);
  master.gain.setValueAtTime(0.65 * vel, t + hold * 0.4);
  master.gain.exponentialRampToValueAtTime(0.001, t + hold * 0.98);
}

/* ── Rhythm engine ── */
let rhythmEnabled = true;

function getActiveSS() {
  if (activeComplex && activeComplex.chainA.ss) return activeComplex.chainA.ss;
  if (presetActive) { const p = PS.find(p => p.name === presetActive); if (p) return p.playSS || p.ss || null; }
  return null;
}

function toggleRhythm() {
  updateSSBadges();
}

function updateRhythmUI() {
  const ss = getActiveSS();
  const toggle = document.getElementById('rhythmToggle');
  const hint = document.getElementById('rhythmHint');
  if (!toggle) return;
  if (ss) {
    toggle.style.display = 'flex';
    const nH = (ss.match(/H/g) || []).length;
    const nE = (ss.match(/E/g) || []).length;
    const nC = (ss.match(/C/g) || []).length;
    const parts = [];
    if (nH) parts.push(nH + 'H');
    if (nE) parts.push(nE + 'E');
    if (nC) parts.push(nC + 'C');
    hint.textContent = parts.join(' ');
  } else {
    toggle.style.display = 'none';
  }
}

function updateSSBadges() {
  const ss = rhythmEnabled ? getActiveSS() : null;
  document.querySelectorAll('.aa-badge').forEach((el, i) => {
    el.classList.remove('ss-H', 'ss-E', 'ss-C');
    if (ss && i < ss.length) el.classList.add('ss-' + ss[i]);
  });
}

function computeTimings(startIdx, bpm) {
  const baseDur = 60 / bpm;
  const ss = rhythmEnabled ? getActiveSS() : null;
  const timings = [];
  let offset = 0;

  const segPos = [];
  if (ss) {
    let segStart = 0;
    for (let i = 0; i < seq.length; i++) {
      if (i > 0 && ss[i] !== ss[i - 1]) segStart = i;
      segPos[i] = i - segStart;
    }
  }

  for (let i = startIdx; i < seq.length; i++) {
    let dur = baseDur;
    let vel = 1.0;

    if (ss && i < ss.length) {
      const ssType = ss[i];
      const gp = segPos[i] || 0;

      if (i > startIdx && ss[i] !== ss[i - 1]) {
        offset += baseDur * 0.25;
      }

      if (ssType === 'H') {
        const beat = gp % 3;
        dur = baseDur * (beat === 0 ? 1.15 : 0.92);
        vel = beat === 0 ? 1.0 : 0.65;
      } else if (ssType === 'E') {
        const beat = gp % 4;
        const accent = beat === 0;
        const medium = beat === 2;
        dur = baseDur * (accent ? 1.08 : 1.0);
        vel = accent ? 1.0 : (medium ? 0.8 : 0.6);
      } else {
        dur = baseDur * (0.88 + Math.random() * 0.24);
        vel = 0.75 + Math.random() * 0.25;
      }
    }

    timings.push({ offset, dur: dur * 0.85, vel });
    offset += dur;
  }
  return timings;
}

/* ── Playback ── */
function stopPlay() {
  playing = false; paused = false; playIdx = 0;
  timers.forEach(clearTimeout); timers = [];
  document.getElementById('playBtn').textContent = '🎵 play sequence';
  const cpb = document.getElementById('composePlayBtn');
  if (cpb) cpb.textContent = compFolded ? '▶ play your protein' : '▶ play';
  setActive(-1);
}

function pausePlay() {
  paused = true; playing = false;
  timers.forEach(clearTimeout); timers = [];
  document.getElementById('playBtn').textContent = '🎵 play sequence';
  const cpb = document.getElementById('composePlayBtn');
  if (cpb) cpb.textContent = compFolded ? '▶ play your protein' : '▶ play';
}

function startFrom(startIdx) {
  playing = true; paused = false;
  document.getElementById('playBtn').textContent = 'pause';
  const cpb = document.getElementById('composePlayBtn');
  if (cpb) cpb.textContent = '⏸ pause';
  const bpm = parseInt(document.getElementById('tempoSlider').value);
  const timings = computeTimings(startIdx, bpm);
  seq.slice(startIdx).forEach((aa, j) => {
    const i = startIdx + j;
    const ti = timings[j];
    const t = setTimeout(() => {
      if (!playing) return;
      playIdx = i + 1;
      const note = AM[aa]; if (note) playNote(FR[note], ti.dur, hySustain(aa), ti.vel);
      const contact = contactMap.get(i);
      if (contact) {
        const pNote = AM[contact.aa];
        if (pNote) playNote(FR[pNote], ti.dur, hySustain(contact.aa), ti.vel);
      }
      setActive(i);
      if (i === seq.length - 1) setTimeout(() => { if (playing) stopPlay(); }, ti.dur * 1100);
    }, ti.offset * 1000);
    timers.push(t);
  });
}

function togglePlay() {
  if (playing) { pausePlay(); return; }
  if (!seq.length) return;
  if (paused) { startFrom(playIdx); return; }
  playIdx = 0; startFrom(0);
}

/* ── Active highlight ── */
function setActive(idx) {
  document.querySelectorAll('.aa-badge').forEach((el, i) => el.classList.toggle('active', i === idx));
  document.querySelectorAll('.partner-badge').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.contact-dot').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.compose-seq .cbadge').forEach((el, i) => el.classList.toggle('active', i === idx));

  if (idx >= 0 && idx < seq.length) {
    const aa = seq[idx], note = AM[aa];
    const contact = contactMap.get(idx);

    if (contact) {
      const pb = document.querySelector(`.partner-badge[data-idx="${idx}"]`);
      if (pb) pb.classList.add('active');
      const cd = document.querySelector(`.contact-dot[data-idx="${idx}"]`);
      if (cd) cd.classList.add('active');
      showAADisplay([aa, contact.aa]);
    } else {
      showAADisplay([aa]);
    }
    highlightViewerResidue(idx);

    // Light up piano keys
    if (note) {
      const cls = 'piano-key-' + note.replace('#', 's');
      document.querySelectorAll('.' + cls).forEach(el => el.classList.add('lit'));
      setTimeout(() => document.querySelectorAll('.' + cls).forEach(el => el.classList.remove('lit')), 280);
    }
    if (contact) {
      const pNote = AM[contact.aa];
      if (pNote) {
        const cls2 = 'piano-key-' + pNote.replace('#', 's');
        document.querySelectorAll('.' + cls2).forEach(el => el.classList.add('lit'));
        setTimeout(() => document.querySelectorAll('.' + cls2).forEach(el => el.classList.remove('lit')), 280);
      }
    }

    // Auto-scroll sequence to keep active badge visible (gentle page-style pan)
    const wrap = composing ? document.getElementById('composeSeq') : document.getElementById('seqMel');
    const activeEl = composing ? wrap.querySelectorAll('.cbadge')[idx] : wrap.querySelectorAll('.seq-unit')[idx];
    if (activeEl && wrap.scrollWidth > wrap.clientWidth) {
      const elLeft = activeEl.offsetLeft - wrap.scrollLeft;
      if (elLeft > wrap.clientWidth * 0.85) {
        const target = Math.max(0, activeEl.offsetLeft - wrap.clientWidth * 0.2);
        smoothScrollX(wrap, target, 600);
      }
    }
  } else {
    highlightViewerResidue(-1);
  }
}

function smoothScrollX(el, target, duration) {
  const start = el.scrollLeft;
  const delta = target - start;
  if (Math.abs(delta) < 2) return;
  const t0 = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  function step(now) {
    const t = Math.min(1, (now - t0) / duration);
    el.scrollLeft = start + delta * ease(t);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ── Tooltip ── */
function showTooltip(el, aa, note) {
  if (window.matchMedia('(hover: none)').matches) return;
  const tip = document.getElementById('keyTooltip');
  if (!aa) { tip.style.display = 'none'; return; }
  tip.innerHTML = `${AN[aa]}<span>${A3[aa]} \u00B7 ${aa} \u00B7 ${note}</span>`;
  const pianoArea = document.querySelector('.piano-area');
  const areaRect = pianoArea.getBoundingClientRect();
  const keyRect = el.getBoundingClientRect();
  const keyCenter = keyRect.left + keyRect.width / 2 - areaRect.left;
  tip.style.display = 'block';
  tip.style.left = keyCenter + 'px';
  tip.style.bottom = '158px';
  tip.style.transform = 'translateX(-50%)';
}

function hideTooltip() {
  document.getElementById('keyTooltip').style.display = 'none';
}

/* ── Rendering ── */
function renderSeqMel() {
  const wrap = document.getElementById('seqMel'); wrap.innerHTML = '';
  const labelWrap = document.getElementById('seqRowLabels'); labelWrap.innerHTML = '';
  const caption = document.getElementById('bindingCaption');
  if (activeComplex && contactMap.size > 0) {
    labelWrap.innerHTML =
      `<div class="seq-row-label">${activeComplex.chainA.name} residues</div>`
      + `<div class="seq-row-label-dot"></div>`
      + `<div class="seq-row-label-partner">${activeComplex.chainB.name} contacts</div>`;
    if (caption) {
      caption.style.display = '';
      caption.innerHTML = `<strong>Binding residues ↓</strong> &nbsp;The two rows below show which <em>${activeComplex.chainA.name}</em> amino acids touch which <em>${activeComplex.chainB.name}</em> partner amino acids at the binding interface.`;
    }
  } else if (caption) {
    caption.style.display = 'none';
    caption.innerHTML = '';
  }
  seq.forEach((aa, i) => {
    const g = GR[aa] || 'ali', c = GC[g];
    const note = AM[aa];
    const unit = document.createElement('div');
    unit.className = 'seq-unit';
    const badge = document.createElement('div');
    badge.className = 'aa-badge' + (HP.has(aa) ? ' hydrophobic' : ''); badge.style.background = c.bg; badge.style.color = c.tx;
    badge.textContent = aa; badge.title = AN[aa] || aa;
    unit.appendChild(badge);
    const contact = contactMap.get(i);
    if (contact) {
      const dot = document.createElement('div');
      dot.className = 'contact-dot'; dot.dataset.idx = i;
      unit.appendChild(dot);
      const paa = contact.aa;
      const pg = GR[paa] || 'ali', pc = GC[pg];
      const pb = document.createElement('div');
      pb.className = 'partner-badge'; pb.dataset.idx = i;
      pb.style.background = pc.bg; pb.style.color = pc.tx;
      pb.textContent = paa; pb.title = `${AN[paa]} (${activeComplex.chainB.name}), ${contact.dist.toFixed(1)} \u00C5`;
      unit.appendChild(pb);
    }
    unit.onclick = () => {
      if (note) playNote(FR[note], 0.4, hySustain(aa));
      if (contact) { const pn = AM[contact.aa]; if (pn) playNote(FR[pn], 0.4, hySustain(contact.aa)); }
      setActive(i);
    };
    wrap.appendChild(unit);
  });
}

function keyStructHTML(aa, maxDim) {
  if (!aa) return '';
  return `<div class="key-struct">${renderSideChainSVG(aa, maxDim, false)}</div>`;
}

function renderPiano() {
  const wrap = document.getElementById('pianoWrap'); wrap.innerHTML = '';
  if (isWhiteOnly()) {
    wrap.style.width = (WO_WN.length * WW) + 'px';
    renderPianoWhiteOnly(wrap);
    scalePianoForMobile();
    return;
  }
  if (isPentatonic()) {
    wrap.style.width = (20 * PENT_W + 3 * 4) + 'px';
    renderPianoPentatonic(wrap);
    scalePianoForMobile();
    return;
  }
  wrap.style.width = '576px';
  WN.forEach((note, i) => {
    const aa = NA[note], g = aa ? GR[aa] : null, c = aa ? GC[g] : null;
    const el = document.createElement('div');
    el.className = 'wkey piano-key-' + note.replace('#', 's') + (aa && HP.has(aa) ? ' hydrophobic' : '');
    if (g) el.dataset.group = g;
    el.style.cssText = `left:${i * WW}px;width:${WW - 1}px;height:${WH}px;background:${c ? c.bg : 'var(--color-background-primary)'}`;
    el.innerHTML = aa ? `${keyStructHTML(aa, 35)}<div class="klabel" style="color:${c ? c.tx : 'var(--color-text-tertiary)'}">${aa}</div><div class="klabel-sub" style="color:${c ? c.tx : 'var(--color-text-tertiary)'}">${A3[aa]}</div>` : '';
    el.onclick = () => { if (aa) { playNote(FR[note], 0.5, hySustain(aa)); showAADisplay([aa]); if (!composing) toggleCompose(); addComposeAA(aa); } };
    el.onmouseenter = () => showTooltip(el, aa, note);
    el.onmouseleave = hideTooltip;
    wrap.appendChild(el);
  });
  BN.forEach(note => {
    const aa = NA[note], g = aa ? GR[aa] : null, c = aa ? GC[g] : null;
    const wi = BP[note], left = wi * WW + WW * 0.7 - BW / 2;
    const bkBg = c ? c.bk : '#444441', bkTx = c ? c.bg : '#F1EFE8';
    const el = document.createElement('div');
    el.className = 'bkey piano-key-' + note.replace('#', 's') + (aa && HP.has(aa) ? ' hydrophobic' : '');
    if (g) el.dataset.group = g;
    el.style.cssText = `left:${left}px;width:${BW}px;height:${BH}px;background:${bkBg}`;
    el.innerHTML = aa ? `${keyStructHTML(aa, 22)}<div class="klabel" style="color:${bkTx}">${aa}</div><div class="klabel-sub" style="color:${bkTx}">${A3[aa]}</div>` : '';
    el.onclick = () => { if (aa) { playNote(FR[note], 0.5, hySustain(aa)); showAADisplay([aa]); if (!composing) toggleCompose(); addComposeAA(aa); } };
    el.onmouseenter = () => showTooltip(el, aa, note);
    el.onmouseleave = hideTooltip;
    wrap.appendChild(el);
  });
  scalePianoForMobile();
}

function renderPianoWhiteOnly(wrap) {
  /* Build note→[aa,...] lookup for keys with multiple AAs */
  const noteAAs = {};
  Object.entries(AM).forEach(([aa, note]) => {
    if (!noteAAs[note]) noteAAs[note] = [];
    noteAAs[note].push(aa);
  });
  WO_WN.forEach((note, i) => {
    const aas = noteAAs[note] || [];
    const firstAA = aas[0], g = firstAA ? GR[firstAA] : null, c = firstAA ? GC[g] : null;
    const el = document.createElement('div');
    el.className = 'wkey piano-key-' + note.replace('#', 's') + (firstAA && HP.has(firstAA) ? ' hydrophobic' : '');
    if (g) el.dataset.group = g;
    el.style.cssText = `left:${i * WW}px;width:${WW - 1}px;height:${WH}px;background:${c ? c.bg : 'var(--color-background-primary)'}`;
    if (aas.length === 1) {
      el.innerHTML = `${keyStructHTML(firstAA, 35)}<div class="klabel" style="color:${c ? c.tx : 'var(--color-text-tertiary)'}">${firstAA}</div><div class="klabel-sub" style="color:${c ? c.tx : 'var(--color-text-tertiary)'}">${A3[firstAA]}</div>`;
    } else if (aas.length === 2) {
      const tx = c ? c.tx : 'var(--color-text-tertiary)';
      el.innerHTML = `<div class="key-struct-pair">${keyStructHTML(aas[0], 24)}${keyStructHTML(aas[1], 24)}</div><div class="klabel-pair" style="color:${tx}"><span>${aas[0]}</span><span class="klabel-pair-sep">/</span><span>${aas[1]}</span></div><div class="klabel-sub" style="color:${tx}">${A3[aas[0]]}/${A3[aas[1]]}</div>`;
    }
    el.onclick = () => { if (firstAA) { playNote(FR[note], 0.5, hySustain(firstAA)); showAADisplay(aas); if (!composing) toggleCompose(); addComposeAA(firstAA); } };
    el.onmouseenter = () => showTooltip(el, firstAA, note);
    el.onmouseleave = hideTooltip;
    wrap.appendChild(el);
  });
  /* Render disabled black keys */
  WO_BN.forEach(note => {
    const wi = WO_BP[note], left = wi * WW + WW * 0.7 - BW / 2;
    const el = document.createElement('div');
    el.className = 'bkey bkey-disabled';
    el.style.cssText = `left:${left}px;width:${BW}px;height:${BH}px;background:#d0cfc8;opacity:0.45;cursor:default`;
    wrap.appendChild(el);
  });
}

function renderPianoPentatonic(wrap) {
  const octaveGap = 4;
  PENT_MORD.forEach((note, i) => {
    const aa = NA[note], g = aa ? GR[aa] : null, c = aa ? GC[g] : null;
    const octave = Math.floor(i / 5);
    const left = i * PENT_W + octave * octaveGap;
    const el = document.createElement('div');
    el.className = 'wkey pent-key piano-key-' + note;
    if (g) el.dataset.group = g;
    el.style.cssText = `left:${left}px;width:${PENT_W - 1}px;height:${WH}px;background:${c ? c.bg : 'var(--color-background-primary)'}`;
    const octLabel = i % 5 === 0 ? `<div class="pent-oct">${note.slice(-1)}</div>` : '';
    el.innerHTML = aa
      ? `${keyStructHTML(aa, 28)}<div class="klabel" style="color:${c ? c.tx : 'var(--color-text-tertiary)'}">${aa}</div><div class="klabel-sub" style="color:${c ? c.tx : 'var(--color-text-tertiary)'}">${A3[aa]}</div>${octLabel}`
      : octLabel;
    el.onclick = () => { if (aa) { playNote(FR[note], 0.5, hySustain(aa)); showAADisplay([aa]); } };
    el.onmouseenter = () => showTooltip(el, aa, note);
    el.onmouseleave = hideTooltip;
    wrap.appendChild(el);
  });
}

/* ── Mobile piano scaling ── */
function scalePianoForMobile() {
  const wrap = document.getElementById('pianoWrap');
  const scroll = wrap.parentElement; // .piano-scroll
  if (window.innerWidth > 600) {
    wrap.style.transform = '';
    scroll.style.height = '';
    scroll.style.overflowX = 'auto';
    return;
  }
  const pianoW = parseFloat(wrap.style.width);
  const avail = scroll.clientWidth;
  if (pianoW <= avail) { wrap.style.transform = ''; scroll.style.height = ''; return; }
  const s = avail / pianoW;
  wrap.style.transform = `scale(${s})`;
  scroll.style.height = (WH * s + 8) + 'px';
  scroll.style.overflowX = 'hidden';
}

function renderLegend() {
  const leg = document.getElementById('legend'); leg.innerHTML = '';
  ['ali', 'pol', 'aro', 'pos', 'neg'].forEach(g => {
    const c = GC[g], el = document.createElement('div');
    el.className = 'leg';
    el.innerHTML = `<div class="leg-dot" style="background:${c.bk}"></div><div><span>${c.label}</span>${c.role ? `<div class="leg-role">${c.role}</div>` : ''}</div>`;
    leg.appendChild(el);
  });
  const hy = document.createElement('div');
  hy.className = 'leg';
  hy.innerHTML = '<div class="leg-dot" style="background:transparent;border-bottom:3px solid rgba(100,140,180,0.65);border-radius:0"></div><div><span>Hydrophobic (longer sustain)</span><div class="leg-role">protein\'s core; important for protein-protein interactions</div></div>';
  leg.appendChild(hy);
}

function toggleDetails() {
  detailsOpen = !detailsOpen;
  document.getElementById('panelRef').style.display = detailsOpen ? 'block' : 'none';
  document.getElementById('detailToggle').textContent = detailsOpen ? 'hide details' : 'show details';
}

function renderPanelRef() {
  const panel = document.getElementById('panelRef');
  const m = MAPPINGS.find(m => m.id === activeMapping);
  const sorted = Object.entries(m.map).sort((a, b) => getNoteIndex(a[1]) - getNoteIndex(b[1]));
  let html = '<div class="panel-ref">';
  if (activeMapping === 'frequency') {
    sorted.forEach(([aa, note]) => {
      const g = GR[aa], c = GC[g];
      html += `<div class="panel-ref-row"><span class="panel-ref-aa" style="color:${c.bk}">${aa}</span><span class="panel-ref-name">${A3[aa]}</span><span class="panel-ref-note">${AF[aa]}%</span></div>`;
    });
  } else {
    sorted.forEach(([aa, note]) => {
      const g = GR[aa], c = GC[g];
      html += `<div class="panel-ref-row" style="align-items:center;padding:2px 0"><span class="panel-ref-aa" style="color:${c.bk}">${aa}</span><span class="panel-ref-name">${A3[aa]}</span><span class="panel-ref-svg">${renderSideChainSVG(aa)}</span></div>`;
    });
  }
  panel.innerHTML = html + '</div>';
}

function showAADisplay(aaCodes) {
  const disp = document.getElementById('aaDisplay');
  if (!aaCodes || aaCodes.length === 0) { disp.innerHTML = ''; return; }
  disp.innerHTML = aaCodes.map(aa => {
    const g = GR[aa], c = GC[g];
    return `<div class="aa-card">
      <div class="aa-card-name" style="color:${c ? c.bk : 'var(--color-text-primary)'}">${AN[aa]} (${A3[aa]})</div>
      <div class="aa-card-code">${aa} \u00B7 ${AM[aa]} \u00B7 ${c ? c.label.split(' ')[0] : ''}</div>
      ${renderStructSVG(aa)}
      <div class="aa-card-blurb">${AB[aa] || ''}</div>
    </div>`;
  }).join('');
}

/* ── Presets ── */
function renderPresets() {
  const wrap = document.getElementById('presets'); wrap.innerHTML = '';
  PS.forEach(p => {
    const btn = document.createElement('button');
    btn.innerHTML = p.snippet ? `${p.name}<span class="snippet-badge">snippet</span>` : p.name;
    btn.className = p.name === presetActive ? 'active' : '';
    btn.onclick = () => loadPresetClear(p);
    wrap.appendChild(btn);
  });
}

function loadPreset(p) {
  stopPlay(); presetActive = p.name;
  const playable = p.playSeq || p.seq;
  document.getElementById('seqInput').value = playable;
  seq = playable.toUpperCase().split('').filter(aa => AM[aa]);
  renderPresets(); renderSeqMel();
  const ib1 = document.getElementById('infoBar'); if (ib1) ib1.textContent = `${p.name} (${p.seq.length} aa)`;
  renderInfoPanel(); updateRhythmUI(); updateSSBadges();
}

function loadPresetClear(p) {
  activeComplex = null; contactMap = new Map();
  loadPreset(p); renderHarmonyBtns();
}

function loadCustom() {
  stopPlay(); presetActive = ''; activeComplex = null; contactMap = new Map();
  seq = document.getElementById('seqInput').value.toUpperCase().split('').filter(aa => AM[aa]);
  renderPresets(); renderHarmonyBtns(); renderSeqMel();
  const ib2 = document.getElementById('infoBar'); if (ib2) ib2.textContent = seq.length ? `${seq.length} amino acids loaded` : 'no valid amino acids found';
  renderInfoPanel(); updateRhythmUI(); updateSSBadges();
}

function onSeqInput() {
  const input = document.getElementById('seqInput').value;
  const raw = input.toUpperCase().split('').filter(aa => AM[aa]);
  if (!raw.length) return;

  // Enter compose mode if not already
  if (!composing) toggleCompose();

  // Load the pasted sequence
  compSeq = [...raw];
  seq = [...raw];
  compFolded = false; compFoldPdb = null; compFoldSeq = null;

  renderComposeSeq();
  updateComposeCount();
  updateComposePlay();
  const fb = document.getElementById('foldBtn');
  if (fb) fb.disabled = compSeq.length < 20;
  updateSuggestions();
  renderComposeInfo();
}

function loadAndPlay() {
  onSeqInput();
}

/* ── Mapping ── */
function renderMappingBtns() {
  const wrap = document.getElementById('mappingBtns'); wrap.innerHTML = '';
  MAPPINGS.forEach(m => {
    const btn = document.createElement('button');
    if (m.sub) {
      btn.innerHTML = `<span class="map-name">${m.name}</span><span class="map-sub">${m.sub}</span>`;
    } else {
      btn.textContent = m.name;
    }
    btn.className = m.id === activeMapping ? 'active' : '';
    btn.title = m.desc;
    btn.onclick = () => switchMapping(m.id);
    wrap.appendChild(btn);
  });
}

function kbHintText() {
  const layout = getLayout();
  if (layout === 'whiteOnly') return 'type amino acid letters: similar AAs share a key (white keys only)';
  if (layout === 'pentatonic') return 'type amino acid letters: each AA on its own pentatonic note';
  return 'play with your keyboard: A&thinsp;S&thinsp;D&thinsp;F&thinsp;G&thinsp;H&thinsp;J&thinsp;K&thinsp;L for white keys, W&thinsp;E&thinsp;T&thinsp;Y&thinsp;U&thinsp;O&thinsp;P for black keys';
}

function switchMapping(id) {
  stopPlay(); activeMapping = id; setMapping(id); rebuildNA(); rebuildKB();
  const hint = document.getElementById('kbHint');
  if (hint) { hint.style.display = ''; hint.innerHTML = kbHintText(); }
  renderMappingBtns(); renderPanelRef(); renderPiano(); renderSeqMel();
  renderInfoPanel();
}

/* ── Harmony ── */
function renderHarmonyBtns() {
  const wrap = document.getElementById('harmonyBtns'); wrap.innerHTML = '';
  COMPLEXES.forEach(cx => {
    const btn = document.createElement('button');
    btn.textContent = cx.name;
    btn.className = (activeComplex && activeComplex.id === cx.id) ? 'active' : '';
    btn.title = cx.desc;
    btn.onclick = () => loadComplex(cx);
    wrap.appendChild(btn);
  });
}

function loadComplex(cx) {
  stopPlay();
  activeComplex = cx; presetActive = '';
  contactMap = new Map();
  cx.contacts.forEach(([idxA, partnerAA, dist, partnerResi]) => {
    contactMap.set(idxA, { aa: partnerAA, dist, partnerResi });
  });
  if (activeMapping !== 'complexity-harmony') {
    activeMapping = 'complexity-harmony'; setMapping('complexity-harmony'); rebuildNA(); rebuildKB();
    const hint = document.getElementById('kbHint');
    if (hint) { hint.style.display = ''; hint.innerHTML = kbHintText(); }
    renderMappingBtns(); renderPiano();
  }
  document.getElementById('seqInput').value = cx.chainA.seq;
  seq = cx.chainA.seq.toUpperCase().split('').filter(aa => AM[aa]);
  renderPresets(); renderHarmonyBtns(); renderSeqMel();
  const ib3 = document.getElementById('infoBar');
  if (ib3) ib3.innerHTML = `<span style="font-weight:500">${cx.name}</span> `
    + `<span style="color:var(--color-text-tertiary)">(${cx.pdb})</span> `
    + `<span style="color:var(--color-text-secondary);font-size:12px">${cx.contacts.length} contacts</span>`;
  renderInfoPanel(); updateRhythmUI(); updateSSBadges();
}

/* ── Keyboard ── */
function aaFromKey(key, note) {
  if (isDirect()) return key.toUpperCase();
  return NA[note] || null;
}

function updateKbInfo() {
  if (kbDown.size === 0) { showAADisplay([]); return; }
  const aas = [...kbDown.entries()].map(([k, n]) => aaFromKey(k, n)).filter(Boolean);
  showAADisplay(aas);
}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (composing && e.key === 'Escape') { e.preventDefault(); toggleCompose(); return; }
  if (composing && e.key === 'Backspace') { e.preventDefault(); undoCompose(); return; }
  const note = KB[e.key.toLowerCase()];
  if (!note || kbDown.has(e.key)) return;
  const hint = document.getElementById('kbHint'); if (hint) hint.style.display = 'none';
  const aa = aaFromKey(e.key, note);
  kbDown.set(e.key, note);
  playNote(FR[note], 0.5, hySustain(aa));
  const cls = 'piano-key-' + note.replace('#', 's');
  document.querySelectorAll('.' + cls).forEach(el => el.classList.add('lit'));
  updateKbInfo();
  if (!composing) toggleCompose();
  if (aa) addComposeAA(aa);
});

document.addEventListener('keyup', e => {
  kbDown.delete(e.key);
  const note = KB[e.key.toLowerCase()];
  if (!note) return;
  const cls = 'piano-key-' + note.replace('#', 's');
  document.querySelectorAll('.' + cls).forEach(el => el.classList.remove('lit'));
  updateKbInfo();
});

/* ── 3D Viewer ── */
let activeViewer = null;
let activeViewCS = null;      // colorscheme used by current viewer
let activeViewStyleIdx = 0;   // index into VIEW_STYLES
let activeResiMap = null;     // seq index → PDB resi number

const CHAIN_COLORS = ['#8faadc', '#a9d18e', '#c4a4d6', '#f4b183', '#9dc3e6', '#d6a5a5'];

function lightenHex(hex, amt = 0.55) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const mix = (c) => Math.round(c + (255 - c) * amt);
  const toHex = (c) => c.toString(16).padStart(2, '0');
  return '#' + toHex(mix(r)) + toHex(mix(g)) + toHex(mix(b));
}

function darkenHex(hex, amt = 0.18) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const mix = (c) => Math.round(c * (1 - amt));
  const toHex = (c) => c.toString(16).padStart(2, '0');
  return '#' + toHex(mix(r)) + toHex(mix(g)) + toHex(mix(b));
}

function applyChainStyle(viewer, styleFn) {
  const chains = [...new Set(viewer.selectedAtoms({}).map(a => a.chain))];
  chains.forEach((ch, i) => {
    const color = CHAIN_COLORS[i % CHAIN_COLORS.length];
    viewer.setStyle({ chain: ch }, styleFn(color));
  });
}

const VIEW_STYLES = [
  { name: 'cartoon',
    apply: (v, cs, dim, forceGrey) => cs ? v.setStyle({}, { cartoon: { colorscheme: cs, opacity: dim ? 0.45 : 1 }, stick: { colorscheme: cs, opacity: dim ? 0.25 : 0.8, radius: 0.13 } }) : (dim && forceGrey) ? v.setStyle({}, { cartoon: { color: '#d0d0d0', opacity: 0.45 } }) : applyChainStyle(v, c => ({ cartoon: { color: c, opacity: dim ? 0.45 : 1 }, stick: { color: darkenHex(c, 0.45), opacity: dim ? 0.25 : 0.8, radius: 0.14 } })),
    highlight: c => ({ stick: { color: c, radius: 0.3 }, sphere: { color: c, scale: 0.5 } }) },
  { name: 'line',
    apply: (v, cs) => cs ? v.setStyle({}, { line: { colorscheme: cs } }) : applyChainStyle(v, c => ({ line: { color: c } })),
    highlight: c => ({ line: { color: c, linewidth: 4 } }) },
  { name: 'stick',
    apply: (v, cs, dim) => cs ? v.setStyle({}, { stick: { colorscheme: cs, opacity: dim ? 0.3 : 1 } }) : applyChainStyle(v, c => ({ stick: { color: c, opacity: dim ? 0.3 : 1 } })),
    highlight: c => ({ stick: { color: c, radius: 0.25 } }) },
  { name: 'sphere',
    apply: (v, cs, dim) => cs ? v.setStyle({}, { sphere: { colorscheme: cs, scale: 0.4, opacity: dim ? 0.3 : 1 } }) : applyChainStyle(v, c => ({ sphere: { color: c, scale: 0.4, opacity: dim ? 0.3 : 1 } })),
    highlight: c => ({ sphere: { color: c, scale: 0.5 } }) },
];

function addViewToggle(container, viewer, colorscheme) {
  const bar = document.createElement('div');
  bar.className = 'view-style-bar';
  const btns = VIEW_STYLES.map((s, i) => {
    const btn = document.createElement('button');
    btn.className = 'view-style-btn' + (i === 0 ? ' active' : '');
    btn.textContent = s.name;
    btn.onclick = () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeViewStyleIdx = i;
      s.apply(viewer, colorscheme);
      viewer.render();
    };
    bar.appendChild(btn);
    return btn;
  });
  container.style.position = 'relative';
  container.appendChild(bar);
}

function buildResiMap(viewer) {
  // If the active preset/complex declared a focus chain + starting residue,
  // trust that (handles PDBs with multiple chains or gaps at N-terminus).
  if (activeFocusChain && activeStartResi != null && seq.length) {
    return Array.from({ length: seq.length }, (_, i) => activeStartResi + i);
  }
  const cas = viewer.selectedAtoms({ atom: 'CA' });
  if (!cas.length) return null;
  // Fallback: use chain of first CA; map seq index → PDB resi
  const chain = cas[0].chain;
  const residues = cas.filter(a => a.chain === chain);
  const map = new Array(residues.length);
  residues.forEach((a, i) => { map[i] = a.resi; });
  return map;
}

function highlightViewerResidue(idx) {
  if (!activeViewer || !activeResiMap) return;
  const isPlaying = idx >= 0 && idx < activeResiMap.length;
  const wasCartoon = activeViewStyleIdx === 0;
  const style = isPlaying ? VIEW_STYLES[0] : VIEW_STYLES[activeViewStyleIdx];
  // Re-apply base style (faded when playing) so the yellow highlight dominates.
  style.apply(activeViewer, activeViewCS, isPlaying, isPlaying && !wasCartoon);
  if (isPlaying) {
    const resi = activeResiMap[idx];
    // Highlight the active residue + pop its side chain so it's visible against
    // the faded cartoon.
    const hlMain = wasCartoon
      ? { cartoon: { color: '#f7c948', opacity: 1 }, stick: { color: '#f7c948', opacity: 1, radius: 0.28 }, sphere: { color: '#f7c948', scale: 0.3, opacity: 0.6 } }
      : style.highlight('#f7c948');
    const selMain = activeFocusChain ? { resi, chain: activeFocusChain } : { resi };
    activeViewer.addStyle(selMain, hlMain);
    // If this residue is a binding contact, also light up the partner chain
    // residue in a complementary color so the interaction reads visually.
    const contact = contactMap.get(idx);
    if (contact && contact.partnerResi != null && activeComplex && activeComplex.partnerChain) {
      const hlP = wasCartoon
        ? { cartoon: { color: '#e85d75', opacity: 1 }, stick: { color: '#e85d75', opacity: 1, radius: 0.28 }, sphere: { color: '#e85d75', scale: 0.3, opacity: 0.6 } }
        : style.highlight('#e85d75');
      activeViewer.addStyle({ resi: contact.partnerResi, chain: activeComplex.partnerChain }, hlP);
    }
  }
  activeViewer.render();
}

function waitFor3Dmol() {
  if (typeof $3Dmol !== 'undefined') return Promise.resolve();
  return new Promise(resolve => {
    const check = setInterval(() => {
      if (typeof $3Dmol !== 'undefined') { clearInterval(check); resolve(); }
    }, 100);
  });
}

function initPdbViewer(pdbId, containerId, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  activeFocusChain = opts.chain || null;
  activeStartResi = opts.startResi != null ? opts.startResi : null;
  const pdbData = typeof PDB_DATA !== 'undefined' && PDB_DATA[pdbId.toUpperCase()];
  if (!pdbData) {
    container.innerHTML = `<img class="info-panel-img" src="https://cdn.rcsb.org/images/structures/${pdbId.toLowerCase()}_assembly-1.jpeg" alt="structure" onerror="this.style.display='none'" style="width:100%;height:100%;object-fit:cover"/>`;
    return;
  }
  container.innerHTML = '<div class="pdb-viewer-loading">loading viewer...</div>';

  waitFor3Dmol().then(() => {
    if (!document.getElementById(containerId)) return;
    container.innerHTML = '';
    const viewer = $3Dmol.createViewer(container, { backgroundColor: 'white' });
    viewer.addModel(pdbData, 'pdb');
    applyChainStyle(viewer, c => ({ cartoon: { color: c }, stick: { color: lightenHex(c), opacity: 0.35, radius: 0.12 } }));
    viewer.zoomTo();
    viewer.render();
    viewer.spin('y', SPIN_SPEED);
    activeViewer = viewer;
    activeViewCS = null;
    activeViewStyleIdx = 0;
    activeResiMap = buildResiMap(viewer);
    addViewToggle(container, viewer, null);
  });
}

/* ── Composition Mode ── */
function toggleCompose() {
  composing = !composing;
  const btn = document.getElementById('composeBtn');
  const bar = document.getElementById('composeBar');
  const seqRow = document.querySelector('.seq-input-row');
  const seqWrap = document.querySelector('.seq-mel-wrap');
  const harmonyWrap = document.getElementById('harmonyWrap');
  const playBtn = document.getElementById('playBtn');
  if (composing) {
    stopPlay();
    activeComplex = null; contactMap = new Map();
    presetActive = '';
    compFolded = false; compFoldPdb = null; compFoldSeq = null;
    compSeq = [];
    seq = [];
    document.getElementById('seqInput').value = '';
    document.body.classList.remove('center-view');
    const center = document.getElementById('centerViewer');
    if (center) center.innerHTML = '';
    renderPresets();
    renderSeqMel();
    btn.textContent = 'exit compose mode'; btn.classList.add('active');
    bar.style.display = 'flex';
    if (seqRow) seqRow.style.display = 'none';
    if (seqWrap) seqWrap.style.display = 'none';
    if (harmonyWrap) harmonyWrap.style.display = 'none';
    if (playBtn) playBtn.style.display = 'none';
    document.getElementById('composeSeq').innerHTML = '';
    document.body.classList.add('compose-active');
    resetComposeButtons();
    updateComposeCount();
    updateComposePlay();
    updateSuggestions();
    renderComposeInfo();
  } else {
    stopPlay();
    btn.textContent = '🎼 compose mode'; btn.classList.remove('active');
    bar.style.display = 'none';
    if (seqRow) seqRow.style.display = '';
    if (seqWrap) seqWrap.style.display = '';
    if (harmonyWrap) harmonyWrap.style.display = '';
    if (playBtn) playBtn.style.display = '';
    document.getElementById('composeSeq').innerHTML = '';
    document.body.classList.remove('compose-active');
    document.body.classList.remove('center-view');
    compFolded = false; compFoldPdb = null; compFoldSeq = null;
    const center = document.getElementById('centerViewer');
    if (center) center.innerHTML = '';
    resetComposeButtons();
    clearSuggestions();
    renderInfoPanel();
  }
}

function addComposeAA(aa) {
  if (!aa || compSeq.length >= 300 || compFolded) return;
  compSeq.push(aa);
  seq = [...compSeq];
  document.getElementById('seqInput').value = compSeq.join('');
  renderComposeSeq();
  updateComposeCount();
  updateComposePlay();
  updateSuggestions();
  renderComposeInfo();
}

function undoCompose() {
  if (compSeq.length === 0) return;
  if (compFolded) backToComposing();
  compSeq.pop();
  seq = [...compSeq];
  document.getElementById('seqInput').value = compSeq.join('');
  renderComposeSeq();
  updateComposeCount();
  updateComposePlay();
  updateSuggestions();
  renderComposeInfo();
}

function updateComposePlay() {
  const btn = document.getElementById('composePlayBtn');
  if (btn) btn.disabled = compSeq.length === 0;
}

function clearCompose() {
  stopPlay();
  compFolded = false; compFoldPdb = null; compFoldSeq = null;
  compMatch = null;
  compSeq = [];
  seq = [];
  document.getElementById('seqInput').value = '';
  const center = document.getElementById('centerViewer');
  if (center) center.innerHTML = '';
  document.body.classList.remove('center-view');
  resetComposeButtons();
  renderComposeSeq();
  updateComposeCount();
  updateComposePlay();
  updateSuggestions();
  renderComposeInfo();
}

function backToComposing() {
  stopPlay();
  compFolded = false;
  compMatch = null;
  if (activeViewer) { try { activeViewer.spin(false); } catch(e) {} activeViewer = null; }
  const center = document.getElementById('centerViewer');
  if (center) center.innerHTML = '';
  document.body.classList.remove('center-view');
  resetComposeButtons();
  updateComposePlay();
  updateSuggestions();
  renderComposeInfo();
}

function resetComposeButtons() {
  const cpb = document.getElementById('composePlayBtn');
  if (cpb) { cpb.className = 'compose-action'; cpb.textContent = '▶ play'; cpb.style.marginLeft = ''; }
  const bb = document.getElementById('backComposeBtn');
  if (bb) bb.style.display = 'none';
  updateFoldBtn();
}

function updateFoldBtn() {
  const fb = document.getElementById('foldBtn');
  if (!fb) return;
  fb.style.marginLeft = 'auto';
  if (compFolded) {
    fb.textContent = 'folded ✓';
    fb.disabled = true;
    fb.style.marginLeft = '0';
  } else if (compSeq.length < 20) {
    fb.textContent = 'fold it!';
    fb.disabled = true;
  } else if (compFoldPdb && compSeq.join('') === compFoldSeq) {
    fb.textContent = 'view fold';
    fb.disabled = false;
  } else {
    fb.textContent = 'fold it!';
    fb.disabled = false;
  }
}

function renderComposeSeq() {
  const wrap = document.getElementById('composeSeq');
  wrap.innerHTML = '';
  compSeq.forEach(aa => {
    const g = GR[aa] || 'ali', c = GC[g];
    const el = document.createElement('div');
    el.className = 'cbadge';
    el.style.background = c.bg; el.style.color = c.tx;
    el.textContent = aa;
    wrap.appendChild(el);
  });
  if (wrap.scrollWidth > wrap.clientWidth) {
    wrap.scrollLeft = wrap.scrollWidth;
  }
}

function updateComposeCount() {
  const el = document.getElementById('composeCount');
  if (el) {
    const n = compSeq.length;
    if (n < 20) el.textContent = n + ' aa (' + (20 - n) + ' more to fold)';
    else el.textContent = n + ' aa';
  }
  updateFoldBtn();
}

function clearSuggestions() {
  document.querySelectorAll('.suggested').forEach(el => {
    el.classList.remove('suggested');
    el.style.removeProperty('--suggest-color');
  });
}

function updateSuggestions() {
  clearSuggestions();
  const lastAA = compSeq.length > 0 ? compSeq[compSeq.length - 1] : null;
  const top4 = getTop4(lastAA);
  top4.forEach(aa => {
    const note = AM[aa];
    if (!note) return;
    const cls = 'piano-key-' + note.replace('#', 's');
    const g = GR[aa], c = GC[g];
    document.querySelectorAll('.' + cls).forEach(el => {
      el.classList.add('suggested');
      el.style.setProperty('--suggest-color', c ? c.bk : '#534AB7');
    });
  });
}

function renderComposeInfo() {
  const el = document.getElementById('infoPanelContent');
  if (!el) return;
  if (compSeq.length === 0) {
    el.innerHTML = '<div class="info-panel-title">compose mode</div>'
      + '<div class="info-panel-desc">Play keys to build an amino acid sequence. Glowing keys show the most likely next residues for a foldable protein.</div>'
      + '<div class="info-panel-subtitle">min 20 aa to fold</div>';
    return;
  }
  const groups = { ali: 0, pol: 0, aro: 0, pos: 0, neg: 0 };
  compSeq.forEach(aa => { const g = GR[aa]; if (g) groups[g]++; });
  const total = compSeq.length;
  let html = '<div class="info-panel-title">your sequence</div>';
  html += '<div class="info-panel-subtitle">' + total + ' amino acids</div>';
  html += '<div style="margin:6px 0;font-size:11px;color:var(--color-text-secondary)">';
  ['ali', 'pol', 'aro', 'pos', 'neg'].forEach(g => {
    const c = GC[g], pct = total > 0 ? Math.round(100 * groups[g] / total) : 0;
    if (groups[g] > 0) html += '<div style="display:flex;align-items:center;gap:4px;margin:2px 0"><div style="width:8px;height:8px;border-radius:50%;background:' + c.bk + '"></div>' + c.label.split('(')[0].trim() + ': ' + pct + '%</div>';
  });
  html += '</div>';
  if (total >= 20) {
    html += '<div style="margin-top:8px;font-size:11px;color:#534AB7;font-weight:500">Ready to fold!</div>';
  } else {
    html += '<div style="margin-top:8px;font-size:11px;color:var(--color-text-tertiary)">' + (20 - total) + ' more aa to fold</div>';
  }
  el.innerHTML = html;
}

function enterFoldedView(pdbData, seqStr, autoPlay) {
  compFolded = true;
  activeFocusChain = null; activeStartResi = null;
  document.body.classList.add('center-view');
  const bb = document.getElementById('backComposeBtn');
  if (bb) bb.style.display = '';
  updateFoldBtn();
  const cpb = document.getElementById('composePlayBtn');
  if (cpb) { cpb.disabled = false; cpb.className = 'compose-fold compose-play-folded'; cpb.textContent = '▶ play your protein'; cpb.style.marginLeft = 'auto'; }
  showFold(pdbData, seqStr);
  findClosestProtein(true);
  if (autoPlay) togglePlay();
}

async function foldSequence() {
  if (compSeq.length < 20) return;
  const seqStr = compSeq.join('');
  if (compFoldPdb && seqStr === compFoldSeq) {
    enterFoldedView(compFoldPdb, seqStr, false);
    return;
  }
  const el = document.getElementById('infoPanelContent');
  el.innerHTML = '<div class="info-panel-title">folding...</div>'
    + '<div class="fold-loading">Sending ' + seqStr.length + ' residues to ESMFold</div>';

  try {
    const resp = await fetch('https://api.esmatlas.com/foldSequence/v1/pdb/', {
      method: 'POST',
      body: seqStr,
      headers: { 'Content-Type': 'text/plain' }
    });
    if (!resp.ok) throw new Error('ESMFold returned ' + resp.status);
    const pdbData = await resp.text();
    compFoldPdb = pdbData; compFoldSeq = seqStr;
    enterFoldedView(pdbData, seqStr, true);
  } catch (err) {
    el.innerHTML = '<div class="info-panel-title">fold error</div>'
      + '<div class="fold-error">' + err.message + '</div>'
      + '<div class="info-panel-desc">The ESMFold API may be unavailable or blocking browser requests. Your sequence:</div>'
      + '<div style="font-family:var(--font-mono);font-size:10px;word-break:break-all;margin:6px 0;padding:6px;background:var(--color-background-secondary);border-radius:4px">' + seqStr + '</div>';
  }
}

function normalizePdbBFactors(pdbData) {
  // ESMFold may return pLDDT on 0–1 scale; normalize B-factors to 0–100
  const lines = pdbData.split('\n');
  const bfs = [];
  lines.forEach(line => {
    if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
      const bf = parseFloat(line.substring(60, 66));
      if (!isNaN(bf)) bfs.push(bf);
    }
  });
  if (bfs.length === 0 || !bfs.every(b => b <= 1)) return pdbData;
  return lines.map(line => {
    if ((line.startsWith('ATOM') || line.startsWith('HETATM')) && line.length >= 66) {
      const bf = parseFloat(line.substring(60, 66));
      if (!isNaN(bf)) {
        const scaled = (bf * 100).toFixed(2).padStart(6);
        return line.substring(0, 60) + scaled + line.substring(66);
      }
    }
    return line;
  }).join('\n');
}

function parsePLDDT(pdbData) {
  const bFactors = [];
  pdbData.split('\n').forEach(line => {
    if (line.startsWith('ATOM') && line.substring(12, 16).trim() === 'CA') {
      const bf = parseFloat(line.substring(60, 66));
      if (!isNaN(bf)) bFactors.push(bf);
    }
  });
  if (bFactors.length === 0) return null;
  const avg = bFactors.reduce((a, b) => a + b, 0) / bFactors.length;
  return { avg: avg.toFixed(1), min: Math.min(...bFactors).toFixed(1), max: Math.max(...bFactors).toFixed(1) };
}

function helixImg() {
  return '<img src="img/alpha-helix.png" alt="alpha helix" style="height:28px;vertical-align:middle;margin-right:4px">';
}
function sheetImg() {
  return '<img src="img/beta-sheet.png" alt="beta sheet" style="height:28px;vertical-align:middle;margin-right:4px">';
}
function extractSS(viewer) {
  const atoms = viewer.selectedAtoms({ atom: 'CA' });
  let nHelix = 0, nSheet = 0;
  atoms.forEach(a => { if (a.ss === 'h') nHelix++; else if (a.ss === 's') nSheet++; });
  const n = atoms.length || 1;
  return { helix: Math.round(nHelix / n * 100), sheet: Math.round(nSheet / n * 100), coil: Math.round((n - nHelix - nSheet) / n * 100) };
}

function showFold(pdbData, seqStr) {
  pdbData = normalizePdbBFactors(pdbData);
  const el = document.getElementById('infoPanelContent');
  const center = document.getElementById('centerViewer');
  if (center) center.innerHTML = '<div id="foldViewer" class="fold-viewer"></div>'
    + '<div class="fold-attribution">Structure predicted by <a href="https://esmatlas.com" target="_blank">ESMFold</a></div>';
  const conf = parsePLDDT(pdbData);
  let html = '<div class="info-panel-title">your protein</div>'
    + '<div class="info-panel-subtitle">' + seqStr.length + ' amino acids</div>';
  if (conf) {
    const color = conf.avg >= 70 ? '#3a8a5c' : conf.avg >= 50 ? '#EF9F27' : '#dc2626';
    html += '<div style="margin:6px 0;font-size:11px">'
      + '<span style="color:var(--color-text-tertiary)">ESMFold Model confidence: </span>'
      + '<span style="font-weight:600;color:' + color + '">pLDDT ' + conf.avg + '</span>'
      + '<span style="color:var(--color-text-tertiary)"> (' + conf.min + '\u2013' + conf.max + ')</span>'
      + '</div>';
    html += '<div style="font-size:10px;color:var(--color-text-tertiary);margin-bottom:4px;line-height:1.3">High confidence (70+) sequences or regions will likely fold into a stable structure</div>';
  }
  html += '<div class="fold-status">colored by confidence: <span style="color:#dc2626">low</span> \u2192 <span style="color:#3a8a5c">high</span></div>'
    + '<div id="foldPropensity"></div>'
    + '<div style="margin-top:8px;font-size:9px;color:var(--color-text-tertiary);line-height:1.4">Folded with <a href="https://esmatlas.com" target="_blank" style="color:var(--color-text-tertiary)">ESMFold</a> (Lin et al., Science 2023)</div>'
    + '<div id="matchResults" style="margin-top:10px;border-top:0.5px solid var(--color-border-tertiary);padding-top:8px"><div style="font-size:11px;color:var(--color-text-tertiary)">searching for similar proteins...</div></div>';
  el.innerHTML = html;
  if (compMatch) renderMatchInline(compMatch);

  waitFor3Dmol().then(() => {
    const viewerDiv = document.getElementById('foldViewer');
    if (!viewerDiv) return;
    const viewer = $3Dmol.createViewer(viewerDiv, { backgroundColor: 'white' });
    viewer.addModel(pdbData, 'pdb');
    const foldCS = { prop: 'b', gradient: 'roygb', min: 50, max: 90 };
    viewer.setStyle({}, { cartoon: { colorscheme: foldCS }, stick: { colorscheme: foldCS, opacity: 0.35, radius: 0.12 } });
    viewer.zoomTo();
    viewer.render();
    viewer.spin('y', SPIN_SPEED);
    activeViewer = viewer;
    activeViewCS = foldCS;
    activeViewStyleIdx = 0;
    activeResiMap = buildResiMap(viewer);
    addViewToggle(viewerDiv, viewer, foldCS);

    // Append actual secondary structure from folded model
    const propDiv = document.getElementById('foldPropensity');
    if (propDiv) {
      const ss = extractSS(viewer);
      function ssBar(label, svg, pct, color) {
        return '<div style="display:flex;align-items:center;gap:6px;margin:4px 0">'
          + svg
          + '<span style="min-width:68px;font-weight:500;font-size:11px">' + label + '</span>'
          + '<div style="flex:1;height:6px;background:#eee;border-radius:3px;overflow:hidden">'
          + '<div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:3px"></div></div>'
          + '<span style="font-size:10px;color:var(--color-text-tertiary);min-width:28px;text-align:right">' + pct + '%</span>'
          + '</div>';
      }
      propDiv.innerHTML = '<div style="margin:10px 0 6px;padding:8px 10px;background:#f8f7fc;border-radius:6px;font-size:12px">'
        + '<div style="font-weight:600;margin-bottom:6px;color:var(--color-text-primary)">secondary structure</div>'
        + ssBar('alpha helix', helixImg(), ss.helix, '#e07838')
        + '<div style="font-size:10px;color:var(--color-text-tertiary);line-height:1.4;margin:2px 0 8px 32px">'
        + '\u03B1-helices are the most common protein shape: coils held together by hydrogen bonds every 4th residue. '
        + '<strong>To build one</strong>, use lots of <strong>MALEK</strong> residues: methionine (M), alanine (A), leucine (L), glutamate (E), and lysine (K). '
        + 'Avoid <strong>proline (P)</strong> and <strong>glycine (G)</strong>: they\u2019re known as \u201Chelix breakers\u201D because they kink or over-flex the backbone.'
        + '</div>'
        + ssBar('beta sheet', sheetImg(), ss.sheet, '#3878c0')
        + '<div style="font-size:10px;color:var(--color-text-tertiary);line-height:1.4;margin:2px 0 4px 32px">'
        + '\u03B2-sheets are parallel or antiparallel strands connected by hydrogen bonds, with flexible loops linking adjacent strands. '
        + 'They form the framework of antibodies, and the loops form the antigen-binding sites. '
        + '<strong>To build one</strong>, use large aromatic residues: tryptophan (W), tyrosine (Y), phenylalanine (F); and C\u03B2-branched residues: isoleucine (I), valine (V), threonine (T). '
        + 'Sheets also need <strong>loops to turn back onto themselves</strong>, so sprinkle in glycine (G) or proline (P) between strands.'
        + '</div>'
        + '</div>';
    }
  });
}

/* ── Info Panel (right) ── */
function renderInfoPanel() {
  const el = document.getElementById('infoPanelContent');
  if (!el) return;
  if (activeViewer) { activeViewer = null; activeResiMap = null; }
  const center = document.getElementById('centerViewer');
  const hasStructure = !!(activeComplex || presetActive || (compFolded && compFoldPdb));
  document.body.classList.toggle('center-view', hasStructure);
  if (!hasStructure && center) center.innerHTML = '';

  if (activeComplex) {
    const cx = activeComplex;
    if (center) center.innerHTML = `<div id="pdbViewer" class="pdb-viewer"></div>`;
    let html = `<div class="info-panel-title">${cx.name}</div>`;
    html += `<div class="info-panel-subtitle">${cx.pdb} · ${cx.contacts.length} contacts</div>`;
    html += `<div class="info-panel-stats">${cx.chainA.name} melody + ${cx.chainB.name} harmony</div>`;
    html += `<div class="info-panel-desc">${cx.desc}</div>`;
    html += '<div class="info-panel-contacts">';
    cx.contacts.forEach(([idx, partnerAA, dist]) => {
      const aa = cx.chainA.seq[idx];
      const g1 = GR[aa], c1 = GC[g1];
      const g2 = GR[partnerAA], c2 = GC[g2];
      html += `<div class="info-panel-contact-row">
        <span class="info-panel-contact-aa" style="color:${c1?.bk || 'var(--color-text-primary)'}">${aa}${idx}</span>
        <span class="info-panel-contact-dash">\u2013</span>
        <span class="info-panel-contact-aa" style="color:${c2?.bk || 'var(--color-text-primary)'}">${partnerAA}</span>
        <span class="info-panel-contact-dist">${dist.toFixed(1)} \u00C5</span>
      </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
    initPdbViewer(cx.pdb, 'pdbViewer', { chain: cx.pdbChain, startResi: cx.pdbStartResi });

  } else if (presetActive) {
    const p = PS.find(p => p.name === presetActive);
    if (p) {
      if (center) center.innerHTML = `<div id="pdbViewer" class="pdb-viewer"></div>`;
      let html = `<div class="info-panel-title">${p.name}</div>`;
      html += `<div class="info-panel-subtitle">${p.pdb} · ${p.seq.length} amino acids</div>`;
      if (p.playSeq) html += `<div class="info-panel-stats" style="font-size:10px;color:var(--color-text-tertiary)">playing ${p.playSeq.length}aa B-chain fragment</div>`;
      html += `<div class="info-panel-desc">${p.significance}</div>`;
      el.innerHTML = html;
      initPdbViewer(p.pdb, 'pdbViewer', { chain: p.pdbChain, startResi: p.pdbStartResi });
    }

  } else if (compFolded && compFoldPdb) {
    showFold(compFoldPdb, compFoldSeq);
    return;

  } else if (seq.length) {
    let html = '<div class="info-panel-title">custom sequence</div>';
    html += `<div class="info-panel-subtitle">${seq.length} amino acids</div>`;
    el.innerHTML = html;

  } else {
    el.innerHTML = '<div class="info-panel-placeholder">select a preset or harmony complex</div>';
  }
}

/* ── Mobile collapsibles ── */
function setupMobileCollapsibles() {
  if (window.innerWidth > 600) return;
  const mp = document.querySelector('.mapping-panel');
  const ip = document.getElementById('infoPanel');
  [{ panel: mp, label: 'Mappings & legend', cls: 'mapping-panel-body', startOpen: false },
   { panel: ip, label: 'Protein info', cls: 'info-panel-body', startOpen: true }].forEach(({ panel, label, cls, startOpen }) => {
    if (!panel || panel.querySelector('.mobile-toggle')) return;
    const body = document.createElement('div');
    body.className = cls + (startOpen ? ' open' : '');
    while (panel.firstChild) body.appendChild(panel.firstChild);
    const btn = document.createElement('button');
    btn.className = 'mobile-toggle' + (startOpen ? ' open' : '');
    btn.textContent = label;
    btn.onclick = () => { btn.classList.toggle('open'); body.classList.toggle('open'); };
    panel.appendChild(btn);
    panel.appendChild(body);
  });
}

/* ── Find closest protein (RCSB PDB sequence search) ── */

function fmtIdentity(score) {
  const exact = score * 100;
  if (exact === 100) return '100%';
  if (Math.round(exact) === 100) return '~100%';
  return Math.round(exact) + '%';
}

async function searchRCSB(seqStr) {
  const query = {
    query: {
      type: 'terminal',
      service: 'sequence',
      parameters: {
        evalue_cutoff: 1,
        identity_cutoff: 0.1,
        sequence_type: 'protein',
        value: seqStr
      }
    },
    request_options: {
      scoring_strategy: 'sequence',
      sort: [{ sort_by: 'score', direction: 'desc' }],
      paginate: { start: 0, rows: 5 }
    },
    return_type: 'polymer_entity'
  };
  const resp = await fetch('https://search.rcsb.org/rcsbsearch/v2/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query)
  });
  if (resp.status === 204) return []; // no matches
  if (!resp.ok) throw new Error('RCSB search returned ' + resp.status);
  const data = await resp.json();
  if (!data.result_set || data.result_set.length === 0) return [];

  // Parse results: identifier is like "4HHB_1" (pdbId_entityId)
  const results = data.result_set.map(r => {
    const parts = r.identifier.split('_');
    const pdbId = parts[0];
    const entityId = parts[1] || '1';
    const score = r.score || 0;
    return { pdbId, entityId, score };
  });

  // Fetch entity details for all results in parallel
  const detailed = await Promise.all(results.map(async r => {
    try {
      const eResp = await fetch('https://data.rcsb.org/rest/v1/core/polymer_entity/' + r.pdbId + '/' + r.entityId);
      if (!eResp.ok) return { ...r, name: r.pdbId, organism: '', description: '', sequence: '' };
      const e = await eResp.json();
      return {
        ...r,
        name: e.rcsb_polymer_entity?.pdbx_description || r.pdbId,
        organism: e.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name || '',
        description: e.entity_poly?.pdbx_seq_one_letter_code_can || '',
        sequence: (e.entity_poly?.pdbx_seq_one_letter_code_can || '').replace(/\s/g, '')
      };
    } catch {
      return { ...r, name: r.pdbId, organism: '', description: '', sequence: '' };
    }
  }));
  return detailed;
}

function formatCombinatorics(n) {
  const log10 = n * Math.log10(20);
  const exp = Math.floor(log10);
  const mantissa = Math.pow(10, log10 - exp);
  return mantissa.toFixed(2) + ' × 10<sup>' + exp + '</sup>';
}

function noMatchExplainerHTML(n) {
  return '<div class="info-panel-desc">That\'s not surprising: with <strong>20 amino acids</strong>, there are <strong>20<sup>'
    + n + '</sup> ≈ ' + formatCombinatorics(n) + '</strong> possible sequences of length '
    + n + '. The PDB only contains ~230,000 solved structures, so finding a random match is astronomically rare. '
    + 'Your sequence has carved its own path through that space.</div>';
}

async function findClosestProtein(append) {
  const seqStr = compSeq.length > 0 ? compSeq.join('') : seq.join('');
  if (seqStr.length < 10) return;
  if (searchInProgress) return;

  const truncated = seqStr.slice(0, 400);
  searchInProgress = true;

  // If not appending below fold, show standalone loading state
  if (!append) {
    const el = document.getElementById('infoPanelContent');
    el.innerHTML = '<div class="info-panel-title">searching...</div>'
      + '<div class="fold-loading">Searching RCSB PDB for similar proteins (' + truncated.length + ' residues)</div>';
  }

  try {
    const results = await searchRCSB(truncated);
    searchInProgress = false;

    if (append) {
      renderMatchInline(results, truncated.length);
    } else if (results.length === 0) {
      const el = document.getElementById('infoPanelContent');
      el.innerHTML = '<div class="info-panel-title">no matches found</div>'
        + '<div class="info-panel-desc">No proteins in the PDB matched with at least 10% sequence identity.</div>'
        + noMatchExplainerHTML(truncated.length);
    } else {
      compMatch = results;
      showProteinMatch(results, 0);
    }
  } catch (err) {
    searchInProgress = false;
    if (append) {
      const md = document.getElementById('matchResults');
      if (md) md.innerHTML = '';
    } else {
      const el = document.getElementById('infoPanelContent');
      el.innerHTML = '<div class="info-panel-title">search error</div>'
        + '<div class="fold-error">' + err.message + '</div>'
        + '<div class="info-panel-desc">The RCSB PDB API may be temporarily unavailable. Your sequence:</div>'
        + '<div style="font-family:var(--font-mono);font-size:10px;word-break:break-all;margin:6px 0;padding:6px;background:var(--color-background-secondary);border-radius:4px">' + truncated + '</div>';
    }
  }
}

function renderMatchInline(results, seqLen) {
  const md = document.getElementById('matchResults');
  if (!md) return;
  if (!results || results.length === 0) {
    const n = seqLen || (compSeq.length > 0 ? compSeq.length : seq.length);
    md.innerHTML =
      '<div style="font-size:11px;font-weight:600;color:var(--color-text-primary);margin-bottom:4px">no similar proteins found</div>'
      + '<div style="font-size:11px;line-height:1.5;color:var(--color-text-secondary)">'
      + 'No matches in the PDB with ≥10% identity. That\'s not surprising: with <strong>20 amino acids</strong>, '
      + 'there are <strong>20<sup>' + n + '</sup> ≈ ' + formatCombinatorics(n) + '</strong> possible sequences of length '
      + n + '. Only ~230,000 structures have been solved, so a random match is astronomically rare.'
      + '</div>';
    return;
  }
  compMatch = results;
  let html = '<div style="font-size:11px;font-weight:600;color:var(--color-text-primary);margin-bottom:4px">similar known proteins</div>';
  results.forEach((r, i) => {
    html += '<div class="match-row" onclick="showProteinMatch(compMatch,' + i + ')" title="View ' + r.name + '">'
      + '<span class="match-identity">' + fmtIdentity(r.score) + '</span>'
      + '<span class="match-name" style="text-decoration:underline dotted;text-underline-offset:2px">' + r.name + '</span>'
      + (r.organism ? '<span class="match-organism">' + r.organism + '</span>' : '')
      + '</div>';
  });
  html += '<div style="font-size:9px;color:var(--color-text-tertiary);margin-top:4px">via <a href="https://search.rcsb.org" target="_blank" style="color:var(--color-text-tertiary)">RCSB PDB</a></div>';
  md.innerHTML = html;
}

function showProteinMatch(results, activeIdx) {
  const el = document.getElementById('infoPanelContent');
  const top = results[activeIdx];
  let html = '<a href="https://www.rcsb.org/structure/' + top.pdbId + '" target="_blank" class="info-panel-title" style="display:block;color:inherit;text-decoration:underline dotted;text-underline-offset:2px;cursor:pointer">' + top.name + '</a>';
  if (top.organism) html += '<div class="info-panel-subtitle" style="font-style:italic">' + top.organism + ' · PDB ' + top.pdbId + '</div>';
  html += '<div class="info-panel-stats">Sequence identity: <strong>' + fmtIdentity(top.score) + '</strong></div>';
  html += '<div id="matchViewer" class="fold-viewer"></div>';

  // Action buttons
  html += '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">';
  if (top.sequence) {
    html += '<button class="match-play-btn" onclick="loadMatchedProtein(' + activeIdx + ')">&#9654; play</button>';
    const userSeq = compSeq.join('') || seq.join('');
    if (userSeq) {
      html += '<button class="match-play-btn" style="background:#4a6fa5;border-color:#4a6fa5" onclick="compareWithMatch(' + activeIdx + ')">compare</button>';
    }
  }
  if (compFolded && compFoldPdb) {
    html += '<button class="match-play-btn" style="background:transparent;border-color:var(--color-border-secondary);color:var(--color-text-secondary)" onclick="showFold(compFoldPdb,compFoldSeq)">&larr; back to fold</button>';
  }
  html += '</div>';

  // List all matches
  if (results.length > 1) {
    html += '<div class="match-list">';
    html += '<div style="font-size:10px;color:var(--color-text-tertiary);margin-bottom:4px">top matches</div>';
    results.forEach((r, i) => {
      html += '<div class="match-row' + (i === activeIdx ? ' active' : '') + '" onclick="showProteinMatch(compMatch,' + i + ')">'
        + '<span class="match-identity">' + fmtIdentity(r.score) + '</span>'
        + '<span class="match-name">' + r.name + '</span>'
        + (r.organism ? '<span class="match-organism">' + r.organism + '</span>' : '')
        + '</div>';
    });
    html += '</div>';
  }

  html += '<div style="margin-top:8px;font-size:9px;color:var(--color-text-tertiary);line-height:1.4">Searched via <a href="https://search.rcsb.org" target="_blank" style="color:var(--color-text-tertiary)">RCSB PDB</a></div>';
  el.innerHTML = html;

  // Load 3D structure
  waitFor3Dmol().then(async () => {
    const viewerDiv = document.getElementById('matchViewer');
    if (!viewerDiv) return;
    viewerDiv.innerHTML = '<div class="pdb-viewer-loading">loading structure...</div>';
    try {
      const pdbResp = await fetch('https://files.rcsb.org/download/' + top.pdbId + '.pdb');
      if (!pdbResp.ok) throw new Error('PDB fetch failed');
      const pdbData = await pdbResp.text();
      if (!document.getElementById('matchViewer')) return;
      viewerDiv.innerHTML = '';
      const viewer = $3Dmol.createViewer(viewerDiv, { backgroundColor: 'white' });
      viewer.addModel(pdbData, 'pdb');
      viewer.setStyle({}, { cartoon: { color: 'spectrum' }, stick: { color: 'spectrum', opacity: 0.35, radius: 0.12 } });
      viewer.zoomTo();
      viewer.render();
      viewer.spin('y', SPIN_SPEED);
    } catch {
      viewerDiv.innerHTML = '<img class="info-panel-img" src="https://cdn.rcsb.org/images/structures/' + top.pdbId.toLowerCase() + '_assembly-1.jpeg" alt="structure" onerror="this.style.display=\'none\'" style="width:100%;height:100%;object-fit:cover"/>';
    }
  });
}

function compareWithMatch(idx) {
  if (!compMatch || !compMatch[idx]) return;
  const r = compMatch[idx];
  const userSeq = compSeq.join('') || seq.join('');
  if (!userSeq || !r.sequence) return;
  const params = new URLSearchParams({
    seq1: userSeq,
    name1: 'Your sequence',
    seq2: r.sequence,
    name2: r.name + ' (' + r.pdbId + ')'
  });
  window.open('align.html?' + params.toString(), '_blank');
}

function loadMatchedProtein(idx) {
  if (!compMatch || !compMatch[idx]) return;
  const r = compMatch[idx];
  const raw = r.sequence.toUpperCase().split('').filter(aa => AM[aa]);
  if (!raw.length) return;
  if (!composing) toggleCompose();
  compSeq = [...raw];
  seq = [...raw];
  compFolded = false; compFoldPdb = null; compFoldSeq = null;
  document.getElementById('seqInput').value = raw.join('');
  renderComposeSeq();
  updateComposeCount();
  updateComposePlay();
  updateSuggestions();
  renderComposeInfo();
  togglePlay();
}

/* ── Init ── */
renderMappingBtns(); renderLegend(); renderPanelRef(); renderPiano();
renderPresets(); renderHarmonyBtns(); loadComplex(COMPLEXES[0]);
setupMobileCollapsibles();

let _resizeT;
window.addEventListener('resize', () => {
  clearTimeout(_resizeT);
  _resizeT = setTimeout(scalePianoForMobile, 150);
});
