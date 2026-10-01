// Storyboard v3 (light & calm launch, after the Numtera reference): frames + board.  node v3/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { C, D, S, M, W, H, T, TS, R, Ln, G, ML, ctx, wrap } from '../lib.mjs';
import { FRAMES, ACTS } from './frames.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = d => { const p = path.join(here, 'out', d); fs.mkdirSync(p, { recursive: true }); return p; };
const doc = (w, h, defs, body) => `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>\n`;
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const tc = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const END = 90;
FRAMES.forEach((f, i) => { f.n = i + 1; f.id = `w${String(f.n).padStart(2, '0')}`; f.dur = (FRAMES[i + 1]?.t ?? END) - f.t; });
const actName = a => ACTS.find(x => x[0] === a)[1];

function frameBody(f) {
  const c = ctx(f.id);
  const body = f.art(c) + ML(48, H - 36, `V3 · Shot ${String(f.n).padStart(2, '0')} — ${f.title}`, { size: 13 }) + ML(W - 48, H - 36, `${tc(f.t)} · ${f.dur.toFixed(1)} s · ${actName(f.act)}`, { size: 13, anchor: 'end' });
  return { defs: c.defs.join(''), body };
}
for (const f of FRAMES) { const b = frameBody(f); fs.writeFileSync(path.join(out('frames'), `${f.id}-${slug(f.title)}.svg`), doc(W, H, b.defs, b.body)); }

const PW = 1920, PH = 1820, pages = [];
const header = (n, label) => R(0, 0, PW, PH, { fill: C.bg }) +
  TS(80, 74, [['br'], ['e', { fill: C.green }], ['w']], { f: D, w: 800, size: 40, ls: -1 }) + ML(200, 68, 'Launch film · Storyboard v3 · light & calm cut', { size: 14, ls: 3 }) +
  ML(PW - 80, 68, `${label}   ${String(n).padStart(2, '0')}`, { size: 14, ls: 3, anchor: 'end' }) + Ln(80, 104, PW - 80, 104, { stroke: C.line2 });
const para = (x, y, text, max, o = {}) => wrap(text, max).map((l, i) => T(x, y + i * (o.lh || 24), l, { f: S, size: o.size || 17, fill: o.fill || C.t2 })).join('');

// Cover
{
  let b = header(1, 'Cover');
  b += ML(80, 220, 'brew · ~90-second launch film · modelled on "Numtera" by ObiN Studio', { size: 16, ls: 3, fill: C.green });
  b += ['Calm, bright,', 'and built on the product.'].map((l, i) => T(80, 400 + i * 132, l, { f: D, w: 700, size: 120, ls: -4, fill: i ? C.green : C.text })).join('');
  b += ML(80, 680, `~90 s · 16:9 · ${FRAMES.length} shots · light stage with dark emphasis beats`, { size: 16 });
  [['What we took from the reference', 'Typed one-line captions with a caret · a text-selection highlight · big single words pulling out of motion blur · the logo landing between "Meet" and the name · light-theme product UI in perspective with heavy depth of field · a split screen hero (light card, dark monospace system panel) · a { braced } phrase morphing into a progress bar and then a card header · a [ bracketed ] payoff the camera flies through · macro shots of single form fields · numbered steps building one at a time · ending on dark with a typed tagline and CTA.'],
   ['What we changed for brew', 'Blue becomes brew green and teal. The off-white paper is brew\'s own text colour (#F2F2F0 family). The reference\'s brackets become brew\'s viewfinder brackets, so the payoff device is the logo itself. Copy is brew\'s: "Stop assembling videos", "watched by people", "We hand you the video", "Your first video is free".'],
   ['Facts kept accurate', 'Pipeline stages, nine languages (EN DE FR ES PT IT PL ID DA), the 15-point review, three days, first video free, "Send us a script" CTA. brew Studio screens are a proposed light-theme UI built from the site\'s tokens.']]
    .forEach(([k, v], i) => { const y = 800 + i * 270; b += ML(80, y, k, { size: 14, ls: 3, fill: C.green }) + para(80, y + 44, v, 118, { size: 24, lh: 34 }); });
  pages.push({ name: 'p01-cover', body: b, defs: '' });
}

