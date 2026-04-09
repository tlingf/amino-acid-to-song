'use strict';

const EXAMPLES = [
  { name: 'Human insulin', seq: 'MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN' },
  { name: 'Mouse insulin', seq: 'MALLVHFLPLLALLALWEPKPTQAFVKQHLCGPHLVEALYLVCGERGFFYTPKSRREVEDPQVEQLELGGSPGDLQTLALEVARQKRGIVDQCCTSICSLYQLENYCN' },
  { name: 'Pig insulin',   seq: 'MALWTRLLPLLALLALWAPAPAQAFVNQHLCGSHLVEALYLVCGERGFFYTPKARREVEGPQVGALELAGGPGAGGLEGPPQKRGIVEQCCASVCSLYQLENYCN' },
];

/* ─── State ─── */
let seqCount = 0;
let viewMode = 'full'; // 'compact' or 'full'

/* ─── DOM refs ─── */
const seqInputsEl = document.getElementById('seqInputs');
const resultsEl = document.getElementById('results');
const lengthsEl = document.getElementById('lengths');
const statsGridEl = document.getElementById('statsGrid');
const alignmentsEl = document.getElementById('alignments');
const mutationsEl = document.getElementById('mutations');

/* ─── Sequence input management ─── */
function addSeqInput(name, seq) {
  seqCount++;
  const id = seqCount;
  const div = document.createElement('div');
  div.className = 'seq-entry';
  div.dataset.id = id;
  div.innerHTML = `
    <input class="seq-name" placeholder="Name" value="${name || 'Seq ' + id}"/>
    <textarea placeholder="Paste amino acid sequence (one-letter codes)..." rows="1">${seq || ''}</textarea>
    <button class="remove-btn" title="Remove">&times;</button>
  `;
  div.querySelector('.remove-btn').onclick = () => {
    div.remove();
    if (seqInputsEl.children.length < 2) addSeqInput();
  };
  const ta = div.querySelector('textarea');
  ta.addEventListener('input', () => {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  });
  seqInputsEl.appendChild(div);
  return div;
}

function getSequences() {
  const entries = seqInputsEl.querySelectorAll('.seq-entry');
  const seqs = [];
  entries.forEach(e => {
    const name = e.querySelector('.seq-name').value.trim() || 'Untitled';
    const raw = e.querySelector('textarea').value.toUpperCase().replace(/[^A-Z]/g, '');
    if (raw.length > 0) seqs.push({ name, seq: raw });
  });
  return seqs;
}

/* ─── Needleman-Wunsch global alignment ─── */
function needlemanWunsch(s1, s2, matchScore, mismatchScore, gapScore) {
  const m = s1.length, n = s2.length;
  const W = n + 1;
  const dp = new Float32Array((m + 1) * W);
  const tb = new Uint8Array((m + 1) * W);

  for (let i = 1; i <= m; i++) { dp[i * W] = i * gapScore; tb[i * W] = 1; }
  for (let j = 1; j <= n; j++) { dp[j] = j * gapScore; tb[j] = 2; }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const idx = i * W + j;
      const sc = s1[i - 1] === s2[j - 1] ? matchScore : mismatchScore;
      const diag = dp[(i - 1) * W + (j - 1)] + sc;
      const up   = dp[(i - 1) * W + j] + gapScore;
      const left = dp[i * W + (j - 1)] + gapScore;
      if (diag >= up && diag >= left)      { dp[idx] = diag; tb[idx] = 0; }
      else if (up >= left)                 { dp[idx] = up;   tb[idx] = 1; }
      else                                 { dp[idx] = left; tb[idx] = 2; }
    }
  }

  let a1 = '', a2 = '';
  let i = m, j = n;
  while (i > 0 || j > 0) {
    const idx = i * W + j;
    if (i > 0 && j > 0 && tb[idx] === 0) { a1 = s1[--i] + a1; a2 = s2[--j] + a2; }
    else if (i > 0 && tb[idx] === 1)      { a1 = s1[--i] + a1; a2 = '-' + a2; }
    else                                   { a1 = '-' + a1; a2 = s2[--j] + a2; j; }
  }

  return { aligned1: a1, aligned2: a2, score: dp[m * W + n] };
}

