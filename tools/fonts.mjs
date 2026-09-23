#!/usr/bin/env node
// Vendor Fontsource woff2 files into one design folder, at authoring time only.
//
//   node tools/fonts.mjs designs/NNN-slug        sync one design
//   node tools/fonts.mjs --all                   sync every design that has a marker
//
// The design's <style> holds the font list in a marker comment:
//
//   /* @fonts: Cutive Mono:400:block; Caveat:600,700 */
//   ...generated @font-face rules...
//   /* @fonts-end */
//
// Each item is Family:weights[:display[:latin]]. Weights are 400, 700, 400i (italic),
// or "var" / "var-wdth" for @fontsource-variable axes. display is block or swap
// (default swap). The flag "latin" keeps only latin and latin-ext files.
// The script reads every character in index.html, downloads only the Fontsource
// files whose unicode-range covers a used character, rewrites the rules between
// the markers, removes unused font files, and adds license lines to FONTS-LICENSES.md.
// See tools/fonts.md.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CDN = "https://cdn.jsdelivr.net/npm";
const MARK = /\/\* @fonts:([^*]*)\*\/[\s\S]*?\/\* @fonts-end \*\//;

const slugOf = (fam) => fam.toLowerCase().replace(/ /g, "-");

function parseRange(s) {
  return s.split(",").map((p) => p.trim().replace(/^U\+/i, "")).filter(Boolean).map((p) => {
    if (p.includes("?")) return [parseInt(p.replace(/\?/g, "0"), 16), parseInt(p.replace(/\?/g, "F"), 16)];
    const [a, b] = p.split("-");
    return [parseInt(a, 16), parseInt(b || a, 16)];
  });
}

function parseCss(css) {
  const out = [];
  for (const m of css.matchAll(/@font-face\s*{([^}]*)}/g)) {
    const b = m[1];
    const get = (k) => (b.match(new RegExp(k + ":\\s*([^;]+);")) || [])[1];
    const src = get("src");
    const file = src && (src.match(/url\(\.\/files\/([^)]+\.woff2)\)/) || [])[1];
    if (!file) continue;
    out.push({
      family: get("font-family").replace(/['"]/g, ""),
      style: get("font-style"),
      weight: get("font-weight"),
      range: get("unicode-range") || null,
      file,
      format: /woff2-variations/.test(src) ? "woff2-variations" : "woff2",
    });
  }
  return out;
}

async function get(url, bin) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(r.status + " " + url);
      return bin ? Buffer.from(await r.arrayBuffer()) : await r.text();
    } catch (e) {
      if (i === 3) throw e;
      await new Promise((ok) => setTimeout(ok, 500 * (i + 1)));
    }
  }
}

async function syncDesign(dir) {
  const file = path.join(dir, "index.html");
  let html = fs.readFileSync(file, "utf8");
  const m = html.match(MARK);
  if (!m) return console.log(`${path.basename(dir)}: no @fonts marker, skipped`);
  const specs = m[1].split(";").map((s) => s.trim()).filter(Boolean);
  const bodyText = html.replace(MARK, "");
  const used = new Set([...bodyText].map((c) => c.codePointAt(0)));
  const fontsDir = path.join(dir, "fonts");
  fs.mkdirSync(fontsDir, { recursive: true });
  const keep = new Set();
  const rules = [];
  const lic = [];
  for (const spec of specs) {
    const [family, weights, display = "swap", flag] = spec.split(":").map((s) => s.trim());
    const id = slugOf(family);
    for (const w of weights.split(",").map((s) => s.trim())) {
      const variable = w.startsWith("var");
      const italic = w.endsWith("i");
      let url;
      if (variable) {
        const axis = w.split("-")[1];
        url = `${CDN}/@fontsource-variable/${id}/${axis ? axis : "index"}${italic ? "-italic" : ""}.css`;
      } else {
        url = `${CDN}/@fontsource/${id}/${parseInt(w)}${italic ? "-italic" : ""}.css`;
      }
      const css = await get(url);
      if (!css) throw new Error(`no Fontsource css at ${url}`);
      const pkg = variable ? `@fontsource-variable/${id}` : `@fontsource/${id}`;
      const faces = parseCss(css).filter((f) => {
        if (flag === "latin" && !/-latin(-ext)?-/.test(f.file)) return false;
        if (!f.range) return true;
        return parseRange(f.range).some(([a, b]) => {
          for (const c of used) if (c >= a && c <= b) return true;
          return false;
        });
      });
      if (!faces.length) throw new Error(`${family} ${w}: no file covers the used text`);
      for (const f of faces) {
        const dest = path.join(fontsDir, f.file);
        if (!fs.existsSync(dest)) {
          const buf = await get(`${CDN}/${pkg}/files/${f.file}`, true);
          if (!buf) throw new Error("missing " + f.file);
          fs.writeFileSync(dest, buf);
        }
        keep.add(f.file);
        rules.push(
          `@font-face{font-family:"${family}";font-style:${f.style};font-weight:${f.weight};font-display:${display};` +
            `src:url(fonts/${f.file}) format("${f.format}");${f.range ? `unicode-range:${f.range.replace(/\s+/g, "")};` : ""}}`
        );
      }
    }
    lic.push(family);
  }
  for (const f of fs.readdirSync(fontsDir)) if (!keep.has(f)) fs.unlinkSync(path.join(fontsDir, f));
  if (!fs.readdirSync(fontsDir).length) fs.rmdirSync(fontsDir);
  html = html.replace(MARK, `/* @fonts: ${specs.join("; ")} */\n${rules.join("\n")}\n/* @fonts-end */`);
  fs.writeFileSync(file, html);
  await addLicenses(path.basename(dir), lic);
  let bytes = 0;
  for (const f of keep) bytes += fs.statSync(path.join(fontsDir, f)).size;
  console.log(`${path.basename(dir)}: ${keep.size} files, ${(bytes / 1024).toFixed(0)} KB`);
}

const meta = {};
async function addLicenses(design, families) {
  const lf = path.join(ROOT, "FONTS-LICENSES.md");
  let t = fs.readFileSync(lf, "utf8");
  for (const fam of families) {
    const id = slugOf(fam);
    if (t.includes(`| ${fam} |`)) continue;
    meta[id] ??= await (await fetch(`https://api.fontsource.org/v1/fonts/${id}`)).json();
    t = t.trimEnd() + `\n| ${fam} | ${meta[id].license} | https://fontsource.org/fonts/${id} | ${design} |\n`;
  }
  fs.writeFileSync(lf, t);
}

const args = process.argv.slice(2);
const dirs = args[0] === "--all"
  ? fs.readdirSync(path.join(ROOT, "designs")).filter((d) => /^\d{3}-/.test(d)).map((d) => path.join(ROOT, "designs", d))
  : args.map((a) => path.resolve(a));
if (!dirs.length) {
  console.error("usage: node tools/fonts.mjs designs/NNN-slug [...] | --all");
  process.exit(2);
}
for (const d of dirs) if (fs.existsSync(path.join(d, "index.html"))) await syncDesign(d);
