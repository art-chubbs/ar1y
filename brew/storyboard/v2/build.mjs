// Storyboard v2 (cinematic SaaS launch): frame SVGs + board pages.  node v2/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { C, D, S, M, W, H, T, TS, R, Ln, G, ML, ctx, dots, tag, brackets, wrap } from '../lib.mjs';
import { FRAMES, ACTS } from './frames.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = d => { const p = path.join(here, 'out', d); fs.mkdirSync(p, { recursive: true }); return p; };
const doc = (w, h, defs, body) => `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>\n`;
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tc = t => `0:${String(Math.floor(t)).padStart(2, '0')}`;
FRAMES.forEach((f, i) => { f.n = i + 1; f.id = `v${String(f.n).padStart(2, '0')}`; });
const actName = a => ACTS.find(x => x[0] === a)[1];

function frameBody(f) {
  const c = ctx(f.id);
  const body = R(0, 0, W, H, { fill: C.bg }) + dots(c) + f.art(c) +
    ML(48, H - 36, `V2 · Shot ${String(f.n).padStart(2, '0')} — ${f.title}`, { size: 13 }) + ML(W - 48, H - 36, `${tc(f.t)} · ${actName(f.act)}`, { size: 13, anchor: 'end' });
  return { defs: c.defs.join(''), body };
}
for (const f of FRAMES) { const b = frameBody(f); fs.writeFileSync(path.join(out('frames'), `${f.id}-${slug(f.title)}.svg`), doc(W, H, b.defs, b.body)); }

const PW = 1920, PH = 1820, pages = [];
const header = (n, label) => R(0, 0, PW, PH, { fill: C.bg }) +
  TS(80, 74, [['br'], ['e', { fill: C.green }], ['w']], { f: D, w: 800, size: 40, ls: -1 }) + ML(200, 68, 'Launch film · Storyboard v2 · SaaS launch cut', { size: 14, ls: 3 }) +
  ML(PW - 80, 68, `${label}   ${String(n).padStart(2, '0')}`, { size: 14, ls: 3, anchor: 'end' }) + Ln(80, 104, PW - 80, 104, { stroke: C.line2 });
const para = (x, y, text, max, o = {}) => wrap(text, max).map((l, i) => T(x, y + i * (o.lh || 24), l, { f: S, size: o.size || 17, fill: o.fill || C.t2 })).join('');

{
  let b = header(1, 'Cover');
  b += ML(80, 220, 'brew · 60-second cinematic launch cut · alternative to v1', { size: 16, ls: 3, fill: C.green });
  b += ['The camera lives', 'inside the product.'].map((l, i) => T(80, 400 + i * 132, l, { f: D, w: 700, size: 128, ls: -4, fill: i ? C.green : C.text })).join('');
  b += ML(80, 680, '60 s · 16:9 · 20 shots · 120 BPM, cut on the beat', { size: 16 });
  const pts = [
    ['v1 vs v2', 'v1 tells the story with metaphor (the loop, the freeze). v2 is a product launch: real brew Studio screens, macro shots, camera moves, big statements on the beat. Same brand, same facts, same ending.'],
    ['Camera language', 'Macro (100 mm) on UI details with rack focus; low-angle crane reveals; lateral tracking along the pipeline; isometric glides over the library. Everything feels physical: glass edges catch light, windows cast shadows on a reflective floor.'],
    ['Light', 'Near-black stage. Green key light from below for brew moments; amber, teal and coral rim lights only inside their product scenes (YouTube, b-roll, UGC). Diagonal "aurora" beams from the site sweep the reveal and end card.'],
    ['Rhythm', 'Hook in 6 s. Statements cut on kicks, one word per beat. The music drops to a single pad for the human review (the slowest shot in the film) then rebuilds to the stats and the close.'],
    ['Product UI', 'brew Studio screens here are a proposed design built from the site\'s tokens (New video, In production, Review, Library, Languages, AI b-roll). Swap in the real app UI if one exists.'],
  ];
  pts.forEach(([k, v], i) => { const y = 800 + i * 170; b += ML(80, y, k, { size: 14, ls: 3, fill: C.green }) + para(80, y + 44, v, 120, { size: 24, lh: 34, fill: C.t2 }); });
  pages.push({ name: 'p01-cover', body: b, defs: '' });
}

const AW = 840, AH = AW * 9 / 16, sc = AW / W;
for (let p = 0; p * 4 < FRAMES.length; p++) {
  const set = FRAMES.slice(p * 4, p * 4 + 4), n = pages.length + 1;
  let b = header(n, `Shots ${set[0].n}–${set[set.length - 1].n}`), defs = '';
  set.forEach((f, i) => {
    const x = 80 + (i % 2) * (AW + 80), y = 140 + Math.floor(i / 2) * 840, fb = frameBody(f);
    defs += fb.defs + `<clipPath id="${f.id}-panel"><rect width="${W}" height="${H}" rx="24"/></clipPath>`;
    b += G(`translate(${x} ${y}) scale(${sc})`, G(null, fb.body, { clip: `url(#${f.id}-panel)` })) + R(x, y, AW, AH, { r: 10, stroke: C.line2 });
    let ny = y + AH + 44;
    b += T(x, ny, String(f.n).padStart(2, '0'), { f: M, w: 500, size: 26, fill: C.green }) + T(x + 52, ny, f.title, { f: D, w: 700, size: 28, ls: -0.5 }) +
      T(x + AW, ny, `${tc(f.t)} · ${actName(f.act)}`, { f: M, size: 14, fill: C.t3, anchor: 'end' });
    ny += 36;
    for (const [lab, key] of [['Visual', 'visual'], ['Camera', 'motion'], ['VO', 'vo'], ['SFX', 'sfx'], ['Next', 'next']]) {
      const lines = wrap(f[key], 86);
      b += ML(x, ny, lab, { size: 11, fill: key === 'vo' ? C.green : C.t3 }) + lines.map((l, k) => T(x + 90, ny + k * 22, l, { f: S, size: 16, fill: key === 'vo' ? C.text : C.t2 })).join('');
      ny += lines.length * 22 + 8;
    }
  });
  pages.push({ name: `p${String(n).padStart(2, '0')}-shots-${set[0].n}-${set[set.length - 1].n}`, body: b, defs });
}
for (const pg of pages) fs.writeFileSync(path.join(out('board'), `${pg.name}.svg`), doc(PW, PH, pg.defs, pg.body));
console.log(`v2 frames: ${FRAMES.length}, pages: ${pages.length}`);
