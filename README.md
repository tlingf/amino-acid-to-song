# Protein Melody Player

Turn protein sequences into music. Each of the 20 standard amino acids is mapped to a chromatic note across two octaves (C4-G5), so any amino acid sequence becomes a playable melody.

## How it works

Amino acids are assigned to notes so that simple AAs (linear/small side chains) land on white keys, complex AAs (rings, sulfur, cyclic) on black keys, with common AAs in octave 4 and rare AAs in octave 5. Binding pairs form consonant intervals. The mapping is defined in [`aa_mapping.js`](aa_mapping.js) and can be edited independently.

| Group | Residues | Notes | Colour |
|---|---|---|---|
| Aliphatic | G A V P L I M | G4, D4, E4, D#4, C4, B4, F#4 | Orange |
| Polar | S T C N Q | A4, D5, F#5, E5, G5 | Green |
| Aromatic | F Y W | C#4, G#4, C#5 | Purple |
| Basic (+) | H K R | D#5, C5, A#4 | Red-orange |
| Acidic (-) | D E | F5, F4 | Blue |

Hydrophobic residues (G, A, V, P, L, I, M, F, W) are labeled with "HP" on the piano keys.

## Files

- **`protein_melody_player_local.html`** — Standalone version. Open directly in a browser. Includes dark mode support (follows system preference).
- **`index.html`** — Same player, intended for embedding or deployment.
- **`protein_melody_player_v3.html`** — Embeddable fragment (no `<html>`/`<body>` wrapper). Expects CSS custom properties from a parent page.
- **`aa_mapping.js`** — Amino acid to note/frequency/property mappings, shared by the HTML files. Edit this file to change the musical mapping.

## Usage

1. Open `protein_melody_player_local.html` in a browser.
2. Pick a preset protein or paste your own amino acid sequence (one-letter codes).
3. Press **play** to hear the melody, or use your computer keyboard to play notes directly.

### Keyboard layout

Bottom row plays white keys, top row plays black keys (sharps):

```
 W  E     T  Y  U     O  P     ]
A  S  D  F  G  H  J  K  L  ;  '  \
C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5 G5
```

Multiple keys can be held simultaneously. The info bar displays the full amino acid name(s) for all currently held notes.

## Presets

- **trp-cage** — Smallest known folding protein (20 aa)
- **ubiquitin** — N-terminus of the molecular degradation tag (20 aa)
- **insulin B** — B-chain of the blood sugar hormone (20 aa)
- **VHH CDR3** — Nanobody antigen-binding loop (13 aa)

## Dark mode

`protein_melody_player_local.html` automatically follows your system light/dark preference via `prefers-color-scheme`.
