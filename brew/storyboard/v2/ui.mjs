// brew Studio — an imagined product UI for the cinematic launch storyboard (v2).
// Built from the site's tokens; every screen is plain SVG so it imports into Figma.
import { C, D, S, M, W, H, T, TS, R, Ln, Ci, P, G, ML, pill, tag, brackets, cursor, check, waveform, grad, rgrad, clipRect, STEPS } from '../lib.mjs';
import { panamaMap, archivePhoto, skyline, serumShot, phone, player } from '../art.mjs';

export const glow = (c, cx, cy, rx, ry, col = C.green, op = 0.35) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${rgrad(c, [[0, col, op], [1, col, 0]])}"/>`;

// Glass-edged window with a lit top border and soft shadow plate.
export function windowFrame(c, x, y, w, h, inner, o = {}) {
  const clip = clipRect(c, x, y, w, h, 18);
  const edge = grad(c, [[0, '#FFFFFF', 0.22], [0.25, '#FFFFFF', 0.06], [1, '#FFFFFF', 0.02]]);
  return R(x + 30, y + 50, w - 60, h, { r: 24, fill: '#000', op: 0.55 }) +
    G(null, R(x, y, w, h, { fill: C.s1 }) +
      R(x, y, w, 44, { fill: '#17171B' }) + Ln(x, y + 44, x + w, y + 44, { stroke: C.line }) +
      [0, 1, 2].map(i => Ci(x + 24 + i * 20, y + 22, 6, { fill: C.line2 })).join('') +
      T(x + w / 2, y + 28, o.title || 'brew Studio', { f: M, size: 13, fill: C.t3, anchor: 'middle', ls: 1 }) + inner, { clip }) +
    R(x, y, w, h, { r: 18, stroke: edge, sw: 1.5 });
}

const NAV = ['New video', 'In production', 'Review', 'Library', 'Languages', 'AI b-roll', 'UGC ads'];
export function sidebar(x, y, h, active) {
  let out = R(x, y, 260, h, { fill: '#101013' }) + Ln(x + 260, y, x + 260, y + h, { stroke: C.line }) +
    TS(x + 28, y + 52, [['br'], ['e', { fill: C.green }], ['w']], { f: D, w: 800, size: 30, ls: -1 });
  NAV.forEach((n, i) => {
    const ny = y + 104 + i * 46, on = n === active;
    out += (on ? R(x + 14, ny - 26, 232, 38, { r: 8, fill: C.green, fop: 0.12 }) : '') +
      Ci(x + 34, ny - 7, 4, { fill: on ? C.green : C.line2 }) + T(x + 50, ny, n, { f: S, size: 16, w: on ? 600 : 400, fill: on ? C.text : C.t2 }) +
      (n === 'In production' ? R(x + 200, ny - 20, 30, 22, { r: 11, fill: C.s2 }) + T(x + 215, ny - 4, '3', { f: M, size: 12, fill: C.t2, anchor: 'middle' }) : '');
  });
  out += R(x + 14, y + h - 84, 232, 64, { r: 10, fill: C.s2 }) + ML(x + 30, y + h - 56, 'Minutes left', { size: 11 }) +
    T(x + 30, y + h - 32, '642 / 700', { f: M, w: 500, size: 16, fill: C.text }) + R(x + 150, y + h - 40, 80, 6, { r: 3, fill: C.line2 }) + R(x + 150, y + h - 40, 74, 6, { r: 3, fill: C.green });
  return out;
}

