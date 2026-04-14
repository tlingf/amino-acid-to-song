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
    id: 'keyboard',
    name: 'AA letters (white keys)',
    type: 'direct',
    layout: 'whiteOnly',
    desc: 'Type amino acid letters directly — similar AAs share a key (BLOSUM62 ≥ 1, same property group). White keys only, 14 notes from G3 to F5.',
    map: {
      W: 'G3',
      H: 'A3',
      P: 'B3',
      G: 'C4',
      F: 'D4',  Y: 'D4',
      A: 'E4',
      V: 'F4',  I: 'F4',
      L: 'G4',  M: 'G4',
      K: 'A4',  R: 'A4',
      D: 'B4',  E: 'B4',
      S: 'C5',  T: 'C5',
      N: 'D5',
      Q: 'E5',
      C: 'F5'
    }
  },
  {
    id: 'pentatonic-harmony',
    name: 'AA letters (pentatonic)',
    type: 'direct',
    layout: 'pentatonic',
    desc: 'C-major pentatonic across 4 octaves — every interval is consonant. Each amino acid gets its own note.',
    map: {
      P: 'C3',  F: 'D3',  H: 'E3',  M: 'G3',  W: 'A3',
      L: 'C4',  A: 'D4',  V: 'E4',  G: 'G4',  I: 'A4',
      E: 'C5',  D: 'D5',  Y: 'E5',  K: 'G5',  R: 'A5',
      S: 'C6',  T: 'D6',  N: 'E6',  Q: 'G6',  C: 'A6'
    }
  },
  {
    id: 'complexity-harmony',
    name: 'Piano keyboard',
    sub: 'ordered by complexity',
    layout: 'chromatic',
    desc: 'Complexity ladder with black keys for binding-pair consonance (salt bridges = perfect fifths/fourths, aromatics = thirds/fourths).',
    map: {
      G: 'C4',   P: 'C#4',  A: 'D4',   C: 'D#4',  S: 'E4',
      T: 'F4',   M: 'F#4',  V: 'G4',   R: 'G#4',  L: 'A4',
      F: 'A#4',  I: 'B4',   D: 'C5',   Y: 'C#5',  N: 'D5',
      H: 'D#5',  E: 'E5',   Q: 'F5',   W: 'F#5',  K: 'G5'
    }
  },
  {
    id: 'frequency',
    name: 'Piano keyboard',
    sub: 'ordered by frequency',
    layout: 'chromatic',
    desc: 'Common AAs on octave 4, rare on octave 5. Simple AAs on white keys, complex on black.',
    map: {
      L: 'C4',   F: 'C#4',  A: 'D4',   P: 'D#4',  V: 'E4',
      E: 'F4',   M: 'F#4',  G: 'G4',   Y: 'G#4',  S: 'A4',
      R: 'A#4',  I: 'B4',   K: 'C5',   W: 'C#5',  T: 'D5',
      H: 'D#5',  N: 'E5',   D: 'F5',   C: 'F#5',  Q: 'G5'
    }
  },
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
  ali: { bg: '#FAEEDA', tx: '#633806', bk: '#EF9F27', label: 'Nonpolar Aliphatic (G A V L I P M)', role: 'Bury deep; water-repelling (hydrophobic)' },
  pol: { bg: '#E1F5EE', tx: '#085041', bk: '#1D9E75', label: 'Polar (S T C N Q)', role: 'H-bonds & signaling switches' },
  aro: { bg: '#EEEDFE', tx: '#3C3489', bk: '#534AB7', label: 'Aromatic (F Y W)', role: 'Ring-stacking & UV absorption' },
  pos: { bg: '#FAECE7', tx: '#712B13', bk: '#D85A30', label: 'Basic + (H K R)', role: 'Positive charge; bind DNA' },
  neg: { bg: '#E6F1FB', tx: '#0C447C', bk: '#378ADD', label: 'Acidic \u2212 (D E)', role: 'Negative charge; bind metals' }
};

/* Amino acid → three-letter abbreviation */
const A3 = {
  G: 'Gly', A: 'Ala', V: 'Val', P: 'Pro', L: 'Leu', I: 'Ile', M: 'Met',
  S: 'Ser', T: 'Thr', F: 'Phe', C: 'Cys', N: 'Asn', Q: 'Gln', Y: 'Tyr',
  H: 'His', K: 'Lys', W: 'Trp', D: 'Asp', E: 'Glu', R: 'Arg'
};

