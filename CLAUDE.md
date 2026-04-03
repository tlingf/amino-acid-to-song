# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Protein Melody Player — a static web app that converts protein amino acid sequences into music. Each of the 20 standard amino acids maps to a chromatic note (C4–G5). Supports melody playback, real-time keyboard input, and harmony mode where protein–protein binding contacts play simultaneously.

## Running

Open `index.html` directly in a browser. No build step, no bundler, no dependencies. Pure vanilla JS + Web Audio API.

## Architecture

All JS is loaded via `<script>` tags in index.html in dependency order:

1. **aa_mapping.js** — Data layer. Exports globals: `MAPPINGS` (array of mapping configs), `AM` (active aa→note map), `AN` (aa→full name), `GR` (aa→property group), `GC` (group→color config), `FR` (note→Hz), `HP` (hydrophobic set), `COMPLEXES` (binding pair data), `A3` (3-letter codes), `AB` (abbreviations). The `setMapping(id)` function switches the active mapping.
2. **aa_structures.js** — 2D chemical structure data and SVG renderers. Exports: `SC` (side-chain atom/bond data), `renderStructSVG()`, `renderSideChainSVG()`.
3. **player.js** — All application logic: audio synthesis (`playNote`, `playChord`), playback sequencing, piano rendering, keyboard input handling, preset/harmony UI, info panel. Depends on globals from the first two files.

## Key Design Patterns

- State is in module-level variables in player.js (e.g., `seq`, `playing`, `activeMapping`, `activeComplex`, `contactMap`).
- Audio uses Web Audio API oscillators with multi-partial synthesis (not samples).
- Harmony mode overlays a second voice at interface contact positions when a protein complex is selected.
- Variable names are terse: `AM` = amino acid map, `NA` = note-to-amino-acid reverse map, `NI` = note index, `WN`/`BN` = white/black notes, `KB` = keyboard bindings, `PS` = presets, `GR` = group, `GC` = group colors.
