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
    id: 'binding-chords',
    name: 'Binding chords',
    desc: 'Optimized for harmony: salt bridges (E–K, D–R) land on perfect fifths, hydrophobic contacts (L–I, F–I) on major thirds, aromatics (F–Y) on fifths, H-bonds (T–N, E–H) on minor thirds. Common AAs on octave 4 white keys.',
    map: {
      L: 'C4',   C: 'C#4',  A: 'D4',   W: 'D#4',  I: 'E4',
      V: 'F4',   M: 'F#4',  E: 'G4',   F: 'G#4',  G: 'A4',
      H: 'A#4',  S: 'B4',   D: 'C5',   N: 'C#5',  K: 'D5',
      Y: 'D#5',  T: 'E5',   Q: 'F5',   P: 'F#5',  R: 'G5'
    }
  },
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
    id: 'frequency',
    name: 'Frequency',
    desc: 'Common AAs on octave 4, rare on octave 5. Simple AAs on white keys, complex on black. Binding pairs harmonized.',
    map: {
      L: 'C4',   F: 'C#4',  A: 'D4',   P: 'D#4',  V: 'E4',
      E: 'F4',   M: 'F#4',  G: 'G4',   Y: 'G#4',  S: 'A4',
      R: 'A#4',  I: 'B4',   K: 'C5',   W: 'C#5',  T: 'D5',
      H: 'D#5',  N: 'E5',   D: 'F5',   C: 'F#5',  Q: 'G5'
    }
  },
  {
    id: 'literal',
    name: 'Literal note',
    desc: 'Letter-matched AAs on their namesake note (C→C4, D→D4 …). Remaining AAs grouped by property: aromatics, aliphatics, polars, basic+.',
    map: {
      C: 'C4',   S: 'C#4',  D: 'D4',   T: 'D#4',  E: 'E4',
      F: 'F4',   Y: 'F#4',  G: 'G4',   W: 'G#4',  A: 'A4',
      V: 'A#4',  P: 'B4',   L: 'C5',   I: 'C#5',  M: 'D5',
      N: 'D#5',  Q: 'E5',   H: 'F5',   K: 'F#5',  R: 'G5'
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

/* Note → frequency (Hz) */
const FR = {
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
  'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
  'A#4': 466.16, 'B4': 493.88, 'C5': 523.25, 'C#5': 554.37, 'D5': 587.33,
  'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99
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
    id: 'p53-mdm2',
    name: 'p53–MDM2',
    pdb: '1YCR',
    desc: 'Tumor suppressor p53 binds MDM2\'s hydrophobic cleft — F19, W23, L26 anchor the interaction that controls cell fate',
    chainA: { name: 'p53', seq: 'SQETFSDLWKLLPEN' },
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
  },
  {
    id: 'insulin-dimer',
    name: 'Insulin dimer',
    pdb: '4INS',
    desc: 'Insulin B-chain self-associates — symmetric aromatic stacking of F24, F25, Y26 at the dimer interface',
    chainA: { name: 'Insulin B', seq: 'FVNQHLCGSHLVEALYLVCGERGFFYTPKT' },
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
    id: 'gcn4-zipper',
    name: 'GCN4 zipper',
    pdb: '2ZTA',
    desc: 'Leucine zipper coiled-coil — Leu residues interdigitate every 7 residues; Glu–Lys salt bridges stabilize the dimer',
    chainA: { name: 'GCN4', seq: 'RMKQLEDKVEELLSKNYHLENEVARLKKLVGER' },
    chainB: { name: 'GCN4\u2032' },
    contacts: [
      [1,  'V', 3.9],   // M1→V'   a–a' packing
      [4,  'L', 3.5],   // L4→L'   d–d' leucine zipper
      [5,  'K', 3.8],   // E5→K'   e–g' salt bridge
      [7,  'E', 3.7],   // K7→E'   g–e' salt bridge
      [8,  'V', 3.7],   // V8→V'   a–a' packing
      [11, 'L', 3.4],   // L11→L'  d–d' leucine zipper
      [15, 'N', 4.0],   // N15→N'  a–a' polar layer (Asn–Asn H-bond)
      [18, 'L', 3.3],   // L18→L'  d–d' leucine zipper
      [19, 'K', 3.9],   // E19→K'  e–g' salt bridge
      [22, 'V', 3.6],   // V22→V'  a–a' packing
      [25, 'L', 3.4],   // L25→L'  d–d' leucine zipper
    ]
  },
  {
    id: 'barnase-barstar',
    name: 'Barnase–Barstar',
    pdb: '1BRS',
    desc: 'Tightest known enzyme–inhibitor pair (Kd~10⁻¹⁴ M) — Asp–Arg salt bridges dominate the interface',
    chainA: { name: 'Barstar', seq: 'KKAVINGEQIRSISDLHQTLKKELALPEYYGENLDALWDCLTGWVEYPLVLEWRQFEQSKQLTENGAESVLQVFREAKAEGCDITIILS' },
    chainB: { name: 'Barnase' },
    contacts: [
      [28, 'R', 3.8],   // Y29→R  hydrogen bond
      [33, 'W', 3.7],   // L34→W  hydrophobic packing
      [34, 'R', 2.8],   // D35→R59  key salt bridge
      [37, 'A', 3.6],   // W38→A  hydrophobic
      [38, 'R', 3.0],   // D39→R83  salt bridge
      [41, 'N', 3.2],   // T42→N  hydrogen bond
      [42, 'S', 3.5],   // G43→S  backbone
      [43, 'G', 3.7],   // W44→G  aromatic packing
      [75, 'H', 3.4],   // E76→H102  electrostatic
    ]
  }
];