/* Amino acid → short description */
const AB = {
  G: 'Smallest amino acid. Extreme flexibility — found in tight turns and loops.',
  A: 'Simple and compact. A helix-lover — the most common residue in α-helices.',
  V: 'Branched and bulky. Prefers buried β-sheets; resists helix formation.',
  P: 'The only cyclic residue. Acts as a structural "kink" — breaks helices and introduces rigid turns.',
  L: 'Long hydrophobic side chain. A workhorse in protein cores and coiled-coils.',
  I: 'Branched at Cβ like Val. Strong β-sheet preference; common in membrane proteins.',
  M: 'Flexible sulfur-containing chain. Often the start codon residue (initiator Met).',
  S: 'Small polar hydroxyl. Frequent phosphorylation site — a key signaling switch.',
  T: 'Polar with a methyl branch. Also a phosphorylation target; common in glycoproteins.',
  F: 'Benzene ring, no hydroxyl. Drives hydrophobic packing; participates in π-stacking.',
  C: 'Thiol side chain. Forms disulfide bonds (S–S) that cross-link and stabilize structure.',
  N: 'Short polar amide. Caps helix ends; common in N-linked glycosylation sites (N-X-S/T).',
  Q: 'Longer polar amide. Participates in coiled-coil "polar layers" and hydrogen-bond networks.',
  Y: 'Phenol ring — aromatic + hydroxyl. Phosphorylation target in kinase signaling cascades.',
  H: 'Imidazole ring, pKa ≈ 6. Switches charge near physiological pH — critical in enzyme catalysis.',
  K: 'Long flexible amine. Ubiquitination and acetylation target; key in histone regulation.',
  W: 'Largest amino acid. Indole ring absorbs UV at 280 nm — anchors membrane-protein interfaces.',
  D: 'Short acidic carboxyl. Chelates metal ions (Ca²⁺, Mg²⁺); common in enzyme active sites.',
  E: 'Longer acidic carboxyl. Strong helix former; prominent in salt bridges with Arg/Lys.',
  R: 'Guanidinium group, always charged. Forms bidentate salt bridges; reads DNA in the major groove.'
};

/* Hydrophobic residues */
const HP = new Set(['G', 'A', 'V', 'P', 'L', 'I', 'M', 'F', 'W']);

/* Kyte-Doolittle hydrophobicity scale (higher = more hydrophobic) */
const HY = {
  I: 4.5, V: 4.2, L: 3.8, F: 2.8, C: 2.5, M: 1.9, A: 1.8,
  G: -0.4, T: -0.7, S: -0.8, W: -0.9, Y: -1.3, P: -1.6,
  H: -3.2, D: -3.5, E: -3.5, N: -3.5, Q: -3.5, K: -3.9, R: -4.5
};

/* Note → frequency (Hz) — chromatic C4–G5 + pentatonic C3–A6 */
const FR = {
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
  'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
  'A#4': 466.16, 'B4': 493.88, 'C5': 523.25, 'C#5': 554.37, 'D5': 587.33,
  'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99,
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  'A5': 880.00, 'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'G6': 1567.98, 'A6': 1760.00
};

/*
 * Protein–Protein Binding Complexes (pre-computed from PDB structures)
 *
 * Each complex has two chains. Chain A plays as the primary melody.
 * At interface contact positions (residues within ~6 Å), the partner
 * residue from chain B plays simultaneously as harmony.
 *
 * contacts: [[indexInChainA, partnerAA_oneLetter, distance_Å], ...]
 */
const COMPLEXES = [
  {
    id: 'insulin-dimer',
    name: 'Insulin dimer',
    pdb: '4INS',
    desc: 'Insulin molecules naturally pair up when stored in the pancreas. This self-pairing controls how quickly insulin is released into the blood. Understanding this interface is how scientists engineered fast-acting insulins that millions of diabetics depend on daily.',
    chainA: { name: 'Insulin B', seq: 'FVNQHLCGSHLVEALYLVCGERGFFYTPKT', ss: 'CCCCCCCCHHHHHHHHHHHHCCCEEECCCC' },
    chainB: { name: 'Insulin B\u2032' },
    contacts: [
      [12, 'E', 4.8],   // E13→E13' weak electrostatic
      [13, 'A', 4.2],   // A14→A14'
      [16, 'L', 3.9],   // L17→L17' hydrophobic
      [23, 'F', 3.5],   // F24→F24' aromatic stacking
      [24, 'F', 3.4],   // F25→F25' aromatic stacking
      [25, 'Y', 3.6],   // Y26→Y26' aromatic–hydroxyl
    ]
  },
  {
    id: 'p53-mdm2',
    name: 'p53–MDM2',
    pdb: '1YCR',
    desc: 'p53 is the "guardian of the genome" — it tells damaged cells to stop growing or self-destruct. MDM2 keeps p53 in check by binding and silencing it. In over half of all cancers, this balance is broken. Cancer drugs are being designed to block this exact handshake and reactivate p53.',
    chainA: { name: 'p53', seq: 'SQETFSDLWKLLPEN', ss: 'CCCCHHHHHHHHCCC' },
    chainB: { name: 'MDM2' },
    contacts: [
      [2,  'K', 4.2],   // E17→K94  salt bridge
      [3,  'H', 3.8],   // T18→H96  hydrogen bond
      [4,  'I', 3.4],   // F19→I61  into hydrophobic pocket
      [5,  'M', 4.0],   // S20→M62
      [6,  'Q', 3.9],   // D21→Q72
      [7,  'F', 3.5],   // L22→F55  hydrophobic
      [8,  'L', 3.1],   // W23→L54  deepest pocket insertion
      [9,  'L', 4.2],   // K24→L57
      [10, 'Y', 3.6],   // L25→Y100
      [11, 'I', 3.3],   // L26→I99  hydrophobic anchor
    ]
  }
];