// Screens: each draws inside the main area (x, y, w, h).
export function screenNew(c, x, y, w, h, o = {}) {
  const typed = o.typed ?? 'Why the Panama Canal ran short of water';
  return ML(x + 48, y + 64, 'New video', { size: 12, fill: C.green }) +
    T(x + 48, y + 120, 'What should we make?', { f: D, w: 700, size: 44, ls: -1.5 }) +
    T(x + 48, y + 156, 'A finished script, or one line about the idea. Both work.', { f: S, size: 18, fill: C.t3 }) +
    R(x + 48, y + 196, w - 96, 120, { r: 14, fill: C.bg, stroke: C.green, sw: 1.5 }) +
    T(x + 80, y + 268, typed, { f: S, size: 30, w: 500 }) +
    [['Length', '10 min'], ['Style', 'Visual explainer'], ['Voice', 'Ours'], ['Languages', '9']].map(([k, v], i) => {
      const cx = x + 48 + i * ((w - 96) / 4);
      return R(cx, y + 344, (w - 96) / 4 - 14, 76, { r: 12, fill: C.s2, stroke: C.line }) + ML(cx + 18, y + 372, k, { size: 11 }) + T(cx + 18, y + 404, v, { f: S, w: 600, size: 20 });
    }).join('') +
    R(x + w - 300, y + 452, 252, 60, { r: 10, fill: C.green }) + T(x + w - 174, y + 490, 'Send to brew  →', { f: S, w: 600, size: 20, fill: C.bg, anchor: 'middle' }) +
    T(x + 48, y + 490, 'First video free · up to ten minutes', { f: M, size: 13, fill: C.t3 });
}

export function pipelineRow(x, y, active, o = {}) {
  let px = x, out = '';
  STEPS.forEach((s, i) => {
    const p = pill(px, y, s, { state: i < active ? 'done' : i === active ? 'active' : 'idle', size: o.size || 12 });
    out += p.svg; px += p.w + 8;
  });
  return out;
}

export function screenProduction(c, x, y, w, h, o = {}) {
  const feed = [['Research', '14 sources checked against the script', '09:12'], ['Script', 'v1 ready · 6 beats · in your channel\'s voice', '11:40'],
    ['Voice', 'Recorded · 00:54', '13:05'], ['Edit', 'Assembling · map, archive, lock diagram', 'now']];
  return ML(x + 48, y + 64, 'In production', { size: 12, fill: C.green }) +
    T(x + 48, y + 116, 'Why the Panama Canal ran short of water', { f: D, w: 700, size: 36, ls: -1 }) +
    T(x + w - 48, y + 112, 'Day 2 of 3', { f: M, w: 500, size: 18, fill: C.amber, anchor: 'end' }) +
    pipelineRow(x + 48, y + 146, o.active ?? 4) +
    R(x + 48, y + 214, w - 96, 10, { r: 5, fill: C.line }) + R(x + 48, y + 214, (w - 96) * (o.prog ?? 0.62), 10, { r: 5, fill: C.green }) +
    feed.map(([k, v, tm], i) => {
      const fy = y + 280 + i * 74;
      return Ln(x + 48, fy + 30, x + w - 48, fy + 30, { stroke: C.line }) + (tm === 'now' ? Ci(x + 60, fy - 6, 7, { fill: C.green }) : check(x + 60, fy - 6, 10)) +
        T(x + 86, fy, k, { f: S, w: 600, size: 20 }) + T(x + 220, fy, v, { f: S, size: 18, fill: C.t2 }) + T(x + w - 48, fy, tm, { f: M, size: 14, fill: tm === 'now' ? C.green : C.t3, anchor: 'end' });
    }).join('');
}

