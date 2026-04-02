/*
 * Protein Melody Player — main application logic
 *
 * Depends on: aa_mapping.js (AM, AN, A3, AB, GR, GC, FR, HP, MAPPINGS, COMPLEXES)
 *             aa_structures.js (SC, renderStructSVG, renderSideChainSVG)
 */

/* ── Constants ── */
const MORD = ['C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4','C5','C#5','D5','D#5','E5','F5','F#5','G5'];
const NI = {}; MORD.forEach((n, i) => NI[n] = i);
const WN = ['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5'];
const BN = ['C#4','D#4','F#4','G#4','A#4','C#5','D#5','F#5'];
const BP = { 'C#4': 0, 'D#4': 1, 'F#4': 3, 'G#4': 4, 'A#4': 5, 'C#5': 7, 'D#5': 8, 'F#5': 10 };
const WW = 48, BW = 30, WH = 178, BH = 112;
const AF = { L: 9.66, A: 8.25, G: 7.07, V: 6.87, E: 6.75, S: 6.56, I: 5.96, K: 5.84, R: 5.53, D: 5.45, T: 5.34, P: 4.70, N: 4.06, Q: 3.93, F: 3.86, Y: 2.92, M: 2.42, H: 2.27, C: 1.37, W: 1.08 };

const PS = [
  { name: 'trp-cage',   seq: 'NLYIQWLKDGGPSSGRPPPS', pdb: '1L2Y', desc: 'Trp-cage (20aa) — smallest known folding protein; W rings out as the highest note', significance: 'A 20-residue mini-protein that folds in microseconds, making it a key model system for studying protein folding dynamics.' },
  { name: 'ubiquitin',  seq: 'MQIFVKTLTGKTITLEVEPS', pdb: '1UBQ', desc: 'Ubiquitin N-terminus (20aa) — the cell\'s molecular tag for degradation', significance: 'A universal molecular tag that marks proteins for destruction by the proteasome — its discovery earned the 2004 Nobel Prize in Chemistry.' },
  { name: 'insulin B',  seq: 'FVNQHLCGSHLVEALYLVCG', pdb: '4INS', desc: 'Insulin B-chain (20aa) — the hormone sequence that regulates blood sugar', significance: 'The B-chain of insulin binds to the insulin receptor, triggering glucose uptake. Mutations here cause hereditary diabetes.' },
  { name: 'VHH CDR3',   seq: 'AAEGRTFGSYYSY',        pdb: '1ZVH', desc: 'VHH CDR3 loop (13aa) — nanobody antigen-binding region', significance: 'The hypervariable loop that gives camelid nanobodies their antigen specificity — now widely used as compact biologics and research tools.' }
];

const KB = {
  'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4', 'f': 'F4', 't': 'F#4',
  'g': 'G4', 'y': 'G#4', 'h': 'A4', 'u': 'A#4', 'j': 'B4',
  'k': 'C5', 'o': 'C#5', 'l': 'D5', 'p': 'D#5', ';': 'E5', "'": 'F5', ']': 'F#5',
  '\\': 'G5'
};

/* ── State ── */
let NA = {};
let activeMapping = MAPPINGS[0].id;
let seq = [], playing = false, paused = false, playIdx = 0, timers = [], ctx = null;
let presetActive = '';
let activeComplex = null, contactMap = new Map();
let detailsOpen = false;
let composing = false, compSeq = [];
const kbDown = new Map();

function rebuildNA() { NA = {}; Object.entries(AM).forEach(([aa, n]) => NA[n] = aa); }
rebuildNA();

/* ── Audio ── */
function getCtx() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }

function playNote(freq, dur) {
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
  master.gain.setValueAtTime(0.9, t);
  master.gain.linearRampToValueAtTime(0.75, t + 0.05);
  master.gain.setValueAtTime(0.65, t + hold * 0.4);
  master.gain.exponentialRampToValueAtTime(0.001, t + hold * 0.98);
}

/* ── Playback ── */
function stopPlay() {
  playing = false; paused = false; playIdx = 0;
  timers.forEach(clearTimeout); timers = [];
  document.getElementById('playBtn').textContent = 'play sequence'; setActive(-1);
}

function pausePlay() {
  paused = true; playing = false;
  timers.forEach(clearTimeout); timers = [];
  document.getElementById('playBtn').textContent = 'play sequence';
}

