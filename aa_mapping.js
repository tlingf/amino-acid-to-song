/*
 * Amino Acid ↔ Note Mapping
 *
 * Each of the 20 standard amino acids is mapped to one chromatic semitone
 * across two octaves (C4–G5). The mapping follows residue size / polarity
 * order so that the melody roughly tracks physicochemical properties.
 *
 * AM  — one-letter AA code → note  (e.g. G → C4)
 * AN  — one-letter AA code → full name
 * GR  — one-letter AA code → property group key
 * GC  — group key → colour / label config
 * HP  — set of hydrophobic residues
 * FR  — note → frequency (Hz, equal temperament A4=440)
 */

/* Amino acid → note */
const AM = {
  G: 'C4',   A: 'C#4',  V: 'D4',   P: 'D#4',  L: 'E4',
  I: 'F4',   M: 'F#4',  S: 'G4',   T: 'G#4',  F: 'A4',
  C: 'A#4',  N: 'B4',   Q: 'C5',   Y: 'C#5',  H: 'D5',
  K: 'D#5',  W: 'E5',   D: 'F5',   E: 'F#5',  R: 'G5'
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