export function screenReview(c, x, y, w, h, o = {}) {
  const pw = w - 420, ph = pw * 9 / 16;
  const items = ['Named people match the narration', 'Places dated and sourced', 'Numbers legible on pause', 'Voice matches the script', 'Pacing holds attention', 'Watched start to finish'];
  return ML(x + 48, y + 64, 'Review', { size: 12, fill: C.green }) +
    player(c, x + 48, y + 90, pw - 48, ph, o.inner ? o.inner(x + 48, y + 90, pw - 48, ph) : archivePhoto(c, x + 48 + (pw - 48) / 2 - 150, y + 110, 300, ph - 40), { prog: 0.57, time: '00:31 / 00:54' }) +
    R(x + pw + 20, y + 90, 352, ph, { r: 14, fill: C.s2, stroke: C.line }) +
    ML(x + pw + 44, y + 128, 'Review · 15-point list', { size: 11 }) + T(x + pw + 348, y + 132, '15/15', { f: M, w: 500, size: 18, fill: C.green, anchor: 'end' }) +
    items.map((it, i) => check(x + pw + 54, y + 172 + i * 44, 10) + T(x + pw + 76, y + 178 + i * 44, it, { f: S, size: 15, fill: C.t2 })).join('') +
    R(x + pw + 44, y + ph + 34, 304, 0.01) +
    Ci(x + pw + 64, y + ph + 50, 18, { fill: C.amber }) + T(x + pw + 64, y + ph + 56, 'MK', { f: S, w: 600, size: 13, fill: C.bg, anchor: 'middle' }) +
    T(x + pw + 94, y + ph + 46, 'Watched by Maya K.', { f: S, w: 600, size: 15 }) + T(x + pw + 94, y + ph + 66, 'All 54 seconds · 12:04', { f: M, size: 12, fill: C.t3 });
}

const LIB = [['Why the Panama Canal Ran Short of Water', 'Visual Explainer', '0:53', 'map'], ['The 1919 Boston Molasses Tank Collapse', 'Archive Documentary', '0:50', 'archive'],
  ['Why You Still Get Goosebumps', 'Stick Explainer', '0:56', 'paper'], ['Why Your Diet Starts on Monday', 'Character Cartoon', '1:01', 'cartoon'],
  ['The 1904 Olympic Marathon in St Louis', 'Paper Archive', '0:49', 'archive'], ['Switzerland explained in meme format', 'Brainrot', '0:54', 'meme']];
export function thumb(c, x, y, w, h, kind) {
  if (kind === 'map') return panamaMap(c, x, y, w, h, { quiet: true, r: 10 });
  if (kind === 'archive') return archivePhoto(c, x, y, w, h);
  const bgs = { paper: ['#E9DFC8', '#D3C29F'], cartoon: ['#6B4F3A', '#2E2219'], meme: ['#1B1B1F', '#000'] }[kind];
  const clip = clipRect(c, x, y, w, h, 10);
  const fig = kind === 'paper' ? Ci(x + w * .5, y + h * .4, h * .12, { stroke: '#222', sw: 3 }) + P(`M${x + w * .5} ${y + h * .52}V${y + h * .78}M${x + w * .5} ${y + h * .6}L${x + w * .4} ${y + h * .7}M${x + w * .5} ${y + h * .6}L${x + w * .6} ${y + h * .7}`, { stroke: '#222', sw: 3, cap: 'round' })
    : kind === 'cartoon' ? Ci(x + w * .4, y + h * .45, h * .16, { fill: '#E0B394' }) + R(x + w * .3, y + h * .6, w * .2, h * .4, { r: 12, fill: C.amber })
      : T(x + w / 2, y + h * .3, 'TRAINS THAT', { f: D, w: 800, size: h * .12, fill: '#FFF', anchor: 'middle' }) + T(x + w / 2, y + h * .43, 'ACTUALLY ARRIVE', { f: D, w: 800, size: h * .12, fill: '#FFF', anchor: 'middle' });
  return G(null, R(x, y, w, h, { fill: grad(c, [[0, bgs[0]], [1, bgs[1]]]) }) + fig, { clip });
}
export function screenLibrary(c, x, y, w, h) {
  const cw = (w - 96 - 40) / 3, chh = cw * 9 / 16;
  return ML(x + 48, y + 64, 'Library · 10 delivered', { size: 12, fill: C.green }) +
    LIB.map(([t, s, d, k], i) => {
      const cx = x + 48 + (i % 3) * (cw + 20), cy = y + 90 + Math.floor(i / 3) * (chh + 90);
      return thumb(c, cx, cy, cw, chh, k) + R(cx + cw - 64, cy + chh - 36, 52, 26, { r: 5, fill: '#000', op: 0.8 }) + T(cx + cw - 38, cy + chh - 18, d, { f: M, size: 13, fill: C.text, anchor: 'middle' }) +
        T(cx, cy + chh + 28, t.length > 34 ? t.slice(0, 33) + '…' : t, { f: S, w: 600, size: 16 }) + T(cx, cy + chh + 52, `${s} · Delivered`, { f: S, size: 14, fill: C.t3 });
    }).join('');
}

