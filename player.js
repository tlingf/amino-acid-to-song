/*
 * Protein Melody Player — main application logic
 *
 * Depends on: aa_mapping.js (AM, AN, A3, AB, GR, GC, FR, HP, MAPPINGS, COMPLEXES)
 *             aa_structures.js (SC, renderStructSVG, renderSideChainSVG)
 */

/* ── Constants ── */
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
const AF = { L: 9.66, A: 8.25, G: 7.07, V: 6.87, E: 6.75, S: 6.56, I: 5.96, K: 5.84, R: 5.53, D: 5.45, T: 5.34, P: 4.70, N: 4.06, Q: 3.93, F: 3.86, Y: 2.92, M: 2.42, H: 2.27, C: 1.37, W: 1.08 };

const PS = [
  { name: 'trp-cage',   seq: 'NLYIQWLKDGGPSSGRPPPS', ss: 'CHHHHHHHHHHHHHHCCCCC', pdb: '1L2Y', desc: 'Trp-cage (20aa) — smallest known folding protein; W rings out as the highest note', significance: 'A 20-residue mini-protein designed in 2002 by the Andersen lab. It folds in microseconds around a central tryptophan (W) residue buried by proline rings, making it one of the most important model systems for studying protein folding dynamics and validating molecular simulations.' },
  { name: 'ubiquitin',  seq: 'MQIFVKTLTGKTITLEVEPS', ss: 'EEEEEEECCEEEEEEEECCC', pdb: '1UBQ', desc: 'Ubiquitin N-terminus (20aa) — the cell\'s molecular tag for degradation', significance: 'Ubiquitin is a small 76-residue protein found in virtually all eukaryotic cells. It acts as a molecular tag — when chains of ubiquitin are attached to a target protein, the cell\'s proteasome recognizes and degrades it. This quality-control system is essential for cell cycle regulation, DNA repair, and immune signaling. Its discovery earned Aaron Ciechanover, Avram Hershko, and Irwin Rose the 2004 Nobel Prize in Chemistry.' },
  { name: 'insulin B',  seq: 'FVNQHLCGSHLVEALYLVCG', ss: 'CCCCCCCCHHHHHHHHHHHH', pdb: '4INS', desc: 'Insulin B-chain (20aa) — the hormone sequence that regulates blood sugar', significance: 'Insulin is a peptide hormone produced by pancreatic beta cells that regulates blood glucose. It consists of two chains (A and B) linked by disulfide bonds. The B-chain\'s central alpha-helix is critical for binding the insulin receptor and triggering glucose uptake into cells. Mutations in this region can cause hereditary diabetes (MIDY), and engineered B-chain variants are the basis of fast-acting therapeutic insulins.' },
  { name: 'VHH CDR3',   seq: 'AAEGRTFGSYYSY',        ss: 'CCCCCCCCCCCCC',        pdb: '1ZVH', desc: 'VHH CDR3 loop (13aa) — nanobody antigen-binding region', significance: 'Camelids (llamas, camels, alpacas) produce unique heavy-chain-only antibodies. The VHH domain — or nanobody — is their single variable region, and the CDR3 loop is the primary determinant of antigen specificity. At only ~15 kDa, nanobodies are the smallest known antigen-binding fragments, prized for their stability, ease of engineering, and ability to access epitopes that conventional antibodies cannot reach. They are now used as research tools, diagnostics, and FDA-approved therapeutics.' }
];

const KB_CHROMATIC = {
  'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4', 'f': 'F4', 't': 'F#4',
  'g': 'G4', 'y': 'G#4', 'h': 'A4', 'u': 'A#4', 'j': 'B4',
  'k': 'C5', 'o': 'C#5', 'l': 'D5', 'p': 'D#5', ';': 'E5', "'": 'F5', ']': 'F#5',
  '\\': 'G5'
};
const KB_PENTATONIC = {
  'a': 'C3', 's': 'D3', 'd': 'E3', 'f': 'G3', 'g': 'A3',
  'h': 'C4', 'j': 'D4', 'k': 'E4', 'l': 'G4', ';': 'A4',
  'q': 'C5', 'w': 'D5', 'e': 'E5', 'r': 'G5', 't': 'A5',
  'y': 'C6', 'u': 'D6', 'i': 'E6', 'o': 'G6', 'p': 'A6'
};
let KB = { ...KB_CHROMATIC };

function isDirect() {
  const m = MAPPINGS.find(m => m.id === activeMapping);
  return m && m.type === 'direct';
}

function isPentatonic() {
  const m = MAPPINGS.find(m => m.id === activeMapping);
  return m && (m.type === 'pentatonic' || m.type === 'direct');
}

function getNoteIndex(note) {
  return isPentatonic() ? (PENT_NI[note] ?? -1) : (NI[note] ?? -1);
}

