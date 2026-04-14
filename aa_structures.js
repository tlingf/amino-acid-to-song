/*
 * Amino Acid 2D Structure Data & SVG Rendering
 *
 * mkBB()            - backbone atom/bond template
 * SC                - side-chain atoms & bonds per AA
 * renderStructSVG() - full structure (backbone + side chain) for AA cards
 * renderSideChainSVG() - compact side chain only, for panel reference
 */

function mkBB() {
  return {
    atoms: [
      { x: 10, y: 44, l: 'H₂N', cls: 'N' },
      { x: 42, y: 44, l: 'Cα',  cls: '' },
      { x: 74, y: 44, l: 'C',   cls: '' },
      { x: 74, y: 18, l: 'O',   cls: 'O' },
      { x: 106, y: 44, l: 'OH', cls: 'O' }
    ],
    bonds: [
      { a: 0, b: 1, d: 1 }, { a: 1, b: 2, d: 1 },
      { a: 2, b: 3, d: 2 }, { a: 2, b: 4, d: 1 }
    ]
  };
}

const SC = {
  G: { a: [], b: [] },
  A: { a: [{ x: 42, y: 76, l: 'CH₃' }], b: [{ a: 1, b: 5, d: 1 }] },
  V: { a: [{ x: 42, y: 76, l: 'CH' }, { x: 14, y: 100, l: 'CH₃' }, { x: 70, y: 100, l: 'CH₃' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }, { a: 5, b: 7, d: 1 }] },
  L: { a: [{ x: 42, y: 76, l: 'CH₂' }, { x: 42, y: 106, l: 'CH' }, { x: 14, y: 130, l: 'CH₃' }, { x: 70, y: 130, l: 'CH₃' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }, { a: 6, b: 7, d: 1 }, { a: 6, b: 8, d: 1 }] },
  I: { a: [{ x: 42, y: 76, l: 'CH' }, { x: 14, y: 100, l: 'CH₃' }, { x: 70, y: 100, l: 'CH₂' }, { x: 70, y: 126, l: 'CH₃' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }, { a: 5, b: 7, d: 1 }, { a: 7, b: 8, d: 1 }] },
  P: { a: [{ x: 42, y: 74, l: 'CH₂' }, { x: 18, y: 90, l: 'CH₂' }, { x: 10, y: 62, l: 'CH₂' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }, { a: 6, b: 7, d: 1 }, { a: 7, b: 0, d: 1 }] },
  M: { a: [{ x: 42, y: 76, l: 'CH₂' }, { x: 42, y: 104, l: 'CH₂' }, { x: 42, y: 132, l: 'S', cls: 'S' }, { x: 42, y: 156, l: 'CH₃' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }, { a: 6, b: 7, d: 1 }, { a: 7, b: 8, d: 1 }] },
  S: { a: [{ x: 42, y: 76, l: 'CH₂' }, { x: 42, y: 104, l: 'OH', cls: 'O' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }] },
  T: { a: [{ x: 42, y: 76, l: 'CH' }, { x: 14, y: 100, l: 'OH', cls: 'O' }, { x: 70, y: 100, l: 'CH₃' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }, { a: 5, b: 7, d: 1 }] },
  C: { a: [{ x: 42, y: 76, l: 'CH₂' }, { x: 42, y: 104, l: 'SH', cls: 'S' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }] },
  N: { a: [{ x: 42, y: 76, l: 'CH₂' }, { x: 42, y: 106, l: 'C' }, { x: 14, y: 130, l: 'O', cls: 'O' }, { x: 70, y: 130, l: 'NH₂', cls: 'N' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }, { a: 6, b: 7, d: 2 }, { a: 6, b: 8, d: 1 }] },
  Q: { a: [{ x: 42, y: 76, l: 'CH₂' }, { x: 42, y: 104, l: 'CH₂' }, { x: 42, y: 132, l: 'C' }, { x: 14, y: 156, l: 'O', cls: 'O' }, { x: 70, y: 156, l: 'NH₂', cls: 'N' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }, { a: 6, b: 7, d: 1 }, { a: 7, b: 8, d: 2 }, { a: 7, b: 9, d: 1 }] },
  D: { a: [{ x: 42, y: 76, l: 'CH₂' }, { x: 42, y: 106, l: 'C' }, { x: 14, y: 130, l: 'O', cls: 'O' }, { x: 70, y: 130, l: 'O⁻', cls: 'O' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }, { a: 6, b: 7, d: 2 }, { a: 6, b: 8, d: 1 }] },
  E: { a: [{ x: 42, y: 76, l: 'CH₂' }, { x: 42, y: 104, l: 'CH₂' }, { x: 42, y: 132, l: 'C' }, { x: 14, y: 156, l: 'O', cls: 'O' }, { x: 70, y: 156, l: 'O⁻', cls: 'O' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }, { a: 6, b: 7, d: 1 }, { a: 7, b: 8, d: 2 }, { a: 7, b: 9, d: 1 }] },
  K: { a: [{ x: 42, y: 76, l: 'CH₂' }, { x: 42, y: 100, l: 'CH₂' }, { x: 42, y: 124, l: 'CH₂' }, { x: 42, y: 148, l: 'CH₂' }, { x: 42, y: 172, l: 'NH₃⁺', cls: 'N' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }, { a: 6, b: 7, d: 1 }, { a: 7, b: 8, d: 1 }, { a: 8, b: 9, d: 1 }] },
  R: { a: [{ x: 42, y: 76, l: 'CH₂' }, { x: 42, y: 100, l: 'CH₂' }, { x: 42, y: 124, l: 'CH₂' }, { x: 42, y: 148, l: 'NH', cls: 'N' }, { x: 42, y: 172, l: 'C' }, { x: 14, y: 194, l: 'NH₂', cls: 'N' }, { x: 70, y: 194, l: 'NH₂⁺', cls: 'N' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }, { a: 6, b: 7, d: 1 }, { a: 7, b: 8, d: 1 }, { a: 8, b: 9, d: 1 }, { a: 9, b: 10, d: 1 }, { a: 9, b: 11, d: 2 }] },
  H: { a: [{ x: 42, y: 76, l: 'CH₂' }, { x: 30, y: 104, l: '' }, { x: 54, y: 104, l: '' }, { x: 20, y: 130, l: 'N', cls: 'N' }, { x: 54, y: 130, l: 'C' }, { x: 30, y: 148, l: 'C' }, { x: 50, y: 148, l: 'NH', cls: 'N' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }, { a: 5, b: 7, d: 2 }, { a: 6, b: 8, d: 1 }, { a: 7, b: 9, d: 1 }, { a: 8, b: 10, d: 2 }, { a: 8, b: 11, d: 1 }, { a: 9, b: 11, d: 1 }, { a: 9, b: 10, d: 1 }] },
  F: { a: [{ x: 42, y: 76, l: 'CH₂' }, { x: 42, y: 106, l: '' }, { x: 22, y: 118, l: '' }, { x: 62, y: 118, l: '' }, { x: 22, y: 142, l: '' }, { x: 62, y: 142, l: '' }, { x: 42, y: 154, l: '' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }, { a: 5, b: 7, d: 2 }, { a: 6, b: 8, d: 2 }, { a: 7, b: 9, d: 1 }, { a: 8, b: 10, d: 1 }, { a: 9, b: 11, d: 2 }, { a: 10, b: 11, d: 1 }] },
  Y: { a: [{ x: 42, y: 76, l: 'CH₂' }, { x: 42, y: 106, l: '' }, { x: 22, y: 118, l: '' }, { x: 62, y: 118, l: '' }, { x: 22, y: 142, l: '' }, { x: 62, y: 142, l: '' }, { x: 42, y: 154, l: '' }, { x: 42, y: 176, l: 'OH', cls: 'O' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }, { a: 5, b: 7, d: 2 }, { a: 6, b: 8, d: 2 }, { a: 7, b: 9, d: 1 }, { a: 8, b: 10, d: 1 }, { a: 9, b: 11, d: 2 }, { a: 10, b: 11, d: 1 }, { a: 11, b: 12, d: 1 }] },
  W: { a: [{ x: 42, y: 76, l: 'CH₂' }, { x: 34, y: 104, l: '' }, { x: 20, y: 116, l: '' }, { x: 50, y: 116, l: '' }, { x: 10, y: 140, l: '' }, { x: 34, y: 140, l: '' }, { x: 62, y: 128, l: '' }, { x: 76, y: 140, l: '' }, { x: 62, y: 156, l: '' }, { x: 20, y: 152, l: 'NH', cls: 'N' }], b: [{ a: 1, b: 5, d: 1 }, { a: 5, b: 6, d: 1 }, { a: 5, b: 7, d: 2 }, { a: 6, b: 9, d: 2 }, { a: 7, b: 10, d: 1 }, { a: 9, b: 14, d: 1 }, { a: 7, b: 11, d: 1 }, { a: 11, b: 12, d: 2 }, { a: 12, b: 13, d: 1 }, { a: 10, b: 14, d: 2 }, { a: 10, b: 9, d: 1 }, { a: 13, b: 10, d: 1 }] }
};