// Pacing: reference flow vs v3
{
  let b = header(2, 'Pacing vs reference');
  b += T(80, 220, 'Flow & velocity', { f: D, w: 700, size: 72, ls: -2 });
  b += para(80, 280, 'Read from the reference\'s 1 fps preview frames (YouTube blocked the full stream). Section lengths are accurate to about ±1 s; speeds are inferred from motion blur and from how much each frame changes.', 130, { size: 20, lh: 30, fill: C.t3 });
  const X0 = 80, XW = PW - 160, sx = t => X0 + XW * t / 95;
  const lane = (y, label, secs, dark) => {
    let s = ML(X0, y - 24, label, { size: 13, fill: C.green });
    for (let t = 0; t <= 95; t += 5) s += Ln(sx(t), y + 96, sx(t), y + 104, { stroke: C.line2 }) + (t % 10 === 0 ? T(sx(t), y + 124, tc(t), { f: M, size: 12, fill: C.t3, anchor: 'middle' }) : '');
    dark.forEach(([a, z]) => { s += R(sx(a), y, sx(z) - sx(a), 14, { fill: C.text, op: 0.9 }); });
    s += R(X0, y, XW, 14, { stroke: C.line2 });
    secs.forEach(([a, z, name], i) => {
      s += R(sx(a) + 1, y + 24, sx(z) - sx(a) - 2, 60, { r: 6, fill: [C.coral, C.amber, C.green, C.teal][i % 4], fop: 0.16, stroke: [C.coral, C.amber, C.green, C.teal][i % 4] });
      const wpx = sx(z) - sx(a), fs = wpx < 140 ? 12 : 15;
      const lines = wrap(name, Math.max(5, Math.floor((wpx - 14) / (fs * 0.52))));
      s += lines.slice(0, 2).map((l, k) => T(sx(a) + 7, y + 46 + k * (fs + 5), l, { f: S, size: fs, fill: C.text })).join('');
    });
    return s;
  };
  b += lane(440, 'Reference (Numtera) · 95 s', [[0, 8, 'Problem, typed'], [8, 11, 'Stop → Meet'], [11, 17, 'Logo + positioning'], [17, 20, 'Reveal'], [20, 51, 'Feature 1: card → 6 s system panel → { learning } → knowledge'], [51, 77, 'Feature 2: menu → macro form → steps built one by one'], [77, 87, 'Contrast + logo'], [87, 95, 'Dark: tagline + CTA']],
    [[23, 29], [40, 44], [50, 54], [87, 95]]);
  b += lane(700, 'brew v3 · 90 s', [[0, 8.5, 'Problem, typed'], [8.5, 12, 'Stop → assembling'], [12, 19, 'Meet [mark] brew + line'], [19, 22, 'Reveal'], [22, 52, 'We make it: topic → 6 s production panel → { frame by frame } → [ a finished file ]'], [52, 71.5, 'You drive it: menu → macro shot field → takes → UGC steps → languages'], [71.5, 81.5, 'Contrast + logo'], [81.5, 90, 'Dark: tagline + CTA']],
    [[26.5, 32.5], [41.5, 45.5], [50, 54.5], [81.5, 90]]);
  b += ML(80, 900, 'Light/dark strip: white blocks above each lane mark the dark beats', { size: 12 });
  b += ML(80, 990, 'Velocity rules (apply to every shot)', { size: 14, ls: 3, fill: C.green });
  [['Type', 'Captions type at ~10 characters/s, hold 1.5–2 s once complete. One line on screen at a time.'],
   ['Big words', 'Arrive in ≤ 6 frames with directional blur, hold ~1 s, leave the same way. Only "Stop", "Meet", "Delivered", "And".'],
   ['Product UI', 'Never cut mid-feature. Slow continuous camera, ~3–5% push per second; cursor travels ~600 px/s with ease-in-out; one click every 1–2 s.'],
   ['Transitions', 'Focus pulls and blur dissolves of 0.3–0.5 s; shape morphs (phrase → bar → card header, brackets fly-through) of ~0.5 s.'],
   ['Holds', 'The system panel and the step builder are the longest beats (5–6 s). The film breathes there; about a third of the runtime is calm UI building.'],
   ['Music', 'Starts under "Meet". Thins to a pad for the review beat, returns for "You drive it", resolves on the logo and holds through the CTA.']]
    .forEach(([k, v], i) => { const y = 1050 + i * 108; b += T(80, y, k, { f: S, w: 600, size: 26 }) + para(340, y, v, 100, { size: 22, lh: 32 }); });
  pages.push({ name: 'p02-pacing', body: b, defs: '' });
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
    b += T(x, ny, String(f.n).padStart(2, '0'), { f: M, w: 500, size: 26, fill: C.green }) + T(x + 52, ny, f.title, { f: D, w: 700, size: 26, ls: -0.5 }) +
      T(x + AW, ny, `${tc(f.t)} · ${f.dur.toFixed(1)} s`, { f: M, size: 14, fill: C.t3, anchor: 'end' });
    ny += 36;
    for (const [lab, key] of [['Visual', 'visual'], ['Motion', 'motion'], ['VO', 'vo'], ['SFX', 'sfx'], ['Next', 'next']]) {
      const lines = wrap(f[key], 86);
      b += ML(x, ny, lab, { size: 11, fill: key === 'vo' ? C.green : C.t3 }) + lines.map((l, k) => T(x + 90, ny + k * 22, l, { f: S, size: 16, fill: key === 'vo' ? C.text : C.t2 })).join('');
      ny += lines.length * 22 + 8;
    }
  });
  pages.push({ name: `p${String(n).padStart(2, '0')}-shots-${set[0].n}-${set[set.length - 1].n}`, body: b, defs });
}
for (const pg of pages) fs.writeFileSync(path.join(out('board'), `${pg.name}.svg`), doc(PW, PH, pg.defs, pg.body));
console.log(`v3 frames: ${FRAMES.length}, pages: ${pages.length}`);
