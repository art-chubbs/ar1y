// v3 kit: light, airy launch-film look (after the Numtera reference), translated to brew's brand.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { C, D, S, M, W, H, T, TS, R, Ln, Ci, P, G, ML, esc, grad, rgrad, clipRect, check, cursor, brackets, LAYER } from '../lib.mjs';

const require = createRequire(import.meta.url);
const fontkit = require('fontkit');
const fdir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fonts');
const FONTS = {
  [`${S}400`]: fontkit.openSync(path.join(fdir, 'archivo-latin-400-normal.woff2')),
  [`${S}500`]: fontkit.openSync(path.join(fdir, 'archivo-latin-500-normal.woff2')),
  [`${S}600`]: fontkit.openSync(path.join(fdir, 'archivo-latin-600-normal.woff2')),
  [`${M}500`]: fontkit.openSync(path.join(fdir, 'ibm-plex-mono-latin-500-normal.woff2')),
  [`${M}400`]: fontkit.openSync(path.join(fdir, 'ibm-plex-mono-latin-400-normal.woff2')),
};
const brico = fontkit.openSync(path.join(fdir, 'bricolage-grotesque-latin-wght-normal.woff2'));
export function tw(s, size, w = 500, f = S, ls = 0) {
  // fontkit can't instance this variable woff2, so lighter Bricolage weights are scaled from the 800 master.
  const font = f === D ? brico : (FONTS[`${f}${w}`] || FONTS[`${f}500`]);
  const k = f === D ? 1 - (800 - w) / 300 * 0.07 : 1;
  return font.layout(s).advanceWidth / font.unitsPerEm * size * k + ls * s.length;
}

// Light palette (brew's off-white text colour becomes the paper; green/teal glows replace the reference's blue).
export const L = { paper: '#F4F4F1', white: '#FFFFFF', ink: '#0B0B0C', ink2: '#3A3A40', ink3: '#8A8A91', line: '#E3E3DE', line2: '#D2D2CC', glass: '#FFFFFF' };

export function blur(c, sx, sy = sx) {
  const id = c.uid('blur');
  c.def(`<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${sx} ${sy}"/></filter>`);
  return `url(#${id})`;
}
export const fx = (inner, filter, op) => `<g filter="${filter}"${op != null ? ` opacity="${op}"` : ''}>${inner}</g>`;

export function lightBg(c, o = {}) {
  const g1 = rgrad(c, [[0, C.green, o.g ?? 0.55], [1, C.green, 0]], { r: 0.5 });
  const g2 = rgrad(c, [[0, C.teal, o.t ?? 0.45], [1, C.teal, 0]], { r: 0.5 });
  const g3 = rgrad(c, [[0, '#FFFFFF', 1], [1, '#FFFFFF', 0]], { r: 0.5 });
  const [gx, gy] = o.at || [1500, 1150];
  return LAYER('Background · paper', R(0, 0, W, H, { fill: L.paper })) +
    LAYER('Glow · green', `<ellipse cx="${gx}" cy="${gy}" rx="1300" ry="620" fill="${g1}"/>`) +
    LAYER('Glow · teal', `<ellipse cx="${gx - 1100}" cy="${gy + 40}" rx="900" ry="420" fill="${g2}"/>`) +
    LAYER('Glow · white', `<ellipse cx="760" cy="360" rx="1100" ry="520" fill="${g3}"/>`);
}
export function darkBg(c, o = {}) {
  const lk = (cx, cy, rx, ry, col, op) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${rgrad(c, [[0, col, op], [1, col, 0]], { r: 0.5 })}"/>`;
  return LAYER('Background · dark', R(0, 0, W, H, { fill: C.bg })) + (o.leaks === false ? '' : LAYER('Light leak · green', lk(o.lx ?? 120, o.ly ?? 980, 760, 520, C.green, 0.45)) + LAYER('Light leak · teal', lk(o.rx ?? 1840, o.ry ?? 60, 700, 460, C.teal, 0.35)));
}

