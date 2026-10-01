// Shared drawing helpers for the brew storyboard. Everything emits plain SVG
// (presentation attributes, no CSS classes) so frames import cleanly into Figma.

export const C = {
  bg: '#0B0B0C', s1: '#131316', s2: '#1A1A1E', line: '#26262B', line2: '#35353C',
  text: '#F2F2F0', t2: '#B4B4B8', t3: '#8A8A91',
  green: '#3EAF75', greenL: '#8FD8B0', amber: '#D9A441', teal: '#3FB8C4', coral: '#E2634A',
};
export const D = 'Bricolage Grotesque', S = 'Archivo', M = 'IBM Plex Mono';
export const W = 1920, H = 1080, FILM = 72;

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const rng = seed => () => {
  seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

const a = (k, v) => (v === undefined || v === null || v === false ? '' : ` ${k}="${v}"`);

export const T = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" font-family="${o.f || S}" font-size="${o.size || 24}" font-weight="${o.w || 400}" fill="${o.fill || C.text}"` +
  a('text-anchor', o.anchor) + a('letter-spacing', o.ls) + a('opacity', o.op) + a('transform', o.tr) + `>${esc(s)}</text>`;

// Multi-style line: parts = [[string, {fill, w, f, op}], ...]
export const TS = (x, y, parts, o = {}) =>
  `<text x="${x}" y="${y}" font-family="${o.f || S}" font-size="${o.size || 24}" font-weight="${o.w || 400}" fill="${o.fill || C.text}"` +
  a('text-anchor', o.anchor) + a('letter-spacing', o.ls) + a('opacity', o.op) + '>' +
  parts.map(([s, p = {}]) => `<tspan${a('fill', p.fill)}${a('font-weight', p.w)}${a('font-family', p.f)}${a('opacity', p.op)}>${esc(s)}</tspan>`).join('') +
  '</text>';

export const R = (x, y, w, h, o = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}"` + a('rx', o.r) + ` fill="${o.fill || 'none'}"` +
  (o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 1}"` : '') + a('stroke-dasharray', o.dash) +
  a('fill-opacity', o.fop) + a('opacity', o.op) + a('transform', o.tr) + '/>';
export const Ln = (x1, y1, x2, y2, o = {}) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke || C.line2}" stroke-width="${o.sw || 1}"` +
  a('stroke-dasharray', o.dash) + a('opacity', o.op) + a('stroke-linecap', o.cap) + '/>';
export const Ci = (x, y, r, o = {}) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${o.fill || 'none'}"` + (o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 1}"` : '') +
  a('opacity', o.op) + a('stroke-dasharray', o.dash) + '/>';
export const P = (d, o = {}) =>
  `<path d="${d}" fill="${o.fill || 'none'}"` + (o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 1}"` : '') +
  a('stroke-linecap', o.cap) + a('stroke-linejoin', o.join) + a('stroke-dasharray', o.dash) + a('opacity', o.op) + a('transform', o.tr) + '/>';
export const LAYER = (name, svg) => `<g data-layer="${esc(String(name).slice(0, 60))}">${svg}</g>`;
export const G = (tr, inner, o = {}) => `<g${a('transform', tr)}${a('opacity', o.op)}${a('clip-path', o.clip)}>${inner}</g>`;

export const monoW = (s, size, ls = 0) => s.length * (size * 0.6 + ls);
export const ML = (x, y, s, o = {}) =>
  T(x, y, String(s).toUpperCase(), { f: M, size: o.size || 14, ls: o.ls ?? 2, fill: o.fill || C.t3, w: o.w || 500, anchor: o.anchor, op: o.op });

// Context per frame: unique ids for defs so frames can share one board SVG.
export function ctx(id) {
  let k = 0;
  const defs = [];
  return { id, defs, uid: p => `${id}-${p}${k++}`, def: s => defs.push(s) };
}

// ---------- brand components ----------

