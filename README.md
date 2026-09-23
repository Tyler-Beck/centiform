# Centiform

100 hand-authored HTML design systems in one static gallery. Each design is one fictional product, place or organisation, built in the language of one source medium (a lightbox of Kodachrome slides, a split-flap board, a Persian miniature folio, a 1-bit desktop). No two designs share a font, a layout skeleton or a motif.

## Browse it online

<https://tyler-beck.github.io/centiform/>

Served by GitHub Pages from `main` at the site root. Every design is reachable from the rail, and each one also opens alone at `https://tyler-beck.github.io/centiform/designs/NNN-slug/index.html`.

## Open it locally

Open `index.html` in a browser. No server, no build, no network. It also works from any static server (`python3 -m http.server`).

- The left rail lists the 100 designs in 10 families. Each entry shows its number, name and 4-colour palette anchor.
- The URL hash holds the selection (`#042-nouveau-whiplash`). Back and Forward walk through the designs you viewed.
- Keys (when focus is in the rail): `j` / `k` or arrow keys for next and previous, `/` to filter, `Escape` to clear the filter, `f` to hide the rail, `o` to open the design alone in a new tab. After you click inside a design, keys go to the design; click the rail to get them back.
- Each design also opens alone at `designs/NNN-slug/index.html`.

## Layout

```
index.html            the shell (the only entry point)
designs.js            manifest: window.CENTIFORM, 100 entries
shell/                shell CSS and JS, planned.html placeholder
designs/NNN-slug/     one self-contained design: index.html + fonts/ (+ optional img/)
tools/check.mjs       node tools/check.mjs  (no dependencies)
tools/fonts.mjs       vendors Fontsource fonts into one design (see tools/fonts.md)
FONTS-LICENSES.md     one row per font family
AGENTS.md             quality rules for every worker
```

## Rules in short

- A design folder never loads a file from outside itself, and never loads anything from the network.
- The shell never styles or scripts a design. The stage iframe has no `sandbox` attribute, so self-hosted fonts work on static hosts.
- `node tools/check.mjs` must exit 0 before any merge.

The design registry and the full rules are in `AGENTS.md`.
