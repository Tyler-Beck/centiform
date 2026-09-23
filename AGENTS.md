# Centiform: rules for every worker

This file holds the ship rules. Section 5 of the Centiform blueprint is copied below verbatim.
Project layout: `index.html` (shell), `designs.js` (manifest, single source of truth), `shell/`, `designs/NNN-slug/` (one self-contained design per folder), `tools/check.mjs` (run `node tools/check.mjs`, must exit 0), `tools/fonts.mjs` and `tools/fonts.md` (vendor fonts).

## 5. Quality bar and anti-slop rules (paste into every ship brief)

### 5.1 Definition of "stunning" for this project

A design passes only if a designer who knows the source medium would recognise it in 3 seconds from a screenshot with the text blurred. The thesis must show in the structure (grid, shapes, motion), not only in colour and font.

### 5.2 Hard rules

**Originality**
- Build exactly the registry row: subject, format, thesis, fonts, palette anchor, layout grammar, motif. Do not merge in ideas from other rows.
- The page must not have the default SaaS skeleton: centred hero with a headline, a sub-line and two buttons, then a 3-card feature row, then logos, then pricing. If the format is `landing`, invent the structure from the medium (a tuning dial, a drawer, a handscroll).
- Banned as defaults: Inter, Poppins, Montserrat, Roboto, Space Grotesk, Playfair Display, Fraunces; purple-to-blue gradients; glassmorphism cards (only 030 may use frosted glass, because it is a glasshouse); `border-radius: 12px-16px` on everything; drop shadows `0 4px 6px rgba(0,0,0,.1)`; emoji as icons; Heroicons/Lucide-style outline icons; lorem ipsum; "Acme"; "Get started"; "Unlock", "Elevate", "Seamless", "Empower".
- Icons, if any, are drawn for this design in inline SVG in its own style.
- Copy: 150-600 words of specific, invented, in-world text (names, dates, prices, measurements). No filler. No meta text about design ("This design explores...") on the page. The registry thesis appears only in the shell info strip.

**Typography**
- Only the registry fonts. Set a type scale on `:root` with at least 5 steps from a stated ratio or a stated historical system (point sizes for the broadsheet, tile units for the station).
- Body text 16-21px on desktop, line length 45-80 characters, line-height 1.35-1.7 for text. Display sizes use `clamp()`.
- Use real typographic detail where the medium had it: small caps via the font, `font-variant-numeric: tabular-nums` for tables, hanging punctuation or optical margin where relevant, true quotes and dashes in copy (the copy may use en dashes for ranges).
- No faux bold or faux italic: only load and use weights that exist.

**Colour**
- Tokens on `:root`: at least `--bg`, `--ink`, `--accent-1`, `--accent-2`, plus the design's own names. The anchors from the registry must be present exactly.
- Text contrast at least 4.5:1 for body and 3:1 for large display text. Exceptions only where the medium needs it (the 1-bit and four-shade designs must still pass on their text).

**Layout and spacing**
- A stated spacing unit on `:root` (for example `--u: 8px`, or a tatami module). All margins and gaps are multiples.
- Full viewport on first paint at 1440x900 and at 390x844. The first screen is composed, not a header plus empty space. No horizontal scroll at any width from 360px up.
- Must work from 360px to 2560px wide. At large widths, the composition scales or frames itself; it does not become a thin centred column with empty sides, unless the thesis is emptiness (010, 023).

**Motion**
- Motion must come from the medium: flaps flip, needles slide, phosphor fades, clay steps at 12fps. No generic fade-up-on-scroll for every block.
- At most 2 motion ideas per design. CSS first; JS only for what CSS cannot do. `requestAnimationFrame` only; stop loops when `document.hidden`.
- Wrap all non-essential motion in `@media (prefers-reduced-motion: no-preference)`.
- No layout shift after load. No scroll-jacking except where the registry grammar is scroll-driven (056, 091, 096, 030, 051), and even then native scroll must still work.

**Craft and code**
- One `index.html` per design; inline `<style>` and `<script>`. Semantic HTML (`header`, `main`, `section`, `nav`, `figure`, `table` for tables). Every interactive element is a real `button` or `a` with a visible focus style in the design's own language.
- Zero console errors and zero failed requests (check in DevTools).
- Page title: `Name . Centiform`.

### 5.3 Self-review the worker runs before handing off each design

1. Blur test: screenshot at 1440x900, look at it small. Is the medium obvious?
2. Swap test: could this layout hold a different registry row with only a colour and font change? If yes, the grammar is too generic. Redo the structure.
3. Neighbour test: open the 3 palette neighbours from `check.mjs` and every design already done in the same family. No shared layout skeleton, hero shape, or motif.
4. Detail test: name 3 details a specialist in the source medium would notice (for example registration marks, grout lines, film-edge codes). If there are fewer than 3, add them.
5. Mobile test at 390x844: still composed, still recognisable, no overflow.
6. `node tools/check.mjs` passes.

### 5.4 Review gate per ship

- The worker screenshots each design at 1440x900 and 390x844 with `chrome-devtools-axi` and puts the files in the firstmate task data folder (not in the repo), then lists them in the PR body with the self-review answers.
- Reviewer (captain for the pilot, firstmate after) opens the gallery and checks: registry fidelity, the 5.2 rules, and a side-by-side against palette neighbours and against all done designs of the same format.
- Rejection reasons are written as a single line per design; the same ship fixes them before merge.