/* SVG helpers shared by both renderers */
function _renderBondsSVG(atoms, bonds) {
  let s = '';
  bonds.forEach(b => {
    const a1 = atoms[b.a], a2 = atoms[b.b];
    if (!a1 || !a2) return;
    if (b.d === 2) {
      const dx = a2.x - a1.x, dy = a2.y - a1.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ox = (-dy / len) * 2, oy = (dx / len) * 2;
      s += `<line class="bond" x1="${a1.x + ox}" y1="${a1.y + oy}" x2="${a2.x + ox}" y2="${a2.y + oy}"/>`;
      s += `<line class="bond" x1="${a1.x - ox}" y1="${a1.y - oy}" x2="${a2.x - ox}" y2="${a2.y - oy}"/>`;
    } else {
      s += `<line class="bond" x1="${a1.x}" y1="${a1.y}" x2="${a2.x}" y2="${a2.y}"/>`;
    }
  });
  return s;
}

function _renderAtomsSVG(atoms) {
  let s = '';
  atoms.forEach(a => {
    if (!a.l) return;
    const cls = a.cls ? ` atom-${a.cls}` : '';
    s += `<text class="atom${cls}" x="${a.x}" y="${a.y}">${a.l}</text>`;
  });
  return s;
}

/* Full structure SVG (backbone + side chain) for AA cards */
function renderStructSVG(aa) {
  const bb = mkBB(), sc = SC[aa];
  if (!sc) return '';
  const atoms = [...bb.atoms, ...sc.a];
  const bonds = [...bb.bonds, ...sc.b];
  let maxY = 60;
  atoms.forEach(a => { if (a.y > maxY) maxY = a.y; });
  const h = maxY + 20;
  return `<svg width="120" height="${h}" viewBox="0 0 120 ${h}" xmlns="http://www.w3.org/2000/svg">`
    + _renderBondsSVG(atoms, bonds)
    + _renderAtomsSVG(atoms)
    + '</svg>';
}

