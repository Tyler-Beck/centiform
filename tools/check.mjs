#!/usr/bin/env node
// Centiform checks. Run: node tools/check.mjs [--quiet]   (no dependencies; exits 1 on any failure)
// --quiet hides the palette-neighbour list.
// Rules: blueprint sections 3.2 (isolation), 3.4 (budgets), 3.5, 5.2 (banned defaults).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DES = path.join(ROOT, "designs");
const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

// 1. Manifest
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "designs.js"), "utf8"), ctx);
const D = ctx.window.CENTIFORM || [];
if (D.length !== 100) fail("designs.js", `expected 100 entries, found ${D.length}`);
const seen = new Set();
D.forEach((d, i) => {
  if (d.n !== i + 1) fail("designs.js", `entry ${i} has n=${d.n}, expected ${i + 1}`);
  if (!new RegExp(`^${String(d.n).padStart(3, "0")}-[a-z0-9-]+$`).test(d.slug)) fail("designs.js", `bad slug ${d.slug}`);
  if (seen.has(d.slug)) fail("designs.js", `duplicate slug ${d.slug}`);
  seen.add(d.slug);
  if (!["planned", "done"].includes(d.status)) fail(d.slug, `bad status ${d.status}`);
  if (!Array.isArray(d.swatch) || d.swatch.length !== 4) fail(d.slug, "swatch needs 4 colours");
});
const folders = fs.existsSync(DES) ? fs.readdirSync(DES).filter((f) => fs.statSync(path.join(DES, f)).isDirectory()) : [];
for (const f of folders) if (!seen.has(f)) fail("designs/", `folder ${f} has no manifest entry`);

// Shell rule: the stage iframe never gets a sandbox attribute.
for (const f of ["index.html", "shell/shell.js"]) {
  if (/sandbox/i.test(fs.readFileSync(path.join(ROOT, f), "utf8"))) fail(f, "the stage iframe must not use sandbox");
}

const walk = (dir) => fs.readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  return fs.statSync(p).isDirectory() ? walk(p) : [p];
});

const BANNED_FONTS = /\b(Inter|Poppins|Roboto|Montserrat|Space Grotesk|Playfair Display|Fraunces)\b/;
const BANNED_WORDS = /\b(lorem|ipsum|acme|john doe|get started|unlock|elevate|seamless|empower)\b/i;
const fontOwner = new Map();
const done = D.filter((d) => d.status === "done");