// Centred sentence; optional green words and a "text selection" highlight over a phrase.
export function line(x, y, parts, o = {}) {
  const size = o.size || 64, w = o.w || 500, f = o.f || S, ink = o.ink || L.ink;
  const full = parts.map(p => p[0]).join('');
  const total = tw(full, size, w, f);
  let cx = o.anchor === 'start' ? x : x - total / 2, out = '';
  for (const [s, po = {}] of parts) {
    const ww = tw(s, size, w, f);
    // SVG drops leading spaces, so offset past them explicitly.
    const lead = s.match(/^\s*/)[0], lw = lead ? tw(lead, size, w, f) : 0;
    if (po.sel) out += LAYER('Selection highlight', R(cx + lw - 4, y - size * 0.86, ww - lw + 8, size * 1.12, { r: 6, fill: C.green }));
    if (s.trim()) out += LAYER(`Text · ${s.trim()}`, T((cx + lw).toFixed(1), y, s.trimStart(), { f, w, size, fill: po.sel ? '#FFFFFF' : po.fill || ink, op: po.op }));
    cx += ww;
  }
  if (o.caret) out += LAYER('Caret', R(cx + 6, y - size * 0.8, Math.max(3, size * 0.05), size * 0.98, { fill: o.caretCol || ink }));
  return out;
}

// Big focus-pull word with directional motion blur.
function blurWord__raw(c, x, y, s, o = {}) {
  const size = o.size || 260;
  const t = T(x, y, s, { f: o.f || S, w: o.w || 500, size, fill: o.fill || L.ink, anchor: o.anchor || 'middle', ls: -size * 0.03 });
  return (o.ghost ? fx(t, blur(c, o.ghost, 2), 0.35) : '') + (o.blur ? fx(t, blur(c, o.blur, o.blurY ?? 0)) : t);
}

function shadowCard__raw(c, x, y, w, h, o = {}) {
  return fx(R(x + 6, y + 18, w - 12, h, { r: o.r ?? 16, fill: '#0B0B0C', op: o.sop ?? 0.14 }), blur(c, 22)) +
    R(x, y, w, h, { r: o.r ?? 16, fill: o.fill || L.white, stroke: o.stroke || L.line, sw: 1, op: o.op });
}

// ---------- light brew Studio ----------
const NAV = ['New video', 'In production', 'Review', 'Library', 'Languages', 'AI b-roll', 'UGC ads'];
function lsidebar__raw(x, y, h, active) {
  let out = R(x, y, 250, h, { fill: '#F8F8F6' }) + Ln(x + 250, y, x + 250, y + h, { stroke: L.line }) +
    brackets(x + 22, y + 22, 34, 34, { len: 9, sw: 3 }) + T(x + 39, y + 46, 'e', { f: D, w: 800, size: 22, fill: C.green, anchor: 'middle' }) +
    TS(x + 68, y + 48, [['br'], ['e', { fill: C.green }], ['w']], { f: D, w: 800, size: 24, fill: L.ink, ls: -0.8 }) +
    ML(x + 24, y + 104, 'Workspace', { size: 10, fill: L.ink3 });
  NAV.forEach((n, i) => {
    const ny = y + 140 + i * 40, on = n === active;
    out += (on ? R(x + 12, ny - 24, 226, 34, { r: 8, fill: C.green, fop: 0.12 }) : '') + Ci(x + 30, ny - 7, 4, { fill: on ? C.green : L.line2 }) +
      T(x + 44, ny, n, { f: S, size: 15, w: on ? 600 : 400, fill: on ? L.ink : L.ink2 });
  });
  return out;
}
function lwindow__raw(c, x, y, w, h, inner, o = {}) {
  const clip = clipRect(c, x, y, w, h, 16);
  return LAYER('Window · frame + shadow', shadowCard(c, x, y, w, h)) +
    G(null, LAYER('Window · surface', R(x, y, w, h, { fill: L.white })) +
      LAYER('Window · title bar', R(x, y, w, 40, { fill: '#FAFAF8' }) + Ln(x, y + 40, x + w, y + 40, { stroke: L.line }) +
        [0, 1, 2].map(i => Ci(x + 22 + i * 18, y + 20, 5.5, { fill: L.line2 })).join('') +
        T(x + w / 2, y + 25, o.title || 'brew Studio', { f: M, size: 12, fill: L.ink3, anchor: 'middle', ls: 1 })) + inner, { clip });
}
const lapp__raw = (c, x, y, w, h, active, screen) => lwindow(c, x, y, w, h, lsidebar(x, y + 40, h - 40, active) + screen(c, x + 250, y + 40, w - 250, h - 40));

