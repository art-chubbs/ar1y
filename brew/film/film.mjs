// brew launch film — 72s, 1920×1080. render(t) returns the full SVG for time t (seconds).
// Runs in the browser (needs canvas text metrics). Reuses the storyboard's brand helpers and art.
import { C, D, S, M, W, H, T, TS, R, Ln, Ci, P, G, ML, ctx, pill, tag, brackets, cursor, check, cross, rng, grad, rgrad, tc } from '../storyboard/lib.mjs';
import { loopCard, bubble, fileChip, badge, panamaMap, archivePhoto, skyline, serumShot, phone, player, chartCard, factCard, timeline, videoCard } from '../storyboard/art.mjs';

export const DURATION = 72, FPS = 60;

// ---------- timing ----------
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const L = (a, b, p) => a + (b - a) * p;
const bez = (x1, y1, x2, y2) => x => {
  if (x <= 0) return 0; if (x >= 1) return 1;
  let u = x;
  for (let i = 0; i < 10; i++) {
    const fx = 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3 - x;
    const d = 3 * x1 * (1 - u) ** 2 + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u * u;
    if (Math.abs(d) < 1e-6) break;
    u = cl(u - fx / d);
  }
  return 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
};
const E = {
  out: bez(.16, 1, .3, 1), inout: bez(.65, 0, .35, 1), over: bez(.34, 1.45, .64, 1), soft: bez(.22, 1, .36, 1),
  in: x => x * x * x, lin: x => cl(x),
};
const A = (t, s, d, e = E.out) => e(cl((t - s) / d));
const lr = (a, b, p) => a.map((v, i) => L(v, b[i], p)); // lerp arrays (rects)

// ---------- text metrics (browser) ----------
const cvs = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
const tw = (s, size, w = 400, f = S, ls = 0) => { cvs.font = `${w} ${size}px "${f}"`; return cvs.measureText(s).width + ls * s.length; };

// ---------- reveal helpers ----------
const at = (x, y) => `translate(${x.toFixed(2)} ${y.toFixed(2)})`;
const scaleAt = (cx, cy, s, sy = s) => `translate(${cx} ${cy}) scale(${s.toFixed(4)} ${sy.toFixed(4)}) translate(${-cx} ${-cy})`;
const fade = (inner, p, dy = 0, dx = 0) => (p <= 0 ? '' : G(dy || dx ? at(dx * (1 - p), dy * (1 - p)) : null, inner, { op: p < 1 ? p.toFixed(3) : null }));
const pop = (inner, cx, cy, p, from = 0) => (p <= 0 ? '' : G(scaleAt(cx, cy, Math.max(0.001, L(from, 1, p))), inner, { op: cl(p * 3).toFixed(3) }));
function clipBox(c, x, y, w, h, r = 0) {
  const id = c.uid('cb');
  c.def(`<clipPath id="${id}"><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, w).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="${r}"/></clipPath>`);
  return `url(#${id})`;
}
function clipCircle(c, cx, cy, r) {
  const id = c.uid('cc');
  c.def(`<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${Math.max(0, r).toFixed(1)}"/></clipPath>`);
  return `url(#${id})`;
}
// Line rises through a mask (the site's headline reveal).
function rise(c, x, y, s, o, p) {
  if (p <= 0) return '';
  const size = o.size || 24;
  const clip = clipBox(c, 0, y - size * 1.05, W, size * 1.42);
  return G(null, G(at(0, (1 - p) * size * 1.15), T(x, y, s, o)), { clip });
}
function riseTS(c, x, y, parts, o, p) {
  if (p <= 0) return '';
  const size = o.size || 24;
  return G(null, G(at(0, (1 - p) * size * 1.15), TS(x, y, parts, o)), { clip: clipBox(c, 0, y - size * 1.05, W, size * 1.42) });
}
const rectOf = (x, y, w, h, r, o = {}) => R(x.toFixed(1), y.toFixed(1), Math.max(0, w).toFixed(1), Math.max(0, h).toFixed(1), { r, ...o });

// Wordmark "brew" with per-letter rise; green e.
function wordmark(c, cx, base, size, t, t0) {
  const ls = -size * 0.036, letters = ['b', 'r', 'e', 'w'];
  const ws = letters.map(ch => tw(ch, size, 800, D) + ls);
  let x = cx - ws.reduce((a, b) => a + b, 0) / 2;
  const clip = clipBox(c, 0, base - size * 0.95, W, size * 1.25);
  let out = '';
  letters.forEach((ch, i) => {
    const p = A(t, t0 + i * 0.06, 0.7, ch === 'e' ? E.over : E.out);
    out += G(at(0, (1 - p) * size), T(x.toFixed(1), base, ch, { f: D, w: 800, size, fill: ch === 'e' ? C.green : C.text }));
    x += ws[i];
  });
  return G(null, out, { clip });
}

// Animated waveform (bars breathe with time).
function wave(x, cy, w, h, n, seed, col, t, o = {}) {
  const r = rng(seed), bw = (w / n) * 0.55;
  let out = '';
  for (let i = 0; i < n; i++) {
    const env = 0.35 + 0.65 * Math.abs(Math.sin((i / n) * Math.PI * 3 + seed));
    const base = 0.3 + 0.7 * r();
    const live = 0.72 + 0.28 * Math.sin(t * 9 + i * 0.7 + seed);
    const grow = o.grow ? o.grow(i / n) : 1;
    const v = Math.max(0.05, env * base * live) * h * grow;
    if (v < 0.5) continue;
    out += R((x + (i * w) / n).toFixed(1), (cy - v / 2).toFixed(1), bw.toFixed(1), v.toFixed(1), { r: Math.min(bw / 2, 3), fill: col });
  }
  return G(null, out, { op: o.op });
}

function aurora(c, strength, shift = 0) {
  if (strength <= 0) return '';
  const id = c.uid('aur');
  c.def(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.green}" stop-opacity="0"/><stop offset="0.5" stop-color="${C.green}" stop-opacity="${(0.16 * strength).toFixed(3)}"/><stop offset="1" stop-color="${C.green}" stop-opacity="0"/></linearGradient>`);
  return [[180, 120, .9], [520, 60, .5], [980, 160, 1], [1420, 80, .6], [1760, 120, .8], [2200, 100, .7]].map(([x0, w, o]) => {
    const x = ((x0 + shift) % 2400) - 240;
    return `<polygon points="${x},0 ${x + w},0 ${x + w - 420},${H} ${x - 420},${H}" fill="url(#${id})" opacity="${o}"/>`;
  }).join('');
}

function dotsBg(c) {
  const id = c.uid('dots');
  c.def(`<pattern id="${id}" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="16" cy="16" r="1.2" fill="${C.text}" fill-opacity="0.06"/></pattern>`);
  return R(0, 0, W, H, { fill: C.bg }) + R(0, 0, W, H, { fill: `url(#${id})` });
}

function ruler(t, shown) {
  let out = Ln(0, 46, W, 46, { stroke: C.line2 });
  for (let x = 24; x < W; x += 96) out += Ln(x, 46, x, x % 480 === 24 ? 36 : 41, { stroke: C.line2 });
  const px = 24 + (W - 48) * (shown / DURATION);
  out += Ln(px, 26, px, 58, { stroke: C.green, sw: 2 }) + `<polygon points="${px - 6},26 ${px + 6},26 ${px},33" fill="${C.green}"/>`;
  out += T(24, 26, tc(shown), { f: M, size: 13, fill: C.green, ls: 1 }) + T(W - 24, 26, tc(DURATION), { f: M, size: 13, fill: C.t3, ls: 1, anchor: 'end' });
  return G(null, out, { op: A(t, 0.05, 0.5).toFixed(3) });
}

