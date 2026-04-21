/*
 * Amino Acid ↔ Note Mappings
 *
 * Multiple named mappings, each assigning the 20 standard amino acids to
 * chromatic semitones across two octaves (C4–G5).
 *
 * MAPPINGS - array of { id, name, desc, map } objects
 * AM       - the active aa→note map (mutable, changed by setMapping)
 * AN       - one-letter AA code → full name
 * GR       - one-letter AA code → property group key
 * GC       - group key → colour / label config
 * HP       - set of hydrophobic residues
 * FR       - note → frequency (Hz, equal temperament A4=440)
 */

const MAPPINGS = [
  {
    id: 'keyboard',
    name: 'AA letters (white keys)',
    type: 'direct',
    layout: 'whiteOnly',
    desc: 'Type amino acid letters directly. Similar AAs share a key (BLOSUM62 ≥ 1, same property group). White keys only, 14 notes from G3 to F5.',
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
    desc: 'C-major pentatonic across 4 octaves, with every interval consonant. Each amino acid gets its own note.',
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
  pol: { bg: '#E1F5EE', tx: '#085041', bk: '#1D9E75', label: 'Polar (S T C N Q)', role: '' },
  aro: { bg: '#EEEDFE', tx: '#3C3489', bk: '#534AB7', label: 'Aromatic (F Y W)', role: '' },
  pos: { bg: '#FAECE7', tx: '#712B13', bk: '#D85A30', label: 'Basic + (H K R)', role: '' },
  neg: { bg: '#E6F1FB', tx: '#0C447C', bk: '#378ADD', label: 'Acidic \u2212 (D E)', role: '' }
};

/* Amino acid → three-letter abbreviation */
const A3 = {
  G: 'Gly', A: 'Ala', V: 'Val', P: 'Pro', L: 'Leu', I: 'Ile', M: 'Met',
  S: 'Ser', T: 'Thr', F: 'Phe', C: 'Cys', N: 'Asn', Q: 'Gln', Y: 'Tyr',
  H: 'His', K: 'Lys', W: 'Trp', D: 'Asp', E: 'Glu', R: 'Arg'
};

/* Amino acid → short description */
const AB = {
  G: 'Smallest amino acid. Extreme flexibility, found in tight turns and loops.',
  A: 'Simple and compact. A helix-lover, the most common residue in α-helices.',
  V: 'Branched and bulky. Prefers buried β-sheets; resists helix formation.',
  P: 'The only cyclic residue. Acts as a structural "kink" that breaks helices and introduces rigid turns.',
  L: 'Long hydrophobic side chain. A workhorse in protein cores and coiled-coils.',
  I: 'Branched at Cβ like Val. Strong β-sheet preference; common in membrane proteins.',
  M: 'Flexible sulfur-containing chain. Often the start codon residue (initiator Met).',
  S: 'Small polar hydroxyl. Frequent phosphorylation site, a key signaling switch.',
  T: 'Polar with a methyl branch. Also a phosphorylation target; common in glycoproteins.',
  F: 'Benzene ring, no hydroxyl. Drives hydrophobic packing; participates in π-stacking.',
  C: 'Thiol side chain. Forms disulfide bonds (S–S) that cross-link and stabilize structure.',
  N: 'Short polar amide. Caps helix ends; common in N-linked glycosylation sites (N-X-S/T).',
  Q: 'Longer polar amide. Participates in coiled-coil "polar layers" and hydrogen-bond networks.',
  Y: 'Phenol ring (aromatic + hydroxyl). Phosphorylation target in kinase signaling cascades.',
  H: 'Imidazole ring, pKa ≈ 6. Switches charge near physiological pH, critical in enzyme catalysis.',
  K: 'Long flexible amine. Ubiquitination and acetylation target; key in histone regulation.',
  W: 'Largest amino acid. Indole ring absorbs UV at 280 nm; anchors membrane-protein interfaces.',
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

/* Note → frequency (Hz) - chromatic C4–G5 + pentatonic C3–A6 */
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
    id: 'insulin-AB',
    name: 'Insulin A\u2194B (intra-hormone)',
    pdb: '4INS',
    pdbChain: 'A',
    pdbStartResi: 1,
    partnerChain: 'B',
    desc: 'Insulin regulates blood sugar by helping cells absorb glucose for energy. It is built from two different chains stitched together by two interchain disulfide bonds (A7\u2013B7 and A20\u2013B19) and a hydrophobic core. Play the A-chain melody and hear the B-chain partner chime in wherever the two halves physically touch inside one insulin molecule.',
    chainA: { name: 'Insulin A', seq: 'GIVEQCCTSICSLYQLENYCN', ss: 'CCCHHHHHHHHCCCCCHHHHC' },
    chainB: { name: 'Insulin B' },
    // [idxA, partnerAA, dist, partnerResi]
    contacts: [
      [1,  'V', 3.7, 12],  // I2  \u2194 V12  hydrophobic core
      [2,  'F', 4.0, 24],  // V3  \u2194 F24
      [6,  'C', 3.0,  7],  // C7  \u2194 C7   interchain disulfide
      [12, 'Y', 3.9, 16],  // L13 \u2194 Y16
      [15, 'L', 4.0, 11],  // L16 \u2194 L11
      [18, 'F', 3.6, 24],  // Y19 \u2194 F24  aromatic stack
      [19, 'C', 3.0, 19],  // C20 \u2194 C19  interchain disulfide
      [20, 'F', 4.5,  1],  // N21 \u2194 F1   C-term \u2194 N-term contact
    ]
  },
  {
    id: 'spike-ace2',
    name: 'Spike\u2013ACE2 (COVID-19)',
    pdb: '6M0J',
    pdbChain: 'E',
    pdbStartResi: 438,
    partnerChain: 'A',
    desc: 'The 70-residue receptor-binding motif (RBM) shown here is the contact zone within the receptor-binding domain, itself a subdomain of the full 1,273-residue spike protein. The SARS-CoV-2 spike protein grabs human cells via the ACE2 receptor: the molecular handshake that started the COVID-19 pandemic. This interface was the bullseye for vaccine design and the mutation site (N501Y, E484K, L452R\u2026) that drove each pandemic wave.',
    chainA: { name: 'Spike RBM', seq: 'SNNLDSKVGGNYNYLYRLFRKSNLKPFERDISTEIYQAGSTPCNGVEGFNCYFPLQSYGFQPTNGVGYQPY', ss: 'CCCCCCCCEEEEEECHHHHCCCCCECCCEEECCCCCHHHCCCCCCCCHHEECCCCCCCCCCECCEECCEEE' },
    chainB: { name: 'ACE2' },
    // indices are 0-indexed into the RBM (seq starts at spike residue S438)
    // [idxA, partnerAA, dist, partnerResi (on ACE2 chain A)]
    contacts: [
      [15, 'H', 3.4,  34],   // Y453 → H34
      [48, 'M', 3.6,  82],   // F486 → M82  hydrophobic
      [49, 'Q', 2.9,  24],   // N487 → Q24  H-bond
      [51, 'Y', 3.5,  83],   // Y489 → Y83  aromatic stack
      [55, 'E', 3.3,  35],   // Q493 → E35  H-bond
      [57, 'K', 3.5, 353],   // Y495 → K353
      [60, 'Y', 3.2,  41],   // Q498 → Y41
      [62, 'D', 3.0, 355],   // T500 → D355 H-bond
      [63, 'Y', 3.1,  41],   // N501 → Y41  (N501Y hotspot)
      [67, 'R', 3.6, 393],   // Y505 → R393
    ]
  },
  {
    id: 'p53-mdm2',
    name: 'p53–MDM2',
    pdb: '1YCR',
    pdbChain: 'B',
    pdbStartResi: 15,
    partnerChain: 'A',
    desc: 'The 15 residues shown are the exact helix from p53\'s transactivation domain that MDM2 grabs to silence it: a peptide fragment of a 393-residue tumor suppressor. p53, the \u201Cguardian of the genome,\u201D triggers cell-cycle arrest or apoptosis in response to DNA damage; MDM2 binds this helix and marks p53 for degradation. p53 is mutated or functionally silenced in the majority of human cancers, making this interface a top drug target: MDM2 inhibitors in clinical trials aim to free p53 and reactivate it.',
    chainA: { name: 'p53', seq: 'SQETFSDLWKLLPEN', ss: 'CCCCHHHHHHHHCCC' },
    chainB: { name: 'MDM2' },
    // [idxA, partnerAA, dist, partnerResi (on MDM2 chain A)]
    contacts: [
      [2,  'K', 4.2,  94],   // E17→K94  salt bridge
      [3,  'H', 3.8,  96],   // T18→H96  hydrogen bond
      [4,  'I', 3.4,  61],   // F19→I61  into hydrophobic pocket
      [5,  'M', 4.0,  62],   // S20→M62
      [6,  'Q', 3.9,  72],   // D21→Q72
      [7,  'F', 3.5,  55],   // L22→F55  hydrophobic
      [8,  'L', 3.1,  54],   // W23→L54  deepest pocket insertion
      [9,  'L', 4.2,  57],   // K24→L57
      [10, 'Y', 3.6, 100],   // L25→Y100
      [11, 'I', 3.3,  99],   // L26→I99  hydrophobic anchor
    ]
  }
];