/* ─── Compute stats ─── */
function alignmentStats(a1, a2) {
  let matches = 0, mismatches = 0, gaps = 0;
  for (let i = 0; i < a1.length; i++) {
    if (a1[i] === '-' || a2[i] === '-') gaps++;
    else if (a1[i] === a2[i]) matches++;
    else mismatches++;
  }
  const identity = a1.length > 0 ? (matches / a1.length * 100) : 0;
  const identityNoGaps = (matches + mismatches) > 0 ? (matches / (matches + mismatches) * 100) : 0;
  return { alignLen: a1.length, matches, mismatches, gaps, identity, identityNoGaps };
}

/* ─── Collect mutations (using Seq 1 residue numbering) ─── */
function getMutations(a1, a2) {
  const muts = [];
  let pos1 = 0; // 1-based position in original seq 1
  for (let i = 0; i < a1.length; i++) {
    if (a1[i] !== '-') pos1++;
    if (a1[i] === '-' && a2[i] !== '-') {
      muts.push({ type: 'ins', pos: pos1, from: '-', to: a2[i] });
    } else if (a1[i] !== '-' && a2[i] === '-') {
      muts.push({ type: 'del', pos: pos1, from: a1[i], to: '-' });
    } else if (a1[i] !== a2[i]) {
      muts.push({ type: 'sub', pos: pos1, from: a1[i], to: a2[i] });
    }
  }
  return muts;
}

function formatMutation(m) {
  if (m.type === 'ins') return `ins${m.pos}${m.to}`;
  if (m.type === 'del') return `${m.from}${m.pos}del`;
  return `${m.from}${m.pos}${m.to}`;
}

function esc(s) {
  const d = document.createElement('span');
  d.textContent = s;
  return d.innerHTML;
}

/* ─── Render alignment block (single scrollable row per comparison) ─── */
function renderAlignmentBlock(a1, a2, name1, name2, stats, mutations) {
  const block = document.createElement('div');
  block.className = 'align-block';

  // Header with inline stats
  const header = document.createElement('div');
  header.className = 'align-block-header';
  header.innerHTML = `
    <span class="abh-title">${esc(name2)}</span>
    <span class="abh-stats">
      <span class="abh-stat">${stats.identity.toFixed(1)}% identity</span>
      <span class="abh-stat">${stats.matches} matches</span>
      <span class="abh-stat">${stats.mismatches} mismatches</span>
      <span class="abh-stat">${stats.gaps} gaps</span>
    </span>
  `;
  block.appendChild(header);

  // Scrollable alignment view
  const view = document.createElement('div');
  view.className = 'align-view';

  const table = document.createElement('div');
  table.className = 'align-table';

  // Residue number ruler (Seq 1 numbering)
  table.appendChild(makeRulerRow(a1));

  // Reference row (Seq 1)
  table.appendChild(makeRow(name1, a1, a2, true));

  // Comparison row (Seq N)
  table.appendChild(makeRow(name2, a2, a1, false));

  view.appendChild(table);
  block.appendChild(view);

  // Store data for re-rendering on view toggle
  block._alignData = { a1, a2, name1, name2 };

  // Mutations list — plain text, comma separated
  if (mutations.length > 0) {
    const mutDiv = document.createElement('div');
    mutDiv.className = 'align-mutations';
    const mutLabel = document.createElement('span');
    mutLabel.className = 'mut-label';
    mutLabel.textContent = 'Mutations';
    mutDiv.appendChild(mutLabel);
    const mutText = document.createElement('span');
    mutText.className = 'mut-text';
    mutText.textContent = mutations.map(formatMutation).join(', ');
    mutDiv.appendChild(mutText);
    block.appendChild(mutDiv);
  }

  return block;
}

function makeRulerRow(a1) {
  const row = document.createElement('div');
  row.className = 'align-row ruler-row';
  const lbl = document.createElement('span');
  lbl.className = 'align-label';
  row.appendChild(lbl);
  const chars = document.createElement('span');
  chars.className = 'align-chars';
  let pos1 = 0;
  for (let i = 0; i < a1.length; i++) {
    if (a1[i] !== '-') pos1++;
    const r = document.createElement('span');
    r.className = 'ac-ruler';
    if (a1[i] !== '-' && (pos1 === 1 || pos1 % 10 === 0)) {
      r.textContent = pos1;
    }
    chars.appendChild(r);
  }
  row.appendChild(chars);
  return row;
}