const chip__raw = (x, y, label, col, o = {}) => {
  const size = o.size || 11, wd = tw(label.toUpperCase(), size, 500, M, 1) + 18;
  return R(x, y, wd, size + 12, { r: 5, fill: col, fop: o.solid ? 1 : 0.14 }) + T(x + 9, y + size + 3, label.toUpperCase(), { f: M, w: 500, size, fill: o.solid ? '#FFF' : col, ls: 1 });
};
function btn__raw(x, y, label, o = {}) {
  const size = o.size || 15, wd = tw(label, size, 600) + 36;
  return R(x - (o.anchor === 'end' ? wd : 0), y, wd, size + 22, { r: 8, fill: o.col || C.green }) +
    T(x - (o.anchor === 'end' ? wd : 0) + 18, y + size + 6, label, { f: S, w: 600, size, fill: '#FFF' });
}

export function scrNew(c, x, y, w, h, o = {}) {
  const typed = o.typed ?? 'Why the Panama Canal ran short of water';
  return ML(x + 40, y + 52, 'New video', { size: 11, fill: C.green }) +
    T(x + 40, y + 98, 'What should we make?', { f: D, w: 700, size: 34, fill: L.ink, ls: -1 }) +
    T(x + 40, y + 128, 'A finished script, or one line about the idea. Both work.', { f: S, size: 15, fill: L.ink3 }) +
    R(x + 40, y + 156, w - 80, 96, { r: 12, fill: '#FBFBF9', stroke: C.green, sw: 1.5 }) + T(x + 66, y + 214, typed, { f: S, size: 24, w: 500, fill: L.ink }) +
    (o.caret !== false ? R(x + 72 + tw(typed, 24, 500), y + 190, 2.5, 30, { fill: C.green }) : '') +
    [['Length', '10 min'], ['Style', 'Visual explainer'], ['Voice', 'Ours'], ['Languages', '9']].map(([k, v], i) => {
      const cw = (w - 80) / 4, cx = x + 40 + i * cw;
      return R(cx, y + 276, cw - 12, 64, { r: 10, fill: '#F7F7F5', stroke: L.line }) + ML(cx + 14, y + 300, k, { size: 10, fill: L.ink3 }) + T(cx + 14, y + 328, v, { f: S, w: 600, size: 16, fill: L.ink });
    }).join('') +
    btn(x + w - 40, y + 368, 'Send to brew  →', { anchor: 'end', size: 16 }) + T(x + 40, y + 394, 'First video free · up to ten minutes', { f: M, size: 12, fill: L.ink3 });
}

