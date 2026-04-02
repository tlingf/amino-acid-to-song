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
  { name: 'trp-cage',   seq: 'NLYIQWLKDGGPSSGRPPPS', ss: 'CHHHHHHHHHHHHHHCCCCC', pdb: '1L2Y', desc: 'Trp-cage (20aa) — smallest known folding protein; W rings out as the highest note', significance: 'A 20-residue mini-protein that folds in microseconds, making it a key model system for studying protein folding dynamics.' },
  { name: 'ubiquitin',  seq: 'MQIFVKTLTGKTITLEVEPS', ss: 'EEEEEEECCEEEEEEEECCC', pdb: '1UBQ', desc: 'Ubiquitin N-terminus (20aa) — the cell\'s molecular tag for degradation', significance: 'A universal molecular tag that marks proteins for destruction by the proteasome — its discovery earned the 2004 Nobel Prize in Chemistry.' },
  { name: 'insulin B',  seq: 'FVNQHLCGSHLVEALYLVCG', ss: 'CCCCCCCCHHHHHHHHHHHH', pdb: '4INS', desc: 'Insulin B-chain (20aa) — the hormone sequence that regulates blood sugar', significance: 'The B-chain of insulin binds to the insulin receptor, triggering glucose uptake. Mutations here cause hereditary diabetes.' },
  { name: 'VHH CDR3',   seq: 'AAEGRTFGSYYSY',        ss: 'CCCCCCCCCCCCC',        pdb: '1ZVH', desc: 'VHH CDR3 loop (13aa) — nanobody antigen-binding region', significance: 'The hypervariable loop that gives camelid nanobodies their antigen specificity — now widely used as compact biologics and research tools.' }
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

function isPentatonic() {
  const m = MAPPINGS.find(m => m.id === activeMapping);
  return m && m.type === 'pentatonic';
}

function getNoteIndex(note) {
  return isPentatonic() ? (PENT_NI[note] ?? -1) : (NI[note] ?? -1);
}

/* ── State ── */
let NA = {};
let activeMapping = MAPPINGS[0].id;
let seq = [], playing = false, paused = false, playIdx = 0, timers = [], ctx = null;
let presetActive = '', savedInfoHTML = '';
let activeComplex = null, contactMap = new Map();
let detailsOpen = false;
const kbDown = new Map();

function rebuildNA() { NA = {}; Object.entries(AM).forEach(([aa, n]) => NA[n] = aa); }
rebuildNA();

/* ── Audio ── */
function getCtx() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }

function playNote(freq, dur, vel) {
  vel = vel ?? 1.0;
  const c = getCtx(); if (c.state === 'suspended') c.resume();
  const hold = dur * 1.6;
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
let rhythmEnabled = false;

function getActiveSS() {
  if (activeComplex && activeComplex.chainA.ss) return activeComplex.chainA.ss;
  if (presetActive) { const p = PS.find(p => p.name === presetActive); if (p && p.ss) return p.ss; }
  return null;
}

function toggleRhythm() {
  rhythmEnabled = document.getElementById('rhythmCheck').checked;
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
  document.getElementById('playBtn').textContent = 'play'; setActive(-1);
}

function pausePlay() {
  paused = true; playing = false;
  timers.forEach(clearTimeout); timers = [];
  document.getElementById('playBtn').textContent = 'play';
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
      const note = AM[aa]; if (note) playNote(FR[note], ti.dur, ti.vel);
      const contact = contactMap.get(i);
      if (contact) {
        const pNote = AM[contact.aa];
        if (pNote) playNote(FR[pNote], ti.dur, ti.vel);
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

/* ── Active highlight + info bar ── */
function setActive(idx) {
  document.querySelectorAll('.aa-badge').forEach((el, i) => el.classList.toggle('active', i === idx));
  document.querySelectorAll('.partner-badge').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.contact-dot').forEach(el => el.classList.remove('active'));

  if (idx >= 0 && idx < seq.length) {
    const aa = seq[idx], note = AM[aa], g = GR[aa];
    const contact = contactMap.get(idx);
    let infoHTML;

    if (contact) {
      const paa = contact.aa, pg = GR[paa], pc = GC[pg];
      const pNote = AM[paa];
      infoHTML = `<span style="font-size:15px;font-weight:500;color:var(--color-text-primary)">${aa}</span>`
        + `<span style="color:var(--color-text-secondary)">${AN[aa]} (${A3[aa]})</span>`
        + `<span style="color:var(--color-text-tertiary);margin:0 4px">+</span>`
        + `<span style="font-size:15px;font-weight:500;color:${pc ? pc.bk : 'var(--color-text-primary)'}">${paa}</span>`
        + `<span style="color:var(--color-text-secondary)">${AN[paa]} (${A3[paa]})</span>`
        + `<span style="margin-left:auto;font-size:12px;color:var(--color-text-tertiary)">${contact.dist.toFixed(1)} \u00C5 \u00B7 ${note}+${pNote}</span>`;
      const pb = document.querySelector(`.partner-badge[data-idx="${idx}"]`);
      if (pb) pb.classList.add('active');
      const cd = document.querySelector(`.contact-dot[data-idx="${idx}"]`);
      if (cd) cd.classList.add('active');
      showAADisplay([aa, paa]);
    } else {
      infoHTML = `<span style="font-size:15px;font-weight:500;color:var(--color-text-primary)">${aa}</span>`
        + `<span style="color:var(--color-text-secondary)">${AN[aa] || aa} (${A3[aa] || ''})</span>`
        + `<span style="margin-left:auto;font-size:12px;color:var(--color-text-tertiary)">${note || '?'} \u00B7 ${GC[g]?.label?.split(' ')[0] || g}</span>`;
      showAADisplay([aa]);
    }
    document.getElementById('infoBar').innerHTML = infoHTML;
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
      const left = activeEl.offsetLeft - wrap.clientWidth / 2 + activeEl.offsetWidth / 2;
      wrap.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
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
    badge.className = 'aa-badge'; badge.style.background = c.bg; badge.style.color = c.tx;
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
      if (note) playNote(FR[note], 0.4);
      if (contact) { const pn = AM[contact.aa]; if (pn) playNote(FR[pn], 0.4); }
      setActive(i);
    };
    wrap.appendChild(unit);
  });
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
    el.className = 'wkey piano-key-' + note.replace('#', 's');
    el.style.cssText = `left:${i * WW}px;width:${WW - 1}px;height:${WH}px;background:${c ? c.bg : 'var(--color-background-primary)'}`;
    el.innerHTML = aa ? `<div class="klabel" style="color:${c ? c.tx : 'var(--color-text-tertiary)'}">${aa}</div><div class="klabel-sub" style="color:${c ? c.tx : 'var(--color-text-tertiary)'}">${A3[aa]}</div>` : '';
    el.onclick = () => { if (aa) { playNote(FR[note], 0.5); showAADisplay([aa]); } };
    el.onmouseenter = () => showTooltip(el, aa, note);
    el.onmouseleave = hideTooltip;
    wrap.appendChild(el);
  });
  BN.forEach(note => {
    const aa = NA[note], g = aa ? GR[aa] : null, c = aa ? GC[g] : null;
    const wi = BP[note], left = wi * WW + WW * 0.7 - BW / 2;
    const bkBg = c ? c.bk : '#444441', bkTx = c ? c.bg : '#F1EFE8';
    const el = document.createElement('div');
    el.className = 'bkey piano-key-' + note.replace('#', 's');
    el.style.cssText = `left:${left}px;width:${BW}px;height:${BH}px;background:${bkBg}`;
    el.innerHTML = aa ? `<div class="klabel" style="color:${bkTx}">${aa}</div><div class="klabel-sub" style="color:${bkTx}">${A3[aa]}</div>` : '';
    el.onclick = () => { if (aa) { playNote(FR[note], 0.5); showAADisplay([aa]); } };
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
    el.style.cssText = `left:${left}px;width:${PENT_W - 1}px;height:${WH}px;background:${c ? c.bg : 'var(--color-background-primary)'}`;
    const octLabel = i % 5 === 0 ? `<div class="pent-oct">${note.slice(-1)}</div>` : '';
    el.innerHTML = aa
      ? `<div class="klabel" style="color:${c ? c.tx : 'var(--color-text-tertiary)'}">${aa}</div><div class="klabel-sub" style="color:${c ? c.tx : 'var(--color-text-tertiary)'}">${A3[aa]}</div>${octLabel}`
      : octLabel;
    el.onclick = () => { if (aa) { playNote(FR[note], 0.5); showAADisplay([aa]); } };
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
    el.innerHTML = `<div class="leg-dot" style="background:${c.bk}"></div><span>${c.label}</span>`;
    leg.appendChild(el);
  });
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
  document.getElementById('infoBar').textContent = `${p.name} (${p.seq.length} aa)`;
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
  document.getElementById('infoBar').textContent = seq.length ? `${seq.length} amino acids loaded` : 'no valid amino acids found';
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
  Object.assign(KB, isPentatonic() ? KB_PENTATONIC : KB_CHROMATIC);
  const hint = document.getElementById('kbHint');
  if (hint) hint.innerHTML = isPentatonic()
    ? 'or play with your keyboard — A&thinsp;S&thinsp;D&thinsp;F&thinsp;G for octave 3, H&thinsp;J&thinsp;K&thinsp;L&thinsp;; for octave 4, Q&thinsp;W&thinsp;E&thinsp;R&thinsp;T for octave 5, Y&thinsp;U&thinsp;I&thinsp;O&thinsp;P for octave 6'
    : 'or play with your keyboard — A&thinsp;S&thinsp;D&thinsp;F… for white keys, W&thinsp;E&thinsp;T&thinsp;Y… for black keys';
  renderMappingBtns(); renderPanelRef(); renderPiano(); renderSeqMel();
  document.getElementById('infoBar').textContent = MAPPINGS.find(m => m.id === id)?.desc || '';
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
  document.getElementById('infoBar').innerHTML =
    `<span style="font-weight:500">${cx.name}</span> `
    + `<span style="color:var(--color-text-tertiary)">(${cx.pdb})</span> `
    + `<span style="color:var(--color-text-secondary);font-size:12px">${cx.contacts.length} contacts</span>`;
  renderInfoPanel(); updateRhythmUI(); updateSSBadges();
}