function makeRow(label, seq, other, isRef) {
  const row = document.createElement('div');
  row.className = 'align-row';
  const lbl = document.createElement('span');
  lbl.className = 'align-label';
  lbl.textContent = label;
  lbl.title = label;
  row.appendChild(lbl);
  const chars = document.createElement('span');
  chars.className = 'align-chars';
  for (let i = 0; i < seq.length; i++) {
    const c = document.createElement('span');
    c.className = 'ac';
    const isGap = seq[i] === '-';
    const otherGap = other[i] === '-';
    const match = !isGap && !otherGap && seq[i] === other[i];

    if (viewMode === 'full') {
      // Full: show all letters, green/red/indel color
      c.textContent = seq[i];
      if (isGap)          c.classList.add('ac-gap-full');
      else if (match)     c.classList.add('ac-match-full');
      else                c.classList.add('ac-mismatch-full');
    } else {
      // Compact: ref shows all letters (dim match, highlight diff); cmp shows dot for match
      if (isRef) {
        c.textContent = seq[i];
        if (isGap)            c.classList.add('ac-gap');
        else if (otherGap)    c.classList.add('ac-highlight');
        else if (!match)      c.classList.add('ac-highlight');
        else                  c.classList.add('ac-dim');
      } else {
        if (isGap) {
          c.textContent = '-';
          c.classList.add('ac-gap');
        } else if (match) {
          c.textContent = '\u00b7';
          c.classList.add('ac-same');
        } else {
          c.textContent = seq[i];
          c.classList.add('ac-mismatch');
        }
      }
    }
    chars.appendChild(c);
  }
  row.appendChild(chars);
  return row;
}

/* ─── Re-render all alignment blocks for current viewMode ─── */
function rerenderAlignments() {
  const blocks = alignmentsEl.querySelectorAll('.align-block');
  blocks.forEach(block => {
    const d = block._alignData;
    if (!d) return;
    const view = block.querySelector('.align-view');
    const table = document.createElement('div');
    table.className = 'align-table';
    table.appendChild(makeRulerRow(d.a1));
    table.appendChild(makeRow(d.name1, d.a1, d.a2, true));
    table.appendChild(makeRow(d.name2, d.a2, d.a1, false));
    view.innerHTML = '';
    view.appendChild(table);
  });
}

function setViewMode(mode) {
  viewMode = mode;
  document.querySelectorAll('.view-toggle button').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  rerenderAlignments();
}

/* ─── Run alignment ─── */
function runAlignment() {
  const seqs = getSequences();
  if (seqs.length < 2) {
    alert('Enter at least 2 sequences to align.');
    return;
  }

  const matchS = parseFloat(document.getElementById('matchScore').value) || 1;
  const mismatchS = parseFloat(document.getElementById('mismatchScore').value) || -1;
  const gapS = parseFloat(document.getElementById('gapScore').value) || -2;

  // Lengths summary
  lengthsEl.innerHTML = '';
  seqs.forEach(s => {
    const tag = document.createElement('span');
    tag.className = 'len-tag';
    tag.innerHTML = `<strong>${esc(s.name)}</strong> ${s.seq.length} aa`;
    lengthsEl.appendChild(tag);
  });

  statsGridEl.innerHTML = '';
  alignmentsEl.innerHTML = '';

  // All comparisons against Seq 1 (baseline)
  const base = seqs[0];
  for (let j = 1; j < seqs.length; j++) {
    const { aligned1, aligned2 } = needlemanWunsch(
      base.seq, seqs[j].seq, matchS, mismatchS, gapS
    );
    const stats = alignmentStats(aligned1, aligned2);
    const mutations = getMutations(aligned1, aligned2);
    alignmentsEl.appendChild(
      renderAlignmentBlock(aligned1, aligned2, base.name, seqs[j].name, stats, mutations)
    );
  }

  resultsEl.style.display = '';
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─── Load example ─── */
function loadExample() {
  seqInputsEl.innerHTML = '';
  EXAMPLES.forEach(ex => {
    const div = addSeqInput(ex.name, ex.seq);
    const ta = div.querySelector('textarea');
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  });
}

/* ─── Init ─── */
document.getElementById('alignBtn').onclick = runAlignment;
document.getElementById('addSeqBtn').onclick = () => addSeqInput();
document.getElementById('exampleBtn').onclick = loadExample;

addSeqInput();
addSeqInput();
