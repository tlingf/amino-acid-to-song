/*
 * Amino Acid ↔ Note Mappings
 *
 * Multiple named mappings, each assigning the 20 standard amino acids to
 * chromatic semitones across two octaves (C4–G5).
 *
 * MAPPINGS — array of { id, name, desc, map } objects
 * AM       — the active aa→note map (mutable, changed by setMapping)
 * AN       — one-letter AA code → full name
 * GR       — one-letter AA code → property group key
 * GC       — group key → colour / label config
 * HP       — set of hydrophobic residues
 * FR       — note → frequency (Hz, equal temperament A4=440)
 */

const MAPPINGS = [
  {
    id: 'complexity',
    name: 'Complexity',
    desc: 'White = complexity ladder (G→K). Black = modification of neighboring white key (e.g. C#4:P next to C4:G, D#4:C next to E4:S).',
    map: {
      G: 'C4',   P: 'C#4',  A: 'D4',   C: 'D#4',  S: 'E4',
      T: 'F4',   M: 'F#4',  V: 'G4',   W: 'G#4',  L: 'A4',
      F: 'A#4',  I: 'B4',   D: 'C5',   Y: 'C#5',  N: 'D5',
      H: 'D#5',  E: 'E5',   Q: 'F5',   R: 'F#5',  K: 'G5'
    }
  },
  {
    id: 'complexity-harmony',
    name: 'Complexity (harmony)',
    desc: 'Same complexity ladder, but black keys placed for binding-pair consonance (salt bridges = perfect fifths/fourths, aromatics = thirds/fourths).',
    map: {
      G: 'C4',   P: 'C#4',  A: 'D4',   C: 'D#4',  S: 'E4',
      T: 'F4',   M: 'F#4',  V: 'G4',   R: 'G#4',  L: 'A4',
      F: 'A#4',  I: 'B4',   D: 'C5',   Y: 'C#5',  N: 'D5',
      H: 'D#5',  E: 'E5',   Q: 'F5',   W: 'F#5',  K: 'G5'
    }
  },
  {
    id: 'frequency',
    name: 'Frequency',
    desc: 'Common AAs on octave 4, rare on octave 5. Simple AAs on white keys, complex on black. Binding pairs harmonized.',
    map: {
      L: 'C4',   F: 'C#4',  A: 'D4',   P: 'D#4',  V: 'E4',
      E: 'F4',   M: 'F#4',  G: 'G4',   Y: 'G#4',  S: 'A4',
      R: 'A#4',  I: 'B4',   K: 'C5',   W: 'C#5',  T: 'D5',
      H: 'D#5',  N: 'E5',   D: 'F5',   C: 'F#5',  Q: 'G5'
    }
  }
];

/* Active mapping (mutable) */
let AM = { ...MAPPINGS[0].map };

function setMapping(id) {
  const m = MAPPINGS.find(m => m.id === id);
  if (!m) return;
  Object.keys(AM).forEach(k => delete AM[k]);
  Object.assign(AM, m.map);
}

/* Amino acid → full name */
const AN = {
  G: 'Glycine',       A: 'Alanine',      V: 'Valine',
  P: 'Proline',       L: 'Leucine',      I: 'Isoleucine',
  M: 'Methionine',    S: 'Serine',       T: 'Threonine',
  F: 'Phenylalanine', C: 'Cysteine',     N: 'Asparagine',
  Q: 'Glutamine',     Y: 'Tyrosine',     H: 'Histidine',
  K: 'Lysine',        W: 'Tryptophan',   D: 'Aspartate',
  E: 'Glutamate',     R: 'Arginine'
};

/* Amino acid → property group */
const GR = {
  G: 'ali', A: 'ali', V: 'ali', P: 'ali', L: 'ali', I: 'ali', M: 'ali',
  S: 'pol', T: 'pol', C: 'pol', N: 'pol', Q: 'pol',
  F: 'aro', Y: 'aro', W: 'aro',
  H: 'pos', K: 'pos', R: 'pos',
  D: 'neg', E: 'neg'
};

/* Group colours & labels */
const GC = {
  ali: { bg: '#FAEEDA', tx: '#633806', bk: '#EF9F27', label: 'Aliphatic (G A V L I P M)' },
  pol: { bg: '#E1F5EE', tx: '#085041', bk: '#1D9E75', label: 'Polar (S T C N Q)' },
  aro: { bg: '#EEEDFE', tx: '#3C3489', bk: '#534AB7', label: 'Aromatic (F Y W)' },
  pos: { bg: '#FAECE7', tx: '#712B13', bk: '#D85A30', label: 'Basic + (H K R)' },
  neg: { bg: '#E6F1FB', tx: '#0C447C', bk: '#378ADD', label: 'Acidic \u2212 (D E)' }
};

/* Hydrophobic residues */
const HP = new Set(['G', 'A', 'V', 'P', 'L', 'I', 'M', 'F', 'W']);

/* Note → frequency (Hz) */
const FR = {
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
  'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
  'A#4': 466.16, 'B4': 493.88, 'C5': 523.25, 'C#5': 554.37, 'D5': 587.33,
  'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99
};