/* ── State ── */
let NA = {};
let activeMapping = MAPPINGS[0].id;
let seq = [], playing = false, paused = false, playIdx = 0, timers = [], ctx = null;
let presetActive = '';
let activeComplex = null, contactMap = new Map();
let detailsOpen = false;
let composing = false, compSeq = [], compFolded = false;
const kbDown = new Map();

function rebuildNA() { NA = {}; Object.entries(AM).forEach(([aa, n]) => NA[n] = aa); }
rebuildNA();

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
  if (presetActive) { const p = PS.find(p => p.name === presetActive); if (p && p.ss) return p.ss; }
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
  document.getElementById('playBtn').textContent = '🎵 play sequence'; setActive(-1);
}

function pausePlay() {
  paused = true; playing = false;
  timers.forEach(clearTimeout); timers = [];
  document.getElementById('playBtn').textContent = '🎵 play sequence';
}

function startFrom(startIdx) {
  playing = true; paused = false;
  document.getElementById('playBtn').textContent = 'pause';
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
    updateInfoPanelNow(idx);

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

    // Auto-scroll sequence to keep active badge visible
    const wrap = document.getElementById('seqMel');
    const activeEl = wrap.querySelectorAll('.seq-unit')[idx];
    if (activeEl && wrap.scrollWidth > wrap.clientWidth) {
      const elLeft = activeEl.offsetLeft - wrap.scrollLeft;
      const margin = wrap.clientWidth * 0.25;
      if (elLeft < margin || elLeft > wrap.clientWidth - margin) {
        const left = activeEl.offsetLeft - wrap.clientWidth / 2 + activeEl.offsetWidth / 2;
        wrap.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
      }
    }
  }
}

/* ── Tooltip ── */
function showTooltip(el, aa, note) {
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
  if (activeComplex && contactMap.size > 0) {
    labelWrap.innerHTML =
      `<div class="seq-row-label">${activeComplex.chainA.name}</div>`
      + `<div class="seq-row-label-dot"></div>`
      + `<div class="seq-row-label-partner">${activeComplex.chainB.name}</div>`;
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
      pb.textContent = paa; pb.title = `${AN[paa]} (${activeComplex.chainB.name}) \u2014 ${contact.dist.toFixed(1)} \u00C5`;
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
  if (isPentatonic()) {
    wrap.style.width = (20 * PENT_W + 3 * 4) + 'px';
    renderPianoPentatonic(wrap);
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
    btn.textContent = p.name; btn.className = p.name === presetActive ? 'active' : '';
    btn.onclick = () => loadPresetClear(p);
    wrap.appendChild(btn);
  });
}

