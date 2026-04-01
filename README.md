# Protein Melody Player

Turn protein sequences into music. Each of the 20 standard amino acids is mapped to a chromatic note across two octaves (C4–G5), so any amino acid sequence becomes a playable melody. When two proteins bind, their contacting residues play simultaneously as harmony.

## How it works

Amino acids are assigned to notes so that simple AAs (linear/small side chains) land on white keys, complex AAs (rings, sulfur, cyclic) on black keys. Three mappings are available:

- **Complexity** — ordered by side-chain complexity (G→K)
- **Complexity (harmony)** — same ladder, but black keys placed so binding pairs (salt bridges, aromatics) produce consonant intervals
- **Frequency** — common AAs in octave 4, rare in octave 5

The mapping is defined in [`aa_mapping.js`](aa_mapping.js) and can be edited independently.

| Group | Residues | Colour |
|---|---|---|
| Aliphatic | G A V P L I M | Orange |
| Polar | S T C N Q | Green |
| Aromatic | F Y W | Purple |
| Basic (+) | H K R | Red-orange |
| Acidic (−) | D E | Blue |

## Files

- **`index.html`** — HTML skeleton
- **`styles.css`** — all styling
- **`aa_mapping.js`** — amino acid → note/frequency/property mappings + binding complex data
- **`aa_structures.js`** — 2D structure data and SVG renderers
- **`player.js`** — application logic (audio, playback, rendering, keyboard)

## Usage

1. Open `index.html` in a browser.
2. Pick a preset protein or paste your own amino acid sequence (one-letter codes).
3. Press **play** to hear the melody, or use your computer keyboard to play notes directly.

### Keyboard layout

Bottom row plays white keys, top row plays black keys (sharps):

```
 W  E     T  Y  U     O  P     ]
A  S  D  F  G  H  J  K  L  ;  '  \
C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5 G5
```

Multiple keys can be held simultaneously.

## Presets

- **trp-cage** — Smallest known folding protein (20 aa)
- **ubiquitin** — N-terminus of the molecular degradation tag (20 aa)
- **insulin B** — B-chain of the blood sugar hormone (20 aa)
- **VHH CDR3** — Nanobody antigen-binding loop (13 aa)

## Harmony — binding pairs

Select a protein–protein complex to hear harmony. The full chain A sequence plays as melody; at interface contact positions (residues within ~6 Å), the partner residue from chain B plays simultaneously.

- **p53–MDM2** (PDB: 1YCR) — tumor suppressor binds MDM2's hydrophobic cleft; F19, W23, L26 anchor the interaction
- **Insulin dimer** (PDB: 4INS) — B-chain self-associates via aromatic stacking of F24, F25, Y26
- **GCN4 zipper** (PDB: 2ZTA) — leucine zipper coiled-coil; Leu residues interdigitate every 7 residues with Glu–Lys salt bridges
- **Barnase–Barstar** (PDB: 1BRS) — tightest known enzyme–inhibitor pair (Kd ~10⁻¹⁴ M); Asp–Arg salt bridges dominate

Contact data is pre-computed from published crystallographic structures and stored in [`aa_mapping.js`](aa_mapping.js). Selecting a harmony complex auto-switches to the "Complexity (harmony)" mapping tuned for consonant binding-pair intervals.