for (const d of done) {
  const dir = path.join(DES, d.slug);
  const file = path.join(dir, "index.html");
  if (!fs.existsSync(file)) { fail(d.slug, "status done but index.html is missing"); continue; }
  const html = fs.readFileSync(file, "utf8");
  const where = d.slug;

  // 2. Document basics and tokens
  if (!/^<!doctype html>/i.test(html)) fail(where, "missing <!doctype html> at the top");
  if (!/<html[^>]*\slang="[^"]+"/i.test(html)) fail(where, "missing <html lang>");
  if (!/<meta charset=/i.test(html)) fail(where, "missing <meta charset>");
  if (!/<meta name="viewport"/i.test(html)) fail(where, "missing <meta name=viewport>");
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1];
  if (!title) fail(where, "missing <title>");
  else if (title !== `${d.title} · Centiform`) fail(where, `title should be "${d.title} · Centiform", found "${title}"`);
  const root = html.match(/:root\s*{([^}]*)}/);
  const props = root ? (root[1].match(/--[\w-]+\s*:/g) || []).length : 0;
  if (props < 6) fail(where, `:root needs at least 6 custom properties, found ${props}`);
  for (const c of d.swatch) if (!html.toLowerCase().includes(c.toLowerCase())) fail(where, `palette anchor ${c} is not used`);

  // 3. Isolation: every reference stays inside this folder
  const refs = [];
  for (const re of [/\s(?:src|href|xlink:href|poster|action)\s*=\s*"([^"]*)"/gi, /\s(?:src|href)\s*=\s*'([^']*)'/gi,
    /url\(\s*['"]?([^'")]*)['"]?\s*\)/gi, /@import\s+['"]([^'"]+)['"]/gi, /fetch\(\s*['"`]([^'"`]*)/gi, /import\(\s*['"`]([^'"`]*)/gi]) {
    for (const m of html.matchAll(re)) refs.push(m[1].trim());
  }
  for (const r of refs) {
    if (!r || r.startsWith("#") || r.startsWith("data:") || r.includes("${")) continue;
    if (/^([a-z]+:|\/\/|\/)/i.test(r) || r.includes("..")) { fail(where, `reference leaves the folder: ${r}`); continue; }
    const target = path.join(dir, r.split(/[?#]/)[0]);
    if (!fs.existsSync(target)) fail(where, `reference not found: ${r}`);
  }
  if (/window\.(top|parent)\b|\btop\.location|localStorage|sessionStorage/.test(html)) fail(where, "touches window.top/parent or storage");

  // 4. Fonts: no family is used by two designs
  for (const m of html.matchAll(/@font-face\s*{[^}]*font-family:\s*["']?([^;"']+)["']?/g)) {
    const fam = m[1].trim();
    const owner = fontOwner.get(fam);
    if (owner && owner !== d.slug) fail(where, `font "${fam}" is already used by ${owner}`);
    fontOwner.set(fam, d.slug);
  }

  // 5. Budgets
  const kb = (b) => (b / 1024).toFixed(0) + " KB";
  if (Buffer.byteLength(html) > 120 * 1024) fail(where, `index.html is ${kb(Buffer.byteLength(html))} (max 120 KB)`);
  const files = walk(dir);
  const total = files.reduce((s, f) => s + fs.statSync(f).size, 0);
  if (total > 1.2 * 1024 * 1024) fail(where, `folder is ${kb(total)} (max 1.2 MB)`);
  const fontBytes = files.filter((f) => f.includes(`${path.sep}fonts${path.sep}`)).reduce((s, f) => s + fs.statSync(f).size, 0);
  if (fontBytes > 900 * 1024) fail(where, `fonts/ is ${kb(fontBytes)} (max 900 KB)`);
  for (const f of files) if (/\.(jpe?g|png|webp|gif|avif)$/i.test(f) && fs.statSync(f).size > 150 * 1024) fail(where, `raster over 150 KB: ${path.relative(dir, f)}`);

  // 6. Banned defaults
  for (const m of html.matchAll(/font(?:-family)?\s*:\s*([^;}{]+)/gi)) {
    const b = m[1].match(BANNED_FONTS);
    if (b) fail(where, `banned font in font stack: ${b[1]}`);
  }
  const text = html.replace(/\/\* @fonts:[\s\S]*?@fonts-end \*\//, "");
  const w = text.match(BANNED_WORDS);
  if (w) fail(where, `banned word: "${w[1]}"`);
  if (/\p{Emoji_Presentation}|️/u.test(text)) fail(where, "emoji found");
}

const repoBytes = walk(ROOT).filter((f) => !f.includes(`${path.sep}.git${path.sep}`)).reduce((s, f) => s + fs.statSync(f).size, 0);
if (repoBytes > 60 * 1024 * 1024) fail("repo", `size ${(repoBytes / 1048576).toFixed(1)} MB (max 60 MB)`);

// 7. Palette neighbours (review aid, never fails)
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const pdist = (a, b) => {
  const [A, B] = [a.swatch.map(rgb), b.swatch.map(rgb)];
  const acc = Math.min(...[2, 3].flatMap((i) => [2, 3].map((j) => dist(A[i], B[j]))));
  return dist(A[0], B[0]) + dist(A[1], B[1]) + acc;
};
if (!process.argv.includes("--quiet")) {
  console.log("Palette neighbours (done designs):");
  for (const d of done) {
    const near = done.filter((x) => x !== d).map((x) => [x, pdist(d, x)]).sort((a, b) => a[1] - b[1]).slice(0, 3);
    console.log(`  ${d.slug.padEnd(28)} ${near.map(([x, v]) => `${x.slug.slice(0, 3)} (${v.toFixed(0)})`).join("  ")}`);
  }
}

console.log(`${done.length} / ${D.length} designs done, ${fontOwner.size} font families, repo ${(repoBytes / 1048576).toFixed(1)} MB`);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
console.log("check passed");
