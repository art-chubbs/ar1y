// Builds the storyboard: one SVG per frame (Figma-ready) + board pages (cover, script, style, frames).
//   node build.mjs  -> out/frames/*.svg, out/board/*.svg
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { C, D, S, M, W, H, FILM, T, TS, R, Ln, Ci, P, G, ML, ctx, ruler, dots, aurora, brackets, tag, pill, tc, wrap, esc } from './lib.mjs';
import { FRAMES, ACTS } from './frames.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = d => { const p = path.join(root, 'out', d); fs.mkdirSync(p, { recursive: true }); return p; };
const svgDoc = (w, h, defs, body) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>\n`;
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

FRAMES.forEach((f, i) => { f.n = i + 1; f.id = `s${String(f.n).padStart(2, '0')}`; });
const actName = a => ACTS.find(x => x[0] === a)[1];

function frameBody(f) {
  const c = ctx(f.id);
  const body =
    R(0, 0, W, H, { fill: C.bg }) + dots(c) + (f.aurora ? aurora(c, f.aurora) : '') +
    f.art(c) + ruler(f.t) +
    ML(48, H - 36, `Shot ${String(f.n).padStart(2, '0')} — ${f.title}`, { size: 13 }) +
    ML(W - 48, H - 36, `Act ${f.act} · ${actName(f.act)}`, { size: 13, anchor: 'end' });
  return { defs: c.defs.join(''), body };
}

// ---------- individual frames ----------
const frameDir = out('frames');
for (const f of FRAMES) {
  const { defs, body } = frameBody(f);
  fs.writeFileSync(path.join(frameDir, `${f.id}-${slug(f.title)}.svg`), svgDoc(W, H, defs, body));
}

// ---------- board pages ----------
const PW = 1920, PH = 1820;
const pages = [];
const header = (n, label) =>
  R(0, 0, PW, PH, { fill: C.bg }) +
  TS(80, 74, [['br'], ['e', { fill: C.green }], ['w']], { f: D, w: 800, size: 40, ls: -1 }) +
  ML(200, 68, 'Launch film · Storyboard v1', { size: 14, ls: 3 }) +
  ML(PW - 80, 68, `${label}   ${String(n).padStart(2, '0')}`, { size: 14, ls: 3, anchor: 'end' }) +
  Ln(80, 104, PW - 80, 104, { stroke: C.line2 });

function para(x, y, text, max, o = {}) {
  return wrap(text, max).map((l, i) => T(x, y + i * (o.lh || 24), l, { f: o.f || S, size: o.size || 17, fill: o.fill || C.t2, w: o.w })).join('');
}

// Cover
{
  let b = header(1, 'Cover');
  b += ML(80, 220, 'brew · Scale With Brew · 72-second launch film', { size: 16, ls: 3, fill: C.green });
  b += ['From idea to upload,', 'without the production', 'in between.'].map((l, i) => T(80, 380 + i * 128, l, { f: D, w: 700, size: 124, ls: -4, fill: i === 2 ? C.green : C.text })).join('');
  b += ML(80, 800, '72 s · 16:9 master (9:16 cutdown later) · 29 frames · 6 acts · 24 fps', { size: 16 });
  // Act bar
  const acts = [[0, 6], [6, 11], [11, 25], [25, 34], [34, 65], [65, 72]];
  const cols = [C.coral, C.green, C.t2, C.green, C.amber, C.green];
  acts.forEach(([s0, s1], i) => {
    const x = 80 + (PW - 160) * s0 / FILM, w = (PW - 160) * (s1 - s0) / FILM;
    b += R(x + 2, 880, w - 4, 16, { r: 4, fill: cols[i], op: i === 2 ? 0.6 : 1 }) +
      ML(x + 4, 940 + (i % 2) * 80, `${ACTS[i][0]} · ${ACTS[i][2]}`, { size: 12 }) + T(x + 4, 976 + (i % 2) * 80, ACTS[i][1], { f: S, w: 600, size: 22 }) +
      Ln(x + 2, 904, x + 2, 918 + (i % 2) * 80, { stroke: C.line2 });
  });
  b += ML(80, 1160, 'What the viewer should remember, in order', { size: 14, ls: 3 });
  ['brew makes the whole video for you.', 'AI does the heavy lifting. A person watches every frame.', 'YouTube videos, AI b-roll and UGC ads.',
    'You approve. You don\'t assemble.', 'Your first video is free.'].forEach((m, i) => {
    b += T(80, 1220 + i * 62, `0${i + 1}`, { f: M, size: 18, fill: C.green }) + T(140, 1220 + i * 62, m, { f: S, size: 34, w: i === 3 ? 600 : 400 });
  });
  b += ML(1080, 1160, 'Built from', { size: 14, ls: 3 });
  b += para(1080, 1210, 'The product brief and scalewithbrew.com, captured 1 Oct 2026. Colours, type, easing curves, the viewfinder brackets, the pipeline pills and most on-screen copy are lifted from the live site so the film looks and sounds like brew.', 58, { size: 22, lh: 34 });
  b += para(1080, 1420, 'Corrected from the brief: the nine languages are EN DE FR ES PT IT PL ID DA (no Hindi or Korean). Added the free first video CTA and the "Rose Freedman" proof moment from the site.', 58, { size: 22, lh: 34, fill: C.t3 });
  pages.push({ name: 'p01-cover', body: b, defs: '' });
}

// Script page
{
  let b = header(2, 'Voiceover script');
  b += T(80, 220, 'Voiceover', { f: D, w: 700, size: 72, ls: -2 });
  b += para(80, 280, 'Tone: confident, conversational, dry. Not hyped. British spelling on screen. Roughly 115 words, read at ~140 wpm with the deliberate pause on the freeze.', 110, { size: 22, lh: 32, fill: C.t3 });
  b += ML(80, 400, 'Time', { size: 13 }) + ML(260, 400, 'Voiceover', { size: 13 }) + ML(1180, 400, 'On screen', { size: 13 });
  const rows = [
    ['0:00', 'Making one video is easy.', 'Making one video is easy.'],
    ['0:03', 'Making fifty — week after week — is another story.', 'Making fifty is another story.'],
    ['0:05', '(silence)', 'freeze'],
    ['0:07', 'So hand it over.', ''],
    ['0:09', 'We make the whole video.', 'brew · We make the whole video.'],
    ['0:11', 'Send a topic, or a script. We research it, write it, voice it, source every shot, and cut it.', 'TOPIC → RESEARCH → SCRIPT → VOICE → EDIT'],
    ['0:25', 'Then a person watches all of it.', 'Review · frame by frame'],
    ['0:27', 'An AI tool picks on mood. We find her.', 'What tools make. What we make.'],
    ['0:31', 'Every frame, before you ever see it.', 'Every frame watched by a person.'],
    ['0:34', 'Long-form YouTube, up to sixty minutes. Three days, start to finish.', 'YouTube videos, done for you. · A file, not a first draft.'],
    ['0:43', 'Need a shot that doesn\'t exist? Type it. Download it in minutes.', 'AI b-roll, on demand. · Type the shot. Keep the shot.'],
    ['0:49', 'Ads that look shot, not generated. Hooks, demos and payoffs, at the volume you actually test.', 'Vertical ads that look shot, not generated.'],
    ['0:56', 'And when a video works, upload it nine times, not once.', 'Upload it nine times, not once.'],
    ['1:02', 'Even the thumbnail is drawn by a person.', 'Drawn by a person'],
    ['1:05', 'You don\'t manage any of that.', 'Send us a script →'],
    ['1:07', 'You approve. You don\'t assemble.', 'You approve. You don\'t assemble.'],
    ['1:09', 'Your first video is free. brew.', 'Your first video is free. scalewithbrew.com'],
  ];
  let y = 450;
  rows.forEach(([t, vo, sup]) => {
    const vl = wrap(vo, 52), sl = wrap(sup, 46), n = Math.max(vl.length, sl.length, 1);
    b += Ln(80, y - 8, PW - 80, y - 8, { stroke: C.line });
    b += T(80, y + 30, t, { f: M, size: 18, fill: C.green });
    b += vl.map((l, i) => T(260, y + 30 + i * 36, l, { f: S, size: 28, fill: vo.startsWith('(') ? C.t3 : C.text })).join('');
    b += sl.map((l, i) => T(1180, y + 30 + i * 36, l, { f: S, size: 22, fill: C.t3 })).join('');
    y += 22 + n * 36 + 12;
  });
  pages.push({ name: 'p02-script', body: b, defs: '' });
}

// Style page
{
  let b = header(3, 'Style & motion');
  b += T(80, 220, 'Style & motion', { f: D, w: 700, size: 72, ls: -2 });
  b += ML(80, 300, 'Palette (from scalewithbrew.com)', { size: 13 });
  [['Ground', C.bg], ['Surface', C.s1], ['Line', C.line2], ['Text', C.text], ['Text 3', C.t3], ['Brand green', C.green], ['YouTube', C.amber], ['AI b-roll', C.teal], ['UGC', C.coral]].forEach(([n, col], i) => {
    const x = 80 + i * 196;
    b += R(x, 330, 176, 120, { r: 10, fill: col, stroke: C.line2 }) + T(x, 486, n, { f: S, w: 600, size: 20 }) + T(x, 512, col, { f: M, size: 15, fill: C.t3 });
  });
  b += para(80, 560, 'Green is reserved for brew moments, active states and success. Amber, teal and coral appear only inside their product scenes, exactly as the site colour-codes them.', 140, { size: 18, fill: C.t3 });

  b += ML(80, 660, 'Type', { size: 13 });
  b += TS(80, 780, [['We make the '], ['whole', { w: 800 }], [' video.']], { f: D, w: 500, size: 84, ls: -3 });
  b += T(80, 850, 'Bricolage Grotesque 500–800 · headlines, tight tracking (−2 to −5)', { f: M, size: 16, fill: C.t3 });
  b += T(80, 920, 'Archivo 400–600 · UI text, captions, body', { f: S, size: 36 });
  b += T(80, 980, 'IBM PLEX MONO 500 · LABELS · TIMECODE 00:00:33:00', { f: M, w: 500, size: 26, fill: C.t2, ls: 2 });

  b += ML(1100, 660, 'Signature device: the viewfinder', { size: 13 });
  b += brackets(1100, 690, 300, 190, { len: 34, sw: 6 }) + TS(1250, 810, [['br'], ['e', { fill: C.green }], ['w']], { f: D, w: 800, size: 72, anchor: 'middle', ls: -3 });
  b += para(1440, 720, 'The four green corners from brew\'s logo are "a person looking". They frame the chaos, lock onto the right shot, pick the thumbnail frame, and carry the logo.', 34, { size: 19, lh: 28 });

  // easing curves
  b += ML(80, 1080, 'Motion: easing from the site\'s CSS', { size: 13 });
  [['e-out', '.16,1,.3,1', 'Everything entering'], ['in-out', '.65,0,.35,1', 'Camera moves, compressions'], ['overshoot', '.34,1.45,.64,1', 'Bracket locks, the green "e"']].forEach(([n, cb, use], i) => {
    const x = 80 + i * 360, y = 1120, s = 200;
    const [x1, y1, x2, y2] = cb.split(',').map(Number);
    b += R(x, y, s, s, { r: 8, stroke: C.line2 }) +
      P(`M${x} ${y + s} C${x + x1 * s} ${y + s - y1 * s} ${x + x2 * s} ${y + s - y2 * s} ${x + s} ${y}`, { stroke: C.green, sw: 3 }) +
      T(x + s + 20, y + 30, n, { f: S, w: 600, size: 22 }) + T(x + s + 20, y + 58, cb, { f: M, size: 14, fill: C.t3 }) +
      para(x + s + 20, y + 92, use, 14, { size: 15, lh: 20, fill: C.t3 });
  });
  b += para(1180, 1130, 'Rhythm: Act I accelerates into chaos, hard freeze, then everything after is smooth, modular and predictable. 40 ms stagger on every list. The only slow-motion is Act IV, where a person reviews, so the slowdown itself means "care".', 52, { size: 20, lh: 30 });

  // transition chain
  b += ML(80, 1420, 'Transition chain: one object, transformed, never cut', { size: 13 });
  const chain = ['Topic line', 'Source cards', 'Script lines', 'Waveform', 'Timeline', 'Player', 'Video card', 'Prompt', 'Phones', 'Language grid', 'Thumbnail', 'Button', 'Logo'];
  let x = 80;
  chain.forEach((s, i) => {
    const p = pill(x, 1450, s, { size: 12, state: i === 0 || i === chain.length - 1 ? 'active' : 'done' });
    b += p.svg; x += p.w + 8;
    if (i < chain.length - 1) { b += T(x + 3, 1470, '→', { f: S, size: 16, fill: C.t3 }); x += 22; }
  });
  b += para(80, 1560, 'Grain: very light, shifting (site uses grain-shift). Background: ground #0B0B0C with the site\'s faint 32 px dot grid; diagonal green "aurora rake" only on brand moments (reveal, hero line, end card). No robots, glowing grids, brains or holograms.', 150, { size: 18, lh: 28, fill: C.t3 });
  pages.push({ name: 'p03-style', body: b, defs: '' });
}

// Frame pages, 4 per page
const AW = 840, AH = AW * 9 / 16, sc = AW / W;
for (let p = 0; p * 4 < FRAMES.length; p++) {
  const set = FRAMES.slice(p * 4, p * 4 + 4);
  const n = pages.length + 1;
  let b = header(n, `Frames ${set[0].n}–${set[set.length - 1].n}`), defs = '';
  set.forEach((f, i) => {
    const x = 80 + (i % 2) * (AW + 80), y = 140 + Math.floor(i / 2) * 840;
    const fb = frameBody(f);
    defs += fb.defs + `<clipPath id="${f.id}-panel"><rect width="${W}" height="${H}" rx="24"/></clipPath>`;
    b += G(`translate(${x} ${y}) scale(${sc})`, G(null, fb.body, { clip: `url(#${f.id}-panel)` })) + R(x, y, AW, AH, { r: 10, stroke: C.line2 });
    let ny = y + AH + 44;
    b += T(x, ny, String(f.n).padStart(2, '0'), { f: M, w: 500, size: 26, fill: C.green }) +
      T(x + 52, ny, f.title, { f: D, w: 700, size: 28, ls: -0.5 }) +
      T(x + AW, ny, `${tc(f.t)} · Act ${f.act}`, { f: M, size: 14, fill: C.t3, anchor: 'end' });
    ny += 36;
    for (const [lab, key] of [['Visual', 'visual'], ['Motion', 'motion'], ['VO', 'vo'], ['SFX', 'sfx'], ['Next', 'next']]) {
      const lines = wrap(f[key], 86);
      b += ML(x, ny, lab, { size: 11, fill: key === 'vo' ? C.green : C.t3 });
      b += lines.map((l, k) => T(x + 90, ny + k * 22, l, { f: S, size: 16, fill: key === 'vo' ? C.text : C.t2 })).join('');
      ny += lines.length * 22 + 8;
    }
  });
  pages.push({ name: `p${String(n).padStart(2, '0')}-frames-${set[0].n}-${set[set.length - 1].n}`, body: b, defs });
}

const boardDir = out('board');
for (const pg of pages) fs.writeFileSync(path.join(boardDir, `${pg.name}.svg`), svgDoc(PW, PH, pg.defs, pg.body));
console.log(`frames: ${FRAMES.length}, pages: ${pages.length}`);