// Pipeline pills with per-pill fade-in and a pop when the active one changes.
const STEPS = ['Topic', 'Research', 'Script', 'Voice', 'Edit', 'Reviewed', 'Delivered'];
const STEP_AT = [11.0, 13.0, 15.5, 17.5, 19.5, 23.0, 33.3];
function stepper(t) {
  const vis = t < 27.0 ? A(t, 11.15, 0.4) * (1 - A(t, 26.7, 0.3)) : (t > 32.9 ? A(t, 33.0, 0.3) * (1 - A(t, 34.25, 0.2)) : 0);
  if (vis <= 0) return '';
  let active = 0;
  STEP_AT.forEach((s, i) => { if (t >= s) active = i; });
  const widths = STEPS.map(s => pill(0, 0, s).w), gap = 10;
  let x = W / 2 - (widths.reduce((a, b) => a + b, 0) + gap * 6) / 2, out = '';
  STEPS.forEach((s, i) => {
    const st = i < active ? 'done' : i === active ? 'active' : 'idle';
    const p = pill(x, 96, s, { state: st });
    const pIn = A(t, 11.15 + i * 0.05, 0.4);
    const bump = i === active ? 1 + 0.12 * Math.sin(Math.PI * cl((t - STEP_AT[i]) / 0.3)) : 1;
    out += G(scaleAt(x + p.w / 2, 96 + p.h / 2, bump), p.svg, { op: pIn.toFixed(3) });
    x += widths[i] + gap;
  });
  return G(null, out, { op: vis.toFixed(3) });
}

// ---------- act I data ----------
const RING = ['Find an editor', 'Send the brief', 'Wait', 'Review', 'Request changes', 'Wait again'];
const RING_ST = ['searching…', 'sent', '2 days', 'v2', '14 notes', '3 days'];
const ringPos = (i, rx = 640, ry = 330) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [W / 2 + Math.cos(a) * rx, H / 2 + 20 + Math.sin(a) * ry]; };
const CHAOS = [
  ['Find an editor', '01', 330, 300, -8, 'searching…'], ['Send the brief', '02', 780, 240, 5, 'sent'],
  ['Wait', '03', 1260, 300, -4, '2 days'], ['Review', '04', 1590, 470, 9, 'v2'],
  ['Request changes', '05', 1420, 760, -6, '14 notes'], ['Wait', '06', 900, 820, 3, '3 days'],
  ['Review again', '07', 420, 760, 7, 'v3'], ['Find a new editor', '01', 240, 520, -12, 'again'],
  ['Send the brief', '02', 1180, 560, -3, 're-sent'], ['Wait', '03', 640, 560, 11, '…'],
];
function chaosAt(t, grey, settle = 1) {
  // settle=1: positions animated by t; cards fly from the ring into a mess.
  let out = '';
  CHAOS.forEach(([l, s, x, y, r, st], i) => {
    const p = settle === 1 ? A(t, 3.4 + i * 0.07, 0.5) : 1;
    const [rx, ry] = ringPos(i % 6);
    const jx = grey ? 0 : Math.sin(t * 23 + i) * 2.5 * A(t, 4.4, 0.8, E.lin), jy = grey ? 0 : Math.cos(t * 19 + i * 2) * 2 * A(t, 4.4, 0.8, E.lin);
    out += loopCard(L(rx, x, p) + jx, L(ry, y, p) + jy, l, s, { rot: L(0, r, p), s: L(0.9, 1, p), grey, status: st, w: 360, op: L(1, 0.55 + 0.45 * ((i * 37) % 10) / 10, p), dot: i % 3 ? C.amber : C.coral });
  });
  const pops = [
    [3.85, () => bubble(1080, 150, 'any update on the edit?', { rot: -3, grey, av: C.teal })],
    [4.0, () => fileChip(560, 140, 'v3_FINAL_final.mp4', { rot: 6, grey })],
    [4.15, () => bubble(160, 880, 'can we try a different font?', { rot: 4, grey, av: C.amber })],
    [4.3, () => fileChip(1500, 620, 'script_v7_notes.docx', { rot: -9, grey })],
    [4.45, () => bubble(1240, 940, 'sorry, running a day late', { rot: -2, grey, av: C.coral })],
    [4.6, () => fileChip(120, 640, 'broll_maybe.zip', { rot: 10, grey })],
  ];
  pops.forEach(([s, f]) => { const p = settle === 1 ? A(t, s, 0.35, E.over) : 1; if (p > 0) out += fade(f(), cl(p), 18); });
  [[470, 252, '3', 3.7], [1415, 245, '12', 3.9], [1736, 418, '7', 4.1], [1050, 772, '2', 4.3]].forEach(([x, y, n, s]) => {
    const p = settle === 1 ? A(t, s, 0.3, E.over) : 1; if (p > 0) out += pop(badge(x, y, n, grey), x, y, p);
  });
  return out;
}

// ---------- scenes ----------
const SC = [];
const scene = (s, e, f, o = {}) => SC.push({ s, e, f, ...o });

// S1 cold open
scene(0, 1.5, (t, c) => {
  const p = A(t, 0.25, 0.6, E.over);
  const cx = L(1420, 1180, A(t, 0.45, 0.55, E.inout)), cy = L(840, 600, A(t, 0.45, 0.55, E.inout));
  const click = Math.sin(Math.PI * cl((t - 1.02) / 0.16));
  const ring = cl((t - 1.02) / 0.4);
  return fade(loopCard(W / 2, L(H / 2 - 30, H / 2, p), 'Find an editor', '01', { w: 520, h: 150, s: 1.15 * (1 - 0.03 * click), status: 'searching…' }), A(t, 0.25, 0.25)) +
    (ring > 0 && ring < 1 ? Ci(1180, 600, L(10, 60, E.out(ring)), { stroke: C.text, sw: 2, op: (1 - ring) * 0.6 }) : '') +
    fade(cursor(cx, cy, 1.4 * (1 - 0.1 * click)), A(t, 0.4, 0.2));
});

// S2 the loop forms
scene(1.5, 3.4, (t, c) => {
  let out = '';
  const orbit = A(t, 1.9, 0.5);
  out += `<ellipse cx="${W / 2}" cy="${H / 2 + 20}" rx="630" ry="320" fill="none" stroke="${C.t3}" stroke-width="1.5" stroke-dasharray="4 10" stroke-dashoffset="${(-t * 40).toFixed(1)}" opacity="${(orbit * 0.8 * (1 - A(t, 3.2, 0.2))).toFixed(3)}"/>`;
  RING.forEach((l, i) => {
    const [x, y] = ringPos(i);
    let px, py, s, op;
    if (i === 0) { const p = A(t, 1.5, 0.5, E.inout); px = L(W / 2, x, p); py = L(H / 2, y, p); s = L(1.15, 0.9, p); op = 1; }
    else { const p = A(t, 1.7 + i * 0.08, 0.55); px = L(W / 2, x, p); py = L(H / 2 + 20, y, p); s = L(0.4, 0.9, p); op = cl(p * 2); }
    if (op > 0) out += loopCard(px, py, l, `0${i + 1}`, { s, w: 340, status: RING_ST[i], op: op.toFixed(3) });
  });
  const hi = Math.floor((t - 2.3) * 4.5);
  if (t > 2.3) { const [x, y] = ringPos(((hi % 6) + 6) % 6); out += R(x - 158, y - 56, 316, 112, { r: 14, stroke: C.green, sw: 2, op: 0.9 }); }
  out += fade(rise(c, W / 2, H / 2 + 40, 'Making one video is easy.', { f: D, w: 500, size: 64, anchor: 'middle', ls: -2 }, A(t, 2.0, 0.7)), 1 - A(t, 3.2, 0.2));
  return out;
});

// S3 fifty of them
scene(3.4, 5.5, (t, c) => {
  const shake = A(t, 4.3, 1.0, E.lin);
  const n = Math.round(L(7, 50, A(t, 3.6, 1.8, E.in)));
  return G(at(Math.sin(t * 37) * 3 * shake, Math.cos(t * 29) * 3 * shake),
    chaosAt(t, false) + R(0, 0, W, H, { fill: C.bg, op: 0.3 }) +
    fade(R(W - 360, 80, 300, 70, { r: 10, fill: C.s1, stroke: C.coral }) + ML(W - 340, 124, `Video ${String(n).padStart(2, '0')} / 50`, { size: 22, fill: C.coral, ls: 3 }), A(t, 3.6, 0.3), -10) +
    fade(R(330, 440, 1260, 200, { r: 20, fill: C.bg, op: 0.88 }), A(t, 3.95, 0.3)) +
    rise(c, W / 2, 572, 'Making fifty is another story.', { f: D, w: 800, size: 84, anchor: 'middle', ls: -2 }, A(t, 4.0, 0.6)));
});

