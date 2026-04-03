# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Coding guidelines
Don't save to /tmp. Save to a tmp dir in the project repo

## Project Overview

Protein Melody Player — a static web app that converts protein amino acid sequences into music. Four mapping strategies assign the 20 standard amino acids to notes (chromatic C4–G5 or pentatonic C3–A6). Supports melody playback, real-time keyboard input, harmony mode (binding contacts play simultaneously), compose mode (build sequences with bigram-guided suggestions and fold via ESMFold), and 3D structure visualization.

## Running

Open `index.html` directly in a browser. No build step, no bundler, no npm. Vanilla JS + Web Audio API. Deployed to GitHub Pages via `.github/workflows/deploy.yml` on push to main.

## External Dependencies

- **3Dmol.js** — loaded from CDN (`<script>` in index.html), used for 3D protein visualization with pLDDT coloring.
- **ESMFold API** (`https://api.esmatlas.com/foldSequence/v1/pdb/`) — called in compose mode to predict structure from sequence.

## Architecture

All JS is loaded via `<script>` tags in index.html in dependency order:

1. **aa_mapping.js** — Data layer. Exports globals: `MAPPINGS` (4 mapping configs), `AM` (active aa→note map), `AN` (aa→full name), `GR` (aa→property group), `GC` (group→color config), `FR` (note→Hz), `HP` (hydrophobic set), `HY` (Kyte-Doolittle hydrophobicity scale), `COMPLEXES` (2 binding pair definitions with contacts), `A3` (3-letter codes), `AB` (blurbs). The `setMapping(id)` function switches the active mapping.
2. **aa_structures.js** — 2D chemical structure data and SVG renderers. Exports: `SC` (side-chain atom/bond data), `renderStructSVG()`, `renderSideChainSVG()`.
3. **aa_bigrams.js** — Bigram transition matrix and Chou-Fasman propensities. Exports: `AA_ORDER`, `BG` (20×20 dipeptide probability matrix), `HELIX_PROP`, `SHEET_PROP`, `getTop4(lastAA)` (top 4 suggested next residues).
4. **pdb_data.js** — Pre-downloaded PDB structures as raw strings. Exports: `PDB_DATA` (keyed by PDB ID: 1YCR, 4INS, 1ZVH, 4HHB, 1CAG, 6M0J).
5. **player.js** — All application logic (~1000 lines): audio synthesis (`playNote`, `playChord`), playback sequencing with secondary-structure rhythm, piano rendering, keyboard input, compose mode (with ESMFold + 3Dmol viewer), preset/harmony UI, info panel. Depends on globals from all above files.

## Key Design Patterns

- State is in module-level variables in player.js (e.g., `seq`, `playing`, `composing`, `compSeq`, `activeMapping`, `activeComplex`, `contactMap`, `rhythmEnabled`).
- Audio uses Web Audio API oscillators with multi-partial synthesis (harmonics 1–4 + sub-octave). Hydrophobic residues get longer sustain via Kyte-Doolittle scale (`hySustain()`).
- Harmony mode overlays a second voice at interface contact positions when a binding complex is selected.
- Secondary-structure rhythm adapts time signature: helix = 3/4 waltz, strand = 4/4 march, coil = free tempo.
- Compose mode shows glowing piano keys for top-4 suggested next residues (bigram + propensity blend). Sequences ≥20 aa can be folded via ESMFold and viewed in 3Dmol.js.
- Variable names are terse: `AM` = amino acid map, `NA` = note-to-amino-acid reverse map, `NI` = note index, `WN`/`BN` = white/black notes, `KB` = keyboard bindings, `PS` = presets, `GR` = group, `GC` = group colors, `BG` = bigram matrix, `HY` = hydrophobicity.
