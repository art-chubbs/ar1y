// Storyboard v4 ("night glass", after the NeuraFlow film by Zelios): frames + board.  node v4/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { C, D, S, M, W, H, T, TS, R, Ln, Ci, G, ML, ctx, wrap } from '../lib.mjs';
import { FRAMES, ACTS, END } from './frames.mjs';
import { N, lg, rg, blurU, fx, beam, horizon, dust, grid, nightBg, glass, glassChip, pillBtn, orb, lightLine, headline, mark, logo, sparkle, icon, studio, tw } from './kit.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = d => { const p = path.join(here, 'out', d); fs.mkdirSync(p, { recursive: true }); return p; };
const doc = (w, h, defs, body) => `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>\n`;
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const tc = t => `0:${t < 10 ? '0' : ''}${t.toFixed(1)}`;
FRAMES.forEach((f, i) => { f.n = i + 1; f.id = `n${String(f.n).padStart(2, '0')}`; f.dur = (FRAMES[i + 1]?.t ?? END) - f.t; });
const actName = a => ACTS.find(x => x[0] === a)[1];

export function frameBody(f, o = {}) {
  const c = ctx(f.id + (o.suffix || ''));
  const body = f.art(c) + (o.clean ? '' : ML(48, H - 36, `V4 · Shot ${String(f.n).padStart(2, '0')} — ${f.title}`, { size: 13, fill: N.ink4 }) + ML(W - 48, H - 36, `${tc(f.t)} · ${f.dur.toFixed(1)} s · ${actName(f.act)}`, { size: 13, anchor: 'end', fill: N.ink4 }));
  return { defs: c.defs.join(''), body };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  for (const f of FRAMES) { const b = frameBody(f); fs.writeFileSync(path.join(out('frames'), `${f.id}-${slug(f.title)}.svg`), doc(W, H, b.defs, b.body)); }

  const PW = 1920, PH = 1820, pages = [];
  const BG = '#050807';
  const header = (n, label) => R(0, 0, PW, PH, { fill: BG }) +
    TS(80, 74, [['br'], ['e', { fill: C.green }], ['w']], { f: D, w: 800, size: 40, ls: -1 }) + ML(200, 68, 'Launch film · Storyboard v4 · night glass cut', { size: 14, ls: 3, fill: N.ink3 }) +
    ML(PW - 80, 68, `${label}   ${String(n).padStart(2, '0')}`, { size: 14, ls: 3, anchor: 'end', fill: N.ink3 }) + Ln(80, 104, PW - 80, 104, { stroke: '#1D2925' });
  const para = (x, y, text, max, o = {}) => wrap(text, max).map((l, i) => T(x, y + i * (o.lh || 24), l, { f: S, size: o.size || 17, fill: o.fill || N.ink2 })).join('');
  const AW = 840, AH = AW * 9 / 16, sc = AW / W;
  const panel = (f, x, y, w, defsAcc) => {
    const fb = frameBody(f, { suffix: `-p${x}-${y}` }), k = w / W;
    defsAcc.push(fb.defs + `<clipPath id="${f.id}-${x}-${y}-panel"><rect width="${W}" height="${H}" rx="${18 / k}"/></clipPath>`);
    return G(`translate(${x} ${y}) scale(${k})`, G(null, fb.body, { clip: `url(#${f.id}-${x}-${y}-panel)` })) + R(x, y, w, w * 9 / 16, { r: 18, stroke: '#1F2B27' });
  };

  // Cover: the hero frame big, title over it.
  {
    const defs = []; let b = header(1, 'Cover');
    b += panel(FRAMES[3], 80, 140, 1760, defs);
    b += ML(80, 1170, 'brew · 30-second launch film · modelled on "NeuraFlow" by Zelios', { size: 16, ls: 3, fill: C.green });
    b += ['Dark, lit from above,', 'and built on the product.'].map((l, i) => T(80, 1300 + i * 112, l, { f: D, w: 700, size: 100, ls: -3, fill: i ? N.mint : N.ink })).join('');
    b += ML(80, 1520, `30 s · 16:9 · ${FRAMES.length} shots · one continuous camera · music-led, supers instead of VO`, { size: 16, fill: N.ink3 });
    b += para(80, 1590, 'Everything you see is a flat 2D layer: no perspective, no skew. Depth comes from light, blur, scale and opacity, so every shot splits straight into After Effects layers.', 120, { size: 24, lh: 34 });
    pages.push({ name: 'p01-cover', body: b, defs: defs.join('') });
  }

  // Reference breakdown + pacing
  {
    let b = header(2, 'Reference & pacing');
    b += T(80, 220, 'What we took from the reference', { f: D, w: 700, size: 64, ls: -2 });
    b += para(80, 278, 'Read from the reference\'s 5 fps and 1 fps preview frames (YouTube blocked the full stream). Times accurate to about ±0.2 s.', 130, { size: 20, lh: 30, fill: N.ink3 });
    const X0 = 80, XW = PW - 160;
    const lane = (y, label, total, secs) => {
      const sx = t => X0 + XW * t / total;
      let s = ML(X0, y - 24, label, { size: 13, fill: C.green });
      for (let t = 0; t <= total; t += 1) s += Ln(sx(t), y + 84, sx(t), y + (t % 5 ? 90 : 96), { stroke: '#2A3833' }) + (t % 5 === 0 ? T(sx(t), y + 118, `0:${String(t).padStart(2, '0')}`, { f: M, size: 12, fill: N.ink3, anchor: 'middle' }) : '');
      const cols = [C.teal, C.green, N.mint, C.amber, C.coral];
      secs.forEach(([a, z, name, act], i) => {
        const col = cols[(act ?? i) % cols.length];
        s += R(sx(a) + 1, y, sx(z) - sx(a) - 2, 72, { r: 6, fill: col, fop: 0.14, stroke: col });
        const wpx = sx(z) - sx(a), fs = wpx < 120 ? 12 : 14;
        s += wrap(name, Math.max(4, Math.floor((wpx - 12) / (fs * 0.55)))).slice(0, 3).map((l, k) => T(sx(a) + 7, y + 22 + k * (fs + 4), l, { f: S, size: fs, fill: N.ink })).join('');
      });
      return s;
    };
    b += lane(400, 'Reference (NeuraFlow) · 20 s', 20, [[0, 0.4, 'Grid', 0], [0.4, 1, 'Logo in beam', 0], [1, 1.6, 'Dome rises', 0], [1.6, 4, 'Headline + dashboard, chips float', 1], [4, 7, 'Pull back, giant wordmark behind', 1], [7, 9, '"New Updates" orbit', 1], [9, 10, 'Question', 2], [10, 13, 'AI agent answers, guide lines', 2], [13, 14, 'Card → 3', 3], [14, 16.2, 'Curved carousel', 3], [16.2, 17.4, 'Star mask', 4], [17.4, 20, 'Logo + "Discover"', 4]]);
    b += lane(640, 'brew v4 · 30 s', 30, FRAMES.map(f => [f.t, f.t + f.dur, f.title.replace(/"/g, ''), Number(f.act) - 1]));
    b += ML(80, 860, 'Device map: reference → brew', { size: 14, ls: 3, fill: C.green });
    [['Electric-blue volumetric beam', 'brew green → teal beam on brew\'s near-black (#0B0B0C family)'], ['Sparkle-star logo + planet dome', 'brew mark (viewfinder brackets + green "e") + the same planet horizon, used to open and close'],
     ['"Smart Control" dashboard', 'brew Studio in dark glass: "Hello, Sam / What should we make this week?", the in-production card, the 15-point review gauge'],
     ['Giant "NeuraFlow" behind the UI', 'Giant faded "brew" wordmark; Library and Languages panels blurred in depth'], ['"New Updates" orbit', '"Topic in. / Video out." with brew\'s six stages orbiting: Research, Script, Voice, Edit, Review, Deliver'],
     ['AI agent chat', 'A creator\'s prompt, the brew team\'s answer card, then the human review card (brew\'s difference: people watch it)'], ['Icon cards → curved carousel', 'Explainers, UGC ads, AI b-roll, 9 languages, Human review, Library, Your voice'],
     ['Four-point star mask → logo', 'brew\'s brackets are the mask: they close over the carousel and shrink into the mark']]
      .forEach(([a, z], i) => { const y = 920 + i * 74; b += T(80, y, a, { f: S, w: 600, size: 21, fill: N.ink2 }) + T(660, y, '→', { f: S, size: 21, fill: C.green }) + para(710, y, z, 92, { size: 21, lh: 28, fill: N.ink }); });
    b += ML(80, 1540, 'Velocity rules', { size: 14, ls: 3, fill: C.green });
    [['Camera', 'Never stops. Push or drift 2–3%/s in every shot; cuts only land on the beat (shots 7 and 11).'], ['Transitions', 'Shape-led: horizon → window, window → wordmark pull-back, ring draw-on, card → card morph, brackets mask → logo. 0.3–0.5 s, e-in-out.'],
     ['Light', 'The beam is always on and always top-centre. It is the continuity: brightest on logo shots, dimmest under UI.'], ['Hold', 'Average shot 1.9 s (reference 1.7 s). Longest holds: hero studio 3 s, end card 3.8 s.']]
      .forEach(([k, v], i) => { const y = 1590 + i * 56 + (i > 1 ? 26 : 0); b += T(80, y, k, { f: S, w: 600, size: 21, fill: N.ink }) + para(300, y, v, 120, { size: 20, lh: 26 }); });
    pages.push({ name: 'p02-reference', body: b, defs: '' });
  }

  // Look kit
  {
    const c = ctx('kit'); let b = header(3, 'Look kit');
    b += T(80, 220, 'Look kit', { f: D, w: 700, size: 64, ls: -2 }) + para(80, 278, 'The pieces every shot is built from. Each is its own layer in the After Effects export.', 120, { size: 20, lh: 30, fill: N.ink3 });
    const sw = [['Night', '#040706'], ['Panel', N.panel], ['brew green', N.green], ['Teal', N.teal], ['Mint (light)', N.mint], ['Rim', N.rim], ['Ink', N.ink], ['Ink 2', N.ink2]];
    sw.forEach(([k, v], i) => { const x = 80 + i * 222; b += R(x, 330, 200, 120, { r: 14, fill: v, stroke: '#2A3833' }) + T(x, 480, k, { f: S, w: 600, size: 17, fill: N.ink }) + T(x, 504, v.toUpperCase(), { f: M, size: 14, fill: N.ink3 }); });
    // stage specimen
    const stage = nightBg(c) + grid(c, { op: 0.06 }) + beam(c) + dust(c, { seed: 5 }) + horizon(c, { y: 820, r: 1500 }) + logo(c, 960, 480, 100);
    c.def(`<clipPath id="kit-stage"><rect width="${W}" height="${H}" rx="40"/></clipPath>`);
    b += G('translate(80 560) scale(0.43)', G(null, stage, { clip: 'url(#kit-stage)' })) + R(80, 560, W * 0.43, H * 0.43, { r: 18, stroke: '#1F2B27' });
    b += ML(80, 1060, 'Stage: night + grid + beam + dust + planet horizon', { size: 12, fill: N.ink3 });
    // glass specimens
    const gx = 1000;
    c.def(`<clipPath id="kit-glassbox"><rect x="${gx - 20}" y="0" width="860" height="464" rx="18"/></clipPath>`);
    b += R(gx - 20, 560, 860, 464, { r: 18, fill: '#07100D', stroke: '#1F2B27' }) + G('translate(0 560)', G(null, beam(c, { cx: gx + 410, k: 0.5, spread: 400, len: 464 }), { clip: 'url(#kit-glassbox)' }));
    b += glass(c, gx + 20, 600, 360, 180, { r: 18, k: 1.3, glow: N.teal }) + T(gx + 46, 650, 'Glass card', { f: S, w: 600, size: 22, fill: N.ink }) + T(gx + 46, 680, 'Body 72%, lit top edge, soft shadow', { f: S, size: 14, fill: N.ink3 });
    b += glassChip(c, gx + 440, 600, 'Glass chip', 'doc', { size: 20 }) + pillBtn(c, gx + 440, 690, 'Send a topic', { icon: 'send', solid: true, size: 16 }) + pillBtn(c, gx + 640, 690, 'Upload', { icon: 'upload', size: 16 });
    b += orb(c, gx + 80, 880, 48, { mark: true }) + orb(c, gx + 220, 880, 40, { icon: 'eye' }) + orb(c, gx + 340, 880, 40, { icon: 'globe' }) + sparkle(c, gx + 450, 880, 18) + lightLine(c, gx + 500, gx + 800, 880, { nodes: [gx + 790] });
    b += headline(c, gx + 410, 990, 'Gradient headline', { size: 44 });
    b += ML(gx - 20, 1060, 'Glass card · chip · buttons · orbs · sparkle · light rule · headline', { size: 12, fill: N.ink3 });
    // studio specimen
    c.def(`<clipPath id="kit-studio"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath>`);
    b += R(80, 1100, 1760, 640, { r: 18, fill: '#07100D', stroke: '#1F2B27' }) + G('translate(160 1130) scale(0.75)', studio(c, 0, 0, 1340, 780)) +
      T(1220, 1180, 'brew Studio · dark glass', { f: D, w: 700, size: 34, fill: N.ink }) +
      para(1220, 1230, 'A proposed dark-theme Studio built from the site\'s tokens: sidebar with the brew mark, account chip and the seven sections; greeting; the in-production card with stage pills and a day counter; the human-review gauge. Flat and straight in every shot.', 50, { size: 18, lh: 27 });
    pages.push({ name: 'p03-look-kit', body: b, defs: c.defs.join('') });
  }

  // Shots, 4 per page
  for (let p = 0; p * 4 < FRAMES.length; p++) {
    const set = FRAMES.slice(p * 4, p * 4 + 4), n = pages.length + 1, defs = [];
    let b = header(n, `Shots ${set[0].n}–${set[set.length - 1].n}`);
    set.forEach((f, i) => {
      const x = 80 + (i % 2) * (AW + 80), y = 140 + Math.floor(i / 2) * 840;
      b += panel(f, x, y, AW, defs);
      let ny = y + AH + 44;
      b += T(x, ny, String(f.n).padStart(2, '0'), { f: M, w: 500, size: 26, fill: C.green }) + T(x + 52, ny, f.title, { f: D, w: 700, size: 26, ls: -0.5, fill: N.ink }) +
        T(x + AW, ny, `${tc(f.t)} · ${f.dur.toFixed(1)} s`, { f: M, size: 14, fill: N.ink3, anchor: 'end' });
      ny += 36;
      for (const [lab, key] of [['Visual', 'visual'], ['Motion', 'motion'], ['Copy', 'vo'], ['SFX', 'sfx'], ['Next', 'next']]) {
        const lines = wrap(f[key], 86);
        b += ML(x, ny, lab, { size: 11, fill: key === 'vo' ? C.green : N.ink3 }) + lines.map((l, k) => T(x + 90, ny + k * 22, l, { f: S, size: 16, fill: key === 'vo' ? N.ink : N.ink2 })).join('');
        ny += lines.length * 22 + 8;
      }
    });
    pages.push({ name: `p${String(n).padStart(2, '0')}-shots-${set[0].n}-${set[set.length - 1].n}`, body: b, defs: defs.join('') });
  }
  fs.rmSync(path.join(here, 'out', 'board'), { recursive: true, force: true });
  for (const pg of pages) fs.writeFileSync(path.join(out('board'), `${pg.name}.svg`), doc(PW, PH, pg.defs, pg.body));
  console.log(`v4 frames: ${FRAMES.length}, pages: ${pages.length}`);
}