// S4 freeze (hard cut, colour drains, timecode holds)
scene(5.5, 6.2, (t, c) => {
  const drain = A(t, 5.5, 0.18, E.lin);
  const sy = L(-20, H + 20, A(t, 5.55, 0.45, E.inout));
  return G(null, chaosAt(9, false, 0), { op: (1 - drain).toFixed(3) }) + G(null, chaosAt(9, true, 0), { op: drain.toFixed(3) }) +
    R(0, 0, W, H, { fill: C.bg, op: 0.25 }) + Ln(0, sy, W, sy, { stroke: C.text, op: 0.14, sw: 2 }) +
    fade(R(W / 2 - 140, H - 120, 280, 44, { r: 22, fill: C.s1, stroke: C.line2 }) + T(W / 2, H - 91, 'HOLD  00:00:05:12', { f: M, size: 16, fill: C.t2, anchor: 'middle', ls: 1 }), A(t, 5.6, 0.2));
});

// S5–S7: brackets arrive → compress → logo (one continuous bracket morph)
const BR = { full: [-60, -60, W + 120, H + 120], inset: [200, 160, W - 400, H - 320], tile: [W / 2 - 340, H / 2 - 209, 680, 418], logo: [W / 2 - 330, 255, 660, 360], input: [384, 434, 1152, 162] };
function bracketAt(t) {
  if (t < 7.4) return lr(BR.full, BR.inset, A(t, 6.2, 0.7));
  if (t < 8.8) return lr(BR.inset, BR.tile, A(t, 7.4, 1.1, E.inout));
  if (t < 11.0) return lr(BR.tile, BR.logo, A(t, 8.8, 0.55, E.inout));
  return lr(BR.logo, BR.input, A(t, 11.0, 0.6, E.inout));
}
const bracketLen = r => Math.max(28, Math.min(90, Math.min(r[2], r[3]) * 0.16));

scene(6.2, 7.4, (t, c) => {
  let out = G(null, chaosAt(9, true, 0), { op: L(1, 0.35, A(t, 6.2, 0.4)).toFixed(3) });
  [[0.16, 0.08], [0.08, 0.18]].forEach(([lag, op]) => { const r = lr(BR.full, BR.inset, A(t - lag, 6.2, 0.7)); out += brackets(...r, { len: 90, sw: 8, op }); });
  return out + brackets(...bracketAt(t), { len: 90, sw: 8 });
});
scene(7.4, 8.8, (t, c) => {
  const p = A(t, 7.4, 1.1, E.inout), s = L(1, 0.3125, p);
  const content = 1 - A(t, 8.45, 0.35);
  const r = bracketAt(t);
  return aurora(c, A(t, 7.6, 0.8), (t - 7.4) * 140) +
    G(scaleAt(W / 2, H / 2, s), G(null, chaosAt(9, true, 0), { op: (0.5 * content).toFixed(3) }) + R(0, 0, W, H, { r: 20, stroke: C.line2, sw: 3, op: p.toFixed(3) })) +
    brackets(...r, { len: bracketLen(r), sw: L(8, 7, p) });
});
scene(8.8, 11.0, (t, c) => {
  const r = bracketAt(t), exit = A(t, 10.7, 0.3, E.in);
  const tileOp = 1 - A(t, 8.8, 0.3);
  return aurora(c, L(1, 0.8, A(t, 8.8, 1)), (t - 7.4) * 140) +
    (tileOp > 0 ? rectOf(...lr(BR.tile, BR.logo, A(t, 8.8, 0.55, E.inout)).map((v, i) => i < 2 ? v + 40 : v - 80), 12, { stroke: C.line2, sw: 2, op: tileOp.toFixed(3) }) : '') +
    G(at(0, -30 * exit), wordmark(c, W / 2, 510, 220, t, 9.0) +
      rise(c, W / 2, 760, 'We make the whole video.', { f: D, w: 500, size: 64, anchor: 'middle', ls: -2 }, A(t, 9.55, 0.7)) +
      fade(ML(W / 2, 830, 'Scale With Brew', { anchor: 'middle', size: 15, ls: 5 }), A(t, 9.9, 0.5)), { op: (1 - exit).toFixed(3) }) +
    brackets(...r, { len: bracketLen(r), sw: 8 });
});

// S8 topic: brackets morph into the input field
const TOPIC = 'Why the Panama Canal ran short of water';
scene(11.0, 13.0, (t, c) => {
  const r = bracketAt(t);
  const box = A(t, 11.35, 0.45);
  const n = Math.round(TOPIC.length * A(t, 11.65, 0.95, E.lin));
  const txt = TOPIC.slice(0, n);
  const caretX = 444 + tw(txt, 44, 500, S);
  const blink = n < TOPIC.length || Math.floor(t * 2.6) % 2 === 0;
  const flash = Math.sin(Math.PI * cl((t - 12.75) / 0.25));
  return fade(ML(400, 420, 'Send a topic, or a script', { size: 15 }), A(t, 11.4, 0.4), 10) +
    fade(R(400, 450, 1120, 130, { r: 14, fill: C.s1, stroke: C.green, sw: 1.5 }) + (flash > 0 ? R(400, 450, 1120, 130, { r: 14, fill: C.green, op: (0.18 * flash).toFixed(3) }) : ''), box) +
    T(444, 532, txt, { f: S, size: 44, w: 500 }) + (blink && box > 0.5 ? R(caretX + 6, 495, 4, 52, { fill: C.green }) : '') +
    fade(ML(400, 640, 'Five minutes', { size: 13 }), A(t, 12.1, 0.4)) +
    fade(T(1520, 640, '↵ Enter', { f: M, size: 15, fill: flash > 0 ? C.green : C.t3, anchor: 'end' }), A(t, 12.2, 0.3)) +
    brackets(...r, { len: bracketLen(r), sw: L(8, 5, A(t, 11.0, 0.6)) });
});

// S9 research: the topic line splits into verified source cards
const RESEARCH = [
  { r: [160, 250, 520, 300], f: c => chartCard(160, 250, 520, 300) },
  { r: [720, 250, 520, 300], f: c => factCard(720, 250, 520, 300, 'Fresh water per crossing', '50,000,000', 'gallons · Panama Canal Authority', { ok: true, vs: 64 }) },
  { r: [1280, 250, 480, 300], f: c => factCard(1280, 250, 480, 300, 'Lock staircase', '26 m', 'climb, three chambers', { ok: true, vs: 80, vcol: C.amber }) },
  { r: [160, 590, 640, 360], f: c => panamaMap(c, 160, 590, 640, 360, { r: 14 }) },
  { r: [850, 600, 300, 340], f: c => archivePhoto(c, 850, 600, 300, 340, { caption: 'GATUN LOCKS · 1914' }) },
  { r: [1210, 640, 520, 260], f: c => factCard(1210, 640, 520, 260, 'Source', 'Checked', 'every claim against the line it sits under', { vs: 48, vcol: C.green }) },
];
scene(13.0, 15.5, (t, c) => {
  const mv = A(t, 13.0, 0.55, E.inout);
  let out = T(L(444, 160, mv), L(532, 200, mv), TOPIC, { f: S, size: L(44, 26, mv), w: 500, fill: mv > 0.5 ? C.t3 : C.text });
  out += fade(R(400, 450, 1120, 130, { r: 14, fill: C.s1, stroke: C.green, sw: 1.5 }), 1 - A(t, 13.0, 0.25));
  const col = A(t, 15.2, 0.3, E.in);
  RESEARCH.forEach((it, i) => {
    const p = A(t, 13.2 + i * 0.1, 0.65);
    if (p <= 0) return;
    const [x, y, w, h] = it.r, fx = x + w / 2, fy = y + h / 2;
    const rot = L((i % 2 ? 1 : -1) * (8 + i * 3), i === 5 ? 4 : 0, p);
    const cx = L(L(960, fx, p), 960, col), cy = L(L(515, fy, p), 570, col), s = L(L(0.3, 1, p), 0.2, col);
    out += G(`translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${rot.toFixed(2)}) scale(${s.toFixed(3)}) translate(${-fx} ${-fy})`, it.f(c), { op: (cl(p * 2) * (1 - col)).toFixed(3) });
  });
  [[770, 620, 0], [1130, 620, 1]].forEach(([x, y], i) => { const p = A(t, 13.9 + i * 0.12, 0.3, E.over) * (1 - col); if (p > 0) out += pop(check(x, y, 12), x, y, p); });
  return out;
});