function loadPreset(p) {
  stopPlay(); presetActive = p.name;
  document.getElementById('seqInput').value = p.seq;
  seq = p.seq.toUpperCase().split('').filter(aa => AM[aa]);
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

/* ── Mapping ── */
function renderMappingBtns() {
  const wrap = document.getElementById('mappingBtns'); wrap.innerHTML = '';
  MAPPINGS.forEach(m => {
    const btn = document.createElement('button');
    btn.textContent = m.name; btn.className = m.id === activeMapping ? 'active' : '';
    btn.title = m.desc;
    btn.onclick = () => switchMapping(m.id);
    wrap.appendChild(btn);
  });
}

function switchMapping(id) {
  stopPlay(); activeMapping = id; setMapping(id); rebuildNA();
  Object.keys(KB).forEach(k => delete KB[k]);
  if (isDirect()) {
    Object.entries(AM).forEach(([aa, note]) => { KB[aa.toLowerCase()] = note; });
  } else {
    Object.assign(KB, isPentatonic() ? KB_PENTATONIC : KB_CHROMATIC);
  }
  const hint = document.getElementById('kbHint');
  if (hint) hint.innerHTML = isDirect()
    ? 'type amino acid letters directly — A&thinsp;G&thinsp;V&thinsp;L&thinsp;I&thinsp;S&thinsp;T&thinsp;C&thinsp;M&thinsp;P&thinsp;D&thinsp;E&thinsp;N&thinsp;Q&thinsp;K&thinsp;R&thinsp;H&thinsp;F&thinsp;W&thinsp;Y'
    : isPentatonic()
    ? 'or play with your keyboard — A&thinsp;S&thinsp;D&thinsp;F&thinsp;G for octave 3, H&thinsp;J&thinsp;K&thinsp;L&thinsp;; for octave 4, Q&thinsp;W&thinsp;E&thinsp;R&thinsp;T for octave 5, Y&thinsp;U&thinsp;I&thinsp;O&thinsp;P for octave 6'
    : 'or play with your keyboard — A&thinsp;S&thinsp;D&thinsp;F… for white keys, W&thinsp;E&thinsp;T&thinsp;Y… for black keys';
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
  cx.contacts.forEach(([idxA, partnerAA, dist]) => {
    contactMap.set(idxA, { aa: partnerAA, dist });
  });
  if (activeMapping !== 'complexity-harmony') {
    activeMapping = 'complexity-harmony'; setMapping('complexity-harmony'); rebuildNA();
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
function updateKbInfo() {
  if (kbDown.size === 0) { showAADisplay([]); return; }
  showAADisplay([...kbDown.values()].map(n => NA[n]).filter(Boolean));
}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (composing && e.key === 'Escape') { e.preventDefault(); toggleCompose(); return; }
  if (composing && e.key === 'Backspace') { e.preventDefault(); undoCompose(); return; }
  const note = KB[e.key.toLowerCase()];
  if (!note || kbDown.has(e.key)) return;
  const hint = document.getElementById('kbHint'); if (hint) hint.style.display = 'none';
  kbDown.set(e.key, note);
  playNote(FR[note], 0.5, hySustain(NA[note]));
  const cls = 'piano-key-' + note.replace('#', 's');
  document.querySelectorAll('.' + cls).forEach(el => el.classList.add('lit'));
  updateKbInfo();
  if (!composing) toggleCompose();
  const aa = NA[note]; if (aa) addComposeAA(aa);
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

function waitFor3Dmol() {
  if (typeof $3Dmol !== 'undefined') return Promise.resolve();
  return new Promise(resolve => {
    const check = setInterval(() => {
      if (typeof $3Dmol !== 'undefined') { clearInterval(check); resolve(); }
    }, 100);
  });
}

function initPdbViewer(pdbId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
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
    viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
    viewer.zoomTo();
    viewer.render();
    viewer.spin('y', 0.5);
    activeViewer = viewer;
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
    activeComplex = null; contactMap = null;
    compFolded = false;
    compSeq = [];
    seq = [];
    document.getElementById('seqInput').value = '';
    renderSeqMel();
    btn.textContent = 'exit compose mode'; btn.classList.add('active');
    bar.style.display = 'flex';
    if (seqRow) seqRow.style.display = 'none';
    if (seqWrap) seqWrap.style.display = 'none';
    if (harmonyWrap) harmonyWrap.style.display = 'none';
    if (playBtn) playBtn.style.display = 'none';
    document.getElementById('composeSeq').innerHTML = '';
    document.body.classList.add('compose-active');
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
  if (compSeq.length === 0 || compFolded) return;
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
  compFolded = false;
  compSeq = [];
  seq = [];
  document.getElementById('seqInput').value = '';
  renderComposeSeq();
  updateComposeCount();
  updateComposePlay();
  updateSuggestions();
  renderComposeInfo();
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
  const foldBtn = document.getElementById('foldBtn');
  if (foldBtn) foldBtn.disabled = compSeq.length < 20;
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
  html += '<div id="infoPanelNow"></div>';
  el.innerHTML = html;
}

async function foldSequence() {
  if (compSeq.length < 20) return;
  const seqStr = compSeq.join('');
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
    compFolded = true;
    showFold(pdbData, seqStr);
  } catch (err) {
    el.innerHTML = '<div class="info-panel-title">fold error</div>'
      + '<div class="fold-error">' + err.message + '</div>'
      + '<div class="info-panel-desc">The ESMFold API may be unavailable or blocking browser requests. Your sequence:</div>'
      + '<div style="font-family:var(--font-mono);font-size:10px;word-break:break-all;margin:6px 0;padding:6px;background:var(--color-background-secondary);border-radius:4px">' + seqStr + '</div>';
  }
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
  // ESMFold may return pLDDT on 0–1 scale; normalize to 0–100
  if (bFactors.every(b => b <= 1)) bFactors.forEach((b, i) => { bFactors[i] = b * 100; });
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
  const el = document.getElementById('infoPanelContent');
  const conf = parsePLDDT(pdbData);
  // Show structure immediately
  let html = '<div class="info-panel-title">your protein</div>'
    + '<div class="info-panel-subtitle">' + seqStr.length + ' amino acids</div>'
    + '<div id="foldViewer" class="fold-viewer"></div>';
  if (conf) {
    const color = conf.avg >= 70 ? '#3a8a5c' : conf.avg >= 50 ? '#EF9F27' : '#dc2626';
    html += '<div style="margin:6px 0;font-size:11px">'
      + '<span style="color:var(--color-text-tertiary)">Model confidence: </span>'
      + '<span style="font-weight:600;color:' + color + '">pLDDT ' + conf.avg + '</span>'
      + '<span style="color:var(--color-text-tertiary)"> (' + conf.min + '\u2013' + conf.max + ')</span>'
      + '</div>';
  }
  html += '<div class="fold-status">colored by confidence: <span style="color:#dc2626">low</span> \u2192 <span style="color:#3a8a5c">high</span></div>'
    + '<div id="foldPropensity"></div>'
    + '<div style="margin-top:8px;font-size:9px;color:var(--color-text-tertiary);line-height:1.4">Folded with <a href="https://esmatlas.com" target="_blank" style="color:var(--color-text-tertiary)">ESMFold</a> (Lin et al., Science 2023)</div>';
  el.innerHTML = html;

  waitFor3Dmol().then(() => {
    const viewerDiv = document.getElementById('foldViewer');
    if (!viewerDiv) return;
    const viewer = $3Dmol.createViewer(viewerDiv, { backgroundColor: 'white' });
    viewer.addModel(pdbData, 'pdb');
    viewer.setStyle({}, { cartoon: { colorscheme: { prop: 'b', gradient: 'roygb', min: 50, max: 90 } } });
    viewer.zoomTo();
    viewer.render();
    viewer.spin('y', 1);

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
      propDiv.innerHTML = '<div style="margin:10px 0 6px;padding:8px 10px;background:#f8f7fc;border-radius:6px;font-size:11px">'
        + '<div style="font-weight:600;margin-bottom:6px;color:var(--color-text-primary)">secondary structure</div>'
        + ssBar('alpha helix', helixImg(), ss.helix, '#e07838')
        + ssBar('beta sheet', sheetImg(), ss.sheet, '#3878c0')
        + '</div>';
    }
  });
}

/* ── Info Panel (right) ── */
function renderInfoPanel() {
  const el = document.getElementById('infoPanelContent');
  if (!el) return;
  if (activeViewer) { activeViewer = null; }

  if (activeComplex) {
    const cx = activeComplex;
    let html = `<div id="pdbViewer" class="pdb-viewer"></div>`;
    html += `<div class="info-panel-title">${cx.name}</div>`;
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
        <span class="info-panel-contact-dash">\u2014</span>
        <span class="info-panel-contact-aa" style="color:${c2?.bk || 'var(--color-text-primary)'}">${partnerAA}</span>
        <span class="info-panel-contact-dist">${dist.toFixed(1)} \u00C5</span>
      </div>`;
    });
    html += '</div>';
    html += '<div id="infoPanelNow"></div>';
    el.innerHTML = html;
    initPdbViewer(cx.pdb, 'pdbViewer');

  } else if (presetActive) {
    const p = PS.find(p => p.name === presetActive);
    if (p) {
      let html = `<div id="pdbViewer" class="pdb-viewer"></div>`;
      html += `<div class="info-panel-title">${p.name}</div>`;
      html += `<div class="info-panel-subtitle">${p.pdb} · ${p.seq.length} amino acids</div>`;
      html += `<div class="info-panel-desc">${p.significance}</div>`;
      html += '<div id="infoPanelNow"></div>';
      el.innerHTML = html;
      initPdbViewer(p.pdb, 'pdbViewer');
    }

  } else if (seq.length) {
    let html = '<div class="info-panel-title">custom sequence</div>';
    html += `<div class="info-panel-subtitle">${seq.length} amino acids</div>`;
    html += '<div id="infoPanelNow"></div>';
    el.innerHTML = html;

  } else {
    el.innerHTML = '<div class="info-panel-placeholder">select a preset or harmony complex</div>';
  }
}

function updateInfoPanelNow(idx) {
  const el = document.getElementById('infoPanelNow');
  if (!el) return;
  if (idx < 0 || idx >= seq.length) { el.innerHTML = ''; return; }
  const aa = seq[idx], note = AM[aa], g = GR[aa], c = GC[g];
  const contact = contactMap.get(idx);
  let html = `<div class="info-panel-now-label">now playing</div>`;
  html += `<span class="info-panel-now-aa" style="color:${c?.bk || 'var(--color-text-primary)'}">${aa}</span> `;
  html += `<span class="info-panel-now-detail">${AN[aa] || aa} · ${note || '?'}</span>`;
  if (contact) {
    const pg = GR[contact.aa], pc = GC[pg];
    const pNote = AM[contact.aa];
    html += `<br/><span class="info-panel-now-aa" style="color:${pc?.bk || 'var(--color-text-primary)'}">${contact.aa}</span> `;
    html += `<span class="info-panel-now-detail">${AN[contact.aa]} · ${pNote || '?'} · ${contact.dist.toFixed(1)} \u00C5</span>`;
  }
  el.innerHTML = html;
}

/* ── Init ── */
renderMappingBtns(); renderLegend(); renderPanelRef(); renderPiano();
renderPresets(); renderHarmonyBtns(); loadComplex(COMPLEXES[0]);