export const LANGS9 = ['English', 'German', 'French', 'Spanish', 'Portuguese', 'Italian', 'Polish', 'Indonesian', 'Danish'];
export function screenLanguages(c, x, y, w, h, o = {}) {
  const sel = o.sel ?? 1, pw = w - 400, ph = pw * 9 / 16;
  return ML(x + 48, y + 64, 'Languages · same edit, new voice', { size: 12, fill: C.green }) +
    player(c, x + 48, y + 90, pw - 48, ph, panamaMap(c, x + 48, y + 90, pw - 48, ph), { prog: 0.4, time: '00:21 / 00:54' }) +
    waveform(x + 48, y + 90 + ph + 46, pw - 48, 46, 110, sel + 3, C.green) +
    R(x + pw + 20, y + 90, 332, 9 * 50 + 20, { r: 14, fill: C.s2, stroke: C.line }) +
    LANGS9.map((l, i) => {
      const ly = y + 128 + i * 50, on = i === sel;
      return (on ? R(x + pw + 30, ly - 26, 312, 40, { r: 8, fill: C.green, fop: 0.14, stroke: C.green }) : '') +
        T(x + pw + 50, ly, l, { f: S, size: 17, w: on ? 600 : 400, fill: on ? C.text : C.t2 }) + (i <= sel ? check(x + pw + 318, ly - 6, 9) : '');
    }).join('');
}

export function screenBroll(c, x, y, w, h, o = {}) {
  const gw = (w - 96 - 20) / 2, gh = gw * 9 / 16 * 0.62;
  return ML(x + 48, y + 64, 'AI b-roll · self serve', { size: 12, fill: C.teal }) + T(x + w - 48, y + 64, 'CREDITS 240', { f: M, size: 13, fill: C.t2, anchor: 'end', ls: 2 }) +
    R(x + 48, y + 90, w - 96, 72, { r: 12, fill: C.bg, stroke: C.teal, sw: 1.5 }) + T(x + 76, y + 135, 'our serum bottle, in a hand, on wet marble, morning light', { f: S, size: 22 }) +
    [0, 1, 2, 3].map(i => {
      const gx = x + 48 + (i % 2) * (gw + 20), gy = y + 186 + Math.floor(i / 2) * (gh + 20);
      return serumShot(c, gx, gy, gw, gh, { r: 10 }) + (i === (o.pick ?? 1) ? R(gx - 3, gy - 3, gw + 6, gh + 6, { r: 12, stroke: C.teal, sw: 3 }) + R(gx + gw - 110, gy + gh - 46, 96, 34, { r: 8, fill: C.teal }) + T(gx + gw - 62, gy + gh - 23, 'Keep', { f: S, w: 600, size: 15, fill: C.bg, anchor: 'middle' }) : '') +
        T(gx + 14, gy + 28, `0:10 · 1080p`, { f: M, size: 12, fill: '#333' });
    }).join('');
}

// Big full-bleed statement with a soft vertical gradient on the type.
export function statement(c, lines, o = {}) {
  const g = grad(c, [[0, '#FFFFFF'], [1, '#9A9AA2']]);
  return lines.map((l, i) => T(o.x ?? W / 2, (o.y ?? 560) + i * (o.lh ?? 200), l, { f: D, w: 800, size: o.size ?? 200, fill: o.fills?.[i] || g, anchor: o.anchor ?? 'middle', ls: -(o.size ?? 200) * 0.04 })).join('');
}

// Pseudo-3D tilt (CSS-like perspective approximation using skew + scale).
export const tilt = (cx, cy, k = 1) => `translate(${cx} ${cy}) skewY(${-4 * k}) skewX(${10 * k}) scale(${1 - 0.06 * k} ${1 - 0.14 * k}) translate(${-cx} ${-cy})`;