// S10 script
const SCRIPT = [['In October 2023, the rain didn\'t come.', 'CHART'], ['Gatun Lake fell to its lowest level in years.', 'MAP'],
  ['Every ship that crosses uses 50 million gallons of fresh water.', 'GRAPHIC'], ['The locks climb 26 metres, one chamber at a time.', 'DIAGRAM'],
  ['So the canal did the only thing it could.', 'ARCHIVE'], ['It let fewer ships through.', 'MAP']];
scene(15.5, 17.5, (t, c) => {
  const pin = A(t, 15.45, 0.45), exit = A(t, 17.25, 0.25, E.in);
  let out = G(scaleAt(W / 2, 570, L(0.92, 1, pin)), R(260, 190, 1400, 760, { r: 18, fill: C.s1, stroke: C.line2 }) +
    ML(310, 250, 'Script · v1 · 0:54', { size: 13 }) + ML(1610, 250, 'In your channel\'s voice', { size: 13, anchor: 'end', fill: C.green }), { op: (pin * (1 - exit)).toFixed(3) });
  out += T(160, 200, TOPIC, { f: S, size: 26, w: 500, fill: C.t3, op: (1 - A(t, 15.5, 0.3)).toFixed(3) });
  SCRIPT.forEach(([l, tg], i) => {
    const y = 340 + i * 100, hi = i === 2, p = A(t, 15.7 + i * 0.09, 0.55);
    const hb = hi ? A(t, 16.55, 0.45, E.inout) : 0;
    const keep = hi ? 1 : 1 - exit;
    out += G(null,
      (hb > 0 ? R(290, y - 52, 1340 * hb, 80, { r: 10, fill: C.green, fop: 0.1, stroke: C.green }) : '') +
      fade(T(320, y, `0${i + 1}`, { f: M, size: 18, fill: hi && hb > 0.5 ? C.green : C.t3 }) + T(390, y, l, { f: S, size: 34, w: hi ? 500 : 400, fill: hi ? C.text : C.t2 }), p, 0, 60) +
      pop(tag(1490, y - 26, tg, hi ? C.green : C.t3, false, 12), 1530, y - 14, A(t, 16.0 + i * 0.09, 0.3, E.over)),
      { op: (hi ? 1 - A(t, 17.3, 0.2) * 0 : keep).toFixed(3) });
  });
  return out;
});

// S11 voice: the line stretches into bars, the bars into a waveform
scene(17.5, 19.5, (t, c) => {
  const mv = A(t, 17.5, 0.5, E.inout), exit = A(t, 19.1, 0.4, E.inout);
  const wx = L(160, 250, exit), wcy = L(640, 866, exit), ww = L(1600, 1500, exit), wh = L(260, 40, exit);
  let out = T(L(390, 160, mv), L(540, 330, mv), 'Every ship that crosses uses 50 million gallons of fresh water.', { f: S, size: 34, w: L(500, 400, mv), fill: C.t3, op: (L(1, 0.6, mv) * (1 - exit)).toFixed(3) });
  out += R(160, 380, 1100 * A(t, 17.75, 0.45, E.inout), 14, { r: 7, fill: C.t3, op: (0.35 * (1 - exit)).toFixed(3) });
  out += R(160, 420, 1400 * A(t, 17.9, 0.45, E.inout), 14, { r: 7, fill: C.green, op: (0.45 * (1 - exit)).toFixed(3) });
  out += wave(wx, wcy, ww, wh, 120, 7, C.green, t, { grow: u => A(t, 18.15 + u * 0.55, 0.3, E.over) });
  out += fade(ML(160, 830, 'VO · EN · 00:54 · in your channel\'s voice', { size: 14 }) + T(1760, 830, tc(t - 5.4), { f: M, size: 14, fill: C.green, anchor: 'end' }), A(t, 18.5, 0.4) * (1 - exit));
  return out;
});

// S12 edit: timeline assembles L→R, programme monitor above
scene(19.5, 22.5, (t, c) => {
  const pin = A(t, 19.5, 0.35), wipe = A(t, 19.55, 1.0, E.inout), play = L(0.05, 0.6, A(t, 20.0, 2.5, E.lin));
  const mon = A(t, 19.8, 0.5);
  return G(scaleAt(960, 385, L(0.85, 1, mon)), player(c, 560, 160, 800, 450, panamaMap(c, 560, 160, 800, 450, { label: 'LAKE GATUN' }), { prog: play, time: `00:${String(Math.round(play * 54)).padStart(2, '0')} / 00:54` }), { op: mon.toFixed(3) }) +
    G(null, G(null, timeline(c, 160, 650, 1600, 330, { play }), { clip: clipBox(c, 150, 640, 30 + 1590 * wipe, 360) }), { op: pin.toFixed(3) }) +
    R(160, 650, 1600, 330, { r: 16, stroke: C.line2, op: pin.toFixed(3) });
});

// S13 the timeline folds into one player (morph)
const PL13a = [560, 160, 800, 450], PL13b = [360, 170, 1200, 675], PL14 = [360, 190, 1200, 675];
scene(22.5, 25.0, (t, c) => {
  const fold = A(t, 22.5, 0.45, E.in), grow = A(t, 22.55, 0.85, E.inout);
  const pr = lr(PL13a, PL13b, grow);
  const prog = L(0.6, 0.62, A(t, 22.5, 2.5));
  const lines = A(t, 22.9, 0.4) * (1 - A(t, 24.5, 0.4));
  return (fold < 1 ? G(scaleAt(960, 650, 1, 1 - fold), timeline(c, 160, 650, 1600, 330, { play: 0.6 }), { op: (1 - fold).toFixed(3) }) : '') +
    player(c, ...pr, panamaMap(c, ...pr, { label: 'LAKE GATUN' }), { prog, time: `00:33 / 00:54` }) +
    [0, 1, 2, 3].map(i => R(pr[0] + 20 + i * 6, pr[1] + pr[3] + 25 + i * 22, (pr[2] - 40 - i * 12) * lines, 14, { r: 7, fill: [C.coral, '#4DB37E', C.green, C.t3][i], op: ((0.5 - i * 0.1) * lines).toFixed(3) })).join('');
});

// S14 a person watches — match cut: same frame, the map becomes the stock shot
scene(25.0, 27.0, (t, c) => {
  const pr = lr(PL13b, PL14, A(t, 25.0, 0.5));
  const swap = A(t, 25.0, 0.12, E.lin);
  const br = lr([290, 120, 1340, 815], [330, 160, 1260, 735], A(t, 25.1, 1.1, E.soft));
  const knob = L(0.5, 0.57, A(t, 25.7, 1.2, E.inout));
  const cx = L(1300, pr[0] + 24 + (pr[2] - 48) * knob - 10, A(t, 25.2, 0.5, E.inout)), cy = L(980, pr[1] + pr[3] - 30, A(t, 25.2, 0.5, E.inout));
  const push = L(1, 1.025, A(t, 25.0, 2.0, E.lin));
  const sub = fade(R(560, pr[1] + 550, 800, 56, { r: 6, fill: '#000', op: 0.7 }) +
    TS(W / 2, pr[1] + 588, [['…a nurse named '], ['Rose Freedman', { fill: '#F2C94C', w: 600 }], ['…']], { f: S, size: 28, anchor: 'middle' }), A(t, 25.35, 0.35));
  return G(scaleAt(W / 2, H / 2, push),
    fade(ML(420, 150, 'Review · frame by frame', { size: 14, fill: C.green }), A(t, 25.3, 0.4)) +
    player(c, ...pr, G(null, panamaMap(c, ...pr, { label: 'LAKE GATUN' }), { op: (1 - swap).toFixed(3) }) + G(null, skyline(c, ...pr), { op: swap.toFixed(3) }),
      { prog: knob, time: `00:${String(Math.round(knob * 54)).padStart(2, '0')} / 00:54`, sub }) +
    brackets(...br, { len: 60, sw: 7, op: A(t, 25.1, 0.4).toFixed(3) }) + fade(cursor(cx, cy, 1.3), A(t, 25.2, 0.3)));
});

