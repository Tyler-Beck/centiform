# Fonts: how to vendor them

Source: Fontsource packages on jsDelivr. Download at authoring time and commit. Designs never load a font from the network.

- Static: `https://cdn.jsdelivr.net/npm/@fontsource/<family-slug>/files/<family-slug>-<subset>-<weight>-<style>.woff2`
- Variable: `https://cdn.jsdelivr.net/npm/@fontsource-variable/<family-slug>/files/<family-slug>-<subset>-<axis>-normal.woff2`
- Family slug: the family name in lowercase, spaces become hyphens (`IM Fell English SC` becomes `im-fell-english-sc`).

## Use the script

1. Put a marker in the design's `<style>`:

   ```css
   /* @fonts: Cutive Mono:400:block; Caveat:600,700 */
   /* @fonts-end */
   ```

   Each item is `Family:weights[:display[:latin]]`.
   - weights: `400`, `700`, `400i` (italic), `var` (variable, default axes) or `var-wdth` (variable with the width axis).
   - display: `block` for display faces, `swap` for text faces (default `swap`).
   - `latin`: keep only the latin and latin-ext files (use it when a CJK or Arabic family only sets Latin text).
2. Run `node tools/fonts.mjs designs/NNN-slug`.
   The script reads every character in `index.html`, downloads only the Fontsource files whose `unicode-range` covers a used character (latin, latin-ext, or the numbered CJK slices), writes the `@font-face` rules between the markers, removes font files that are no longer used, and adds a row to `FONTS-LICENSES.md`.
3. Run it again after you change the copy of a CJK, Arabic or Devanagari design, so that new glyphs get their files.
4. `node tools/fonts.mjs --all` syncs every design.

## Rules

- Only the weights and styles the design uses. No faux bold or faux italic.
- Keep each design's `fonts/` under 900 KB. `node tools/check.mjs` enforces this and the rule that no family appears in two designs.
- The script keeps a numbered CJK slice only when it covers a used character that the latin files and earlier slices do not. Every character in the file counts, including `$` and backticks in scripts.
- CJK slices are 50-90 KB each. If the text family of a CJK design only sets Latin, give it the `latin` flag, and keep the set of distinct CJK characters small.
