# Protein Melody Player

Turn protein sequences into music. Each of the 20 amino acids maps to a note, so any protein becomes a playable melody. When two proteins bind, their contacting residues play simultaneously as harmony. Compose your own sequences and fold them into 3D structures with ESMFold.

## Usage

Open `index.html` in a browser. No build step or dependencies.

- **Play presets**: select a protein (hemoglobin, spike RBM, insulin, VHH nanobody) or paste your own sequence
- **Harmony mode**: pick a binding complex (Spike–ACE2, p53–MDM2) to hear melody + harmony at contact sites
- **Compose mode**: play keys to build a sequence guided by glowing suggestions (bigram statistics + secondary structure propensity). Once you have 20+ residues, fold it with ESMFold and see the 3D structure with pLDDT confidence coloring
- **Keyboard**: bottom row (A S D F...) plays white keys, top row (W E T Y...) plays black keys

## Key mappings

Four mappings available: pentatonic (harmony-optimized), complexity (chromatic), keyboard (direct letter input), and frequency-based. Amino acids are colored by property group: aliphatic (orange), polar (green), aromatic (purple), basic (red), acidic (blue).

## Files

- `index.html`: HTML skeleton
- `styles.css`: all styling
- `aa_mapping.js`: AA → note mappings, property data, binding complexes
- `aa_structures.js`: 2D chemical structure SVG renderers
- `aa_bigrams.js`: bigram transition matrix + Chou-Fasman propensities for compose mode
- `player.js`: audio, playback, rendering, keyboard, composition, ESMFold integration

## Credits

- Structure prediction by [ESMFold](https://esmatlas.com). Lin et al., "Evolutionary-scale prediction of atomic-level protein structure with a language model," *Science* 379, 2023.
- 3D visualization by [3Dmol.js](https://3dmol.csb.pitt.edu). Rego & Koes, *Bioinformatics* 31, 2015.
- Chou-Fasman secondary structure propensities. Chou & Fasman, "Prediction of protein conformation," *Biochemistry* 13(2), 1974.
- Kyte-Doolittle hydrophobicity scale. Kyte & Doolittle, "A simple method for displaying the hydropathic character of a protein," *J Mol Biol* 157(1), 1982.
- Protein structures and binding complex data from the [RCSB Protein Data Bank](https://www.rcsb.org). Berman et al., *Nucleic Acids Res* 28, 2000.
- Bigram transition probabilities are approximate dipeptide frequencies derived from SwissProt/UniProt statistics.