function projectCard__raw(c, x, y, w, o = {}) {
  const steps = ['Topic', 'Research', 'Script', 'Voice', 'Edit', 'Reviewed', 'Delivered'];
  const a = o.active ?? 1;
  let px = x + 20, pills = '';
  steps.forEach((s, i) => {
    const lw = tw(s.toUpperCase(), 10, 500, M, 1) + 18;
    pills += R(px, y + 92, lw, 22, { r: 11, fill: i === a ? C.green : 'none', fop: i === a ? 0.14 : null, stroke: i <= a ? C.green : L.line2 }) +
      T(px + 9, y + 107, s.toUpperCase(), { f: M, w: 500, size: 10, fill: i < a ? L.ink2 : i === a ? C.green : L.ink3, ls: 1 });
    px += lw + 6;
  });
  return shadowCard(c, x, y, w, 136, { r: 14 }) +
    R(x + 20, y + 20, 34, 34, { r: 8, fill: '#4DB37E' }) + chip(x + 66, y + 22, `#${o.id || 2041}`, L.ink3) + chip(x + 136, y + 22, o.tag || 'YouTube', C.amber) + chip(x + 230, y + 22, o.state || 'In production', C.green) +
    T(x + 66, y + 72, o.title || 'Why the Panama Canal ran short of water', { f: S, w: 600, size: 17, fill: L.ink }) + pills;
}

// Dark "system" panel with monospace steps (the reference's hero device).
export function logPanel(c, x, y, w, rows, o = {}) {
  let out = '', yy = y;
  rows.forEach(([kind, text, sub], i) => {
    const before = out.length;
    if (kind === 'check') {
      out += R(x, yy, w, 54, { r: 4, fill: '#16161A', stroke: '#2A2A30' }) + R(x + 16, yy + 16, 22, 22, { r: 3, fill: C.text }) +
        P(`M${x + 21} ${yy + 27}l4 4l8 -9`, { stroke: C.bg, sw: 2.5, cap: 'round', join: 'round' }) + T(x + 52, yy + 33, text, { f: M, w: 500, size: 17, fill: C.text });
      yy += 66;
    } else if (kind === 'progress') {
      out += R(x, yy, w, 74, { r: 4, fill: '#16161A', stroke: '#2A2A30' }) + T(x + 16, yy + 30, text, { f: M, w: 500, size: 17, fill: C.text }) +
        R(x + 16, yy + 48, w - 32, 6, { r: 3, fill: '#2A2A30' }) + R(x + 16, yy + 48, (w - 32) * (sub ?? 0.7), 6, { r: 3, fill: C.green });
      yy += 86;
    } else if (kind === 'found') {
      out += R(x, yy, w, 92, { r: 4, fill: '#16161A', stroke: '#2A2A30' }) + T(x + 16, yy + 34, text, { f: M, w: 500, size: 19, fill: C.text }) +
        R(x + 16, yy + 50, tw(sub, 13, 400, M) + 36, 28, { r: 4, fill: '#222228' }) + T(x + 40, yy + 69, sub, { f: M, size: 13, fill: C.t2 }) + R(x + 24, yy + 57, 10, 13, { r: 2, stroke: C.t2, sw: 1.2 });
      yy += 104;
    } else if (kind === 'done') {
      out += R(x, yy, w, 54, { r: 4, fill: C.green, fop: 0.22, stroke: C.green }) + check(x + 27, yy + 27, 11) + T(x + 52, yy + 34, text, { f: M, w: 500, size: 17, fill: C.greenL });
      yy += 66;
    } else if (kind === 'ghost') {
      out += R(x, yy, w, 18, { r: 3, fill: '#1E1E23' }) + R(x, yy + 26, w * 0.7, 18, { r: 3, fill: '#1E1E23' });
      yy += 56;
    }
    out = out.slice(0, before) + LAYER(`Log · ${text || 'placeholder rows'}`, out.slice(before));
  });
  return out;
}