/* ── Keyboard ── */
function updateKbInfo() {
  const bar = document.getElementById('infoBar');
  if (kbDown.size === 0) { bar.innerHTML = savedInfoHTML; showAADisplay([]); return; }
  const notes = [...kbDown.values()];
  const parts = notes.map(note => {
    const aa = NA[note], g = aa ? GR[aa] : null, c = aa ? GC[g] : null;
    const color = c ? c.bk : 'var(--color-text-primary)';
    return aa
      ? `<span style="font-weight:500;color:${color}">${AN[aa]}</span> <span style="color:var(--color-text-tertiary)">(${A3[aa]} \u00B7 ${note})</span>`
      : `<span style="color:var(--color-text-tertiary)">${note}</span>`;
  });
  bar.innerHTML = parts.join(' &nbsp;\u00B7&nbsp; ');
  showAADisplay(notes.map(n => NA[n]).filter(Boolean));
}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const note = KB[e.key.toLowerCase()];
  if (!note || kbDown.has(e.key)) return;
  const hint = document.getElementById('kbHint'); if (hint) hint.style.display = 'none';
  if (kbDown.size === 0) savedInfoHTML = document.getElementById('infoBar').innerHTML;
  kbDown.set(e.key, note);
  playNote(FR[note], 0.5);
  const cls = 'piano-key-' + note.replace('#', 's');
  document.querySelectorAll('.' + cls).forEach(el => el.classList.add('lit'));
  updateKbInfo();
});

document.addEventListener('keyup', e => {
  kbDown.delete(e.key);
  const note = KB[e.key.toLowerCase()];
  if (!note) return;
  const cls = 'piano-key-' + note.replace('#', 's');
  document.querySelectorAll('.' + cls).forEach(el => el.classList.remove('lit'));
  updateKbInfo();
});

/* ── Info Panel (right) ── */
function renderInfoPanel() {
  const el = document.getElementById('infoPanelContent');
  if (!el) return;

  if (activeComplex) {
    const cx = activeComplex;
    const imgUrl = `https://cdn.rcsb.org/images/structures/${cx.pdb.toLowerCase()}_assembly-1.jpeg`;
    let html = `<img class="info-panel-img" src="${imgUrl}" alt="${cx.name} structure" onerror="this.style.display='none'"/>`;
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

  } else if (presetActive) {
    const p = PS.find(p => p.name === presetActive);
    if (p) {
      const imgUrl = `https://cdn.rcsb.org/images/structures/${p.pdb.toLowerCase()}_assembly-1.jpeg`;
      let html = `<img class="info-panel-img" src="${imgUrl}" alt="${p.name} structure" onerror="this.style.display='none'"/>`;
      html += `<div class="info-panel-title">${p.name}</div>`;
      html += `<div class="info-panel-subtitle">${p.pdb} · ${p.seq.length} amino acids</div>`;
      html += `<div class="info-panel-desc">${p.significance}</div>`;
      html += '<div id="infoPanelNow"></div>';
      el.innerHTML = html;
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