function startFrom(startIdx) {
  playing = true; paused = false;
  document.getElementById('playBtn').textContent = 'pause';
  const bpm = parseInt(document.getElementById('tempoSlider').value);
  const nd = 60 / bpm;
  seq.slice(startIdx).forEach((aa, j) => {
    const i = startIdx + j;
    const t = setTimeout(() => {
      if (!playing) return;
      playIdx = i + 1;
      const note = AM[aa]; if (note) playNote(FR[note], nd * 0.85);
      const contact = contactMap.get(i);
      if (contact) {
        const pNote = AM[contact.aa];
        if (pNote) playNote(FR[pNote], nd * 0.85);
      }
      setActive(i);
      if (i === seq.length - 1) setTimeout(() => { if (playing) stopPlay(); }, nd * 900);
    }, j * nd * 1000);
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
  WN.forEach((note, i) => {
    const aa = NA[note], g = aa ? GR[aa] : null, c = aa ? GC[g] : null;
    const el = document.createElement('div');
    el.className = 'wkey piano-key-' + note.replace('#', 's');
    el.style.cssText = `left:${i * WW}px;width:${WW - 1}px;height:${WH}px;background:${c ? c.bg : 'var(--color-background-primary)'}`;
    el.innerHTML = aa ? `<div class="klabel" style="color:${c ? c.tx : 'var(--color-text-tertiary)'}">${aa}</div><div class="klabel-sub" style="color:${c ? c.tx : 'var(--color-text-tertiary)'}">${A3[aa]}</div>` : '';
    el.onclick = () => { if (aa) { playNote(FR[note], 0.5); showAADisplay([aa]); if (composing) addComposeAA(aa); } };
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
    el.onclick = () => { if (aa) { playNote(FR[note], 0.5); showAADisplay([aa]); if (composing) addComposeAA(aa); } };
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
  const sorted = Object.entries(m.map).sort((a, b) => NI[a[1]] - NI[b[1]]);
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
  renderInfoPanel();
}

function loadPresetClear(p) {
  activeComplex = null; contactMap = new Map();
  loadPreset(p); renderHarmonyBtns();
}

function loadCustom() {
  stopPlay(); presetActive = ''; activeComplex = null; contactMap = new Map();
  seq = document.getElementById('seqInput').value.toUpperCase().split('').filter(aa => AM[aa]);
  renderPresets(); renderHarmonyBtns(); renderSeqMel();
  renderInfoPanel();
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
  renderInfoPanel();
}

/* ── Keyboard ── */
function updateKbInfo() {
  if (kbDown.size === 0) { showAADisplay([]); return; }
  showAADisplay([...kbDown.values()].map(n => NA[n]).filter(Boolean));
}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const note = KB[e.key.toLowerCase()];
  if (!note || kbDown.has(e.key)) return;
  const hint = document.getElementById('kbHint'); if (hint) hint.style.display = 'none';
  kbDown.set(e.key, note);
  playNote(FR[note], 0.5);
  const cls = 'piano-key-' + note.replace('#', 's');
  document.querySelectorAll('.' + cls).forEach(el => el.classList.add('lit'));
  updateKbInfo();
  if (composing) { const aa = NA[note]; if (aa) addComposeAA(aa); }
});

document.addEventListener('keyup', e => {
  kbDown.delete(e.key);
  const note = KB[e.key.toLowerCase()];
  if (!note) return;
  const cls = 'piano-key-' + note.replace('#', 's');
  document.querySelectorAll('.' + cls).forEach(el => el.classList.remove('lit'));
  updateKbInfo();
});

/* ── Composition Mode ── */
function toggleCompose() {
  composing = !composing;
  const btn = document.getElementById('composeBtn');
  const bar = document.getElementById('composeBar');
  if (composing) {
    stopPlay();
    compSeq = [];
    seq = [];
    document.getElementById('seqInput').value = '';
    renderSeqMel();
    btn.textContent = 'exit compose'; btn.classList.add('active');
    bar.style.display = 'flex';
    updateComposeCount();
    updateSuggestions();
    renderComposeInfo();
  } else {
    btn.textContent = 'compose'; btn.classList.remove('active');
    bar.style.display = 'none';
    clearSuggestions();
    renderInfoPanel();
  }
}

function addComposeAA(aa) {
  if (!aa) return;
  compSeq.push(aa);
  seq = [...compSeq];
  document.getElementById('seqInput').value = compSeq.join('');
  renderSeqMel();
  updateComposeCount();
  updateSuggestions();
  renderComposeInfo();
}

function undoCompose() {
  if (compSeq.length === 0) return;
  compSeq.pop();
  seq = [...compSeq];
  document.getElementById('seqInput').value = compSeq.join('');
  renderSeqMel();
  updateComposeCount();
  updateSuggestions();
  renderComposeInfo();
}

function clearCompose() {
  compSeq = [];
  seq = [];
  document.getElementById('seqInput').value = '';
  renderSeqMel();
  updateComposeCount();
  updateSuggestions();
  renderComposeInfo();
}

function updateComposeCount() {
  const el = document.getElementById('composeCount');
  if (el) el.textContent = compSeq.length + ' aa';
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
    showFold(pdbData, seqStr);
  } catch (err) {
    el.innerHTML = '<div class="info-panel-title">fold error</div>'
      + '<div class="fold-error">' + err.message + '</div>'
      + '<div class="info-panel-desc">The ESMFold API may be unavailable or blocking browser requests. Your sequence:</div>'
      + '<div style="font-family:var(--font-mono);font-size:10px;word-break:break-all;margin:6px 0;padding:6px;background:var(--color-background-secondary);border-radius:4px">' + seqStr + '</div>';
  }
}

function showFold(pdbData, seqStr) {
  const el = document.getElementById('infoPanelContent');
  el.innerHTML = '<div class="info-panel-title">your protein</div>'
    + '<div class="info-panel-subtitle">' + seqStr.length + ' amino acids</div>'
    + '<div id="foldViewer" class="fold-viewer"></div>'
    + '<div class="fold-status">colored by pLDDT confidence</div>';

  if (typeof $3Dmol !== 'undefined') {
    const viewer = $3Dmol.createViewer('foldViewer', { backgroundColor: 'white' });
    viewer.addModel(pdbData, 'pdb');
    viewer.setStyle({}, { cartoon: { colorscheme: { prop: 'b', gradient: 'roygb', min: 50, max: 90 } } });
    viewer.zoomTo();
    viewer.render();
    viewer.spin('y', 1);
  } else {
    document.getElementById('foldViewer').innerHTML = '<div class="fold-loading">3Dmol.js not loaded</div>';
  }
}

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