// S15–S16: the player shrinks into "what a tool gives you"; brackets jump to "what we deliver"
const IMG_L = [184, 274, 712, 400];
function leftCard(c, t, dim) {
  const shrink = A(t, 27.0, 0.6, E.inout);
  const img = t < 27.6 ? lr(PL14, IMG_L, shrink) : IMG_L;
  const cardIn = A(t, 27.3, 0.4);
  return G(null,
    fade(R(160, 250, 760, 600, { r: 16, fill: C.s1, stroke: C.line2 }), cardIn) +
    R(160, 250, 760 * A(t, 27.5, 0.45, E.inout), 3, { fill: C.coral }) +
    skyline(c, ...img, { r: L(14, 10, shrink) }) +
    pop(cross(860, 314, 22), 860, 314, A(t, 27.8, 0.35, E.over), 1.8) +
    rise(c, 184, 718, 'WHAT A TOOL GIVES YOU', { f: M, w: 500, size: 13, fill: C.coral, ls: 2 }, A(t, 27.65, 0.5)) +
    rise(c, 184, 768, 'A stock city skyline', { f: D, w: 700, size: 40 }, A(t, 27.75, 0.55)) +
    rise(c, 184, 810, 'Atmospheric, generic, and not her.', { f: S, size: 22, fill: C.t3 }, A(t, 27.85, 0.55)),
    { op: L(1, 0.35, dim).toFixed(3) });
}
scene(27.0, 29.0, (t, c) => {
  return fade(ML(160, 210, 'The narration says "Rose Freedman"', { size: 16, ls: 3 }), A(t, 27.3, 0.4)) + leftCard(c, t, 0) +
    fade(R(1000, 250, 760, 600, { r: 16, stroke: C.line2, dash: '6 8' }) + T(1380, 560, '?', { f: D, w: 700, size: 120, fill: C.line2, anchor: 'middle' }), A(t, 28.0, 0.4)) +
    brackets(...lr([330, 160, 1260, 735], [140, 230, 800, 640], A(t, 27.0, 0.6, E.inout)), { len: 56, sw: 7, op: (1 - A(t, 27.4, 0.3)).toFixed(3) });
});
scene(29.0, 31.0, (t, c) => {
  const dim = A(t, 29.0, 0.35), jump = A(t, 29.1, 0.6, E.over);
  const drop = A(t, 29.4, 0.65);
  const hdr = A(t, 29.0, 0.3);
  return G(null, ML(160, 210, 'The narration says "Rose Freedman"', { size: 16, ls: 3 }), { op: (1 - hdr).toFixed(3) }) +
    G(null, ML(160, 210, 'What tools make. What we make.', { size: 16, ls: 3 }), { op: hdr.toFixed(3) }) +
    leftCard(c, 31, dim) +
    fade(R(1000, 250, 760, 600, { r: 16, fill: C.s1, stroke: C.line2 }), A(t, 29.1, 0.3)) +
    R(1000, 250, 760 * A(t, 29.6, 0.45, E.inout), 3, { fill: C.green }) +
    (drop > 0 ? G(`translate(0 ${((1 - drop) * -90).toFixed(1)}) rotate(${L(-10, 0, drop).toFixed(2)} 1380 480)`, archivePhoto(c, 1230, 280, 300, 400, { tr: 'rotate(-2 1380 480)' }), { op: cl(drop * 2).toFixed(3) }) : '') +
    pop(check(1700, 314, 22), 1700, 314, A(t, 29.95, 0.35, E.over), 1.8) +
    rise(c, 1024, 718, 'WHAT WE DELIVER', { f: M, w: 500, size: 13, fill: C.green, ls: 2 }, A(t, 29.8, 0.5)) +
    rise(c, 1024, 768, 'Her photograph, 1911', { f: D, w: 700, size: 40 }, A(t, 29.9, 0.55)) +
    rise(c, 1024, 810, 'Found, checked against the line, and cleared.', { f: S, size: 22, fill: C.t3 }, A(t, 30.0, 0.55)) +
    brackets(...lr([140, 230, 800, 640], [980, 230, 800, 640], jump), { len: 56, sw: 7, op: A(t, 29.05, 0.15).toFixed(3) });
});

// S17 fifteen points — then a green circle grows out of the last check (shape transition)
const CHECKS = ['Named people match the narration', 'Places dated and sourced', 'Numbers legible on pause', 'Spelling on screen', 'Voice matches the script',
  'Audio levels', 'Music sits under the voice', 'Pacing holds attention', 'Cuts land on the beat', 'Continuity', 'Captions in sync',
  'Grade consistent', 'No stock under a real name', 'Licences cleared', 'Watched start to finish'];
const rowXY = i => { const col = i < 8 ? 0 : 1, row = i < 8 ? i : i - 8; return [160 + col * 820, 290 + row * 86]; };
scene(31.0, 33.05, (t, c) => {
  let out = fade(ML(160, 200, 'Review · 15-point list', { size: 16, ls: 3, fill: C.green }), A(t, 31.05, 0.3));
  let done = 0;
  CHECKS.forEach((it, i) => {
    const s = 31.2 + i * 0.085, p = A(t, s, 0.4);
    if (t > s + 0.12) done++;
    const [x, y] = rowXY(i);
    out += fade(Ln(x, y + 30, x + 760, y + 30, { stroke: C.line }) + T(x + 52, y + 9, it, { f: S, size: 28, fill: p > 0.9 ? (i === 14 ? C.text : C.t2) : C.t3, w: i === 14 ? 600 : 400 }) +
      T(x + 760, y + 8, String(i + 1).padStart(2, '0'), { f: M, size: 14, fill: C.t3, anchor: 'end' }), p, 0, 30) +
      pop(check(x + 18, y, 14), x + 18, y, A(t, s + 0.08, 0.3, E.over));
  });
  out += fade(T(1760, 210, `${String(done).padStart(2, '0')} / 15`, { f: M, w: 500, size: 44, fill: C.green, anchor: 'end' }), A(t, 31.1, 0.3));
  const [lx, ly] = rowXY(14);
  const iris = A(t, 32.6, 0.45, E.in);
  if (iris > 0) out += Ci(lx + 18, ly, L(14, 2300, iris), { fill: C.green });
  return out;
});

// S18 hero line, revealed by a dark circle opening out of the green
scene(33.05, 34.5, (t, c) => {
  const open = A(t, 33.05, 0.5, E.inout);
  const whip = A(t, 34.3, 0.2, E.in);
  const inner = R(0, 0, W, H, { fill: C.bg }) + aurora(c, 0.6, t * 60) +
    rise(c, 160, 470, 'Every frame', { f: D, w: 700, size: 150, ls: -5 }, A(t, 33.2, 0.6)) +
    rise(c, 160, 620, 'watched by a', { f: D, w: 700, size: 150, ls: -5 }, A(t, 33.3, 0.6)) +
    rise(c, 160, 770, 'person.', { f: D, w: 800, size: 150, fill: C.green, ls: -5 }, A(t, 33.45, 0.6)) +
    brackets(...lr([90, 590, 660, 270], [140, 640, 560, 170], A(t, 33.75, 0.45, E.over)), { len: 34, sw: 6, op: A(t, 33.75, 0.15).toFixed(3) });
  return R(0, 0, W, H, { fill: C.green }) + G(null, G(at(-260 * whip, 0), inner, { op: (1 - whip).toFixed(3) }), { clip: clipCircle(c, 260, 715, L(0, 2300, open)) });
});

