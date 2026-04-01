/*
 * Amino Acid ↔ Note Mapping
 *
 * Each of the 20 standard amino acids is mapped to one chromatic semitone
 * across two octaves (C4–G5). The mapping is designed so that:
 *   1. Common AAs land on white (diatonic) keys, rare AAs on black keys
 *   2. Salt-bridge pairs (K↔D, K↔E, R↔D, R↔E) form perfect 5ths/4ths
 *   3. Aromatic-stacking pairs (F↔Y, F↔W, Y↔W) form 5ths and 3rds
 *   4. Hydrophobic pair L↔V forms a perfect 5th
 *
 * AM  — one-letter AA code → note  (e.g. L → C5)
 * AN  — one-letter AA code → full name
 * GR  — one-letter AA code → property group key
 * GC  — group key → colour / label config
 * HP  — set of hydrophobic residues
 * FR  — note → frequency (Hz, equal temperament A4=440)
 */

/* Amino acid → note */
const AM = {
  D: 'C4',   N: 'C#4',  E: 'D4',   C: 'D#4',  A: 'E4',
  V: 'F4',   F: 'F#4',  K: 'G4',   M: 'G#4',  R: 'A4',
  W: 'A#4',  S: 'B4',   L: 'C5',   Y: 'C#5',  I: 'D5',
  H: 'D#5',  T: 'E5',   P: 'F5',   Q: 'F#5',  G: 'G5'
};

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