// Floating "problem" cards: the everyday mess of making video by hand (light theme).
function msgCard__raw(c, x, y, who, text, col = C.teal, o = {}) {
  const wd = Math.max(tw(text, 15, 400) + 90, 260);
  return G(o.tr || null, shadowCard(c, x, y, wd, 74, { r: 12 }) + Ci(x + 30, y + 37, 15, { fill: col }) +
    T(x + 56, y + 31, who, { f: S, w: 600, size: 14, fill: L.ink }) + T(x + 56, y + 53, text, { f: S, size: 15, fill: L.ink2 }), { op: o.op });
}
function fileCard__raw(c, x, y, name, meta, o = {}) {
  const wd = Math.max(tw(name, 15, 500, M) + 90, 280);
  return G(o.tr || null, shadowCard(c, x, y, wd, 70, { r: 12 }) + R(x + 18, y + 18, 26, 34, { r: 4, fill: 'none', stroke: o.col || C.coral, sw: 2 }) +
    T(x + 60, y + 32, name, { f: M, w: 500, size: 15, fill: L.ink }) + T(x + 60, y + 54, meta, { f: S, size: 13, fill: L.ink3 }), { op: o.op });
}
function miniTimeline__raw(c, x, y, w, o = {}) {
  let out = shadowCard(c, x, y, w, 150, { r: 12 }) + ML(x + 18, y + 28, o.label || 'edit_v7_FINAL.prproj', { size: 11, fill: L.ink3 });
  [[0.02, 0.3, C.coral], [0.34, 0.25, C.amber], [0.61, 0.33, C.teal]].forEach(([s, l, col], i) => {
    out += R(x + 18 + s * (w - 36), y + 48, l * (w - 36) - 6, 26, { r: 5, fill: col, fop: 0.25, stroke: col });
  });
  out += R(x + 18, y + 84, w - 36, 22, { r: 5, fill: C.green, fop: 0.15, stroke: C.green }) + R(x + 18, y + 114, w * 0.55, 22, { r: 5, fill: L.line });
  const ph = x + 18 + (w - 36) * (o.play ?? 0.45);
  return out + Ln(ph, y + 42, ph, y + 140, { stroke: C.coral, sw: 2 });
}
function invoiceCard__raw(c, x, y, o = {}) {
  return G(o.tr || null, shadowCard(c, x, y, 300, 190, { r: 12 }) + ML(x + 20, y + 32, 'Invoice #0147', { size: 11, fill: L.ink3 }) +
    T(x + 20, y + 76, '$1,200.00', { f: D, w: 700, size: 34, fill: L.ink }) + T(x + 20, y + 104, 'Freelance edit · 1 video', { f: S, size: 14, fill: L.ink3 }) +
    R(x + 20, y + 130, 120, 32, { r: 6, fill: C.coral, fop: 0.14 }) + T(x + 32, y + 152, 'Overdue', { f: S, w: 600, size: 14, fill: C.coral }), { op: o.op });
}

export { C, D, S, M, W, H, T, TS, R, Ln, Ci, P, G, ML, grad, rgrad, clipRect, check, cursor, brackets };

// Named layers (data-layer) so the After Effects exporter can split frames into elements.
export const blurWord = (...a) => LAYER(`Text · ${a[3]}`, blurWord__raw(...a));
export const shadowCard = (...a) => LAYER('Card', shadowCard__raw(...a));
export const lwindow = lwindow__raw;
export const lsidebar = (...a) => LAYER(`Window · sidebar (${a[3]})`, lsidebar__raw(...a));
export const lapp = lapp__raw;
export const chip = (...a) => LAYER(`Chip · ${a[2]}`, chip__raw(...a));
export const btn = (...a) => LAYER(`Button · ${a[2].trim()}`, btn__raw(...a));
export const projectCard = (...a) => LAYER('Card · project', projectCard__raw(...a));
export const msgCard = (...a) => LAYER(`Card · ${a[3]} message`, msgCard__raw(...a));
export const fileCard = (...a) => LAYER(`Card · ${a[3]}`, fileCard__raw(...a));
export const miniTimeline = (...a) => LAYER('Card · edit timeline', miniTimeline__raw(...a));
export const invoiceCard = (...a) => LAYER('Card · invoice', invoiceCard__raw(...a));