// S19 YouTube: an amber shape sweeps in and collapses into the timeline bar
const fmtMin = v => `${String(Math.floor(v)).padStart(2, '0')}:${String(Math.floor((v % 1) * 60)).padStart(2, '0')}`;
scene(34.5, 39.5, (t, c) => {
  const cover = A(t, 34.5, 0.3, E.inout), collapse = A(t, 34.8, 0.5, E.inout);
  const hits = [[35.35, 10], [35.95, 20], [36.55, 40], [37.15, 60]];
  let mins = 0, prev = 0;
  hits.forEach(([s, m]) => { const p = A(t, s, 0.4, E.over); if (t >= s) mins = L(prev, m, p); prev = m; });
  if (t < hits[0][0]) mins = 0;
  const fill = mins / 60;
  const exit = A(t, 39.2, 0.3, E.in);
  const tags = ['Ideation', 'Research', 'Script', 'Voice', 'Sourcing', 'Edit', 'Grade', 'Review'];
  let out = G(null,
    fade(tag(160, 170, 'We run it', C.amber), A(t, 34.95, 0.3)) +
    rise(c, 160, 300, 'YouTube videos, done for you.', { f: D, w: 600, size: 72, ls: -2 }, A(t, 35.0, 0.6)) +
    fade(T(1760, 300, fmtMin(mins), { f: M, w: 500, size: 72, fill: C.amber, anchor: 'end' }), A(t, 35.1, 0.3)) +
    R(160, 540, 1600, 18, { r: 9, fill: C.line, op: collapse.toFixed(3) }) + (fill > 0 ? R(160, 540, 1600 * Math.min(1, fill), 18, { r: 9, fill: C.amber }) : '') +
    [10, 20, 40, 60].map(m => { const x = 160 + 1600 * m / 60, p = A(t, hits.find(h => h[1] === m)[0] + 0.2, 0.3); return fade(Ln(x, 520, x, 578, { stroke: C.text, sw: 2 }) + T(x, 610, `${m}:00`, { f: M, size: 16, fill: C.t2, anchor: m === 60 ? 'end' : 'middle' }), p, -8); }).join('') +
    tags.map((tg, i) => {
      const x = 220 + i * 196, y = i % 2 ? 760 : 700, p = A(t, 37.35 + i * 0.07, 0.55, E.over);
      return p > 0 ? Ln(x + 40, 558, x + 40, L(558, y - 30, cl(p)), { stroke: C.line2, dash: '3 5' }) + G(at(0, (1 - p) * -60), pill(x, y - 30, tg, { state: 'done' }).svg, { op: cl(p * 2).toFixed(3) }) : '';
    }).join('') +
    fade(ML(160, 920, 'Three days · Two rounds of notes · Nine languages from the same edit', { size: 15 }), A(t, 38.1, 0.4)),
    { op: (1 - exit).toFixed(3) });
  // shape transition: full-frame green → amber, collapsing into the bar's start
  if (collapse < 1) {
    const full = [0, 0, W, H], from = [140, 640, 560, 170], bar = [160, 540, 30, 18];
    const r = collapse > 0 ? lr(full, bar, collapse) : lr(from, full, cover);
    out += rectOf(...r, L(0, 9, collapse), { fill: collapse > 0 ? C.amber : (cover < 0.5 ? C.green : C.amber) });
  }
  return out;
});

// S20 a file, not a first draft — the card grows out of the bar
const CARD = { x: 860, y: 200, w: 900 };
scene(39.5, 43.0, (t, c) => {
  const p = A(t, 39.5, 0.75);
  const fcx = CARD.x + CARD.w / 2, fcy = CARD.y + (CARD.w * 9 / 16 + 150) / 2;
  const exit = A(t, 42.6, 0.3, E.inout), collapse = A(t, 42.9, 0.5, E.inout);
  let out = fade(tag(160, 170, 'We run it', C.amber), 1 - A(t, 42.6, 0.2)) +
    G(`translate(${L(960, fcx, p).toFixed(1)} ${L(549, fcy, p).toFixed(1)}) scale(${L(0.3, 1, p).toFixed(3)}) translate(${-fcx} ${-fcy})`, videoCard(c, CARD.x, CARD.y, CARD.w), { op: cl(p * 2).toFixed(3) }) +
    rise(c, 160, 470, 'A file,', { f: D, w: 700, size: 96, ls: -3 }, A(t, 39.85, 0.6)) +
    rise(c, 160, 570, 'not a first', { f: D, w: 700, size: 96, ls: -3 }, A(t, 39.95, 0.6)) +
    rise(c, 160, 670, 'draft.', { f: D, w: 700, size: 96, ls: -3 }, A(t, 40.05, 0.6)) +
    fade(ML(160, 800, 'Ready to upload · Day 3', { size: 15, fill: C.amber }), A(t, 40.5, 0.4));
  // shape transition: thumbnail floods teal, then folds into the b-roll prompt box
  if (exit > 0) {
    const thumb = [CARD.x + 14, CARD.y + 14, CARD.w - 28, CARD.w * 9 / 16 - 28];
    const r = collapse > 0 ? lr([0, 0, W, H], [160, 430, 1600, 150], collapse) : lr(thumb, [0, 0, W, H], exit);
    out += rectOf(...r, collapse > 0 ? L(0, 16, collapse) : L(10, 0, exit), { fill: C.teal, op: L(1, 0.12, collapse).toFixed(3) }) +
      (collapse > 0 ? rectOf(...r, L(0, 16, collapse), { stroke: C.teal, sw: 1.5, op: collapse.toFixed(3) }) : '');
  }
  return out;
});

// S21 AI b-roll: type the shot
const PROMPT = 'our serum bottle, in a hand, on wet marble, morning light';
const GEN = [1500, 610, 260, 64];
scene(43.0, 45.75, (t, c) => {
  const n = Math.round(PROMPT.length * A(t, 43.55, 1.1, E.lin)), txt = PROMPT.slice(0, n);
  const click = Math.sin(Math.PI * cl((t - 45.45) / 0.18));
  const cx = L(1300, 1660, A(t, 44.85, 0.55, E.inout)), cy = L(930, 650, A(t, 44.85, 0.55, E.inout));
  return fade(tag(160, 170, 'Self serve', C.teal), A(t, 43.1, 0.3)) +
    fade(T(1760, 196, 'CREDITS  240', { f: M, w: 500, size: 18, fill: C.t2, anchor: 'end', ls: 2 }), A(t, 43.2, 0.3)) +
    rise(c, 160, 320, 'AI b-roll, on demand.', { f: D, w: 600, size: 72, ls: -2 }, A(t, 43.15, 0.6)) +
    R(160, 430, 1600, 150, { r: 16, fill: C.s1, stroke: C.teal, sw: 1.5 }) +
    T(210, 522, txt, { f: S, size: 40 }) + (n < PROMPT.length || Math.floor(t * 2.6) % 2 === 0 ? R(216 + tw(txt, 40, 400, S), 486, 4, 50, { fill: C.teal }) : '') +
    ['1080p', '10 s', '16:9', '12.5 credits'].map((o, i) => G(scaleAt(160 + i * 170 + 50, 625, 1, Math.max(0.001, A(t, 44.7 + i * 0.07, 0.35, E.over))), pill(160 + i * 170, 610, o, { state: i === 3 ? 'active' : 'done', color: C.teal }).svg)).join('') +
    pop(R(GEN[0], GEN[1] + 2 * click, GEN[2], GEN[3], { r: 10, fill: click > 0 ? '#36A2AD' : C.teal }) + T(1630, 652 + 2 * click, 'Generate', { f: S, w: 600, size: 24, fill: C.bg, anchor: 'middle' }), 1630, 642, A(t, 44.8, 0.4, E.over)) +
    fade(ML(160, 780, 'The shots stock libraries do not have', { size: 15 }), A(t, 44.9, 0.4)) +
    fade(cursor(cx, cy, 1.3 * (1 - 0.08 * click)), A(t, 44.85, 0.2) * (1 - A(t, 45.6, 0.15)));
});

// S22 the button blooms into the generated clip, which then shrinks into a phone
const PHONE_MID = [790, 200, 340, 604];
scene(45.75, 49.0, (t, c) => {
  const open = A(t, 45.75, 0.75, E.inout), close = A(t, 48.5, 0.5, E.inout);
  const r = close > 0 ? lr([0, 0, W, H], PHONE_MID, close) : lr(GEN, [0, 0, W, H], open);
  const rad = close > 0 ? L(0, 27, close) : L(10, 0, open);
  const push = L(1.0, 1.05, A(t, 45.75, 3.2, E.lin));
  const ui = A(t, 46.45, 0.5) * (1 - A(t, 48.35, 0.2));
  return G(null, G(scaleAt(W / 2, H / 2, push), serumShot(c, 0, 0, W, H)) +
    G(null, R(0, H - 260, W, 260, { fill: grad(c, [[0, '#000', 0], [1, '#000', 0.7]]) }) +
      tag(80, 80, 'Self serve', C.teal, true) +
      rise(c, 80, H - 130, 'Type the shot. Keep the shot.', { f: D, w: 700, size: 64, ls: -2 }, A(t, 46.5, 0.6)) +
      rise(c, 80, H - 80, 'Two free re-rolls a clip. We eat the failures.', { f: S, size: 24, fill: C.t2 }, A(t, 46.65, 0.6)) +
      fade(R(1360, H - 190, 480, 110, { r: 14, fill: C.bg, op: 0.85 }) + ML(1390, H - 150, 'MP4 · 1080p · 0:10', { size: 15, fill: C.text }) +
        ML(1390, H - 112, 'In your library · 3 min', { size: 13, fill: C.teal }) + R(1700, H - 170, 116, 70, { r: 10, fill: C.teal }) +
        T(1758, H - 126, '↓', { f: S, w: 600, size: 34, fill: C.bg, anchor: 'middle' }), A(t, 46.8, 0.45), 30), { op: ui.toFixed(3) }),
    { clip: clipBox(c, ...r, rad) });
});