/* Compact side-chain-only SVG for the panel reference */
function renderSideChainSVG(aa, maxDim = 50, showLabels = true) {
  const sc = SC[aa];
  if (!sc || !sc.a.length) return '<span style="font-size:9px;color:var(--color-text-tertiary)">H</span>';
  const ca = { x: 42, y: 44, l: 'Cα', cls: '' };
  const atoms = [ca, ...sc.a];
  const bonds = sc.b.map(b => ({ a: b.a === 1 ? 0 : b.a - 4, b: b.b === 1 ? 0 : b.b - 4, d: b.d }));
  let minX = 999, maxX = 0, minY = 999, maxY = 0;
  atoms.forEach(a => { minX = Math.min(minX, a.x); maxX = Math.max(maxX, a.x); minY = Math.min(minY, a.y); maxY = Math.max(maxY, a.y); });
  const pad = 12, vw = maxX - minX + pad * 2, vh = maxY - minY + pad * 2;
  const scale = maxDim / Math.max(vw, vh, 1);
  const sw = Math.round(vw * scale), sh = Math.round(vh * scale);
  const ox = -minX + pad, oy = -minY + pad;
  const atomSVG = showLabels
    ? _renderAtomsSVG(atoms)
    : atoms.map(a => a.cls ? `<circle class="atom-${a.cls}" cx="${a.x}" cy="${a.y}" r="2.5"/>` : '').join('');
  return `<svg width="${sw}" height="${sh}" viewBox="${-ox} ${-oy} ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg">`
    + _renderBondsSVG(atoms, bonds)
    + atomSVG
    + '</svg>';
}