export function pill(x, y, label, o = {}) {
  const size = o.size || 13, ls = 1.5, pad = 14;
  const w = monoW(label, size, ls) + pad * 2 - ls, h = size + 17;
  const col = o.color || C.green;
  let out = '';
  if (o.state === 'active') out += R(x, y, w, h, { r: h / 2, fill: col, fop: 0.14, stroke: col, sw: 1.2 });
  else out += R(x, y, w, h, { r: h / 2, stroke: o.state === 'done' ? C.line2 : C.line, sw: 1 });
  const fill = o.state === 'active' ? col : o.state === 'done' ? C.t2 : C.t3;
  out += T(x + pad, y + h / 2 + size * 0.36, label.toUpperCase(), { f: M, size, ls, fill, w: 500 });
  return { svg: out, w, h };
}

function tag__raw(x, y, label, color, filled = false, size = 13) {
  const ls = 1.5, pad = 10, w = monoW(label, size, ls) + pad * 2 - ls, h = size + 13;
  return R(x, y, w, h, { r: 4, fill: filled ? color : 'none', stroke: color, sw: 1.2 }) +
    T(x + pad, y + h / 2 + size * 0.36, label.toUpperCase(), { f: M, size, ls, fill: filled ? C.bg : color, w: 500 });
}

export const STEPS = ['Topic', 'Research', 'Script', 'Voice', 'Edit', 'Reviewed', 'Delivered'];
export function stepper(active, y = 96, cx = W / 2) {
  const items = STEPS.map((s, i) => ({ s, st: i < active ? 'done' : i === active ? 'active' : 'idle' }));
  const gap = 10;
  const widths = items.map(it => pill(0, 0, it.s).w);
  let x = cx - (widths.reduce((p, c) => p + c, 0) + gap * (items.length - 1)) / 2;
  return items.map((it, i) => { const p = pill(x, y, it.s, { state: it.st }); x += widths[i] + gap; return p.svg; }).join('');
}

function brackets__raw(x, y, w, h, o = {}) {
  const l = o.len || 48, col = o.color || C.green;
  const d = `M${x} ${y + l}V${y}H${x + l}M${x + w - l} ${y}H${x + w}V${y + l}M${x + w} ${y + h - l}V${y + h}H${x + w - l}M${x + l} ${y + h}H${x}V${y + h - l}`;
  return P(d, { stroke: col, sw: o.sw || 6, cap: 'square', op: o.op });
}

const cursor__raw = (x, y, s = 1, op) =>
  P('M0 0L0 30L8 23L13.5 35L18.5 32.8L13 21L23 21Z', { fill: C.text, stroke: C.bg, sw: 1.6, join: 'round', tr: `translate(${x} ${y}) scale(${s})`, op });

const check__raw = (x, y, r = 14, col = C.green) =>
  Ci(x, y, r, { fill: col }) + P(`M${x - r * 0.42} ${y + r * 0.02}L${x - r * 0.1} ${y + r * 0.34}L${x + r * 0.45} ${y - r * 0.3}`, { stroke: C.bg, sw: r * 0.2, cap: 'round', join: 'round' });
const cross__raw = (x, y, r = 14, col = C.coral) =>
  Ci(x, y, r, { fill: col }) + P(`M${x - r * 0.35} ${y - r * 0.35}L${x + r * 0.35} ${y + r * 0.35}M${x + r * 0.35} ${y - r * 0.35}L${x - r * 0.35} ${y + r * 0.35}`, { stroke: C.bg, sw: r * 0.2, cap: 'round' });

export function waveform(x, cy, w, h, n, seed, col = C.green, o = {}) {
  const r = rng(seed), bw = (w / n) * (o.fill ?? 0.55);
  let out = '';
  for (let i = 0; i < n; i++) {
    const env = o.flat ? 0.7 : 0.35 + 0.65 * Math.abs(Math.sin((i / n) * Math.PI * (o.waves || 3) + seed));
    const v = Math.max(0.06, env * (0.3 + 0.7 * r())) * h;
    out += R((x + (i * w) / n).toFixed(1), (cy - v / 2).toFixed(1), bw.toFixed(1), v.toFixed(1), { r: Math.min(bw / 2, 3), fill: col });
  }
  return G(null, out, { op: o.op });
}

