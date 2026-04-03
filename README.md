# Protein Melody Player

Turn protein sequences into music. Each of the 20 amino acids maps to a note, so any protein becomes a playable melody. When two proteins bind, their contacting residues play simultaneously as harmony. Compose your own sequences and fold them into 3D structures with ESMFold.

## Usage

Open `index.html` in a browser. No build step or dependencies.

- **Play presets** — select a protein (trp-cage, ubiquitin, insulin, VHH) or paste your own sequence
- **Harmony mode** — pick a binding complex (p53–MDM2, insulin dimer, GCN4 zipper, barnase–barstar) to hear melody + harmony at contact sites
- **Compose mode** — play keys to build a sequence guided by glowing suggestions (bigram statistics + secondary structure propensity). Once you have 20+ residues, fold it with ESMFold and see the 3D structure with pLDDT confidence coloring
- **Keyboard** — bottom row (A S D F...) plays white keys, top row (W E T Y...) plays black keys

## Key mappings

Six mappings available, including chromatic (complexity-ordered, harmony-optimized, frequency-based, literal) and pentatonic. Amino acids are colored by property group: aliphatic (orange), polar (green), aromatic (purple), basic (red), acidic (blue).

## Files

- `index.html` — HTML skeleton
- `styles.css` — all styling
- `aa_mapping.js` — AA → note mappings, property data, binding complexes
- `aa_structures.js` — 2D chemical structure SVG renderers
- `aa_bigrams.js` — bigram transition matrix + Chou-Fasman propensities for compose mode
- `player.js` — audio, playback, rendering, keyboard, composition, ESMFold integration

## Credits

Structure prediction by [ESMFold](https://esmatlas.com) (Lin et al., Science 2023). 3D visualization by [3Dmol.js](https://3dmol.csb.pitt.edu).