// S23 UGC hooks: the clip is now the middle phone; two more flip in beside it
const PALS = [['#4A3F3A', '#1E1A18', '#C99A7A', '#2A1E16', '#7A8F6B'], ['#3A4452', '#171B22', '#8D5E42', '#1A1410', '#D9A441'], ['#4A3A4F', '#1B161E', '#E0B394', '#6B3A1E', '#3FB8C4'], ['#3D4A40', '#161C18', '#B07E5E', '#222', '#E2634A']];
const HOOKS = [[440, 'Hook 01', 'I was so wrong about serums', 0], [790, 'Hook 02', 'POV: 6am, no filter', 1], [1140, 'Hook 03', 'okay this actually worked', 2]];
scene(49.0, 52.5, (t, c) => {
  const exit = A(t, 52.2, 0.3, E.in);
  let out = fade(tag(160, 170, 'We run it · UGC ads', C.coral), A(t, 49.1, 0.3) * (1 - exit));
  HOOKS.forEach(([x, label, cap, k], i) => {
    const flip = i === 1 ? 1 : A(t, 49.1 + (i === 0 ? 0 : 0.15), 0.5, E.over);
    const capP = A(t, 49.35 + i * 0.12, 0.4);
    const prog = ((t - 49) * 0.22 + i * 0.3) % 1;
    out += G(scaleAt(x + 170, 502, Math.max(0.001, flip), 1), phone(c, x, 200, 340, 604, { label, caption: capP > 0.5 ? cap : '', prop: true, pal: PALS[k], prog }), { op: (cl(flip * 3) * (1 - exit)).toFixed(3) });
  });
  return out + fade(ML(W / 2, 880, 'Synthetic cast only · AI label on screen', { size: 15, anchor: 'middle' }), A(t, 49.8, 0.4) * (1 - exit));
});