export function aurora(c, strength = 1) {
  const id = c.uid('aur');
  c.def(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.green}" stop-opacity="0"/><stop offset="0.5" stop-color="${C.green}" stop-opacity="${0.16 * strength}"/><stop offset="1" stop-color="${C.green}" stop-opacity="0"/></linearGradient>`);
  const beams = [[180, 120], [520, 60], [980, 160], [1420, 80], [1760, 120]];
  return beams.map(([x, w], i) => `<polygon points="${x},0 ${x + w},0 ${x + w - 420},${H} ${x - 420},${H}" fill="url(#${id})" opacity="${[0.9, 0.5, 1, 0.6, 0.8][i]}"/>`).join('');
}

export function dots(c, op = 0.07) {
  const id = c.uid('dots');
  c.def(`<pattern id="${id}" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="16" cy="16" r="1.2" fill="${C.text}" fill-opacity="${op}"/></pattern>`);
  return R(0, 0, W, H, { fill: `url(#${id})` });
}

export const tc = (t, fps = 24) => {
  const s = Math.floor(t), f = Math.round((t - s) * fps), p = n => String(n).padStart(2, '0');
  return `00:${p(Math.floor(s / 60))}:${p(s % 60)}:${p(f)}`;
};

export function ruler(t) {
  let out = Ln(0, 46, W, 46, { stroke: C.line2 });
  for (let x = 24; x < W; x += 96) out += Ln(x, 46, x, x % 480 === 24 ? 36 : 41, { stroke: C.line2 });
  const px = 24 + (W - 48) * (t / FILM);
  out += Ln(px, 26, px, 58, { stroke: C.green, sw: 2 }) + `<polygon points="${px - 6},26 ${px + 6},26 ${px},33" fill="${C.green}"/>`;
  out += T(24, 26, tc(t), { f: M, size: 13, fill: C.green, ls: 1 }) + T(W - 24, 26, tc(FILM), { f: M, size: 13, fill: C.t3, ls: 1, anchor: 'end' });
  return out;
}

export function clipRect(c, x, y, w, h, r = 0) {
  const id = c.uid('clip');
  c.def(`<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath>`);
  return `url(#${id})`;
}

export function grad(c, stops, o = {}) {
  const id = c.uid('gr');
  const [x1, y1, x2, y2] = o.dir || [0, 0, 0, 1];
  c.def(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([off, col, op = 1]) => `<stop offset="${off}" stop-color="${col}" stop-opacity="${op}"/>`).join('')}</linearGradient>`);
  return `url(#${id})`;
}
export function rgrad(c, stops, o = {}) {
  const id = c.uid('rg');
  c.def(`<radialGradient id="${id}" cx="${o.cx ?? 0.5}" cy="${o.cy ?? 0.5}" r="${o.r ?? 0.7}">${stops.map(([off, col, op = 1]) => `<stop offset="${off}" stop-color="${col}" stop-opacity="${op}"/>`).join('')}</radialGradient>`);
  return `url(#${id})`;
}

export function wrap(text, max) {
  const words = String(text).split(/\s+/), lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) { if (cur) lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

// Named layers (data-layer) so the After Effects exporter can split frames into elements.
export const brackets = (...a) => LAYER('Brackets', brackets__raw(...a));
export const cursor = (...a) => LAYER('Cursor', cursor__raw(...a));
export const check = (...a) => LAYER('Check', check__raw(...a));
export const cross = (...a) => LAYER('Cross', cross__raw(...a));
export const tag = (...a) => LAYER(`Tag · ${a[2]}`, tag__raw(...a));
