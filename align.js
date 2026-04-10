'use strict';

const EXAMPLES = [
  { name: 'Human insulin', seq: 'MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN' },
  { name: 'Mouse insulin', seq: 'MALLVHFLPLLALLALWEPKPTQAFVKQHLCGPHLVEALYLVCGERGFFYTPKSRREVEDPQVEQLELGGSPGDLQTLALEVARQKRGIVDQCCTSICSLYQLENYCN' },
  { name: 'Pig insulin',   seq: 'MALWTRLLPLLALLALWAPAPAQAFVNQHLCGSHLVEALYLVCGERGFFYTPKARREVEGPQVGALELAGGPGAGGLEGPPQKRGIVEQCCASVCSLYQLENYCN' },
];

/* ─── State ─── */
let viewMode = 'full'; // 'compact' or 'full'
let parsedSeqs = [];    // stored after alignment for renaming

/* ─── DOM refs ─── */
const seqInputEl = document.getElementById('seqInput');
const resultsEl = document.getElementById('results');
const lengthsEl = document.getElementById('lengths');
const statsGridEl = document.getElementById('statsGrid');
const alignmentsEl = document.getElementById('alignments');

/* ─── Parse textarea ───
   Supports:
   1. Plain sequences, one per line
   2. FASTA (>name on its own line, sequence on following lines)
   3. TSV/CSV (name<tab>sequence or name,sequence per line — e.g. pasted from a spreadsheet)
*/
function getSequences() {
  const text = seqInputEl.value.trim();
  if (!text) return [];
  const lines = text.split('\n');
  const hasFasta = lines.some(l => l.trim().startsWith('>'));

  if (hasFasta) {
    // FASTA: >name header, then sequence lines until next header
    const entries = [];
    let current = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('>')) {
        if (current) entries.push(current);
        current = { name: trimmed.slice(1).trim(), buf: '' };
      } else if (current) {
        current.buf += trimmed.toUpperCase().replace(/[^A-Z]/g, '');
      }
    }
    if (current) entries.push(current);
    return entries.filter(e => e.buf).map((e, i) => ({ name: e.name || 'Seq ' + (i + 1), seq: e.buf }));
  }

  // Check for TSV/CSV: does any non-empty line contain a tab or comma with letters on both sides?
  const hasTsv = lines.some(l => /\t/.test(l.trim()));
  const hasCsv = !hasTsv && lines.some(l => {
    const parts = l.trim().split(',');
    return parts.length === 2 && parts[0].trim() && /[A-Za-z]/.test(parts[1]);
  });

  if (hasTsv || hasCsv) {
    const sep = hasTsv ? '\t' : ',';
    const seqs = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const idx = trimmed.indexOf(sep);
      if (idx !== -1) {
        const name = trimmed.slice(0, idx).trim();
        const raw = trimmed.slice(idx + 1).trim().toUpperCase().replace(/[^A-Z]/g, '');
        if (raw) seqs.push({ name: name || 'Seq ' + (seqs.length + 1), seq: raw });
      } else {
        const raw = trimmed.toUpperCase().replace(/[^A-Z]/g, '');
        if (raw) seqs.push({ name: 'Seq ' + (seqs.length + 1), seq: raw });
      }
    }
    return seqs;
  }

  // Plain: one sequence per non-empty line
  const seqs = [];
  let count = 0;
  for (const line of lines) {
    const raw = line.trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (raw) { count++; seqs.push({ name: 'Seq ' + count, seq: raw }); }
  }
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
  parsedSeqs = seqs;

  const matchS = parseFloat(document.getElementById('matchScore').value) || 1;
  const mismatchS = parseFloat(document.getElementById('mismatchScore').value) || -1;
  const gapS = parseFloat(document.getElementById('gapScore').value) || -2;

  // Lengths summary with editable names
  renderLengths();

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
    const block = renderAlignmentBlock(aligned1, aligned2, base.name, seqs[j].name, stats, mutations);
    block._seqIdx = j; // track which comparison sequence
    alignmentsEl.appendChild(block);
  }

  resultsEl.style.display = '';
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─── Render lengths bar with editable names ─── */
function renderLengths() {
  lengthsEl.innerHTML = '';
  parsedSeqs.forEach((s, i) => {
    const tag = document.createElement('span');
    tag.className = 'len-tag';
    const nameEl = document.createElement('input');
    nameEl.className = 'len-name';
    nameEl.value = s.name;
    nameEl.size = Math.max(s.name.length, 4);
    nameEl.addEventListener('input', () => {
      nameEl.size = Math.max(nameEl.value.length, 4);
      renameSeq(i, nameEl.value);
    });
    tag.appendChild(nameEl);
    const span = document.createElement('span');
    span.textContent = ` ${s.seq.length} aa`;
    tag.appendChild(span);
    lengthsEl.appendChild(tag);
  });
}

/* ─── Rename a sequence and update all labels ─── */
function renameSeq(idx, newName) {
  parsedSeqs[idx].name = newName;
  // Update alignment block headers and row labels
  const blocks = alignmentsEl.querySelectorAll('.align-block');
  blocks.forEach(block => {
    const d = block._alignData;
    if (!d) return;
    // Seq 0 (baseline) name appears in all blocks as name1
    if (idx === 0) d.name1 = newName;
    // Comparison seq name
    if (block._seqIdx === idx) {
      d.name2 = newName;
      block.querySelector('.abh-title').textContent = newName;
    }
    // Re-render the alignment rows to update labels
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

/* ─── Load example ─── */
function loadExample() {
  seqInputEl.value = EXAMPLES.map(ex => `>${ex.name}\n${ex.seq}`).join('\n');
}

/* ─── Init ─── */
document.getElementById('alignBtn').onclick = runAlignment;
document.getElementById('exampleBtn').onclick = loadExample;

// Support URL parameters: ?seq1=...&name1=...&seq2=...&name2=...
const urlParams = new URLSearchParams(window.location.search);
const urlSeq1 = urlParams.get('seq1');
const urlSeq2 = urlParams.get('seq2');
if (urlSeq1 && urlSeq2) {
  const parts = [];
  parts.push(`>${urlParams.get('name1') || 'Seq 1'}\n${urlSeq1}`);
  parts.push(`>${urlParams.get('name2') || 'Seq 2'}\n${urlSeq2}`);
  seqInputEl.value = parts.join('\n');
  setTimeout(runAlignment, 100);
}