// S24 one concept, twelve ads — grid builds outward, camera pulls back; then all twelve morph into one player
const GRID = []; for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) GRID.push({ r, k, x: 160 + k * 272, y: 250 + r * 380 });
const EN = [660, 250, 600, 337.5];
scene(52.5, 56.0, (t, c) => {
  const cam = L(1.14, 1, A(t, 52.5, 1.4, E.inout));
  const labels = ['Hook 01', 'Hook 02', 'Hook 03', 'Demo 01', 'Demo 02', 'Payoff'];
  const order = GRID.map((g, i) => [i, Math.hypot(g.x + 100 - 960, g.y + 178 - 540)]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
  const merge = A(t, 55.3, 0.6, E.inout);
  let shown = 0, out = '';
  order.forEach((gi, rank) => {
    const g = GRID[gi], s = 52.65 + rank * 0.07, p = A(t, s, 0.45, E.over);
    if (t > s + 0.1) shown++;
    if (p <= 0) return;
    const r = lr([g.x, g.y, 200, 356], EN, merge);
    const sx = r[2] / 200, sy = r[3] / 356;
    out += G(`translate(${r[0].toFixed(1)} ${r[1].toFixed(1)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(${-g.x} ${-g.y})`,
      G(scaleAt(g.x + 100, g.y + 178, Math.max(0.001, p)), phone(c, g.x, g.y, 200, 356, { label: labels[g.k], pal: PALS[(g.k + g.r) % 4], prop: g.k > 2, prog: ((t - 52) * 0.25 + gi * 0.13) % 1 })),
      { op: (cl(p * 3) * (1 - A(t, 55.6, 0.3))).toFixed(3) });
  });
  return G(scaleAt(W / 2, H / 2, cam), out) +
    G(null, fade(tag(160, 110, 'We run it · UGC ads', C.coral), A(t, 52.6, 0.3)) +
      fade(T(1760, 136, `1 concept → ${shown} ads`, { f: M, w: 500, size: 26, fill: C.coral, anchor: 'end' }), A(t, 52.7, 0.3)) +
      rise(c, 160, 210, 'Vertical ads that look shot, not generated.', { f: D, w: 600, size: 48, ls: -1.5 }, A(t, 52.75, 0.6)), { op: (1 - merge).toFixed(3) }) +
    (merge > 0.6 ? G(null, player(c, ...EN, panamaMap(c, ...EN), { prog: 0.4, r: 14 }), { op: ((merge - 0.6) / 0.4).toFixed(3) }) : '');
});

// S25 nine languages — clones fly out of the English master
const LANGS = [['DE', 160, 250], ['FR', 400, 250], ['ES', 160, 520], ['PT', 400, 520], ['IT', 1320, 250], ['PL', 1560, 250], ['ID', 1320, 520], ['DA', 1560, 520]];
function langPlayer(c, x, y, w, code, seed, main, t, op = 1) {
  const hh = w * 9 / 16;
  return G(null, player(c, x, y, w, hh, panamaMap(c, x, y, w, hh, { quiet: !main }), { prog: 0.4, r: main ? 14 : 10 }) +
    R(x + 12, y + 12, main ? 70 : 52, main ? 38 : 30, { r: 4, fill: main ? C.green : C.bg, op: 0.92 }) +
    T(x + 12 + (main ? 35 : 26), y + (main ? 38 : 33), code, { f: M, w: 500, size: main ? 20 : 15, fill: main ? C.bg : C.text, anchor: 'middle' }) +
    wave(x, y + hh + (main ? 36 : 24), w, main ? 44 : 26, main ? 90 : 50, seed, main ? C.green : C.t2, t), { op });
}
scene(56.0, 62.0, (t, c) => {
  const exit = A(t, 61.6, 0.4, E.in);
  let out = langPlayer(c, EN[0], EN[1], EN[2], 'EN', 2, true, t);
  LANGS.forEach(([code, x, y], i) => {
    const p = A(t, 56.5 + i * 0.07, 0.65);
    if (p <= 0) return;
    const fx = x + 100, fy = y + 70, cx = L(960, fx, p), cy = L(419, fy, p), s = L(0.3, 1, p);
    out += G(`translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${s.toFixed(3)}) translate(${-fx} ${-fy})`, langPlayer(c, x, y, 200, code, i + 20, false, t + i), { op: cl(p * 2).toFixed(3) });
  });
  out += rise(c, W / 2, 880, 'Upload it nine times, not once.', { f: D, w: 600, size: 72, anchor: 'middle', ls: -2 }, A(t, 57.6, 0.7)) +
    fade(ML(W / 2, 940, 'Same edit · new voice · nine languages', { size: 15, anchor: 'middle', fill: C.green }), A(t, 58.0, 0.5));
  return G(null, out, { op: (1 - exit).toFixed(3) });
});

// S26 thumbnail: the strip scrolls, the brackets pick a frame, it lifts into the thumbnail
const THUMB = [560, 420, 800, 450];
scene(62.0, 65.0, (t, c) => {
  const scroll = L(1100, 0, A(t, 62.0, 1.0, E.out));
  let strip = '';
  for (let i = 0; i < 7; i++) {
    const x = 110 + i * 250 + scroll;
    strip += i % 3 === 1 ? archivePhoto(c, x, 170, 230, 150, { caption: '1914' }) : panamaMap(c, x, 180, 230, 130, { r: 6, quiet: true });
  }
  const lift = A(t, 63.3, 0.65, E.inout);
  const tr = lr([610, 180, 230, 130], THUMB, lift);
  const morph = A(t, 64.65, 0.45, E.inout);
  const btn = [W / 2 - 220, H / 2 - 20, 440, 84];
  const fr = morph > 0 ? lr(THUMB, btn, morph) : tr;
  let out = G(null, strip, { op: (1 - morph).toFixed(3) }) +
    brackets(...lr([560, 120, 330, 240], [590, 155, 270, 180], A(t, 62.95, 0.4, E.over)), { len: 24, sw: 5, op: (A(t, 62.95, 0.1) * (1 - morph)).toFixed(3) });
  if (lift > 0) {
    const sx = fr[2] / 800, sy = fr[3] / 450;
    out += G(`translate(${fr[0].toFixed(1)} ${fr[1].toFixed(1)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(-560 -420)`,
      panamaMap(c, 560, 420, 800, 450, { r: 12, quiet: true }) +
      pop(T(600, 760, 'PANAMA', { f: D, w: 800, size: 120, fill: '#111', ls: -4 }), 790, 720, A(t, 63.95, 0.35, E.over), 1.4) +
      pop(T(600, 850, 'RAN DRY', { f: D, w: 800, size: 120, fill: C.coral, ls: -4 }), 820, 810, A(t, 64.07, 0.35, E.over), 1.4) +
      R(560, 420, 800, 450, { r: 12, stroke: C.text, sw: 2 }), { op: (1 - morph * 0.2).toFixed(3) });
    if (morph > 0) out += rectOf(...fr, L(12, 10, morph), { fill: C.green, op: morph.toFixed(3) });
  }
  out += G(null, fade(P('M725 340 C 760 420, 820 450, 900 470', { stroke: C.green, sw: 2, dash: '4 6' }), A(t, 63.7, 0.3)) +
    fade(tag(1400, 440, 'Drawn by a person', C.green), A(t, 64.1, 0.3)) +
    rise(c, 1400, 520, 'From a frame', { f: S, size: 26, fill: C.t2 }, A(t, 64.15, 0.5)) +
    rise(c, 1400, 556, 'actually in the film.', { f: S, size: 26, fill: C.t2 }, A(t, 64.22, 0.5)) +
    fade(T(1400, 620, 'No prompt. No six-fingered hands.', { f: S, size: 20, fill: C.t3 }), A(t, 64.3, 0.3)), { op: (1 - morph).toFixed(3) });
  return out;
});

// S27 the old loop ghosts in and is swallowed by one button
scene(65.0, 67.0, (t, c) => {
  let out = '';
  RING.forEach((l, i) => {
    const [x, y] = ringPos(i, 560, 300);
    const inP = A(t, 65.0 + i * 0.04, 0.35), suck = A(t, 65.55 + i * 0.05, 0.5, E.in);
    if (suck >= 1) return;
    out += loopCard(L(x, W / 2, suck), L(y, H / 2 + 22, suck), l, `0${i + 1}`, { grey: true, s: L(0.75, 0.05, suck), w: 340, op: (0.3 * inP).toFixed(3) });
  });
  const click = Math.sin(Math.PI * cl((t - 66.35) / 0.18));
  const cx = L(1400, W / 2 + 120, A(t, 65.85, 0.45, E.inout)), cy = L(900, H / 2 + 36, A(t, 65.85, 0.45, E.inout));
  [0, 0.12].forEach(d => { const r = cl((t - 66.4 - d) / 0.6); if (r > 0 && r < 1) out += Ci(W / 2, H / 2 + 22, L(80, 420, E.out(r)), { stroke: C.green, sw: 2, op: 1 - r }); });
  const bloom = A(t, 66.75, 0.25, E.in);
  out += G(scaleAt(W / 2, H / 2 + 22, 1 - 0.04 * click + bloom * 0.1),
    R(W / 2 - 220, H / 2 - 20, 440, 84, { r: 10, fill: C.green }) + fade(T(W / 2, H / 2 + 34, 'Send us a script  →', { f: S, w: 600, size: 32, fill: C.bg, anchor: 'middle' }), A(t, 65.1, 0.3)), { op: (1 - bloom).toFixed(3) });
  return out + fade(cursor(cx, cy, 1.4 * (1 - 0.08 * click)), A(t, 65.85, 0.2) * (1 - A(t, 66.75, 0.2)));
});

// S28 you approve — the Approve button then expands into the end-card brackets
const APPROVE = [930, 718, 200, 74], END_BR = [W / 2 - 290, 200, 580, 320];
scene(67.0, 69.5, (t, c) => {
  const click = Math.sin(Math.PI * cl((t - 68.05) / 0.18)), ticked = A(t, 68.1, 0.3, E.inout);
  const cx = L(1300, 1080, A(t, 67.6, 0.45, E.inout)), cy = L(950, 770, A(t, 67.6, 0.45, E.inout));
  const exit = A(t, 69.15, 0.35, E.inout);
  let out = G(null,
    rise(c, 160, 420, 'You approve.', { f: D, w: 700, size: 130, ls: -4 }, A(t, 67.05, 0.6)) +
    rise(c, 160, 560, 'You don\'t assemble.', { f: D, w: 700, size: 130, ls: -4, fill: C.t3 }, A(t, 68.15, 0.6)) +
    fade(R(160, 680, 1000, 150, { r: 16, fill: C.s1, stroke: C.line2 }) + R(190, 712, 150, 86, { r: 8, fill: '#4DB37E', op: 0.6 }) +
      T(370, 748, 'panama-canal_final.mp4', { f: M, w: 500, size: 24 }) + ML(370, 790, '58:24 · 1080p · Ready to upload', { size: 14 }), A(t, 67.3, 0.5), 30) +
    fade(cursor(cx, cy, 1.3 * (1 - 0.08 * click)), A(t, 67.6, 0.2) * (1 - A(t, 68.6, 0.2))), { op: (1 - exit).toFixed(3) });
  // the Approve button: fills, ticks, then becomes the end-card frame
  const r = lr(APPROVE, END_BR, exit);
  const btn = A(t, 67.4, 0.4, E.over);
  out += G(null, rectOf(r[0], r[1] + 2 * click, r[2], r[3], L(10, 4, exit), { fill: C.green, op: (1 - exit).toFixed(3) }) +
    (exit > 0 ? brackets(...r, { len: L(20, 56, exit), sw: 8, op: exit.toFixed(3) }) : '') +
    G(null, P('M960 755L968 763L984 745', { stroke: C.bg, sw: 4, cap: 'round', join: 'round', dash: `30`, op: ticked.toFixed(3) }) +
      T(1060, 765 + 2 * click, 'Approve', { f: S, w: 600, size: 24, fill: C.bg, anchor: 'middle' }), { op: (1 - exit).toFixed(3) }), { op: cl(btn * 2).toFixed(3) });
  return out;
});

// S29 end card
scene(69.5, 72.01, (t, c) => {
  const out = aurora(c, A(t, 69.5, 0.8), t * 50) + brackets(...END_BR, { len: 56, sw: 8 }) +
    wordmark(c, W / 2, 425, 190, t, 69.6) +
    rise(c, W / 2, 640, 'Your first video is free.', { f: D, w: 600, size: 72, anchor: 'middle', ls: -2 }, A(t, 70.05, 0.7)) +
    fade(T(W / 2, 710, 'scalewithbrew.com', { f: M, w: 500, size: 28, fill: C.green, anchor: 'middle', ls: 1 }), A(t, 70.3, 0.5), 12) +
    [['YouTube videos', C.amber], ['AI b-roll', C.teal], ['UGC ads', C.coral]].map(([l, col], i) => {
      const x = W / 2 - 390 + i * 280;
      return fade(Ci(x, 820, 7, { fill: col }) + T(x + 20, 828, l, { f: S, w: 500, size: 24, fill: C.t2 }), A(t, 70.5 + i * 0.07, 0.4), 12);
    }).join('') + fade(ML(W / 2, 920, 'Scale With Brew · Every frame watched by a person', { size: 13, anchor: 'middle', ls: 3 }), A(t, 70.75, 0.5));
  return out;
});

// ---------- compose ----------
export function render(t) {
  const c = ctx('f');
  let body = dotsBg(c);
  for (const s of SC) if (t >= s.s && t < s.e) body += s.f(t, c);
  const shown = t >= 5.5 && t < 6.2 ? 5.5 : t;
  body += ruler(t, Math.min(shown, DURATION)) + stepper(t);
  const black = A(t, 71.35, 0.65, E.inout);
  if (black > 0) body += R(0, 0, W, H, { fill: '#000', op: black.toFixed(3) });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${c.defs.join('')}</defs>${body}</svg>`;
}
